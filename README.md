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

## GAME 03《忍者之夜》

4–11 人选择中立肖像并准备。房主开始比赛后，玩家进行两步秘密轮抽，依次结算五个夜晚阶段，累积个人荣誉。满员房间可用房间码公开旁观。死人仍可查看战况和公聊。全体正式玩家离线时暂停，有正式玩家回到原席位后恢复。比赛实时结算和公开历史见游戏界面。

在 Game 03 的独立工作树中执行以下命令。已有依赖时跳过安装。

```powershell
npm.cmd ci
npm.cmd run build
.\ninja-preview.cmd
.\ninja-preview.cmd status
```

打开 [本地隔离试玩](http://127.0.0.1:3213)。用四个以上独立浏览器配置或容器登录同一个地址，创建房间后用房间码加入。`ninja-preview.cmd stop` 关闭此工作树的隔离实例，试玩数据库保留在 `work/logs/ninja-preview.db`。

[冻结规则](docs/games/night-of-the-ninja/RULES.md) · [需求追踪](docs/games/night-of-the-ninja/TRACEABILITY.md) · [美术清单](docs/games/night-of-the-ninja/ASSET_STATUS.md) · [验证记录](docs/games/night-of-the-ninja/TEST_REPORT.md)

### 单人混合试玩：统一机器人管理器

在 3213 原试玩版或 3216 P20 候选版中，先创建《忍者之夜》房间并配置正式玩家数。然后双击工作树根目录的 **`ninja-bot-manager.cmd`**。

依次输入服务器版本、六位房间码、机器人数量（1～10，少于房间正式席位数），再设置难度。难度 `1` 为简单随机、`2` 为普通启发式、`3` 为困难强化启发式；支持 `1,2,3` 这样按顺序单独配置每一名机器人。确认后自动加入并准备，真人再在网页上准备、开始游戏。

菜单 `2` 停止全部由新管理器启动的机器人，菜单 `1` 可以从当前房间切换到新房间、甚至切换 3213/3216；菜单 `3` 查看状态，菜单 `0` 退出。输入错误时窗口保持开启。机器人是独立游客，仅接收各自的私人数据。

**原 `ninja-bots.cmd` 已弃用**，不要再执行旧版带 `--p20`、`stop` 参数的命令。详细见 [统一机器人管理说明](docs/games/night-of-the-ninja/BOT_MANAGER.md)。

### P20 卡面交互候选版

在 Game 03 工作树执行：

```powershell
npm.cmd run build -- --outDir work/logs/ninja-p20/dist
.\ninja-p20.cmd
.\ninja-p20.cmd status
```

打开 [P20 候选版](http://127.0.0.1:3216)。独立构建、会话和数据库都在 P20 运行范围内，数据库位于 `work/logs/ninja-p20/preview.db`。单人试玩时，先在 3216 创建房间，再双击 `ninja-bot-manager.cmd`，选择 3216、填写房间码、机器人数量及难度；在同一窗口菜单内停止或切换房间。

回退时运行 `.\ninja-p20.cmd stop`，继续使用 [原隔离试玩](http://127.0.0.1:3213)。两个端口有各自的房间、会话和数据。候选数据库留在原路径，重启候选版可继续使用。

### P20.6 公共房间生命周期

三款游戏共用房间清理策略。等待与已结束房间在 30 分钟无有效活动后清理。进行中的房间在所有正式玩家离线后暂停，60 分钟内可用原游客会话恢复剩余倒计时。旁观者不延长对局留存，机器人占用的正式席位按普通玩家计算。

3216 候选版使用现有 `ninja-p20.cmd start`、`stop`、`status` 管理，并继续使用原 `work/logs/ninja-p20/preview.db`。

《诡吹灯》《骰子狼人杀》《忍者之夜》对局中可点击「离开对局（保留席位）」，再在大厅用原游客会话点击「继续对局」。恢复入口只列出仍在进行、且本人拥有席位的比赛。
