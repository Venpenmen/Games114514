# GAME 02 断点
CURRENT_STAGE: P8 开发交付
CURRENT_TASK: 《骰子狼人杀》独立分支交付
WORKTREE: feature/dice-werewolf，基于 9958bfda21ee3ec5e64e3de7b635d4621f5d05a0。原工作树及公网实例独立。
VERIFIED: 规则定向 11/11、全量 32/32、类型检查、生产构建、两款游戏三个独立 Edge 会话通过。骰子完整五局积分赛含两局加赛，检查了桌面、390px 移动视口和待处决截图。
BLOCKERS: 3199 独立常驻试玩启动被工具执行策略阻止。浏览器验收使用实际临时回环服务，结束后停止。未执行实体手机或公网测试。
NEXT_ACTION: 按 README 在独立工作树启动 3199 试玩；需要复验时运行 playwright.cmd test，最终两款游戏复验 2/2。

CHAT_UI DONE · 两款游戏共享聊天组件。定向 1/1、全量 36/36、类型检查、隔离构建及三会话浏览器 2/2 通过。NEXT_ACTION: 在独立回环环境按 docs/TEST_REPORT.md 复验。

RESULT_UI DONE · 两款游戏导航与胜负提醒，自动化 36/36、类型检查、构建、独立三会话 4/4。NEXT_ACTION: 保留本地提交，等待人工确认正式部署。

P16 BUILD_VERIFIED · 自动化 37/37、独立浏览器 4/4。BLOCKER: 正式切换动作被执行策略拒绝。3199 原进程 HTTP 200。NEXT_ACTION: 用既有项目脚本将 work/logs/p16-dist 切换到 dist，再核对新版入口与目录。

P20.6 DONE · 公共房间 30/60 分钟清理、三游戏全员离线暂停、公共头像与《诡吹灯》状态栏。类型检查、107 项自动化、9 个独立浏览器场景、3216 部署浏览器验收通过。基线 991ee7a。NEXT_ACTION: 使用 ninja-p20.cmd status 检查 3216，可直接人工试玩。

P20.6.1 DONE · 两款经典游戏复用暂离与大厅恢复，终局自动移除恢复入口。类型检查、107 项自动化、4 项定向 Edge 联机验收与 3216 冒烟通过。NEXT_ACTION: 可在 3216 使用原游客会话试玩。
