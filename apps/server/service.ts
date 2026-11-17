import express from 'express'
import { createServer } from 'node:http'
import { randomBytes, randomInt, randomUUID, createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { Server } from 'socket.io'
import { avatars, protocolVersion, type Command, type Profile, type Reply, type Snapshot } from '../../packages/protocol/index.ts'
import { registry, record, type GamePlugin, type Turn } from '../../packages/game-sdk/index.ts'

type Plugin = GamePlugin<any, any>
type Room = {
  code: string; gameId: string; version: number; config: unknown; host: string;
  members: (Profile & {ready: boolean})[]; updated: number; chat: Snapshot['chat'];
  match?: { id: string; state: Turn };
  lobby?: Record<string, unknown>;
  departed?: string[]; hostOfflineAt?: number; pausedMs?: number; clockAt?: number;
}
const day = 86_400_000
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
export function createPlatform(options: {
  database: string; origin: string; secure: boolean; plugins: Plugin[];
  assets?: string; cookieName?: string; now?: () => number; random?: (limit: number) => number;
}) {
  const now = options.now ?? Date.now
  const random = options.random ?? randomInt
  const cookieName = options.cookieName ?? 'games_session'
  if (!/^[a-zA-Z0-9_-]+$/.test(cookieName)) throw new Error('Invalid session cookie name')
  const games = registry(options.plugins)
  const db = new DatabaseSync(options.database)
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS sessions (secret TEXT PRIMARY KEY, profile TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, body TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS receipts (key TEXT PRIMARY KEY, body TEXT NOT NULL, created INTEGER NOT NULL);`)
  const app = express()
  const server = createServer(app)
  const io = new Server(server, { maxHttpBufferSize: 8192, allowRequest(req, cb) {
    const origin = req.headers.origin
    cb(null, !origin || origin === options.origin)
  } })
  const online = new Map<string, Set<string>>()
  const rates = new Map<string, { at: number; count: number }>()
  const rooms = () => db.prepare('SELECT body FROM rooms').all().map(row => JSON.parse(String(row.body)) as Room)
  function load(code: string): Room | undefined {
    const row = db.prepare('SELECT body FROM rooms WHERE code=?').get(code)
    return row ? JSON.parse(String(row.body)) : undefined
  }
  function save(room: Room) {
    db.prepare('INSERT OR REPLACE INTO rooms VALUES (?,?,?)').run(room.code, JSON.stringify(room), room.updated)
  }
  function plugin(room: Room) {
    const game = games.get(room.gameId)
    if (!game || game.version !== room.version) throw new Error('游戏版本不可用')
    return game
  }
  function session(cookie?: string) {
    const token = cookie?.match(new RegExp('(?:^|;\\s*)'+cookieName+'=([a-f0-9]{64})(?:;|$)'))?.[1]
    if (!token) return
    const secret = hash(token)
    const row = db.prepare('SELECT profile FROM sessions WHERE secret=? AND expires>?').get(secret, now())
    if (row) return { secret, profile: JSON.parse(String(row.profile)) as Profile }
  }
  function present(room:Room,id:string) {
    return online.has(id) && !room.departed?.includes(id)
  }
  function syncPresence(room:Room,time:number) {
    const state=room.match?.state
    const game=plugin(room)
    const policy=game.roomPolicy
    if(!policy || !state || game.finished(state)) return false
    const connected=room.members.filter(member=>present(room,member.id))
    let changed=false
    if(policy.pauseWhenEmpty) {
      if(!connected.length && state.deadline!==null) {
        room.pausedMs=Math.max(0,state.deadline-(room.clockAt??time))
        state.deadline=null
        changed=true
      } else if(connected.length && room.pausedMs!==undefined) {
        state.deadline=time+room.pausedMs
        delete room.pausedMs
        changed=true
      }
      if(connected.length && (room.clockAt===undefined || time-room.clockAt>=1000)) {
        room.clockAt=time
        changed=true
      }
    }
    if(policy.hostTransferMs) {
      if(!present(room,room.host)) {
        if(room.hostOfflineAt===undefined) {room.hostOfflineAt=time;changed=true}
        if(connected.length && (room.departed?.includes(room.host)||time-room.hostOfflineAt>=policy.hostTransferMs)) {
          room.host=connected[0].id
          delete room.hostOfflineAt
          changed=true
        }
      } else if(room.hostOfflineAt!==undefined) {
        delete room.hostOfflineAt
        changed=true
      }
    }
    return changed
  }
  function snapshot(room: Room, id: string, spectator=false): Snapshot {
    const state = room.match?.state
    const game = plugin(room)
    return { code: room.code, host: room.host, gameId: room.gameId, config: room.config, lobby: room.lobby,
      members: room.members.map(member => ({...member, online: present(room,member.id)})),
      chat: spectator ? [] : room.chat, pausedMs:room.pausedMs,
      ...(spectator?{spectator:true}:game.roomPolicy?.pauseWhenEmpty?{canLeaveActive:true}:{}),
      match: room.match && state ? {id: room.match.id, phase: state.phase, deadline: state.deadline,
        finished: game.finished(state), public: game.public(state), ...(spectator?{}:{private:game.private(state,id)})} : undefined }
  }
  function broadcast(room: Room) {
    for (const member of room.members) {
      if(!room.departed?.includes(member.id)) io.to(member.id).emit('room',snapshot(room, member.id))
    }
    if(plugin(room).roomPolicy?.spectators && room.match) io.to('watch:'+room.code).emit('room',snapshot(room,'',true))
  }
  function changedPresence(id: string) {
    for(const room of rooms()) if(room.members.some(member=>member.id===id)) {
      if(syncPresence(room,now())) save(room)
      broadcast(room)
    }
  }
  function advance(room: Room, time: number) {
    const state = room.match?.state
    if (!state) return false
    const game = plugin(room)
    let changed = false
    while (state.deadline !== null && state.deadline <= time) {
      const phase = state.phase
      game.advance(state, {now:time, random})
      if (state.phase === phase) throw new Error('插件没有推进到期阶段')
      changed = true
    }
    if (changed && game.finished(state)) room.members.forEach(member => { member.ready = false })
    return changed
  }
  function tick() {
    const time = now()
    for (const room of rooms()) {
      const presenceChanged=syncPresence(room,time)
      if (advance(room,time)) {
        room.updated = time
        save(room)
        broadcast(room)
      } else if (presenceChanged) {
        save(room)
        broadcast(room)
      } else if (!(room.match && plugin(room).roomPolicy?.pauseWhenEmpty && !plugin(room).finished(room.match.state)) && room.updated < time - day) {
        db.prepare('DELETE FROM rooms WHERE code=?').run(room.code)
        for (const member of room.members) io.to(member.id).emit('left', room.code)
        io.to('watch:'+room.code).emit('left',room.code)
        io.in('watch:'+room.code).socketsLeave('watch:'+room.code)
      }
    }
    db.prepare('DELETE FROM receipts WHERE created<?').run(time - day)
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(time)
  }
  tick()
  const timer = setInterval(tick, 500)
  timer.unref()
  app.use(express.json({limit:'8kb'}))
  app.use('/api', (req,res,next) => {
    res.set('Cache-Control','no-store')
    if (req.method !== 'GET' && req.headers.origin !== options.origin) {
      res.status(403).json({error:'来源无效'})
      return
    }
    next()
  })
  app.get('/api/catalog', (_req,res) => res.json([...games.values()].map(game => ({
    id:game.id, name:game.name, spectators:game.roomPolicy?.spectators, min:game.minPlayers, max:game.maxPlayers, settings:game.settings, defaults:game.defaults,
  }))))
  function canResume(room:Room,id:string) {
    const game=games.get(room.gameId)
    return !!(game?.roomPolicy?.resumeFromLobby && game.version===room.version && room.match &&
      !game.finished(room.match.state) && room.members.some(member=>member.id===id))
  }
  app.get('/api/resumable-matches',(req,res)=>{
    res.set('Cache-Control','no-store')
    const current=session(req.headers.cookie)
    if(!current) return res.status(401).json({error:'请先登录'})
    return res.json(rooms().filter(room=>canResume(room,current.profile.id)).sort((a,b)=>b.updated-a.updated)
      .map(room=>({gameId:room.gameId,name:plugin(room).name,code:room.code})))
  })
  app.get('/api/me', (req,res) => res.json(session(req.headers.cookie)?.profile ?? null))
  app.post('/api/session', (req,res) => {
    const current = session(req.headers.cookie)
    if (current) { res.json(current.profile); return }
    const token = randomBytes(32).toString('hex')
    const profile = {id:randomUUID(), name:'', avatar:0}
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(hash(token), JSON.stringify(profile), now()+30*day)
    res.cookie(cookieName,token,{httpOnly:true,secure:options.secure,sameSite:'strict',maxAge:30*day})
    res.json(profile)
  })
  app.put('/api/profile', (req,res) => {
    const current = session(req.headers.cookie)
    if (!current) { res.status(401).json({error:'请先登录'}); return }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const avatar = req.body?.avatar
    if (!name || [...name].length > 20 || /[\p{Cc}]/u.test(name) || !Number.isInteger(avatar) || !avatars[avatar]) {
      res.status(400).json({error:'昵称或头像无效'}); return
    }
    const profile = {id:current.profile.id,name,avatar}
    db.exec('BEGIN IMMEDIATE')
    const affected = rooms().filter(room => room.members.some(member => member.id === profile.id))
    try {
      db.prepare('UPDATE sessions SET profile=? WHERE secret=?').run(JSON.stringify(profile),current.secret)
      for (const room of affected) {
        Object.assign(room.members.find(member => member.id === profile.id)!,profile)
        save(room)
      }
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    affected.forEach(broadcast)
    res.json(profile)
  })
  function execute(profile: Profile, cmd: Command) {
    const time = now()
    const id = profile.id
    const key = id + ':' + cmd.id
    const receipt = db.prepare('SELECT body FROM receipts WHERE key=?').get(key)
    if (receipt) return JSON.parse(String(receipt.body)) as Reply
    let room: Room | undefined
    let removed: string[] = []
    let dissolved = false
    if (!profile.name) throw new Error('请先设置昵称')
    if (cmd.type === 'create') {
      const gameId = record(cmd.data).gameId
      const game = typeof gameId === 'string' ? games.get(gameId) : undefined
      if (!game) throw new Error('游戏不可用')
      let code: string
      do { code = String(randomInt(1_000_000)).padStart(6,'0') } while (load(code))
      room = {code,gameId:game.id,version:game.version,config:game.defaults,host:id,members:[{...profile,ready:false}],
        updated:time,chat:[]}
    } else {
      if (typeof cmd.room !== 'string' || !/^\d{6}$/.test(cmd.room)) throw new Error('请输入六位房间码')
      room = load(cmd.room)
      if (!room) throw new Error('房间不存在')
      if (cmd.type==='join' && cmd.data && typeof cmd.data==='object' && Object.hasOwn(cmd.data,'waitingMembers')) {
        const {gameId,waitingMembers}=record(cmd.data)
        if (gameId!==room.gameId || room.match || waitingMembers!==room.members.length)
          throw new Error('等待房间的游戏、对局或人数已变化')
      }
      if (advance(room,time)) {
        room.updated = time
        save(room)
        broadcast(room)
      }
      const game = plugin(room)
      const member = room.members.find(value => value.id === id)
      const state = room.match?.state
      const active = !!state && !game.finished(state)
      if (cmd.type === 'join') {
        if (cmd.data && typeof cmd.data==='object' && 'resume' in cmd.data && cmd.data.resume===true && !canResume(room,id))
          throw new Error('对局无法恢复')

        if (!member) {
          if (active) throw new Error('对局已开始')
          if (room.members.length >= (game.roomPolicy?.capacity(room.config) ?? game.maxPlayers)) throw new Error('房间已满')
          if (room.match) { delete room.match; room.chat = [] }
          room.members.push({...profile,ready:false})
        }
        if(room.departed?.includes(id)) {
          room.departed=room.departed.filter(value=>value!==id)
          syncPresence(room,time)
        }
      } else {
        if (!member || room.departed?.includes(id)) throw new Error('你不是房间成员')
        if (cmd.type === 'sync') return {ok:true,room:room.code} as const
        if (['kick','config','start','dissolve'].includes(cmd.type) && room.host !== id) throw new Error('仅房主可操作')
        switch (cmd.type) {
          case 'lobby':
            if (active || !game.lobby) throw new Error('当前无法选择')
            room.lobby ??= {}
            room.lobby[id] = game.lobby.select(cmd.data)
            member.ready = false
            break
          case 'ready':
            if (active || typeof cmd.data !== 'boolean') throw new Error('无法更新准备状态')
            if (cmd.data && game.lobby && !game.lobby.ready(room.lobby?.[id])) throw new Error('请先完成游戏准备选项')
            member.ready = cmd.data
            break
          case 'config':
            if (active) throw new Error('对局已开始')
            const config=game.config(cmd.data)
            if(game.roomPolicy && room.members.length>game.roomPolicy.capacity(config)) throw new Error('房间人数超过设置')
            room.config = config
            break
          case 'start':
            if (active || room.members.length < game.minPlayers || room.members.length > game.maxPlayers ||
              room.members.some(value => !value.ready || !online.has(value.id))) throw new Error('请等待所有玩家在线并准备')
            const players = room.members.map(value => value.id)
            if (game.canStart && !game.canStart(players,room.config)) throw new Error('未满足游戏开局条件')
            const lobby = game.lobby
            const selections = room.lobby
            if (lobby && players.some(player=>!lobby.ready(selections?.[player]))) throw new Error('未完成游戏准备选项')
            room.match = {id:randomUUID(),state:game.start(players,room.config,{now:time,random},room.lobby)}
            delete room.lobby
            delete room.pausedMs
            delete room.departed
            delete room.hostOfflineAt
            room.clockAt=time
            room.chat = []
            break
          case 'dissolve':
            if (active) throw new Error('对局进行中')
            dissolved = true
            removed = room.members.map(value => value.id)
            break
          case 'kick':
          case 'leave': {
            if(active && cmd.type==='leave' && game.roomPolicy?.pauseWhenEmpty) {
              ;(room.departed??=[]).push(id)
              removed=[id]
              syncPresence(room,time)
              break
            }
            if (active) throw new Error('对局进行中，席位保留')
            const target = cmd.type === 'kick' ? record(cmd.data).id : id
            if ((cmd.type === 'kick' && target === id) || typeof target !== 'string' ||
                !room.members.some(value => value.id === target)) throw new Error('成员无效')
            removed = [target]
            if (room.lobby) delete room.lobby[target]
            room.members = room.members.filter(value => value.id !== target)
            delete room.match
            room.chat = []
            room.members.forEach(value => { value.ready = false })
            if (!room.members.length) dissolved = true
            else if (room.host === target) room.host = room.members[0].id
            break
          }
          case 'game':
          case 'chat':
            if (!active || !state || cmd.match !== room.match?.id || cmd.phase !== state.phase) throw new Error('对局或阶段已变化')
            if (cmd.type === 'game') {
              if (room.pausedMs!==undefined) throw new Error('比赛已暂停')
              game.command(state,id,cmd.data,{now:time,random})
              if (game.finished(state)) room.members.forEach(value => { value.ready = false })
            } else {
              if (!game.canChat(state)) throw new Error('当前阶段禁止发言')
              const message = typeof cmd.data === 'string' ? cmd.data.trim() : ''
              if (!message || [...message].length > 280 || /[\p{Cc}]/u.test(message)) throw new Error('消息无效')
              if (room.chat.some(value => value.author === id && time-value.at < 1000)) throw new Error('发言太快')
              room.chat.push({author:id,text:message,at:time})
            }
            break
          default: throw new Error('命令无效')
        }
      }
    }
    const reply: Reply = {ok:true, room:dissolved || removed.includes(id) ? undefined : room.code}
    db.exec('BEGIN IMMEDIATE')
    try {
      room.updated = time
      if (dissolved) db.prepare('DELETE FROM rooms WHERE code=?').run(room.code)
      else save(room)
      db.prepare('INSERT INTO receipts VALUES (?,?,?)').run(key,JSON.stringify(reply),time)
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    for (const target of removed) io.to(target).emit('left',room.code)
    if (!dissolved) broadcast(room)
    else {
      io.to('watch:'+room.code).emit('left',room.code)
      io.in('watch:'+room.code).socketsLeave('watch:'+room.code)
    }
    return reply
  }
  io.use((socket,next) => {
    const current = session(socket.request.headers.cookie)
    if (!current) { next(new Error('请先登录')); return }
    socket.data.user = current.profile.id
    next()
  })
  io.on('connection', socket => {
    const id = socket.data.user as string
    socket.join(id)
    const sockets = online.get(id) ?? new Set<string>()
    sockets.add(socket.id)
    online.set(id,sockets)
    changedPresence(id)
    socket.on('command', (input: unknown, ack: unknown) => {
      if (typeof ack !== 'function') return
      let reply: Reply
      try {
        const current = session(socket.request.headers.cookie)
        if (!current || current.profile.id !== id) throw new Error('会话已失效')
        const data = record(input)
        if (data.v !== protocolVersion || typeof data.id !== 'string' || !/^[\w-]{8,80}$/.test(data.id) ||
          typeof data.type !== 'string') throw new Error('协议或请求无效')
        const rate = rates.get(id)
        const time = now()
        if (!rate || time-rate.at >= 1000) rates.set(id,{at:time,count:1})
        else if (++rate.count > 20) throw new Error('操作太快')
        if(data.type==='watch') {
          const room=typeof data.room==='string'?load(data.room):undefined
          if(!room?.match || !plugin(room).roomPolicy?.spectators || room.members.some(member=>member.id===id)) throw new Error('此房间不能旁观')
          for(const channel of socket.rooms) if(channel.startsWith('watch:')) socket.leave(channel)
          socket.join('watch:'+room.code)
          socket.emit('room',snapshot(room,id,true))
          ack({ok:true,room:room.code})
          return
        }
        if(data.type==='unwatch') {
          for(const channel of socket.rooms) if(channel.startsWith('watch:')) socket.leave(channel)
          ack({ok:true})
          return
        }
        reply = execute(current.profile,data as Command)
        if (reply.ok && reply.room) {
          if(data.type==='join'||data.type==='create') for(const channel of socket.rooms) if(channel.startsWith('watch:')) socket.leave(channel)
          const room = load(reply.room)
          if (room?.members.some(value => value.id === id)) socket.emit('room',snapshot(room,id))
        }
      } catch (error) {
        reply = {ok:false,error:error instanceof Error ? error.message : '服务器错误'}
      }
      ack(reply)
    })
    socket.on('disconnect', () => {
      sockets.delete(socket.id)
      if (!sockets.size) { online.delete(id); rates.delete(id); changedPresence(id) }
    })
  })
  if (options.assets) app.use(express.static(options.assets))
  return { server, tick, async close() {
    clearInterval(timer)
    for(const room of rooms()) {
      if(plugin(room).roomPolicy?.pauseWhenEmpty && room.match && !plugin(room).finished(room.match.state)) {
        room.clockAt=now()
        save(room)
      }
    }
    await io.close()
    db.close()
  } }
}
