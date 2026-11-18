# Games114514 · 多人联机小游戏合集

基于 **Vue 3、TypeScript、Node.js、Socket.IO 和 SQLite** 的多人联机小游戏平台。采用公共大厅、房间服务与独立游戏插件架构，面向浏览器联机，后续计划扩展到 Android 和 Windows 客户端。

> **版本说明（2026-11-18）**：`main` 目前是早期 **Web 0.1 稳定基线**，主要包含首款《诡吹灯》。三款游戏、账号系统、《忍者之夜》P20.8 系列和机器人功能的最新开发代码保存在 [`feature/night-of-the-ninja` 分支](https://github.com/Venpenmen/Games114514/tree/feature/night-of-the-ninja)，截至本次更新对应提交 [`e5a03da`](https://github.com/Venpenmen/Games114514/commit/e5a03da2d44e4d038d464b244face15050509ebc)。开发分支为候选版，并非已合并到 `main` 的正式发行版。

## 游戏目录与进展

| 游戏 | 人数 | 玩法简介 | 当前版本位置 |
| --- | --- | --- | --- |
| **GAME 01《诡吹灯》** | 3 人 | 两名人类与一名诡异通过夜晚选烛、白天讨论与指认展开隐藏身份博弈 | `main` 提供 Web 0.1；后续规则与玩法迭代见开发分支 |
| **GAME 02《骰子狼人杀》** | 3 人 | 掷骰隐藏身份、红黑牌共同改变点数生命值、投票与积分争冠 | 开发分支 |
| **GAME 03《忍者之夜》** | 4–11 人 | 两步秘密轮抽、五阶段夜晚行动、身份技能与个人荣誉争冠 | 开发分支；P20.8 候选版 |

三款游戏基于同一平台进行房间管理、联机同步与文字交流，各自维护独立的游戏规则和视觉表现。

## 本地运行：main 稳定基线

需要 **Windows、Node.js 24 与 npm**。克隆或下载 `main` 后，在项目目录执行：

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

默认使用本机回环地址 **http://127.0.0.1:3100**，数据库为项目目录下的 `games.db`。环境参数可参考 `.env.example`，并在本地新建 `.env`。也可以使用仓库提供的 `start.cmd` 与 `stop.cmd` 启停脚本。

```powershell
npm.cmd run check
npm.cmd test
```

以上命令对应 `main` 当前源码，**不会自动获取尚未合并的第二、第三款游戏**。运行开发版前应切换到开发分支，并阅读该分支 README 中的隔离测试服务说明。

## 最新开发版

[打开最新开发分支](https://github.com/Venpenmen/Games114514/tree/feature/night-of-the-ninja)

开发分支目前包含：

- 三款游戏接入、独立界面及联机对局；
- 账号、个人资料、战绩、设备与标签页操作权；
- 《忍者之夜》圆桌、身份牌、公开手牌、演出、回放与响应式界面；
- 3213 隔离试玩与 3216 P20 候选服的管理脚本；
- 三款游戏的自动机器人、统一机器人管理器及跨局准备机制；
- 《诡吹灯》博弈模拟第一至第四代实验源码与分析报告。

最近一次核验：开发工作树类型检查通过、业务测试 **123/123**、Vite 生产构建通过，《忍者之夜》公开手牌与演出相关 Playwright 浏览器专项 **1/1** 通过。此处为自动化核验结果；完整手机实机与未来版本的发布验收仍按开发任务推进。

当前下一阶段为 **P20.8.2 手机横屏沉浸式布局**。将重点调整横屏 HUD、桌面及手牌区域、4–11 人席位和触屏操作，同时保持桌面版稳定。

开发计划和跨对话断点：[更新路线图](https://github.com/Venpenmen/Games114514/blob/feature/night-of-the-ninja/work/NINJA_UPDATE_ROADMAP.md) · [Game 03 状态](https://github.com/Venpenmen/Games114514/blob/feature/night-of-the-ninja/work/NINJA_STATE.md) · [Game 03 任务表](https://github.com/Venpenmen/Games114514/blob/feature/night-of-the-ninja/work/NINJA_TASKS.md)

## 课程演示（main 版）

1. 打开三个相互独立的浏览器会话，设置游客昵称和头像；一人创建《诡吹灯》房间，另外两人使用房间码或邀请链接加入。
2. 房主设置游戏参数，三人准备并开始；玩家查看各自身份，在夜晚秘密选择蜡烛。
3. 白天使用文字聊天讨论；进入指认阶段后进行投票、重投与终局结算。
4. 刷新浏览器检查席位和角色恢复，比赛结束后重新准备并开始下一局。

## 技术架构

- **Web**：Vue 3、TypeScript、Vite；
- **服务端**：Node.js、Express、Socket.IO；
- **数据**：SQLite，保存房间、会话和对局相关信息；
- **游戏插件**：游戏规则与公共平台职责分离，由游戏注册机制加载；
- **测试**：Node.js 测试、类型检查、Playwright 多浏览器联机测试。

## 文档

- [《诡吹灯》规则](docs/games/ghost-candle/RULES.md)
- [系统架构](docs/ARCHITECTURE.md) · [通信协议](docs/API.md) · [实现决定](docs/DECISIONS.md)
- [部署说明](docs/DEPLOYMENT.md) · [测试报告](docs/TEST_REPORT.md)
- [开发分支《骰子狼人杀》规则](https://github.com/Venpenmen/Games114514/blob/feature/night-of-the-ninja/docs/games/dice-werewolf/RULES.md)
- [开发分支《忍者之夜》规则](https://github.com/Venpenmen/Games114514/blob/feature/night-of-the-ninja/docs/games/night-of-the-ninja/RULES.md)

---
项目持续开发中。稳定基线与开发候选版分别管理，游戏功能、服务实例及数据文件以对应分支的说明为准。
