# HTTP 和 Socket.IO 协议 v1

- `GET /api/catalog` 读取注册的游戏和设置选项。 `GET /api/me` 返回当前游客资料或 null。
- `POST /api/session` 签发 HttpOnly Cookie。 `PUT /api/profile` 接收 `{name, avatar}`。写操作校验 Origin。
- Socket.IO 通过 Cookie 认证。在 `command` 事件发送 `{v, id, type, room?, match?, phase?, data?}`，收到 `{ok:true,room?}` 或 `{ok:false,error}`。同一个游客在 24 小时内重试成功的操作时复用原 id。
- 通用命令包括 `create`（gameId）、`join`、`sync`、`ready`（布尔值）、`config`（注册的配置）、`start`、`kick`（成员 id）、`leave`、`dissolve`、`chat`（字符串）、`game`（插件命令）。对局内命令携带当前 match 和 phase。
- `room` 推送成员可见的房间快照，附带服务端绝对截止时间、公开投影及接收者自己的投影。 `left` 推送失效的房间码。服务器重启或客户端重连后可用 `sync` 获取最新快照。

后续 Capacitor 和 Tauri 应在同一 HTTPS 源使用现有 v1 协议和会话。若选择本地包资源源，需要单独设计受控的跨源认证并做三端同房测试。
