# 《忍者之夜》验证记录

Windows，Node.js 24.17.0，Playwright 使用 Microsoft Edge。所有服务经回环地址运行。开发复用已安装依赖，新工作树可执行 `npm.cmd ci`。

| 命令 | 退出码 | 实测 |
|---|---:|---|
| `node --test games/night-of-the-ninja/engine.test.ts` | 0 | 55/55，包含 33 张牌元数据、技能、奖池、流派与比赛终局 |
| `npm.cmd test` | 0 | 93/93，包含四场 4／5／7／11 人种子化 Socket.IO 及 SQLite 完整比赛和原有游戏回归 |
| `npm.cmd run check` | 0 | Vue / TypeScript |
| `npm.cmd run build` | 0 | Vite 生产包与正式原画 |
| `playwright.cmd test` | 0 | 7/7，诡吹灯与骰子狼人杀各 2 项，忍者之夜 3 项 |
| `ninja-preview.cmd` / `ninja-preview.cmd status` | 0 | 3213 独立启动；首页与 `/api/catalog` HTTP 200，目录注册三款游戏 |
| `ninja-preview.cmd stop` | 0 | 隔离服务成功停止，再次启动保留数据库 |

- **完整比赛**。真实 Socket.IO 客户端使用固定随机序列，覆盖 4／5／7／11 人、两步轮抽、五阶段、多轮到 10 分冠军与全体轮次不变量。结合测试检查重复命令、全员离线、仅旁观者在线、服务器重启并跨过 48 小时、按原剩余时间恢复、阶段到期与主机管理权超时。
- **真实浏览器**。四个正式浏览器上下文完成比赛，第五个旁观。11 个独立上下文开局，检查桌面和 320px 手机视口、席位数量、横向溢出及图片解码。种子化演出场另外用四个独立浏览器从真实轮抽进入变形与镜僧反应，验证交换确认前无交换动画，反应结束前无死亡，正确反杀及刷新无重复演出。旧游戏均使用三个独立上下文。
- **截图与日志**。工作树内 `work/logs/ninja-desktop.png`、`ninja-mobile.png`、`ninja-11-desktop.png`、`ninja-11-mobile.png`、`ninja-champion.png`、`ninja-art-contact.jpg`。自动化日志使用 `work/logs/ninja-{rules,full,browser,final-check,build}.log`。
- **隔离**。运行入口仅 `127.0.0.1:3213`，独立 `work/logs/ninja-preview.db` 和 `games_ninja_preview` Cookie。Playwright 的 3197、3198、3214、3215 自动退出。P0 正式 3199 只读请求返回 200，交付复查时收到连接失败（curl 退出码 7）；本任务未对其执行启停或修改配置。

[追踪矩阵](TRACEABILITY.md) 记录逐项证据与尚未验收的边缘用例；[素材清单](ASSET_STATUS.md) 记录原画规格及检查。公网、实体手机、跨设备高延迟同步和逐牌手机裁切未执行。等级称谓、密函细节与部分专项验证仍待补齐，见矩阵。
