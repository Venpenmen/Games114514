# HTTP 和 Socket.IO 协议 v1

- `GET /api/catalog` 读取注册的游戏和设置选项。 `GET /api/me` 返回当前游客资料或 null。
- `POST /api/session` 签发 HttpOnly Cookie。 `PUT /api/profile` 接收 `{name, avatar}`。写操作校验 Origin。
- Socket.IO 通过 Cookie 认证。在 `command` 事件发送 `{v, id, type, room?, match?, phase?, data?}`，收到 `{ok:true,room?}` 或 `{ok:false,error}`。同一个游客在 24 小时内重试成功的操作时复用原 id。
- 通用命令包括 `create`（gameId）、`join`、`sync`、`ready`（布尔值）、`config`（注册的配置）、`start`、`kick`（成员 id）、`leave`、`dissolve`、`chat`（字符串）、`game`（插件命令）。对局内命令携带当前 match 和 phase。
- `room` 推送成员可见的房间快照，附带服务端绝对截止时间、公开投影及接收者自己的投影。 `left` 推送失效的房间码。服务器重启或客户端重连后可用 `sync` 获取最新快照。

后续 Capacitor 和 Tauri 应在同一 HTTPS 源使用现有 v1 协议和会话。若选择本地包资源源，需要单独设计受控的跨源认证并做三端同房测试。


### 插件大厅选项

协议 v1 房间快照可带 lobby，按成员 ID 保存已公开的插件大厅选择。选用此扩展的插件可处理 type=lobby 命令。平台只能更新当前认证成员的选择，选择变更取消该成员的准备，且比赛中拒绝修改。骰子狼人杀接收 data={ portrait: 0 到 5 的整数 }，开局后将形象锁入比赛快照。比赛内命令仍使用 type=game，data.kind 为 act 或 vote，data.value 为行动增减量或投票点数。
