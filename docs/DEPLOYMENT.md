# 独立 Sakura FRP 与 TLS 部署

先在 Windows 本地完成三会话验收。计划上线时，为本项目单独申请隧道和 HTTPS 域名，转发到实际使用的回环端口。建立新入口前核对端口及费用。已有 EMS 配置无需改动。

将 `PUBLIC_ORIGIN` 设为浏览器访问的完整 HTTPS Origin（无尾部斜杠），将 `NODE_ENV` 设为 production。代理保留客户端 Origin，支持 Socket.IO 的 HTTP 长轮询及 WebSocket Upgrade，代理空闲超时应大于 Socket.IO 心跳周期。浏览器通过同一 HTTPS 地址访问页面、API 和 Socket.IO。保持 SQLite 可持久写入，备份时使用 SQLite 一致性备份或停服后复制数据库。

部署验收依次检查 HTTPS 证书链和主机名、Secure Cookie、Socket.IO WSS 升级与心跳、三名独立游客同房、移动网络切换和恢复。公网和实体设备的结果在实际执行后记录。
