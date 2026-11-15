# Web 0.1 验收记录

环境为 Windows、Node.js 24.17.0、npm 11.13.0、Microsoft Edge 157.0.4341.46。执行时间为 2026-11-15 19:00–19:20（UTC+08:00）。

| 命令 | 退出码 | 结果 |
| --- | --- | --- |
| `npm.cmd install` | 0 | PASS，新工作区完成依赖安装并生成锁文件 |
| `npm.cmd test` | 0 | PASS，13 个规则、插件和服务集成用例 |
| `npm.cmd run check` | 0 | PASS，TypeScript 和 Vue 类型检查 |
| `npm.cmd run build` | 0 | PASS，Vite 生产构建 |
| `npx.cmd playwright test` | 0 | PASS，Edge 三个彼此独立的浏览器上下文，含 390 px 移动视口 |
| `cmd.exe /d /c .\start.cmd` | 0 | PASS，默认回环端口返回首页 HTTP 200 和真实游戏目录 |
| `cmd.exe /d /c .\stop.cmd` | 0 | PASS，项目服务退出，端口释放 |

规则用例覆盖四级夜晚裁决、随机身份、随机摧毁范围、超时补选、不可修改、弃票、重投、正确和错误指认、九夜终局。服务用例使用真实 HTTP、Socket.IO 和 SQLite，校验来源、房主权限、第四人拒绝、跨房访问、第二插件注册、夜晚保密和聊天限速。恢复用例关闭服务和数据库后重新打开同一数据库，以注入时钟模拟停机跨过截止时间，验证只处理一根蜡烛、下一阶段沿用原时间锚点、重放幂等和并发推进。

浏览器用例使用真实生产构建与独立监听端口，覆盖房间码和邀请链接、三人准备、刷新重连恢复角色、自然等待 30 秒超时、白天公聊、指认和重投、终局、拒绝未重新准备的重赛，以及新局九根蜡烛重置。

初次集成测试读取另一客户端的帧早于远端快照到达，改用显式同步后稳定通过。初版启停入口受 PowerShell 执行策略限制，现使用项目专属的本地命名管道关闭 Node 进程，启停复测通过。

| 检查 | 结果 |
| --- | --- |
| Sakura FRP、实际 TLS 证书及公网 WSS | NOT RUN，未配置公网入口 |
| 实体手机与移动网络切换 | NOT RUN，已验收桌面 Edge 的移动视口 |
| Capacitor APK、Tauri EXE 及跨端同房 | NOT RUN，属于后续交付 |

原始输出保存在 Git 忽略的 `work/logs`。

## 游戏规则面板复验

`npm.cmd test`（13/13）、`npm.cmd run check`、`npm.cmd run build`、`npx.cmd playwright test` 均退出 0。三会话回归新增桌面等候房间打开规则、Escape 关闭并恢复焦点，以及 390 px 对局打开并关闭规则。

## 美术升级复验

2026-11-15，使用同一 Windows、Node.js 与 Edge 环境。 `npm.cmd test`（13/13）、`npm.cmd run check`、`npm.cmd run build`、`npx.cmd playwright test` 均退出 0。浏览器验证封面解码并再次完成真实三人联机。检查了大厅和对局的桌面截图、390 px 对局截图。设置 `GAMES_SCREENSHOTS=1` 后重跑浏览器验收可在 `work/logs` 重建截图。
