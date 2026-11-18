# Game 03 独立断点

CURRENT_STAGE: NINJA-P7 — 隔离版交付；部分艺术细节及边缘用例见需求矩阵。
LAST_PASS: 独立基线／199 项追踪；规则 55/55；全量 93/93；浏览器 7/7；类型检查、Vite 生产包、3213 首页与目录 HTTP 200。
BRANCH: feature/night-of-the-ninja
BASE: a21eeaced3b218fa299a8e986c5d08eb3a316b75
HEAD: 本文件所属提交（`git rev-parse HEAD`）；本地命令证据在 work/logs/ninja-head.txt。
TEST_PORT: 3213（仅回环，人工验收）；自动化 3197／3198／3214／3215
TEST_DB: work/logs/ninja-preview.db；自动化以各自数据库运行。
WORKTREE: Game 03 专用目录；前两款游戏沿用原插件，公共房间能力仅由 Game 03 启用。
BLOCKERS: 概念参考图未定位，已依据冻结文档重建风格。公网、实体手机与高延时同步未验证。正式 3199 初查 200，收尾只读探测连接失败；本任务无启停或迁移。
NEXT_ACTION: 打开 http://127.0.0.1:3213 验收，依据 docs/games/night-of-the-ninja/TRACEABILITY.md 逐项复核 A-3.05、A-4.03、A-4.11 与部分验证条目。

SOLO_BOTS: 3213 混合试玩已启用。基于 785b89c，复用现有游客注册、Socket.IO 命令和真实浏览器验收；4／11 人混合比赛 2/2 到冠军，启停脚本实测通过。NEXT_ACTION: 在 3213 创建新《忍者之夜》房间，运行 ninja-bots.cmd 填充。

P20: DONE · 可验收候选，基线 a08b996。规则 55/55、全量 93/93、浏览器 9/9、类型检查与候选构建通过。3216 独立预览已启动，3213 原预览仍运行。商人、掘墓人两项未做逐步骤浏览器专项，覆盖详见测试报告。NEXT_ACTION: 打开 http://127.0.0.1:3216 并按 README 验收或回退。

BOT_MANAGER_2026-11-16: 原 3213、3216 机器人组均已通过原 CLI 停止，机器上未发现 ninja-bots-cli.ts 活动进程，两个试玩服务继续运行。新 `ninja-bot-manager.cmd` 提供常驻交互菜单、端口选择、房间码、1～10 人自定义数量与统一/逐人三级行为策略；原 `ninja-bots.cmd` 改为弃用提示。新管理器逻辑 `scripts/ninja-bots-manager.ts`；机器人基础实现最小改动 `scripts/ninja-bots.ts`。3216 在新建测试房间 135732 实测 2 名难度 1/3 机器人加入、准备、退出后席位 3→1，退出码 0；npm check、93/93 测试已通过。后续完整浏览器机器人回归见日志。NEXT_ACTION: 双击 ninja-bot-manager.cmd，创建目标端口新房间并在常驻菜单中配置。
P20.1 DONE · 基线 5341775，圆桌和底部手牌就绪。93/93、浏览器五项分批通过、3216 独立构建就绪。复验见 TEST_REPORT.md。
P20.2 DONE · 基线 4f29de7，93/93、独立浏览器 3/3、实际 3216 完整赛 1/1，保留候选数据库。
P20.3 DONE · 按轮情报、名片席位与 8 秒私人提示。93/93、独立浏览器 3/3、3216 实测 1/1。

CLASSIC_BOTS_2026-11-16: 已增加 scripts/classic-bots.ts，复用真实 Socket.IO 游客连接，为诡吹灯/骰子狼人杀提供1~2名随机/普通/困难机器人。原 ninja-bot-manager.cmd 统一支持三款游戏与3216/3213端口，增加管理器父进程存活检查和关闭时取消加入/停止机器人。node --test tests/classic-bots.test.ts 实测1真人自动化客户端+2机器人分别打完诡吹灯(9次真人操作)与骰子狼人杀(45次真人操作)，成功；npm.cmd run check=0；npm.cmd test=93/93；独立 CMD 子进程在关闭CMD后4秒内退出。3227独立数据库测试，不修改3216服务或正式数据。NEXT_ACTION: 通过 ninja-bot-manager.cmd 选择游戏/端口/房间进行真人手动验收，特别检查关闭CMD后已开局机器人离线状态。
P20.4 DONE · 3216 权威演出与终局复盘，94/94、独立浏览器 5/5、3216 1/1。旧存档可恢复，历史缺项标注。

BOT_AUTO_READY_2026-11-16: scripts/ninja-bots.ts 与 scripts/classic-bots.ts 在比赛正式 finished 后检测本人未准备，自动重新选择必要肖像（忍者之夜/骰子狼人杀）并发送 ready=true，禁止自动 start，添加去重、失败重试、断线/停止取消计时。tests/bots-restart.test.ts 用真实 Socket.IO/隔离3228服务器验证三款游戏：完成→机器人自动准备→同房间由真人房主开始下一局，全部通过（1/1测试覆盖3游戏）。诡吹灯另通过真实完整比赛后跨局重开；骰子狼人杀真实全局测试一次在90s截止前未产生冠军（不是机器人准备失败），历史完整对局曾通过。npm.cmd run check EXIT=0；npm.cmd test 96/96；3216 HTTP 200。未重启/改动现有3216服务。NEXT_ACTION: 关闭旧机器人管理器并重新启动最新脚本，建议新建房间人工验证三游戏连续两局；已有其他人正在编辑的 MatchReplay/View/timeline 与 tests/ninja-events/online 未改动。

UX-P0: DONE · 基线 e5a03da；保留未跟踪模拟结果。公共导航、指南与房间演出倍率；3216 尚未更动。NEXT_ACTION: 定向实现并在隔离实例验证。
UX-P1-P5: 实现完成；定向 15/15、全量 138/138（退出码 0）；四档倍率、操作时限、真实 Socket.IO 暂离／重启／恢复／大厅结束通知通过。4 人完整比赛、6/8/11 人布局、三款导航／图文指南及骰子动画→结算→续局已实测；旧测试的固定等待已适配权威演出时长。NEXT_ACTION: 完成经典游戏最终复验、只读标签页补验后，确认空闲并备份更新 3216。
UX-P6 DONE · 2026-11-18：15/15 定向、138/138 全量、类型检查与生产构建退出码 0；11 个不同 Edge 用例分批通过（含三款完整比赛、只读标签页、320/390px、6/8/11 人布局）。3216 空房间后在线 SQLite 一致性备份＋旧构建保留，再更新；HTTP/目录/会话/Socket.IO 握手/登录页验证通过，19 账户、19 资料、9 战绩、0 房间保持，integrity_check=ok。备份与健康证据：work/logs/ux-deployment.json、ux-deploy-check.json。NEXT_ACTION: 人工体验 3216 的舒缓速度及指南；P20.8.2 延后，不动 3199/3213/FRP。
