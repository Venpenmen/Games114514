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


## P12 游戏内导航与结果提醒

Windows、Node.js 24、Edge。npm.cmd test 通过 36/36（包含工作树中已有的网络测试）；npm.cmd run check、npm.cmd run build -- --outDir work/logs/result-dist、npx.cmd playwright test -c work/logs/result-playwright.config.ts 均退出 0。行为定向断言随真实三会话浏览器用例运行。

独立端口 3197/3198 与临时 SQLite 验收 4/4。覆盖大厅与房间入口可见性、刷新、离房、人类和诡异各胜一局、同标签页去重、狼人杀多人获胜和无人获胜、旧详情打开时延迟提示、续局自动关闭与焦点脱离、加赛、冠军和历史聊天位置。截图见 work/logs/ghost-result-true-0.png、ghost-result-false-1.png、dice-mobile-result.png 和 dice-champion-result.png。测试实例已停止；正式 3199 目录 HTTP 200，原进程未重启。公网、实体手机及 SUMMARY 最后数秒专门刷新未独立复验。

## P13 《诡吹灯》三人同选摧毁优先（2026-11-16）

规则变更：两名人类同选同根、诡异选同根并执行 DESTROY 时，该根变为 DESTROYED；其他两人同选仍点亮。服务端规则、前端游戏规则弹窗及规则文档已同步。定向 `node --test games/ghost-candle/engine.test.ts` 原 19/19 通过；新增连续五夜三人同选摧毁、超时三人重合的验证。全量 `npm.cmd test` 37/37，`npm.cmd run check` 及 `npm.cmd run build` 成功。保留未提交的网络、Cookie 与启停配置改动。本轮不包含前端布局与语言简化改版。

P13 补充验收：`npx.cmd playwright test -c work/logs/result-playwright.config.ts` 两款游戏三会话浏览器联机 4/4 通过（1.7 分钟）。项目服务管理脚本受控停止并启动原 3199 服务，启动前后 `/api/catalog` 返回 HTTP 200；部署后首页及游戏目录 HTTP 200，两个插件均存在，构建 Rules JS 资源已确认包含新的三人同选摧毁判定文字。运行配置仍为 PORT=3199、PUBLIC_ORIGIN=auto、DATABASE_PATH=work/logs/dice-preview.db、NODE_ENV=production；未更换或清空数据库，未修改 FRP，公网/实体手机未独立复验。

## P14 《诡吹灯》玩家规则弹窗重写（2026-11-16）

仅修改前端 `games/ghost-candle/Rules.vue` 的玩家可读说明和原生 CSS 图形化示例：两阵营胜利条件、夜晚操作 3 步、5 组具体人类/诡异选择与结果卡片、白天讨论/寻找/指认流程、超时与隐私提示。重点明确 GC-RULES-1.4 的三人同选且诡异摧毁时判为摧毁。保留服务端引擎、协议、数据库、规则技术文档与其他游戏界面。`npm.cmd run check` 退出 0，`npm.cmd test` 37/37，`npm.cmd run build` 退出 0。使用独立测试端口、数据库的 `npx.cmd playwright test -c work/logs/result-playwright.config.ts` 测试 4/4 通过，含《诡吹灯》三会话两阵营终局、规则弹窗移动端宽度和关闭，以及《骰子狼人杀》回归。公网与实体手机未执行。

## P15 《骰子狼人杀》图解规则弹窗（2026-11-16）

仅重写 `games/dice-werewolf/Rules.vue` 的玩家可读文案和弹窗内 CSS 图示，按三名玩家与六个点数、秘密身份、行动阶段、生命值、投票处决、三种得分结局（含两点数特殊终局）、连续三轮无处决、目标积分与加赛组织。所有规则依据 `docs/games/dice-werewolf/RULES.md` 和现有 `engine.ts`，未修改裁决、协议、其他游戏、数据库与 FRP。`npm.cmd run check` 通过；`npm.cmd test` 37/37；`npm.cmd run build` 退出 0。浏览器隔离回归首次因 `work/logs/result-dist` 是旧构建而使新文案断言失败，确认并使用 `robocopy dist work/logs/result-dist /MIR` 同步后重新运行 `npx.cmd playwright test -c work/logs/result-playwright.config.ts` 结果 4/4 通过（1.6 分钟），含 390px 移动视口的新规则标题、投票案例、积分加赛和弹窗关闭断言。公网/实体手机未单独验证。


## P16 双游戏响应式布局

Windows、Node.js 24、Edge。npm.cmd run check、npm.cmd test（37/37）、npm.cmd run build -- --outDir work/logs/p16-dist、npx.cmd playwright test -c work/logs/p16-playwright.config.ts（4/4）均退出 0。独立 3197/3198 首页均引用 index-CkYFAhrm.js，测试数据库与正式数据库隔离；测试后两端口停止监听。

测试由各游戏三个独立浏览器会话驱动。检查 320×700、360×780、375×812、390×844、430×932、740×390、768×1024、1280×720、1366×768、1920×1080。以 CSS 模拟 125%/150% 缩放，并以 390×420 模拟键盘压缩视口。验证固定入口、关闭后新增未读、历史、跨阶段草稿、聊天回执顺序、两种阵营结算、狼人杀普通、加赛、冠军、无人获胜。图片见 work/logs/p16-*.png 和现有结算截图。实际手机键盘、浏览器原生缩放及抽屉打开时主动断网未独立实测。

预检正式 SQLite 无活跃对局。备份、停服、复制与重启的正式切换命令被提交前的自动执行策略拒绝，未执行。3199 保持原 PID 30808，首页 HTTP 200，仍引用 index-CIkJN1EV.js。P16 正式部署和公网复验未执行。


## P20.6 公共房间生命周期与离线状态

- `npm.cmd run check` 退出 0，`npm.cmd test` 107/107，退出 0。覆盖 30/60 分钟边界、第 59 分钟恢复、重启续算、旧房间安全初始化、旁观者在线时清理、过期房间不可访问和恢复入口失效。真实 Socket.IO 验证《诡吹灯》部分提交、《骰子狼人杀》续局结算及《忍者之夜》权威演出的暂停与恢复。
- `npm.cmd run build -- --outDir work/logs/p20-6-dist` 退出 0。Playwright 指向该构建，使用独立本地端口与数据库。最终 `playwright.cmd test online.spec.ts --workers=2` 8/8，退出 0，包含三款游戏与《忍者之夜》4/6/8/11 人布局。另一次运行中 `ninja-events.spec.ts` 通过，验证交换和镜僧裁决时序。初次《诡吹灯》桌面按钮受新增状态栏挤压，调整到页头后，两种阵营完整对局均通过复验。桌面和手机视口均使用 Edge。
- 3216 通过 `ninja-p20.cmd` 停止和启动，使用原 `work/logs/ninja-p20/preview.db`，数据库创建时间一致。健康检查 HTTP 200，Edge 实际加载新版 `index-BjNWNDTZ.js`，验证三游戏目录、游客创建和解散房间及等待区头像标签。未操作 3199、3213 或 FRP。未做实体手机与公网验收。


## P20.6.1 经典游戏暂离与继续对局

- `npm.cmd run check`、`npm.cmd test`（107/107）、`npm.cmd run build -- --outDir work/logs/p20-6-1-dist` 均退出 0。真实 Socket.IO 覆盖全员主动暂离、剩余倒计时、身份与已提交操作、非零积分、陌生会话拒绝、多房间、到期与解散。
- 独立端口及数据库的 Edge 定向联机 4/4，退出 0。覆盖《诡吹灯》两种终局、《骰子狼人杀》与《忍者之夜》回归。新增暂离按钮一度使《诡吹灯》1280×720 的主要操作按钮低于首屏约 4 像素，收紧短桌面视口页头间距后通过原布局断言。
- 仅更新 3216，原 SQLite 文件创建时间一致，HTTP 200。Edge 实际加载 `index-Bi5sDczm.js` 并验证大厅和认证后的恢复列表。隔离测试服务已停止。
