# 开发断点
CURRENT_STAGE: P8 Web 0.1 交付
WORKTREE: main 自原远端历史快进，源码验收基线为 18bea83e43bb3ab6253100e1e776fa02fa447d98。
VERIFIED: 2026-11-15 Windows 上业务测试 13/13，类型检查、生产构建、三个独立 Edge 会话、默认端口 Windows 启停均退出 0。开发分支源码基线已推送并用 git ls-remote 核对。
BLOCKERS: 本地 Web 无。公网、实体手机和 APK/EXE 未执行。
NEXT_ACTION: npm.cmd ci；npm.cmd run build；npm.cmd start。公网后续按 docs/DEPLOYMENT.md 执行。

ART_UPDATE: feature/web-art-direction 完成。规则及集成 13/13、类型检查、构建及三浏览器会话均退出 0。视觉截图在 work/logs。NEXT_ACTION: 双击 start.cmd 查看本地界面。

RULES_UI: 完成。测试 13/13、类型检查、构建和三会话回归退出 0。本地服务已读取新版入口。NEXT_ACTION: 打开 http://127.0.0.1:3100，在等候房间或对局内点「游戏规则」。
