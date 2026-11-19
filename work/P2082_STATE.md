# P20.8.2 第一批断点
基线：实际 HEAD 1190e33，继承 UX.3.2；机器人、实验文件和既有路线图差异保持。
P0 DONE：真实四会话房间；844x390 / 915x412 / 740x320 / 390x844 截图及控件矩形见 work/logs/p2082-*.png、p2082-viewports.json。横向溢出均0；纵向分别114、92、802、544px。844横屏底部操作区落在视口以下；740宽进入竖向布局，圆桌和手牌继续纵向堆积。不能宣称单屏完成。
P1 DONE（浏览器能力边界）：独立横竖识别、可继续操作的旋转提示、用户点击才申请全屏/方向锁、拒绝时回退、visualViewport高度变量和安全区。真实硬件全屏/锁方向成功路径待手机人工验证。
验证：npm.cmd run check=0；隔离候选构建=0；tests/ninja-landscape.spec.ts 1/1、退出码0（真实四账户，视口采样、旋转提示、模拟浏览器拒绝后的真实回退UI）。新增方向data标记与安全区padding随后局部补充，不改变游戏操作。
P2 TODO：未实施单屏骨架。下一步仅在横屏识别范围内重排 HUD/圆桌/手牌/确认区，先解决上述实测纵向溢出，再增加真实两步轮抽、合法目标及确认的横屏验收；不要修改规则和机器人。
文件：games/night-of-the-ninja/ViewportMode.vue、View.vue（仅挂载新组件）、tests/ninja-landscape.spec.ts。
隔离包：work/logs/p2082-candidate/dist（为最后局部data/padding补丁前的验收包，下轮修改后重建）。未提交、未推送、未部署，3216未操作。
NEXT_ACTION: 读取本文件和p2082-viewports.json，继续P2；用 NINJA_TEST_ASSETS=work/logs/p2082-candidate/dist 运行定向浏览器测试。

P2-C0 DONE：已核对1190e33及P1差异；并行scripts与路线图差异保留。NEXT_ACTION：独立landscape.css限定横屏，保留原polar相邻顺序。无测试服务运行。

P2-C1 DONE：landscape.css独立横屏grid骨架已保存；C2候选：四席沿原polar相对顺序、紧凑手牌和静态确认区。尚未验证，不宣称可用。NEXT_ACTION：构建并运行四视口定向用例，检查尺寸与核心操作。

P2-C2 候选已保存：844/915首次测得纵向0，但740圆桌塌陷；已补article明确高度并移除错误聊天隐藏规则。NEXT_ACTION：使用种子83复验三横屏、真实两步轮抽/目标取消确认、桌面。P0原始截图/JSON不再覆盖；新产物均p2082-p2前缀。

C2修复：740塌陷根因是竖屏:has(hand)巨大padding-bottom和手牌position:fixed残留；已在横屏作用域覆盖。当前隔离定向测试运行中，日志p2082-p2-browser.txt；3216未触碰。NEXT_ACTION：先查该测试结果，勿重复P0。

P2-C2/C3 DONE：四人相对席位、横屏手牌及目标取消/确认已实测；844/915无横纵滚动、确认按钮完整在视口内。C4已测740无页面滚动/圆桌高138px，桌面1366x768无纵滚动；截图复核后补身份按钮显式grid行列避免740落入下一行，待最后定向复验。类型检查退出0。

## 当前有效恢复摘要：P2-C5（2026-11-19）
P2-C0～C5 本批四人骨架完成。P0/P1沿用；P3～P5未开发。
源码：ViewportMode.vue（P1）；View.vue（挂载P1、import landscape.css、polar增加横屏CSS坐标变量）；landscape.css（仅orientation:landscape、宽<=1000、高<=500生效）；tests/ninja-landscape.spec.ts（真实四会话种子83）。
验收：check=0；候选构建=0；最终Playwright1/1、退出0，23.9秒。844x390、915x412、740x320横/纵页面溢出均0，圆桌高188/210/138px，确认按钮完整在视口；两步轮抽、卡牌选中/取消、隐士合法目标选中/取消/重新选择/确认通过（手牌844、目标915）；1366x768桌面四席及无页面纵向滚动通过。未运行无关全量测试。
截图：work/logs/p2082-p2-{844x390,915x412,740x320,390x844}.png；尺寸JSON同前缀-viewports.json；日志p2082-p2-{check,build,browser}.txt；独立候选包work/logs/p2082-candidate/dist。
剩余：740低高度仅紧凑可用骨架，视觉/触控密度仍需人工手机复核；竖屏原版纵向滚动保留。其他人数手机精细布局、动画优化、手机指南不在本轮。实体手机全屏/方向锁成功路径未实测。复杂双目标/荣誉技能横屏专项尚未验收。
安全：未提交、未推送、未部署；3199/3213/3216/FRP/数据库未操作。Playwright自动关闭隔离服务器与浏览器，没有本轮临时服务存留。并行scripts、Gen7/Qwen/ML、未跟踪实验文件及原有路线图差异保持。不要整体暂存路线图。
NEXT_ACTION：先读本摘要和p2082-p2-viewports.json，人工复核844/915/740截图；如继续下一批，按范围扩展复杂操作/手机触屏专项，先用本候选包定向测试，不重做P0/P1。不自动部署或推送。
