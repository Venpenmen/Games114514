# Games114514

做一些小东西

多人联机小游戏合集 · Web 0.1。两个可玩插件均为三人游戏：《诡吹灯》和《骰子狼人杀》。

大厅支持为各个游戏配置封面。《诡吹灯》采用中式烛夜主视觉、三态烛台棋盘和独立对局主题。

## 本地运行

需要 Windows、Node.js 24 和 npm。双击 `start.cmd` 安装缺少的依赖、构建并启动。打开 http://127.0.0.1:3100，结束后双击 `stop.cmd`。也可以在项目目录前台运行：

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

首次运行默认绑定回环，默认数据库为项目根目录的 `games.db`。自定义时复制 `.env.example` 为 `.env`。同一数据库由一个服务进程使用。

## 课程演示

1. 打开三个独立浏览器会话，分别填写昵称和头像。由一名游客创建房间，另外两名游客用房间码或邀请链接加入。
2. 新玩家可点「游戏规则」查看玩法，开局后也可随时打开。房主可设夜晚 30 秒。三人准备后由房主开局。每人查看自己的角色，选择完整蜡烛并确认。可故意保留一人未确认，观察到期自动结算。
3. 白天发送一条消息，提前结束讨论。到第 4 天由至少两人同意寻找诡异。第一轮三人各投不同玩家触发重投，第二轮两名玩家指认同一人，观察终局与身份公开。
4. 刷新任意会话验证原席位与角色恢复。终局后原房间仍在，三人重新准备，由房主开始新一局。

## 文档

- [冻结规则](docs/games/ghost-candle/RULES.md)
- [架构](docs/ARCHITECTURE.md) · [协议](docs/API.md) · [实现决定](docs/DECISIONS.md)
- [独立部署](docs/DEPLOYMENT.md) · [验收记录](docs/TEST_REPORT.md)


## GAME 02《骰子狼人杀》

三人创建或加入「骰子狼人杀」房间，分别选择赌徒形象，房主选择目标积分，三人准备后开局。桌面和手机使用同一 Web 页面。单局结算 8 秒后自动续局，可在下一局回看上一局完整结算。冠军结果持续展示。

使用独立工作树试玩时，复制 .env.example 到该工作树的 .env，设置 PORT=3199、PUBLIC_ORIGIN=http://127.0.0.1:3199、DATABASE_PATH=work/logs/dice-preview.db 和 NODE_ENV=development，建好 work/logs，再运行 npm.cmd ci、npm.cmd run build、npm.cmd start。对外继续使用原有部署单独管理。

[完整冻结规则](docs/games/dice-werewolf/RULES.md)
