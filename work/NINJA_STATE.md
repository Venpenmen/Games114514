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
