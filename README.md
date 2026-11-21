# Games114514 · 多人联机小游戏合集

Vue 3 / TypeScript / Node.js / Socket.IO / SQLite 多人游戏平台，公共账户、房间与游戏插件分离。

## 本次发布：P20.8.2

由已验收 `8bff510` 与现有 main 整合。三款游戏及账户、战绩、房间恢复、多标签操作权、权威演出、桌面与手机横屏界面均纳入本次发布。

| 游戏 | 人数 | 内容 |
|---|---|---|
| 诡吹灯 | 3 | 隐藏阵营、蜡烛、讨论与指认；GC-RULES-1.3 |
| 骰子狼人杀 | 3 | 隐藏骰点、红黑操作、投票、积分及加赛 |
| 忍者之夜 | 4–11 | 两步轮抽、五阶段技能、身份、荣誉与冠军；P20.8.2/P4 |

## 运行

需要 Node.js 24、npm。全新开发环境：

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd start
```

`.env.example` 为通用参考。`DATABASE_PATH` 指向本实例自己的数据库，`GAMES_WEB_ASSETS` 指向已构建资源。默认本地端口3100；实际3199生产实例沿用既有动态同源/FRP配置和原数据库绝对路径。

`start.cmd` 启动已经构建的版本，不再在启动过程中无条件构建混合工作区；`stop.cmd` 仅停止本工作树实例。已有生产部署使用隔离发布工作树与独立运行配置，见 [发布说明](docs/RELEASE_P2082.md)。

## 验收边界

手机横屏、4/6/8/9/11席位、商人、变形者、多人获奖、双列出牌抽屉、聊天与七图指南已有隔离证据；桌面抽屉已在3216经用户人工验收。P5 Android实体手机键盘、触控、全屏、方向锁定、工具栏、公网和重连仍须综合验收，不把浏览器视口模拟标为真机通过。

稳定的既有机器人辅助脚本保留。未提交的TDM测试管理、Gen7/Qwen/ML训练及其他实验不包含在本发布版本；测试专用能力不能用于生产。

## 文档

- [平台与部署](docs/DEPLOYMENT.md)
- [游戏规则](docs/games/night-of-the-ninja/RULES.md)
- [P20.8.2断点](work/P2082_STATE.md)
- [后续路线图](work/NINJA_UPDATE_ROADMAP.md)

开发和研究继续在独立工作树进行；main包含已发布产品，不要求将实验数据、模型或测试数据库入库。

## Production release P20.8.2
3199 runs the isolated verified release. The root machine launchers dispatch to `work/logs/release-p2082`; `start.cmd start` and `start.cmd status` are noninteractive/idempotent, while double-click/no arguments keeps a status console open. No automatic mixed-worktree rebuild occurs.
Deployment, preserved data, backup/rollback, tests and deferred Android/public checks: [release record](docs/RELEASE_P2082.md). Final commit metadata is served at `/release.json`. The shared public tunnel intentionally remains on3216 by user choice this round; it is not evidence of3199 public acceptance.
