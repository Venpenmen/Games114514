import express from 'express'
import { createServer } from 'node:http'
import { randomInt, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { accounts, migrateAccounts, validProfile, type Session } from './accounts.ts'
import { Server, type Socket } from 'socket.io'
import { protocolVersion, type Command, type Profile, type Reply, type Snapshot } from '../../packages/protocol/index.ts'
import { registry, record, type GamePlugin, type Turn } from '../../packages/game-sdk/index.ts'

type Plugin = GamePlugin<any, any>
type Room = {
  code: string; gameId: string; version: number; config: unknown; host: string;
  members: (Profile & {ready: boolean})[]; updated: number; chat: Snapshot['chat'];
  match?: { id: string; state: Turn; startedAt?:number };
  lobby?: Record<string, unknown>;
  emptySince?: number; lastMemberActivityAt?: number; departed?: string[]; hostOfflineAt?: number; pausedMs?: number; clockAt?: number;
}
const day = 86_400_000
const idleRoomMs = 30*60_000
const emptyMatchMs = 60*60_000
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
  migrateAccounts(db)
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
  function recordResult(room:Room,time:number) {
    const match=room.match
    if(!match) return
    const result=plugin(room).finalResult?.(match.state)
    if(!result) return
    const players=room.members.map(member=>member.id)
    if(!result.winners.length || result.winners.some(id=>!players.includes(id)) ||
      (result.scores && players.some(id=>!Number.isSafeInteger(result.scores![id]))))
      throw new Error('插件终局记录无效')
    const inserted=db.prepare('INSERT OR IGNORE INTO match_records VALUES (?,?,?,?,?,?)')
      .run(match.id,room.gameId,room.code,match.startedAt??null,time,JSON.stringify(result))
    if(!inserted.changes) return
    const insert=db.prepare('INSERT INTO match_participants VALUES (?,?,?,?,?,?)')
    for(const member of room.members) {
      const score=result.scores?.[member.id]
      const rank=score===undefined ? null : 1+players.filter(id=>result.scores![id]>score).length
      insert.run(match.id,member.id,member.name,score??null,rank,result.winners.includes(member.id)?'win':'loss')
    }
  }
  function saveAdvance(room:Room,time:number,finished:boolean) {
    if(!finished) {save(room);return}
    db.exec('BEGIN IMMEDIATE')
    try {
      recordResult(room,time)
      save(room)
      db.exec('COMMIT')
    } catch(error) {db.exec('ROLLBACK');throw error}
  }
  function plugin(room: Room) {
    const game = games.get(room.gameId)
    if (!game || game.version !== room.version) throw new Error('游戏版本不可用')
    return game
  }
  function control(room:Room,id:string) {
    if(!room.match) return
    const row=db.prepare('SELECT session_id,control_version FROM match_control WHERE match_id=? AND player_id=?')
      .get(room.match.id,id)
    if(row) return { sessionId:String(row.session_id),version:Number(row.control_version) }
  }
  function devices(id:string) {
    return [...online.get(id)??[]].flatMap(socketId=>{
      const socket=io.sockets.sockets.get(socketId)
      return socket ? [socket] : []
    })
  }
  function attending(socket:Socket,room:Room) {
    return socket.data.seated===room.code
  }
  const tabOwners=new Map<string,{socketId:string;tab?:string;session:string}>()
  const ownerKey=(room:Room,id:string)=>room.code+':'+id
  function permitted(socket:Socket,room:Room,id:string) {
    return tabOwners.get(ownerKey(room,id))?.socketId===socket.id &&
      (!room.match || control(room,id)?.sessionId===socket.data.session)
  }
  function canAttach(socket:Socket,room:Room,id:string,sessionId:string) {
    const owner=tabOwners.get(ownerKey(room,id))
    const controlSession=control(room,id)?.sessionId
    if(controlSession && controlSession!==sessionId) return false
    return !owner || owner.socketId===socket.id || (!io.sockets.sockets.has(owner.socketId) &&
      (!socket.data.tab || owner.session===sessionId && owner.tab===socket.data.tab))
  }
  function claimTab(socket:Socket,room:Room,id:string,sessionId:string) {
    tabOwners.set(ownerKey(room,id),{socketId:socket.id,tab:socket.data.tab,session:sessionId})
  }
  function present(room:Room,id:string) {
    return !room.departed?.includes(id) && devices(id).some(socket=>attending(socket,room) && permitted(socket,room,id))
  }
  function isActive(room:Room) {
    return !!room.match && !plugin(room).finished(room.match.state)
  }
  function syncPresence(room:Room,time:number,recovering=false) {
    const state=room.match?.state
    if(!state || !isActive(room)) return false
    const policy=plugin(room).roomPolicy
    const connected=room.members.filter(member=>present(room,member.id))
    let changed=false
    if(!connected.length) {
      if(room.emptySince===undefined) {
        room.emptySince=time
        changed=true
      }
      if(state.deadline!==null) {
        const pausedAt=recovering ? Math.max(room.clockAt??0,room.updated) : time
        room.pausedMs=Math.max(0,state.deadline-pausedAt)
        state.deadline=null
        changed=true
      }
    } else {
      if(room.emptySince!==undefined) {
        delete room.emptySince
        changed=true
      }
      if(room.pausedMs!==undefined) {
        state.deadline=time+room.pausedMs
        delete room.pausedMs
        room.clockAt=time
        changed=true
      }
      if(room.clockAt===undefined || time-room.clockAt>=1000) {
        room.clockAt=time
        changed=true
      }
    }
    if(policy?.hostTransferMs) {
      if(!present(room,room.host) && connected.length) {
        if(room.hostOfflineAt===undefined) {room.hostOfflineAt=time;changed=true}
        if(room.departed?.includes(room.host)||time-room.hostOfflineAt>=policy.hostTransferMs) {
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
  function removeExpired(room:Room,time:number) {
    const active=isActive(room)
    const since=active ? room.emptySince : room.lastMemberActivityAt
    if(since===undefined || time-since < (active ? emptyMatchMs : idleRoomMs)) return false
    db.prepare('DELETE FROM rooms WHERE code=?').run(room.code)
    for(const member of room.members) tabOwners.delete(ownerKey(room,member.id))
    if(room.match) db.prepare('DELETE FROM match_control WHERE match_id=?').run(room.match.id)
    for(const member of room.members) io.to(member.id).emit('left',room.code)
    io.to('watch:'+room.code).emit('left',room.code)
    io.in('watch:'+room.code).socketsLeave('watch:'+room.code)
    return true
  }
  function live(room:Room|undefined,time:number) {
    return room && !removeExpired(room,time) ? room : undefined
  }
  // Rooms are the durable source of membership. Departed seats remain occupied.
  const occupiedRows=db.prepare(`SELECT r.body FROM rooms r
    WHERE EXISTS (SELECT 1 FROM json_each(r.body,'$.members') m WHERE json_extract(m.value,'$.id')=?)
    ORDER BY r.updated DESC,r.code`)
  function occupied(id:string,time:number,except?:string) {
    for(const row of occupiedRows.all(id)) {
      const room=JSON.parse(String(row.body)) as Room
      if(room.code!==except && live(room,time)) return room
    }
  }
  function snapshot(room: Room, id: string, spectator=false, readOnly=false): Snapshot {
    const state = room.match?.state
    const game = plugin(room)
    return { code: room.code, host: room.host, gameId: room.gameId, config: room.config, lobby: readOnly?undefined:room.lobby, readOnly,
      members: room.members.map(member => ({...member, online: present(room,member.id)})),
      chat: spectator || readOnly ? [] : room.chat, pausedMs:room.pausedMs,
      ...(spectator?{spectator:true}:game.roomPolicy?.allowActiveLeave?{canLeaveActive:true}:{}),
      match: room.match && state ? {id: room.match.id, phase: state.phase, deadline: state.deadline,
        finished: game.finished(state), public: game.public(state), ...(spectator||readOnly?{}:{private:game.private(state,id),controlVersion:control(room,id)?.version})} : undefined }
  }
  function broadcast(room: Room, finishedNow=false) {
    for (const member of room.members) {
      if(room.departed?.includes(member.id)) {
        if(finishedNow) io.to(member.id).emit('left',room.code)
        for(const socket of devices(member.id)) if(attending(socket,room)) socket.emit('room',snapshot(room,member.id,false,true))
        continue
      }
      for(const socket of devices(member.id)) if(attending(socket,room))
        socket.emit('room',snapshot(room,member.id,false,!permitted(socket,room,member.id)))
    }
    if(plugin(room).roomPolicy?.spectators && room.match) io.to('watch:'+room.code).emit('room',snapshot(room,'',true))
  }
  function changedPresence(id: string) {
    for(const room of rooms()) if(room.members.some(member=>member.id===id)) {
      const time=now()
      if(removeExpired(room,time)) continue
      if(syncPresence(room,time)) save(room)
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
    if (changed && game.finished(state)) {
      room.lastMemberActivityAt=time
      room.members.forEach(member => { member.ready = false })
    }
    return changed
  }
  function tick() {
    const time = now()
    for(const socket of io.sockets.sockets.values()) if(socket.data.expires<=time) {
      socket.emit('session-revoked')
      socket.disconnect(true)
    }
    for (const room of rooms()) {
      if(removeExpired(room,time)) continue
      const presenceChanged=syncPresence(room,time)
      const advanced=advance(room,time)
      if(advanced) room.updated=time
      if(advanced || presenceChanged) {
        const finished=advanced && !isActive(room)
        saveAdvance(room,time,finished)
        broadcast(room,finished)
      }
    }
    db.prepare('DELETE FROM receipts WHERE created<?').run(time - day)
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(time)
  }
  // Initialize legacy rooms before accepting connections so a reconnect cannot erase expiry.
  const startedAt=now()
  for(const room of rooms()) {
    if(removeExpired(room,startedAt)) continue
    room.lastMemberActivityAt??=startedAt
    syncPresence(room,startedAt,true)
    save(room)
  }
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
  const auth=accounts(db,app,{cookieName,secure:options.secure,now,revoked(ids) {
    for(const socket of io.sockets.sockets.values()) if(ids.includes(socket.data.session)) {
      socket.emit('session-revoked')
      socket.disconnect(true)
    }
  }})
  const {session}=auth
  app.get('/api/catalog', (_req,res) => res.json([...games.values()].map(game => ({
    id:game.id, name:game.name, spectators:game.roomPolicy?.spectators, min:game.minPlayers, max:game.maxPlayers, settings:game.settings, defaults:game.defaults,
  }))))
  function canResume(room:Room,id:string) {
    const game=games.get(room.gameId)
    return !!(game?.roomPolicy?.resumeFromLobby && game.version===room.version && room.match &&
      !game.finished(room.match.state) && room.members.some(member=>member.id===id))
  }
  app.get('/api/occupied-room',(req,res)=>{
    const current=session(req.headers.cookie)
    if(!current) return res.status(401).json({error:'请先登录'})
    const room=occupied(current.profile.id,now())
    return res.json(room?{code:room.code,name:plugin(room).name}:null)
  })
  app.get('/api/resumable-matches',(req,res)=>{
    res.set('Cache-Control','no-store')
    const current=session(req.headers.cookie)
    if(!current) return res.status(401).json({error:'请先登录'})
    return res.json(rooms().filter(room=>canResume(room,current.profile.id) && live(room,now())).sort((a,b)=>b.updated-a.updated)
      .map(room=>({gameId:room.gameId,name:plugin(room).name,code:room.code,matchId:room.match!.id,
        takeover:!!control(room,current.profile.id) && control(room,current.profile.id)?.sessionId!==current.id})))
  })
  app.get('/api/history',(req,res)=>{
    const current=session(req.headers.cookie)
    if(!current) return res.status(401).json({error:'请先登录'})
    auth.touch(current.id)
    const id=current.profile.id
    const offset=typeof req.query.offset==='string' && /^\d{1,8}$/.test(req.query.offset)?Number(req.query.offset):0
    const rows=db.prepare(`SELECT m.* FROM match_records m JOIN match_participants p USING(match_id)
      WHERE player_id=? ORDER BY finished_at DESC,match_id DESC LIMIT 21 OFFSET ?`).all(id,offset)
    const totals=db.prepare(`SELECT m.game_id,COUNT(*) AS played,SUM(p.outcome='win') AS won,
      MAX(p.score) AS best_score FROM match_records m JOIN match_participants p USING(match_id)
      WHERE p.player_id=? GROUP BY m.game_id`).all(id)
    const participants=db.prepare(`SELECT player_id,nickname_snapshot,score,rank,outcome
      FROM match_participants WHERE match_id=? ORDER BY rank,nickname_snapshot,player_id`)
    res.json({totals,more:rows.length>20,matches:rows.slice(0,20).map(row=>{
      const {result_json,...match}=row
      return {...match,result:JSON.parse(String(result_json)),players:participants.all(row.match_id!)}
    })})
  })
  app.get('/api/me', (req,res) => res.json(session(req.headers.cookie)?.profile ?? null))
  app.put('/api/profile', (req,res) => {
    const current = session(req.headers.cookie)
    if (!current) { res.status(401).json({error:'请先登录'}); return }
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
    const avatar = req.body?.avatar
    if(!validProfile(name,avatar)) {
      res.status(400).json({error:'昵称或头像无效'}); return
    }
    const profile = {id:current.profile.id,name,avatar}
    const affected = rooms().filter(room => room.members.some(member => member.id === profile.id) && live(room,now()))
    db.exec('BEGIN IMMEDIATE')
    try {
      db.prepare('UPDATE player_profiles SET nickname=?,avatar_key=?,updated_at=? WHERE player_id=?').run(name,'emoji-'+avatar,now(),profile.id)
      for (const room of affected) {
        Object.assign(room.members.find(member => member.id === profile.id)!,profile)
        save(room)
      }
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    affected.forEach(room=>broadcast(room))
    res.json(profile)
  })
  function execute(current:Session, socket:Socket, cmd:Command) {
    const {profile}=current
    const time = now()
    const id = profile.id
    const entered=cmd.room ? live(load(cmd.room),time) : undefined
    const activeControl=entered && control(entered,id)
    const switching=cmd.type==='takeover'
    const joining=cmd.type==='join'
    if(entered && !joining && !switching && cmd.type!=='sync' && !permitted(socket,entered,id))
      throw new Error('本标签页没有操作权，请先接管操作')
    if(cmd.type!=='create' && cmd.type!=='join' && !switching &&
       (!entered || !attending(socket,entered))) throw new Error('请先加入房间')
    if(entered && isActive(entered) && !['join','takeover','sync'].includes(cmd.type) &&
       (!activeControl || cmd.match!==entered.match?.id || cmd.controlVersion!==activeControl.version))
      throw new Error('操作权或对局已变化，请同步后重试')
    const key = [current.id,cmd.room??'',entered?.match?.id??'',switching?'takeover':activeControl?.version??0,cmd.id].join(':')
    const receipt = db.prepare('SELECT body FROM receipts WHERE key=?').get(key)
    if (receipt) {
      const reply=JSON.parse(String(receipt.body)) as Reply
      const code=reply.ok?reply.room:undefined
      if(code && !live(load(code),time)) throw new Error('房间不存在或已过期')
      return reply
    }
    const acquiring=cmd.type==='create' || Boolean(joining && entered && !entered.members.some(member=>member.id===id))
    if(acquiring) {
      const existing=occupied(id,time,entered?.code)
      if(existing) return {ok:false,error:'你已占据房间 '+existing.code+' 的正式席位',occupiedRoom:existing.code}
    }
    let room: Room | undefined
    let removed: string[] = []
    let dissolved = false
    let finishedNow = false
    let newControl=false
    let ownsTab=cmd.type==='create'
    let retiredMatch:string|undefined
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
      room = entered
      if (!room) throw new Error('房间不存在或已过期')
      if (cmd.type==='join' && cmd.data && typeof cmd.data==='object' && Object.hasOwn(cmd.data,'waitingMembers')) {
        const {gameId,waitingMembers}=record(cmd.data)
        if (gameId!==room.gameId || room.match || waitingMembers!==room.members.length)
          throw new Error('等待房间的游戏、对局或人数已变化')
      }
      if (advance(room,time)) {
        room.updated = time
        const finished=!isActive(room)
        saveAdvance(room,time,finished)
        broadcast(room,finished)
      }
      const game = plugin(room)
      const member = room.members.find(value => value.id === id)
      const state = room.match?.state
      const active = !!state && !game.finished(state)
      if (cmd.type === 'join' || switching) {
        if(switching && (!member || (room.match && cmd.match!==room.match.id))) throw new Error('原对局或席位已变化')
        if (cmd.data && typeof cmd.data==='object' && 'resume' in cmd.data && cmd.data.resume===true && !canResume(room,id))
          throw new Error('对局无法恢复')

        if (!member) {
          if (active) throw new Error('对局已开始')
          if (room.members.length >= (game.roomPolicy?.capacity(room.config) ?? game.maxPlayers)) throw new Error('房间已满')
          if (room.match) { retiredMatch=room.match.id; delete room.match; room.chat = [] }
          room.members.push({...profile,ready:false})
        }
        ownsTab=switching || canAttach(socket,room,id,current.id)
        if(room.match && ownsTab && (!activeControl || switching)) newControl=true
        if(ownsTab && room.departed?.includes(id)) {
          room.departed=room.departed.filter(value=>value!==id)
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
              room.members.some(value => !value.ready || !present(room!,value.id))) throw new Error('请等待所有玩家在线并准备')
            const players = room.members.map(value => value.id)
            if (game.canStart && !game.canStart(players,room.config)) throw new Error('未满足游戏开局条件')
            const lobby = game.lobby
            const selections = room.lobby
            if (lobby && players.some(player=>!lobby.ready(selections?.[player]))) throw new Error('未完成游戏准备选项')
            retiredMatch=room.match?.id
            room.match = {id:randomUUID(),startedAt:time,state:game.start(players,room.config,{now:time,random},room.lobby)}
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
            if(active && cmd.type==='leave' && game.roomPolicy?.allowActiveLeave) {
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
            retiredMatch=room.match?.id
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
              finishedNow=game.finished(state)
              if (finishedNow) room.members.forEach(value => { value.ready = false })
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
      if(acquiring) {
        // Repeat under SQLite's writer lock before saving a new membership.
        const conflict=occupied(id,time,room.code)
        if(conflict) {
          db.exec('ROLLBACK')
          return {ok:false,error:'你已占据房间 '+conflict.code+' 的正式席位',occupiedRoom:conflict.code}
        }
      }
      room.updated = time
      room.lastMemberActivityAt=time
      const obsolete=retiredMatch ?? (dissolved?room.match?.id:undefined)
      if(obsolete) db.prepare('DELETE FROM match_control WHERE match_id=?').run(obsolete)
      if(room.match && newControl) {
        db.prepare(`INSERT INTO match_control VALUES (?,?,?,?,?)
          ON CONFLICT(match_id,player_id) DO UPDATE SET session_id=excluded.session_id,
          control_version=match_control.control_version+1,updated_at=excluded.updated_at`)
          .run(room.match.id,id,current.id,1,time)
      }
      if(room.match && cmd.type==='start') for(const member of room.members) {
        const chosen=member.id===id?socket:devices(member.id).find(peer=>attending(peer,room!) && tabOwners.get(ownerKey(room!,member.id))?.socketId===peer.id)
        db.prepare('INSERT INTO match_control VALUES (?,?,?,?,?)').run(room.match.id,member.id,chosen!.data.session,1,time)
      }
      if(finishedNow) recordResult(room,time)
      if (dissolved) db.prepare('DELETE FROM rooms WHERE code=?').run(room.code)
      else save(room)
      db.prepare('INSERT INTO receipts VALUES (?,?,?)').run(key,JSON.stringify(reply),time)
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    const previous=socket.data.seated as string|undefined
    if(joining||cmd.type==='create'||switching) socket.data.seated=room.code
    if(ownsTab) claimTab(socket,room,id,current.id)
    for(const target of removed) {
      if(!room.members.some(member=>member.id===target) || dissolved) tabOwners.delete(ownerKey(room,target))
      for(const peer of devices(target)) if(attending(peer,room)) delete peer.data.seated
      io.to(target).emit('left',room.code)
    }
    if(!dissolved && syncPresence(room,time)) save(room)
    if(previous && previous!==room.code && socket.data.seated!==previous) changedPresence(id)
    if (!dissolved) broadcast(room,finishedNow)
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
    socket.data.session = current.id
    socket.data.expires = current.expires
    const tab=socket.handshake.auth.tab
    if(typeof tab==='string' && /^[a-f0-9-]{36}$/.test(tab)) socket.data.tab=tab
    next()
  })
  io.on('connection', socket => {
    const id = socket.data.user as string
    socket.join(id)
    const sockets = online.get(id) ?? new Set<string>()
    sockets.add(socket.id)
    online.set(id,sockets)
    socket.on('command', (input: unknown, ack: unknown) => {
      if (typeof ack !== 'function') return
      let reply: Reply
      try {
        const current = session(socket.request.headers.cookie)
        if (!current || current.id !== socket.data.session) throw new Error('会话已失效')
        auth.touch(current.id)
        const data = record(input)
        if (data.v !== protocolVersion || typeof data.id !== 'string' || !/^[\w-]{8,80}$/.test(data.id) ||
          typeof data.type !== 'string') throw new Error('协议或请求无效')
        const rate = rates.get(id)
        const time = now()
        if (!rate || time-rate.at >= 1000) rates.set(id,{at:time,count:1})
        else if (++rate.count > 20) throw new Error('操作太快')
        if(data.type==='watch') {
          const room=typeof data.room==='string'?live(load(data.room),time):undefined
          if(!room?.match || !plugin(room).roomPolicy?.spectators || room.members.some(member=>member.id===id)) throw new Error('此房间不能旁观')
          for(const channel of socket.rooms) if(channel.startsWith('watch:')) socket.leave(channel)
          if(socket.data.seated) {
            delete socket.data.seated
            changedPresence(id)
          }
          socket.join('watch:'+room.code)
          socket.emit('room',snapshot(room,id,true))
          ack({ok:true,room:room.code})
          return
        }
        if(data.type==='unwatch' || data.type==='detach') {
          for(const channel of socket.rooms) if(channel.startsWith('watch:')) socket.leave(channel)
          if(data.type==='detach' && socket.data.seated) {
            delete socket.data.seated
            changedPresence(id)
          }
          ack({ok:true})
          return
        }
        reply = execute(current,socket,data as Command)
        if (reply.ok && reply.room) {
          if(data.type==='join'||data.type==='create'||data.type==='takeover') for(const channel of socket.rooms) if(channel.startsWith('watch:')) socket.leave(channel)
          const room = live(load(reply.room),time)
          if (room?.members.some(value => value.id === id) && attending(socket,room)) socket.emit('room',snapshot(room,id,false,!permitted(socket,room,id)||!!room.departed?.includes(id)))
        }
      } catch (error) {
        reply = {ok:false,error:error instanceof Error ? error.message : '服务器错误'}
      }
      ack(reply)
    })
    socket.on('disconnect', () => {
      sockets.delete(socket.id)
      if (!sockets.size) { online.delete(id); rates.delete(id) }
      if(socket.data.seated) changedPresence(id)
    })
  })
  if (options.assets) app.use(express.static(options.assets))
  return { server, tick, async close() {
    clearInterval(timer)
    for(const room of rooms()) {
      if(isActive(room) && room.members.some(member=>present(room,member.id))) {
        room.clockAt=now()
        save(room)
      }
    }
    await io.close()
    db.close()
  } }
}
