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
