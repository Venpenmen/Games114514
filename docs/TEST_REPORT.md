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

## GC-RULES-1.3

2026-11-15，Windows、Node.js 24、Edge。定向 `node --test games/ghost-candle/engine.test.ts` 19/19，`npm.cmd test` 21/21，`npm.cmd run check`、`npm.cmd run build` 与 `playwright.cmd test` 均退出 0。三会话通过独立回环实例完成一局及重赛。服务集成验证并发提交和同请求重试只结算一次；规则单测覆盖十种行动、完整随机候选、超时补选及双方五根胜利。

平衡模拟直接运行旧版与新版规则引擎。每种策略每版 10,000 局，使用相同 xorshift32 种子序列，诡异均匀随机选完整蜡烛摧毁，白天不发起指认。人类协同同选的胜率从 92.31% 到 100%，独立随机选烛从 0.36% 到 7.98%。这是限定策略下的纯蜡烛模拟。


## GAME 02《骰子狼人杀》

2026-11-16，Windows、Node.js 24、Edge。定向规则测试 11/11，npm.cmd test 32/32，npm.cmd run check、npm.cmd run build、playwright.cmd test 均退出 0。同轮多人处决、秘密选择、自动代投、两轮票型、庄家清场、特殊结束、计分和加赛有定向断言。集成使用真实 Socket.IO 和 SQLite，关闭并重开服务后核对跨局推进、绝对截止时间、票型和积分回执。

浏览器 2/2 通过，两个用例各用三名独立游客。GAME 02 经临时回环服务 http://127.0.0.1:3198 以受控随机源复现五局含两局加赛，比分 5/4/1，验证实际操作保密、聊天、重投、待处决、刷新重连、自动续局后保留上局结算和刷新后的冠军。GAME 01 经 http://127.0.0.1:3197 完整联机和重赛通过。第一次浏览器运行的固定加赛目标未考虑身份重抽，后续用当局当事人显示的点数投票，复验通过。

已查看桌面、390 px 移动和待处决截图，检查骰子六面、点数、动画和减少动态 CSS。截图保存在 work/logs/dice-desktop.png、dice-mobile.png、dice-condemned.png、dice-champion.png。生产随机源仍为服务器 randomInt。

常驻本地入口 3199 的启动动作被执行策略拒绝，临时浏览器验收服务结束后停止。按 README 的独立工作树方式可手动启动。实体手机、公网和原生端均未执行。


## P11 公共房间聊天

Windows、Node.js 24、Edge。定向 node --test apps/web/components/chat-history.test.ts 通过 1/1。npm.cmd test 通过 36/36，npm.cmd run check 与 npm.cmd run build -- --outDir work/logs/chat-dist 均退出 0。全量计入工作树中已有的网络测试，其源码未混入聊天提交。

npx.cmd playwright test -c work/logs/chat-playwright.config.ts 以独立 3197/3198 端口、独立数据库和独立构建目录运行，两款游戏各三会话，2/2 通过。浏览器验证桌面与 390 px、无编号、昵称字重、长文本与 HTML 文本安全、历史位置、未读计数、手动或按钮跳转、只读快照、自己发送成功、回执先于快照、限流失败保留草稿、刷新恢复、阶段禁言、重赛清空和冠军禁言。配置与日志保存在 work/logs。正式进程未重启，未执行公网和实体手机复验。
