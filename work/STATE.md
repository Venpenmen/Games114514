# GAME 02 断点
CURRENT_STAGE: P8 开发交付
CURRENT_TASK: 《骰子狼人杀》独立分支交付
WORKTREE: feature/dice-werewolf，基于 9958bfda21ee3ec5e64e3de7b635d4621f5d05a0。原工作树及公网实例独立。
VERIFIED: 规则定向 11/11、全量 32/32、类型检查、生产构建、两款游戏三个独立 Edge 会话通过。骰子完整五局积分赛含两局加赛，检查了桌面、390px 移动视口和待处决截图。
BLOCKERS: 3199 独立常驻试玩启动被工具执行策略阻止。浏览器验收使用实际临时回环服务，结束后停止。未执行实体手机或公网测试。
NEXT_ACTION: 按 README 在独立工作树启动 3199 试玩；需要复验时运行 playwright.cmd test，最终两款游戏复验 2/2。

CHAT_UI DONE · 两款游戏共享聊天组件。定向 1/1、全量 36/36、类型检查、隔离构建及三会话浏览器 2/2 通过。NEXT_ACTION: 在独立回环环境按 docs/TEST_REPORT.md 复验。
