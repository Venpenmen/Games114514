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

P3-C0 DONE：实际HEAD693ce9a，P2已提交；并行scripts/路线图及实验差异保留。NEXT_ACTION：多人数横屏按相对席位顺序分布到圆桌上下弧，四人保持原坐标；先验证6/8/9。

P3-C1/C2 IMPLEMENTED未验收：View.polar新增仅横屏使用的上下弧坐标，依原relative顺序旋转、本人始终下弧；4人不变；landscape.css按人数限制宽度。NEXT_ACTION：真实6/8/9房间边界/相交及桌面回归测试；不要标记DONE直到通过。

P3-C1 DONE：真实4/6人用例通过，三横屏零溢出、名片无相交、逐一身份详情入口可点击、确认区可见、1366桌面无纵滚动；4人坐标未变。C2：8人同项已通过，9人正在同一隔离批次验证。日志work/logs/p2082-p3-browser.txt，测量p2082-p3-{4,6,8}.json。NEXT_ACTION：待9人结果后落C2，11人单独启动避免注册限流；触控目标/死亡/身份公开专项尚未验收。

P3-C2 DONE：8/9人真实房间三横屏边界、无相交、全部身份入口点击、确认可见及桌面零纵滚动均通过；首批4/4，退出0。当前11人+四人操作回归隔离批次运行，日志p2082-p3-extra.txt。NEXT_ACTION：确认C3几何结果；C4/C5仍需多人数真实目标/状态专项，不可仅凭初始轮抽截图标记完成。

## 当前有效恢复摘要：P3-C3 稳定检查点（2026-11-19）
基线693ce9a，未提交。P3-C0/C1/C2/C3完成布局和初始状态验收；C4/C5未完成，不宣称完整P3交付。
实现：View.vue polar()内沿原relative席位顺序生成上下弧位置，四人继续原椭圆坐标；只改--nn-landscape-*变量，原桌面left/top不变。landscape.css追加多人数宽度限制、中央舞台留空及昵称换行，不改服务器、规则、身份投影或机器人。
实际测试：类型检查0、隔离构建0；首批4/6/8/9人4/4，第二批11人+P2四人操作2/2，全部退出0。每个人数均测844x390、915x412、740x320、1366x768：横屏无页面纵滚动，所有席位边界在视口内且两两不相交，确认按钮在视口；逐一真实点击所有身份详情并关闭，桌面四/多席无纵滚动。四人真实轮抽、目标取消重选/确认回归通过。
证据：work/logs/p2082-p3-{4,6,8,9,11}.{json,png}（代表截图844）；p2082-p3-{check,build,browser,extra}.txt。候选包work/logs/p2082-p3-candidate/dist。新的真实多人测试tests/ninja-landscape-seats.spec.ts。
限制：当前多人数截图是初始轮抽状态；6/8/9/11人的真实合法目标逐一点击、执行者/被执行者描边、公开/隐藏身份动态位置、死亡灰白、多公开牌避让尚未专项验证。没有以页面伪造状态替代这些测试。未执行无关全量测试；P3-C5最终全量回归留到上述专项完成。
安全：没有提交、推送、部署；3216/3213/3199及数据库未操作。Playwright隔离进程/浏览器已自动结束，无本轮常驻测试服务。脚本、Gen7/Qwen/ML和路线图原有并行改动均保持。
NEXT_ACTION（第一条）：阅读本摘要，然后扩展tests/ninja-landscape-seats.spec.ts，通过真实轮抽/出牌进入目标阶段，补6/8/9/11人所有合法席位的选中/取消/重选与确认，以及身份/死亡状态；先做6人C4小切片，不重复P0-P2或已过的初始几何采样。最后再C5类型/必要全量与生产包验收。不要自动暂存并行路线图、不要自动部署或推送。

C4/C5 START：保留C3几何结果；新增真实轮抽→密探目标专项，先6人；不伪造DOM状态。NEXT_ACTION：运行p2082-p3-interaction测试，逐项写入覆盖，不据此自动标记死亡/公开身份通过。

C5-A 6人真实密探专项通过：真实轮抽/亮牌后全部5个合法目标可选/取消/重选，非法目标disabled，三横屏及桌面确认可见、身份边界绑定；确认提交后选框清除。1/1退出0，p2082-p3-interaction.txt（该日志后续批次不覆盖）。C4其他人数/公开身份/死亡未覆盖。NEXT_ACTION：9/11优先，新增纯数字角标/身份按钮光晕/合法查看后位置稳定断言。

C4/C5测试诊断：9人未开局即超时，连续修改房间配置的异步快照造成设定人数被旧配置覆盖，实际仅4人。仅修测试配置顺序（人数最后设置）并增加配置往返间隔、稳定身份locator；未修改正式配置逻辑。该失败不计通过。NEXT_ACTION：重跑9/11定向，日志dense。

C4-A/B部分、C5-A密集人数 DONE：9/11真实密探专项2/2退出0；全部8/10个合法目标在三横屏+桌面逐一选中/取消/重选，非法disabled；初始合法已知身份按钮有光晕、角标纯数字；确认后合法查阅的身份按钮坐标变化<=1px。公开全身份和9/11死亡未触发，不标记通过。证据target-{9,11}.json/png、interaction-dense.txt。NEXT_ACTION：6/4/8新版断言及四人镜僧死亡横屏专项；无正式服务改动。

C4-B 四人死亡专项 DONE：复用真实种子83隐士→变形者→镜僧流程，以NINJA_LANDSCAPE_STATES=1启用844/915/740死亡图像filter和身份按钮包含于死亡名片边界断言；三档偏好、离线/恢复、刷新、下一轮复活沿原用例验证通过。此结果仅覆盖四人，不外推6/8/9/11。
C5-A 全人数目标专项 DONE：4/6/8/9/11各一例，三横屏+1366桌面；全部count-1个合法目标选中/取消/重选、非法disabled、确认在视口且提交后选择清除；合法查阅后身份按钮位置变化<=1px，初始已知身份按钮光晕和纯数字角标通过。密集批次2/2，剩余批次含死亡4/4，均退出0。
C4-C PARTIAL：4/6/8分别在3/4/4张真实公开牌、1名执行者标记存在时，全部合法目标仍可触控；9/11目标触控通过但未单独量化公开牌数量。复杂演出中央避让及多人数死亡/完全公开身份转换尚未穷尽，不能标记整体C4 DONE。
C5-B DONE（基础交互矩阵）：三横屏零页面溢出、身份边界绑定、桌面目标操作回归通过；C3原初始几何样本沿用，不重复生成。
C5-C PARTIAL：最新类型检查0、隔离构建0；本轮仅测试改动，没有产品源码局部修复。未运行全量，因为剩余视觉特殊状态尚未验完，且规则/服务端未改动。

C4-C截图审查发现11人中央牌面/技能文字挤压，虽然目标触控通过，视觉避让未通过。NEXT_ACTION：仅横屏为TablePlays补空闲格点候选，原局部候选优先；紧凑中央卡面；新增牌与舞台相交断言后复验11/4，不重排席位。

C4-C FAILED（必须保留）：11人真实公开牌与中央舞台相交断言收到4张相交；4人同项通过。尝试仅横屏格点备用候选未消除密集布局碰撞，已精确撤销本轮TablePlays/中央压缩实验，回到C3稳定产品源码，未还原任何并行改动。
失败证据：work/logs/p2082-p3-avoidance.txt；复现：NINJA_CHECK_STAGE_AVOIDANCE=1、NINJA_TEST_ASSETS=work/logs/p2082-p3-candidate/dist，运行test ninja-landscape-interaction.spec.ts --grep '11 real'。该严格断言保留为显式专项开关，不计入默认基础目标测试通过；不是已修复/不是忽略失败。
下一步不要继续盲增候选点：先量化740/844下名片/中央舞台占用空间，研究专用可滚动公开牌带或更小的可点击卡牌占位，再通过严格相交断言。多人数完全公开身份和死亡位置专项仍未覆盖，整体P3不标记VERIFIED。

## 当前唯一有效恢复摘要：C4/C5 部分完成，P3 NOT VERIFIED（2026-11-19）
产品基线仍为693ce9a＋前轮C3未提交的View.vue/landscape.css；本轮没有留下未经通过的产品修复。TablePlays备用网格试验已撤销，最终候选包已重新构建回稳定源码（index-hN84BQgw.js）。
本轮新增tests/ninja-landscape-interaction.spec.ts；tests/ninja-events.spec.ts仅添加NINJA_LANDSCAPE_STATES可选横屏死亡断言；更新本断点。并行脚本、路线图、Gen7/Qwen/ML及实验文件不修改/不清理/不提交。
已通过：6个不同基础专项（9/11各1，4/6/8各1，四人镜僧状态1）；全部人数真实轮抽→密探合法目标逐一触控、取消/重选/确认，非法目标禁用，三横屏零页面溢出与1366桌面回归，已知身份光晕/纯数字角标、合法查看后身份按钮位置稳定。四人死亡灰白、离线/三偏好/刷新/复活与横屏绑定通过。
未通过：严格公开牌避让额外用例11人失败、4人通过，日志p2082-p3-avoidance.txt。11人有4张卡与中央舞台相交，不能以目标能点击替代视觉通过。NINJA_CHECK_STAGE_AVOIDANCE=1保留严格复现开关，默认基础触控矩阵不把它误计为通过。
未覆盖：6/8/9/11完全公开身份切换及死亡前后坐标稳定，全部演出终止后的牌桌视觉恢复；C4-A/B为部分，C4-C失败，C5-A/B基础完成、C5-C验证和交接已落盘但整体验收未完成。
验证：最新类型检查0；npm.cmd test 155/155退出0，仅运行一次；撤销试验后隔离构建0。日志p2082-p3-final-check.txt、p2082-p3-full.txt、p2082-p3-final-build.txt。基础浏览器证据interaction-dense.txt 2/2、interaction-rest.txt 4/4；target-{4,6,8,9,11}.json/png，death-4.png。旧interaction.txt为最早6人小切片，勿重复累计人数。
安全：所有本轮测试/浏览器/临时服务器已结束；未操作3199/3213/3216/FRP/既有数据库，未提交/推送/部署。候选目录work/logs/p2082-p3-candidate/dist。
NEXT_ACTION第一项：只读TablePlays.layout和landscape.css，基于target-11.png及失败日志量化低高度空闲区域；先解决公开牌/中央舞台避让并用严格11人用例复验，不重跑P0～C3。再补多人数完全公开/死亡状态，最后才允许P3 VERIFIED。需要改变布局时局部小切片，不修改规则或身份权限，不自动提交或部署。

C4-D START：保持断言，先为原失败11人导出舞台/圆桌/卡牌DOMRect、transform和inline定位，证据collision-11-*.json；未做无依据CSS修改。

C4-D精确归因：844圆桌714x188，舞台x158.52..571.48/y144.38..207.63；卡牌30x44，spy-6/4/1/5四张穿入舞台（详collision-11-844.json）。原候选半径不足；上轮顶部锚定网格的y采样越过两排席位之间窄空隙。本轮仅增加舞台垂直中心线候选，保留原零碰撞候选优先、完整牌面及所有碰撞判定，不缩舞台。NEXT_ACTION：严格11人三横屏复验。

C4-D DONE（11人）：中心线候选严格断言通过，11x844/915/740牌面与舞台零相交、全部目标仍可点、牌面数量未减；已保存修复后矩形，原844失败关键矩形将在before-summary单独保留，测试产物改用d-after/d-target新前缀。NEXT_ACTION：9/11真实触控及自然轮末全员公开身份位置专项；不修改状态机。

C4-E进行中：严格9/11避让及目标触控通过；自然轮末测试初次因阶段标记重复选择器失败，已限定首个；后续盲眼刺客反应控件等待超时，改为明确验证合法超时不反应路径，仍强制等待真实死亡并比较坐标，未伪造状态。任何未通过用例不计DONE。NEXT_ACTION：e-final复验。

C5-F阶段证据：本轮类型检查0、隔离构建0；全量仅运行一次155/155退出0（def-full.txt）。C4-E仍未通过，不标P3 VERIFIED。当前e-11.txt单例正在验证自然超时死亡及轮末公开；测试会自动清理进程，不操作其他服务。代码仅TablePlays增加11行横屏候选，测试与断点增量；不要提交并行脚本。

C4-E 11人真实死亡已触发并保存e-death-11.json/png，灰白与身份按钮坐标断言通过；随后测试助手错误地要求死亡玩家下一阶段出牌而挂起，已停止该批次、仅修助手跳过死亡者。该批不计整体通过。NEXT_ACTION：9/11 E流程重跑，确认自然轮末公开，不改规则。

C4-E 11人 DONE补证：上条记录后工具返回表明e-11批次其实已正常完成1/1、退出0（1.6分钟），并非被中断。自然轮末公开和死亡坐标全部断言通过，e-public-11.json/png记录原/终位置；盲眼刺客真实超时不反应。当前e-complete批次补9人并复核11，修正记录，以实际日志为准。

C4-E 9人 DONE：e-complete批次第1例通过，e-public-9.json deathCovered=true；真实密探查阅→盲眼刺客超时不反应死亡→自然轮末多身份公开，灰白及原/终身份坐标<=1px断言通过。11人旧e-11已同项通过，最新批次正在复核。NEXT_ACTION：待批次结束，再做关闭长流程的4/6/8/11严格牌面边界回归；C5-F不重跑全量。

C4-E DONE（9/11）：e-complete.txt最终2/2退出0；两个public JSON deathCovered=true，真实超时不反应死亡、灰白、身份坐标稳定及轮末同时公开均通过，未修改服务器或引擎。NEXT_ACTION：C5-F最终4/6/8/11严格边界与图片填充回归（4人附自然公开/死亡），9人沿用已通过密集批次；类型检查和构建已0、全量155/155仅一次。

C5-F强断言发现新问题：4/6/8/11虽均通过舞台零相交，但新增名片/牌面完整边界合取检查失败；尚不能标P3 VERIFIED。正导出imageRect与seatRect分离归因，原断言不放宽。C4-E9/11已通过仍有效。NEXT_ACTION：先查d-after-4-*.json具体失败条件，再最小修复。

C5-F精确归因：失败全部发生于740，公开牌/图片DOMRect为0；TablePlays旧max-width800竖屏规则display:none误作用于横屏。现明确在landscape覆盖display:block（不隐藏卡牌规避）。同时真实目标状态名片曾因窄列文字换行长至94px，局部统一36px并紧凑文本/头像，保留数字/状态且不动舞台。NEXT_ACTION：严格11/4边界复验，然后其余人数。

740可见牌复验归因：真实卡牌30x44，原模型size/.72+2=43.67略低估min-height44；网格起点margin6错过上角空隙，5px装饰余量使无实质相交位置被过度排除。仅横屏模型改最小44、间距2、边缘采样2；物理相交断言保持0、不缩牌或舞台。下一步仍严格4/11实测。

低高度精确布局补充：740两排名片实际40px高；舞台底166.125到圆桌底212仅45.875px，44px牌高加2px上下间隔差0.125px；固定x网格也会跨过915侧边约40px宽空隙。仅横屏新增障碍/已放牌边缘对齐候选，<=160px圆桌使用0.5px布局余量，修正容器1px边框坐标；实际零交叠/不裁切断言不变。不是缩牌/缩舞台/隐藏牌。NEXT_ACTION：严格4/11复验再回归。

C4-D最终强验证 DONE：f-edge.txt 4/11两例2/2退出0，三横屏真实可见牌面填充、圆桌边界、名片/身份及舞台零实际相交均通过（740不再沿用隐藏牌）。牌数不减、0相交断言未放宽；生产包index-msq6vzsM.js。NEXT_ACTION：最终全人数批次，4/9/11自然身份公开与死亡，6/8触控回归；全量155已一次通过不再重复。

最终批次进度：4人自然死亡/全员存活身份公开1例通过（e-public-4.json deathCovered=true），6人严格触控/显示/边界通过；当前8/9/11继续同一批次。最终类型检查退出0。新的36px横屏名片锁定高度，修复执行者文字额外换行造成的形变；740已明确显示所有公开牌。NEXT_ACTION：等def-final.txt全部结束，再决定P3 VERIFIED，不能提前发布。

## 当前唯一有效恢复摘要：P3 VERIFIED（Web隔离候选，2026-11-19）
C4-D DONE：修复原11人4张牌侵入舞台；中心线与障碍/已放牌边缘候选补齐原采样空隙，仍保留原合法位置优先。修正44px真实牌高和容器1px边框模型，仅低高度缩减布局间隔、不改实体牌大小/舞台大小。修复<=800竖屏规则误隐藏740横屏公开牌，明确display:block；固定横屏名片36px与紧凑文本，消除技能标签换行导致最高94px形变。没有隐藏牌、裁切重要内容、禁用pointer-events或放宽实际碰撞断言。
C4-E DONE：4/9/11通过真实规则轮抽/密探查阅、盲眼刺客真实超时不反应死亡、自然轮末多人公开身份；三个e-public JSON的deathCovered均true，原/终全部身份牌坐标最大差均0px，死亡前后身份坐标差<=1px、灰白正常；已知身份光晕及纯数字角标通过。保留死者未按规则公开的身份，不泄漏秘密。
C5-F DONE：最终独立Playwright五人数5/5退出0（def-final.txt，3.9分钟）；4/6/8/9/11全部合法目标触控/取消/重选/确认、非法禁用；844x390/915x412/740x320页面无纵滚动、确认可见，牌面非零且图片填满原框，公开牌与舞台/名片无实质交叠、不越圆桌；1366x768桌面操作回归通过。11人各横屏均6张真实可见牌、zeroSize=0。页面横向尺寸沿用C3零溢出，新增牌面/名片边界断言确保新元素不超视口。全量本轮仅一次155/155，类型检查0、隔离构建0。
本轮产品修改：games/night-of-the-ninja/TablePlays.vue（矩形候选定位）；landscape.css（横屏公开牌恢复、名片固定高度及紧凑字体）。View.vue与原landscape多人数位置是前轮C3成果，保留。测试新增/扩展tests/ninja-landscape-interaction.spec.ts（环境开关控制长流程）、此前tests/ninja-events.spec.ts横屏验证保持；没有引擎、服务端、权限或机器人改动。
关键证据：p2082-p3-d-before-summary.json（原始关键DOMRect转录）、collision-before.txt；p2082-p3-d-after-11-{844,915,740}.json（含stage/ring/card/image/seat矩形）；d-target-{4,6,8,9,11}.png/json；e-death-{4,9,11}.png/json；e-public-{4,9,11}.png/json；def-final.txt、def-final-check.txt、def-full.txt、f-build.txt。均位于work/logs。中间失败保留，包含重复阶段定位器及反应助手等待问题，不计入通过数。
可复现最终命令（PowerShell，工作树根目录）：设置NINJA_TEST_ASSETS=work/logs/p2082-p3-candidate/dist、NINJA_CHECK_STAGE_AVOIDANCE=1、NINJA_FINISH_PUBLIC_ROUND=1、NINJA_E_COUNTS=4,9,11，然后node_modules/.bin/playwright.cmd test tests/ninja-landscape-interaction.spec.ts --workers=1。种子83及固定顺序4/6/8/9/11；注册/对局随机流以该独立批次为准，不并行混跑其他房间。候选包work/logs/p2082-p3-candidate/dist，最终product index-msq6vzsM.js（以f-build.txt实际文件为准）。
安全状态：测试浏览器/隔离服务器已自动结束。未提交、未推送、未部署，未操作3199/3213/3216/FRP/既有数据库。Gen7/Qwen/ML和脚本、路线图原有并行差异全部保留，不可整体暂存。
P4恢复第一项：先读本摘要、查看d-target-11与e-public-11图，再按单独批准的P4范围补手机聊天/情报/复盘/教程；不要重复P0～P3。实体手机全屏/方向锁成功路径、真人长期触屏手感和复杂技能完整手机流程仍属后续人工/P4-P5，不在本轮宣布已验收；不实现延期变形者未知身份候选。

## P3.1 P31-C0 IN PROGRESS (2026-11-19)
实际HEAD=d0af520；P3产品已提交，断点中未提交/未部署描述为旧记录，以新任务提供3216已部署为准，本轮不访问该实例。保护现有README/TEST_REPORT、路线图和机器人所有并行差异。只做前端。待测：112px工具列/112px操作区挤压桌面；不可操作compact卡横排溢出；浮动全屏挡HUD；9px昵称/8px状态过小；弹层高度与键盘。NEXT：复用P3真实多人测试采样baseline，再局部调整。

P31-C0 DONE：已复用真实4/6/8/9/11房间采集baseline JSON/截图，见p2082-p31-baseline-*。HEAD d0af520。P31-C1 IN PROGRESS：72px侧栏、84px底栏替代112px；HUD32px，名片文字11px/状态9px、身份28x40；不可操作compact卡改竖排限宽；全屏入口迁入公共导航，仅忍者启用，保留原逻辑。隔离构建通过；待测新尺寸/严格避让。

P31-C1 DONE（初测4/6/8/9通过，11未完成）：新网格已生成截图/layout JSON；844圆桌增宽40px、增高34px，舞台尺寸随后以JSON对照。发现真实触控聊天入口原固定底部遮手牌，已迁入工具列。P31-C2/C3 IN PROGRESS。baseline与新布局合批11人均被30次/分钟认证限流中断，非产品布局失败；改分批<=30注册/实例，不关闭认证限流。NEXT：分批新布局含11人、严格真实出牌测试。

P31-C1 DONE测量：844圆桌714x188→754x222；4人舞台399x93→421x110，9人413x63→436x75；底栏112→84，侧栏112→72。旧baseline仅4/6/8/9完成，11触发认证限流，未宣称通过。P31-C2/C5初验DONE：新9/11真实房间三横屏+1366桌面，席位无相交、身份全部点击、出牌/时间线/情报/设置/指南开关、聊天真实发送2/2（panels.txt）；check退出0。C3/C4待严格公开牌及真实阶段。C6入口迁移已验证在导航内；实体全屏/锁向成功仍需人工。NEXT：p31-interaction严格9/11，之后4/6/8。

P31-C3/C4进度：不可操作compact卡竖排限宽已新增真实draft2自身scrollWidth断言；密集9人严格公开牌/舞台/席位避让、触控和自然死亡/轮末公开通过，11仍运行，见interaction-dense.txt。中央文本11px/标题14px、技能图32x44、揭示图18x24、弹层13px与动态高度；私人提示限65%宽/75%高保持原8秒逻辑。新增仅横屏手牌说明入口复用真实私有own.hand与CardFace，待重新构建/菜单验收，不改权限或规则。

P31-C3严格9/11出牌/死亡/公开2/2通过（interaction-dense.txt）。C5新版手牌说明+工具面板+聊天+旋转/全屏失败回退，4/6/8三例通过（panels-small.txt）。发现目标阶段固定名片内四行Grid挤压昵称（原测试仅容器未识别），C2小修：昵称独立13px行、信息block、行动标签贴名片边缘不占正文行，加入昵称实际高度和上下边界断言；待该修复专项。非规则变更。

P31-C2/C3密集修复后9/11目标阶段昵称文字边界、严格避让及所有工具4/4通过（final-dense.txt）；740截图发现状态栏三行和确认按钮盒模型溢出，已改状态2x2和按钮border-box，待最终验证。P31-C5补原有游戏规则/阶段帮助的横屏专用工具入口（桌面原位保留且新入口隐藏）。新增长昵称+详情还原断言。全量155/155退出0，后续均纯CSS/现有组件入口，不重复全量。NEXT：final-small结束，重新构建后密集/全人数最终。

P31-C2/C3上轮小人数4/6/8严格出牌+菜单6/6通过（final-small.txt）。最终增补手机规则入口和长昵称后密集验收运行中；已完成一次全量155/155，check0。C4保留真实9/11死亡/公开证据；C7新增真实完整比赛直到冠军/本轮及完整复盘，及复用exchange/mirror场景的横屏专项，不修改引擎。下一步：dense批次结束，再跑small+events独立批次避免端口/认证限流。

P31-C7发现并修复待验：真实比赛第3轮冠军后，App既有room-panel-finished（肖像/新局设置）加入主页面，740纵溢出208px；不是舞台溢出，诊断round-3-2.json与round-overflow.png。仅忍者横屏将该已有面板改为可展开房间管理浮层，保留全部准备/重开/退出功能，桌面和其他游戏不变。另修confirm.primary继承7rem min-width导致低高度横向侵入侧栏，以及Rules内部wrapper未命中按钮尺寸。NEXT：重新构建，单独tournament+小人数/events批次，密集纯布局回归。P31尚未VERIFIED。

P31-C7收尾进度：最终小人数目标交互4/6/8三例通过（acceptance-small.txt）；events复用原竖屏断言要求confirm position=fixed不适合本横屏Grid，已替换为完整可见与可点击断言，不改游戏状态/碰撞断言，待单独复验。tournament房间管理修复待本批次结果。所有真实失败证据保留，不计为通过。最新check0，生产构建0，full155/155。

P31-C5/C7实际新进展：acceptance-small.txt中除旧fixed定位断言外7例通过，包括4/6/8交互+全部面板及真实三轮冠军/轮末复盘/完整复盘/房间管理；冠军已消除740终局208px页面溢出。逐图又发现冠军正文位于舞台下方：现以CSS顺序将冠军置顶、缩紧头像与图注，原轮结果仍可内部滚动查阅，新增三横屏冠军标题完整入视口断言。最终acceptance-final批次（events/9/11/面板/tournament）正在运行；本轮尚不能标VERIFIED。NEXT：读该日志，只修真实失败；check并保存终态。

P31-C3/C4事件专项DONE：真实变形者查看/交换/公开流程、隐士看牌、刺杀及镜僧反杀、死亡灰白/身份绑定、私密面板；最终events1/1通过59.1s（acceptance-final.txt），非DOM伪造。最终9/11严格避让和目标交互2/2也通过；等候冠军标题入视口及全部工具面板最后结果。最新check退出0。无服务部署/提交。

## 最新唯一恢复摘要：P3.1 VERIFIED（隔离浏览器验收，2026-11-19）
P31-C0 DONE：实际HEAD d0af520/feature/night-of-the-ninja；读取AGENTS及P2082断点、STATE/TASKS和git。复用真实P3客户端；baseline4/6/8/9测量有效，baseline11因30次/分钟认证限流中断，后续分批运行，不关闭限流。space-comparison.json保存有效新旧对照。
P31-C1 DONE：横屏72px工具列/84px底栏（低高度78px）/32pxHUD；844圆桌714x188→754x222，四人舞台399x93→421x110；9人413x63→436x75。动态高度和安全区保持，桌面不变。
P31-C2 DONE：4/6/8/9/11三横屏与1366桌面，名片及身份绑定；昵称11px独立13px行，状态2x2避免挤掉昵称；执行标签贴边不占正文行；身份28x40。长昵称省略但有title/授权身份详情完整昵称入口。全人数真实目标点选/取消/重选/确认、非法禁用、已知光晕/纯数字角标、公开牌舞台/席位严格零相交均通过。原TablePlays算法未更改。
P31-C3 DONE：不可操作compact卡竖排限宽并真实draft2自身scrollWidth断言；确认primary去除桌面7rem最小宽度，盒模型不侵入工具列；仅横屏新增手牌说明弹窗，数据只来自本人own.hand，使用原CardFace；可选、锁定、秘密提交、跳过、反应及无可操作阶段通过。740公开牌仍全部显示。
P31-C4 DONE：中央文本/图片/揭示/私人提示按横屏密度调整；不改时间线/权限/8秒私密队列。真实9/11死亡与轮末公开见interaction-dense.txt；真实4人变形者/隐士/镜僧反杀/死亡见最终events；终局冠军置于舞台首位、三横屏标题完整可见，旧结果仍可内部查看。
P31-C5 DONE：出牌区、时间线、情报、身份/卡牌说明、游戏规则、阶段帮助、指南、设置、聊天真实发送及关闭，4/6/8/9/11均完成，弹窗/关闭入口边界断言通过；聊天入口移入工具列，不再盖手牌。真实完整比赛到冠军（最终批次4轮），轮末/完整复盘、终局房间管理可操作；App原冠军房间面板曾导致740纵溢出208px，现仅忍者横屏折叠为可展开房间管理，原准备/新局/退出保留。
P31-C6 DONE（浏览器范围）：全屏入口位于?和设置之间，仅忍者小视口；复用原请求全屏/锁方向及失败提示，加入fullscreenchange与卸载清理。390竖屏提示→844横屏恢复、模拟不支持全屏失败路径通过。没有伪称实体全屏、Android软键盘或刘海安全区实测。
P31-C7 DONE：acceptance-final.txt最终6/6退出0（events1、9/11目标2、完整比赛1、9/11面板2，3分钟）；acceptance-small.txt中4/6/8目标+面板6项通过，最终冠军CSS置顶不影响这些选择阶段；该旧批次另有旧竖屏fixed断言失败，已改为横屏完整可见/实际确认并在最终events通过，不能把旧失败计为成功。总体12个定向场景有通过证据。全量npm test仅一次155/155退出0（full.txt）；最终check退出0（check.txt）、隔离build退出0（build.txt）。没有再次运行无关全量测试。
产品文件：apps/web/App.vue（终局横屏房间管理折叠）、components/GameToolbar.vue（挂载原ViewportMode）、games/night-of-the-ninja/View.vue（移出原浮动全屏/横屏规则入口）、ViewportMode.vue、OperationStage.vue（手牌说明）、landscape.css。新增4个tests/ninja-landscape-p31*.spec.ts；未修改engine、协议、权限、其他游戏或机器人。
证据统一work/logs/p2082-p31-*：space-comparison.json、baseline/layout-人数-视口截图及JSON、d-after-人数-视口.json/d-target-人数.png、event-reaction-mobile/event-death-4.png、e-death/e-public-9/11、champion-{844,915,740}.png、tournament.json。候选work/logs/p2082-p31-candidate/dist（index-CyWkgLf_.js，实际以build.txt为准）。无自动部署；3216继续原P3，未访问3199/3213/3216/FRP或既有数据库。
恢复命令：NINJA_TEST_ASSETS=work/logs/p2082-p31-candidate/dist；NINJA_P31_COUNTS=9,11或4,6,8；NINJA_CHECK_STAGE_AVOIDANCE=1；运行playwright test tests/ninja-landscape-p31-interaction.spec.ts tests/ninja-landscape-p31.spec.ts --workers=1。events与tournament建议独立批次（同认证IP每分钟30次），NINJA_LANDSCAPE_STATES=1；需要真实9/11死亡长流程时再启用NINJA_FINISH_PUBLIC_ROUND=1、NINJA_E_COUNTS=9,11。勿同时启动占用相同隔离端口的批次。
安全/交接：所有测试由Playwright托管关闭；未提交/未推送/未部署。保留README/TEST_REPORT原先修改和Gen7/Qwen/ML、机器人、路线图全部并行差异。P3.1下一步仅用户实体手机验收与ChatGPT+RDC独立复核，再另行授权定向提交/部署；P4/P5未提前实施。实体Android全屏/方向锁成功、退出全屏、真实键盘/工具栏/安全区及长期触控舒适度仍未实测，需人工确认。复杂新技能流程与变形者候选展示仍延期。P31不等同正式发布。

## P3.2恢复检查点 P32-C0 DONE / C4 IMPLEMENTED（未验收）
已读取附件、核对HEAD d0af520与P3.1全部未提交成果及并行机器人差异。3216按用户最新说明已为P3.1，本轮不访问。仅先修改ViewportMode.vue：失败提示单例4秒消失、可手动关闭、重试先清旧、卸载清理；提示移到底部，不盖HUD。C1左右席位/C2舞台/C3手牌/C5浏览器均TODO，不得标VERIFIED。NEXT_ACTION：先添加复用P31真实房间的全屏失败关闭/4秒/重复测试，再实施左右列与严格公开牌避让。未启动测试服务；无提交推送部署。
P32-C4最小验证：npm run check退出0。尚未执行浏览器定时/关闭验证；本轮只形成提示修复的可编译断点，左右列与舞台尚未修改，P3.2未完成。
`nP32-C4验收进行中：新增tests/ninja-landscape-p32-notice.spec.ts，复用P31真实四人房间。修复底部提示遮手牌风险：提示固定顶部并为主页面预留58px，不覆盖HUD/手牌/确认；验证关闭、4秒、重复触发。隔离构建通过；测试日志work/logs/p2082-p32-c4.txt。C1/C2/C3/C5仍TODO。NEXT：读取本日志确认实际结果，然后开始左右列联合布局。无提交部署。
P32-C4 DONE（最小浏览器验收）：1/1退出0，真实四人房间，关闭、重复后重置4秒、单例、HUD/手牌/确认无矩形交叠通过；测试服务已自动关闭。NEXT_ACTION：C1+C2左右纵列与中央舞台联合布局，保留当前C4，不重复验收。其余未完成，不得标P3.2 VERIFIED。
P32-C1/C2/C3 IN PROGRESS：View仅改横屏坐标变量为沿相对座次左右两列；landscape末尾独立覆盖侧列17%、按高度行高、中央5px/26%以及74px统一手牌与76px紧凑跳过。桌面left/top未改。隔离构建通过，dense测试运行中见p2082-p32-dense.txt。未验收，禁止标VERIFIED。
P32最新状态：左右列第一版未通过，dense四例均失败（9/11交互及布局）；详见work/logs/p2082-p32-dense.txt和test-results对应error-context，不能标完成。新增改动仅View横屏变量与landscape末尾P32覆盖、新增两测试；未改引擎、服务或并行成果。下一步必须先读取失败断言与DOMRect修正联合布局，不能重复全项目分析。候选未部署，C4原验证保留。
P32根因修复：旧身份牌百分比高度与auto名片产生固有最小高度，密集行实际超出行距；增加仅横屏ring size容器、席位组合按实际容器高度/列人数确定高度，名片与身份继承组合高度；状态固定单行不wrap。构建通过，dense-fix验收运行。
P32修复进展：dense-fix三项通过（9交互、9/11布局），11交互仅740状态下边界失败；真实组合可用高度不足原13+10正文及4px边框，现行距减为1px、昵称12px/状态10px（非缩小字体）后独立复验，日志p2082-p32-11-final.txt。严格碰撞断言未改。
P32-C1/C2密集联合修复完成初验：11严格目标交互独立1/1通过，原9/11四项失败均已有对应通过证据；完整小人数6项批次运行中。C3统一74px卡牌/紧凑pass已进入同批真实轮抽与目标测试，待最终综合。
P32-C5：4/6/8全部严格交互+布局6/6通过；9/11布局3/4首批及11交互独立通过，最终事件/冠军/9/11面板批次运行中。desktop-comparison.json通过1366桌面五种人数席位及身份牌DOMRect逐项对照P3.1，最大差全部0px。仅横屏布局改动，未改变桌面尺寸。

P32最终综合事件+冠军+9/11布局4/4通过（p32-final.txt）；桌面全部0px差。stage-comparison发现4人无公开牌时仍被P31 :not(:has)高优先级覆盖，只闲置舞台高度110未扩大，新增同优先级横屏覆盖，需最终4人复验；非4人844舞台74.8→210px。C4四人已通过，十一提示仍运行。

P32四人最终舞台覆盖已验证3/3（four-final.txt），空桌中央高度已扩大且严格出牌避让通过。提示横屏改为导航高度内的单行通知、不再挤压牌桌（纵屏仍原预留），保留4秒/关闭/重触发机制；新增提示期间状态文字边界断言，4/11最终通知测试运行。最终check/build执行中；无服务变更。

P32最终待收尾：C4最终4/11两例2/2通过，提示出现时席位与状态文字无溢出；横屏通知不再改变牌桌高度。最终check/build通过，产品index-D5zu8KiC.js。stage-comparison已更新，844所有人数中央高度210，四人原110其余74.8。最后9交互复验运行中（nine-final.txt），通过即可最终VERIFIED；所有既有服务未操作。

## 最新有效摘要：P3.2 VERIFIED（隔离浏览器验收，2026-11-20）
C0/C4继承完成；C1+C2/C3/C5现全部DONE。未提交、未推送、未部署；3216按用户说明继续P3.1，未访问3199/3213/3216/FRP或既有数据库。
原四项失败是实际产品问题：身份牌百分比高度/名片auto固有高度使侧列组合超过行距；状态换行和正文行高使低高度11人越框。修复：横屏ring size容器，整体席位高度=min(42px,实际容器高度/最大列人数-1px)，名片及身份绑定继承高度；昵称12px行高（字体不等比例缩小），状态单行，保留全部状态、头像、荣誉、手牌和身份入口。没有删除元素、放宽碰撞断言或更改游戏/权限。
左右顺序按真实相对座次：本人左下沿左列向上，再右列向下；4/6/8/9/11分别2+2/3+3/4+4/5+4/6+5。桌面left/top算法和媒体外样式未更改。中央连续区5px上下、26%左右，公开牌仍用原DOMRect严格避让算法，TablePlays未修改。844舞台高度全部210px（4人原110，其他74.8），见stage-comparison.json。
手牌：可选/不可选同74px外框和38px图片；跳过76px紧凑选项、40px最小高度、文字11px。既有锁定/选择/取消/确认/详情/等待流程不变，未增加底栏高度。
C4保留关闭/4秒/重复重置；横屏提示位于导航高度内，不再预留58px挤压密集席位；纵屏原回退保留。提示出现时HUD/手牌/确认无矩形交叠，席位及状态无溢出。
验收14个独立场景均有通过证据：small.txt 6/6（4/6/8目标+布局面板）；final.txt 4/4（真实变形者/隐士/镜僧反杀/死亡1、完整比赛至冠军/复盘1、9/11布局面板2）；11-final.txt 1/1与nine-final.txt 1/1（密集严格目标交互）；notice-complete.txt 2/2（4/11关闭/4秒/重复/状态及遮挡）。four-final.txt另有4人最终舞台专项3/3。所有三横屏844x390/915x412/740x320和1366x768桌面均覆盖；目标逐个点选/取消/重选/确认，非法目标禁用、真实身份切换、死亡灰白、公开牌不遮舞台/席位且完整显示等断言通过。未将早期失败计为通过。
桌面量化对照：desktop-comparison.json，五种人数1366x768的席位和身份矩形逐项对照P3.1，最大差均0px，同时真实交互回归通过。最终npm run check退出0（check.txt），隔离build退出0（build.txt，index-D5zu8KiC.js）。本轮纯前端布局/提示，不重复引擎全量155单测；执行上述实际规则浏览器综合回归。
本轮增量产品文件：games/night-of-the-ninja/View.vue（只改横屏变量）、landscape.css、ViewportMode.vue。P3.1其余未提交文件保留。新增tests/ninja-landscape-p32*.spec.ts复用P31真实场景，不改原P31证据。截图/DOMRect/日志统一work/logs/p2082-p32-*；代表d-target-11.png、layout-11-740.png、event-reaction-mobile.png、event-death-4.png、champion-740.png。隔离候选work/logs/p2082-p32-candidate/dist。
恢复命令：设置NINJA_TEST_ASSETS=work/logs/p2082-p32-candidate/dist，NINJA_P31_COUNTS=4,6,8或9,11，NINJA_CHECK_STAGE_AVOIDANCE=1，playwright test tests/ninja-landscape-p32-interaction.spec.ts tests/ninja-landscape-p32.spec.ts --workers=1。事件/冠军用对应p32-events与p32-tournament，NINJA_LANDSCAPE_STATES=1；提示用p32-notice，counts=4,11。批次串行，避免端口和30次/分钟认证限流。
所有测试实例/浏览器已由Playwright关闭。Git全部保留未提交状态，未暂存。Gen7/Qwen/ML、机器人脚本、路线图与其他并行成果保持不动。NEXT_ACTION：交ChatGPT+RDC独立核验与用户真实手机验收，之后另行决定定向提交及部署；不得自行部署。本次无未解决浏览器阻塞。Android真实方向锁/全屏/安全区/软键盘与触控舒适度仍需人工，VERIFIED不代表真机或正式发布；P4/P5和未知身份候选未实施。

## P3.3 C0 DONE / C5 IN PROGRESS（2026-11-20）
已读任务书及公开牌补充，保护P3.1/P3.2所有未提交成果和并行脚本。只先为TablePlays横屏新增所属席位内侧水平候选，优先同纵坐标、多牌按完整牌高纵向错位，不改变桌面候选、可见状态和退出动画。严格DOMRect检测沿用。当前未做浏览器验收，C1手牌/C2聊天复现与权限回归/C3私人面板/C4手势全屏/C6综合均待实施，不得标完成。NEXT：先对p33五人数真实queued/resolving、详情及牌间零交叠补测试，再实施其余任务。无提交/部署/服务操作。
P33当前最小验证：npm run check退出0（p2082-p33-check.txt）；没有启动测试实例。受本轮可用执行资源限制，尚未继续浏览器与C1～C4，C5也仅实现初版候选，可能仍需最近可用位置的归属标签及严格牌间避让。所有未完成项必须从此处继续，不得用类型检查替代验收。

P33恢复推进：C5候选保留并启动真实9/11严格测试；C1初版横屏普通手牌恢复直接展示，74px/38px与操作牌统一，留96px确认区域；C3初版横向私人面板和确定列、恢复pointer-events。尚未改8秒队列，C2聊天未修改（必须先复现），C4手势流程未修改。均未验收，不得标DONE。NEXT：读取p33-dense.txt失败并修复，然后补全部C1～C6测试。
P33最新失败：p33-dense.txt两例均实际页面纵溢出11px，尚未走到公开牌完整断言；根因为恢复普通手牌后低高度操作区内固有卡高/内边距，已局部限制展示手牌64px border-box并校正行高，未复验。C2/C4未实施，C3队列仍8秒，不能标完成。资源限制中止前断点：下一项必须重新构建并重跑p33-interaction9/11；不得把此失败写成公开牌已通过。测试实例已退出，未操作现有服务。
P33最新增量：已用真实service测试以过期phase复现聊天失败（chat-before退出1），仅game继续严格phase，chat仍严格match/成员/当前canChat/频率/回执（chat-after日志）。横屏私人队列改手动确认，桌面8秒不变；横屏错误浮层及关闭入口不进Grid，其他场景按钮隐藏。普通手牌操作Grid固定4等分行，复验dense-after运行。C4进入全屏最佳手势路径仍未做，全部新UI及队列尚待专项验证，不可VERIFIED。
P33 dense-after失败2/2：16px纵溢出，定位为新4行Grid与已有options span5产生隐式第五行。已改显式5行，并将仅普通展示手牌定位在操作区内部left120/right100/top5/bottom5，不参与行高计算、不扩大底栏。该修复尚未复验。NEXT必须构建后重跑p33-interaction，再完成C4及新增聊天/UI/队列/公开牌归属等验收。没有宣称完成。

P33进展：Grid修复9/11目标交互2/2通过。全量155/155通过，含聊天过期phase与当前禁言/频率回归，chat-before已真实失败→after成功。C4新增仅忍者小视口真实start/继续对局手势立即请求全屏/方向锁，失败不阻塞，原按钮重试保留。C3横屏主动确认，桌面8秒保留；事件测试增加真实8.2秒仍可确认断言。C5增加实际牌间零交叠、内侧方向、每牌点击详情断言，尚待最终结果。不要提前VERIFIED。
P33新增严格验收发现740牌间重叠（spy-4/spy-3与spy-3/spy-5），旧逐牌贪心最低代价回退无法保证后续空间；新增仅横屏的整体空位回溯匹配、最近所属者排序、空位去重和有界搜索，桌面分支不动，待复验。事件旧8秒消失断言已按正式手动确认设计改为先验证仍存在再真实点击确定。不能把失败批次计通过。
P33最终批次启动：chat-final服务定向1/1（错误match拒绝、过期phase可聊、同id幂等、禁言/频率均保留），前轮全量155/155。小人数新增手牌可见/牌内侧/牌间零碰撞/逐牌详情/错误浮层不移动导航断言，密集+事件8.2秒手动确认+冠军继续串行测试。原进行中的已知失败批次已停止，不计入通过结果。
P33收尾进度：multi-small 3/3（含完整公开数量/秘密提交不显牌/内侧/逐牌详情/牌间零碰撞）；multi-dense事件1与11交互通过，9多牌碰席位未通过，已将整体匹配触发范围扩展到所有障碍与边界，acceptance最终6例运行中。UI-final 4/4，含4/11全屏实际请求调用记录、4秒/关闭、普通面板/聊天，以及错误浮层不移动导航。事件实际8.2秒不消失、手动按来源顺序确认变形者两条提示已通过。没有改信息权限。全屏限制已核对W3C https://www.w3.org/TR/screen-orientation/，系统不保证自动方向锁，真机仍待人工。
P33最后验收：acceptance 6/6通过（事件、9/11多牌内侧严格检查、冠军、9/11界面）；private-complete 1/1确认普通私人面板无纵滚动且按钮在视口，8.2秒及队列顺序真实通过。桌面席位/身份五人数差0px。额外桌面公开牌对照测试第一版夹带移动resize导致旧版手牌不可见断言失败，已改纯桌面1366全程重跑，不改产品或放宽桌面断言；旧失败不能计入通过。当前等待old/new两次对照结束。
P33核心已通过：五人数严格手牌/秘密提交→完整公开数量/内侧/归属详情/多牌及牌间避让；9人5张牌4名执行者的真实双牌场景通过。private-complete无纵滚及确认、8.2秒/队列，desktop old/new两次均通过且公开牌坐标/尺寸0px差、身份前后状态完全一致。最后经典聊天完整对局2例运行中（classic-chat.txt），无既有服务器操作。待该回归完成再写最终VERIFIED。
P33经典回归最初2例因隐藏关闭按钮文字污染旧错误正文失败，现按钮只忍者渲染且正文textContent不变，classic-chat-final已2/2通过（含真实聊天滚动/延迟快照/错误草稿）。忍者error-final1/1通过。额外二次决策页面级边界断言发现底部重复情报区固有高度造成33px溢出，已将该重复区限定在原操作区两行内可查阅；中央主要私人面板仍默认无纵滚且确定始终可达。不得把此新增失败计入通过，需skill-layout复验。

## 最新唯一有效恢复摘要：P3.3 VERIFIED（隔离浏览器验收，2026-11-20）
C0～C6全部DONE。真实修复及验证已完成，不再从旧失败断点恢复。未提交/推送/部署，未操作3199/3213/3216/FRP、既有数据库或机器人；3216当前P3.2来自用户说明，未在本轮访问验证其健康状态。
C1：横屏普通本人手牌直接显示，目标/等待/提交后不再要求先开说明；与可选/不可选牌同74px外框、38px图，跳过紧凑，确认区留空。修复原11px溢出后发现4行与options span5产生隐式行16px，现显式5行与普通手牌操作区内定位；二次选择时手牌与选项各占可用区一半，不覆盖确认。
C2：真实service测试过期phase聊天先失败（chat-before.txt），修复后同一会话/房间/match/操作权/当前canChat仍严格，只有chat不再误拒绝旧phase；game仍严格phase。错误match拒绝、禁言（含旧phase）、频率、同id幂等且只一条均通过。服务定向chat-final.txt 1/1；全量full.txt 155/155。手机忍者错误条固定定位+可关闭，不进入Grid；经典回归发现隐藏关闭文字污染原错误正文，已限定忍者且正文textContent不变，经典与忍者均复验通过。
C3：横屏私人面板横向两列、可触控、确定固定可达，普通面板无纵向滚动；横屏队列主动确认，桌面仍8秒。身份/密探/隐士/被看牌/变形者/反应信息真实覆盖，8.2秒仍可读，按来源顺序确认；刷新不重播旧信息，新轮清理和私有权限保持。操作区重复情报小面板曾33px溢出，限定在既有两行内可查阅，中央主要私人面板保持普通信息完整默认可见。
C4：新增immersive.ts，仅忍者小视口在真实start/继续对局手势中立即请求fullscreen再lock，不等待网络；失败不阻塞正常命令，保留原顶部一次点击入口、关闭/4秒/重触发提示和监听清理。notice真实启动请求调用与失败回退通过。规范依据https://www.w3.org/TR/screen-orientation/；无法保证解除Android系统旋转锁，成功方向锁/软键盘/安全区/真实触感仍需用户真机验证，不宣称模拟器等于Android实测。
C5：仅手机横屏增加所属玩家内侧/同纵向候选；多牌完整牌高错位。保留P3.2中央尺寸，DOMRect严格检查；贪心放置密集时曾两牌重叠，新增整体空位匹配（最近所属者排序、去重、有界回溯），触发覆盖越界/席位/舞台/牌间所有冲突；不缩牌、不藏牌、不放宽断言。手机牌面内显示所属玩家名称，点击详情显示完整姓名；桌面原标题/布局/动画不变。秘密提交未齐0牌，全员后期望数量全出现；queued/resolving高亮与退出机制保留。同人两张真实公开牌独立证据double-proof.txt 2/2（事件预热+9人），double-coverage.json三个横屏均5牌4人/其中1人2牌，严格牌间/席位/舞台/边界及逐牌详情通过。
C6证据全部work/logs/p2082-p33-*：small-complete.txt 6/6（4/6/8交互+布局）；acceptance.txt 6/6（事件、9/11严格交互、9/11布局、完整比赛至冠军/复盘）；ui-final.txt 4/4（包含新增4/11全屏请求/失败关闭/定时/重触发与界面，布局场景有重复）；private-complete.txt及skill-layout-final.txt各1/1（普通私人面板不纵滚、按钮完整可达、二次技能页面不溢出）；spy-small.txt 3/3、spy-dense.txt 2/2（五人数密探真实私人面板与严格公开牌）；error-final.txt 1/1（错误条不移动导航且可关闭）；double-proof.txt 2/2。基本P3.3 14个场景有通过证据，额外加测不混入唯一数量。三横屏844x390/915x412/740x320及1366x768桌面均覆盖，保留的早期失败不计通过；桌面对照夹具的诊断失败已在断点记录，old/new日志为最终复验结果。
经典公共聊天回归：classic-chat-final.txt 2/2，《骰子狼人杀》三人完整积分/加赛/冠军、诡吹灯三人完整对局/重启，含聊天长文本/未读/草稿/快照先后/滚动/频率/错误。未修改这两款游戏源文件。
桌面：desktop-comparison.json五人数席位/身份矩形差0px；desktop-old/new.txt各1/1，用同种子P3.2候选与P3.3做真实1366桌面公开牌/详情/目标操作，desktop-card-comparison.json公开牌位置/尺寸差0px、身份前后变化完全一致。初版夹带手机resize及手机稳定性断言导致基线也失败，现改为真正纯桌面逐状态新旧精确对照；手机零碰撞/位置稳定断言保留，不改变旧桌面行为。
最终npm run check退出0（check.txt），隔离生产构建退出0（build.txt，候选work/logs/p2082-p33-candidate/dist；index-t8tuIhyX.js，以build.txt实际文件为准）。最后产品变化是忍者专属CSS/错误按钮门控，核心协议已完成全量155/155和额外服务断言，不反复重跑不受影响的规则单测。
P33增量产品：apps/server/service.ts/service.test.ts、apps/web/App.vue、games/night-of-the-ninja/View.vue/TablePlays.vue/landscape.css、新增immersive.ts；复用OperationStage模板和ViewportMode手动入口，P3.1/P3.2其他未提交成果全部保留。新增tests/ninja-landscape-p33*.spec.ts；README/TEST_REPORT与STATE/TASKS只追加本阶段记录。并行Gen7/Qwen/ML、机器人脚本、路线图等未改动，严禁整体暂存。
关键截图：d-target-{4,6,8,9,11}.png；double-d-target-9.png及double-d-after-9-{844,915,740}.json；event-reaction-mobile.png/event-death-4.png/event-intel.png；champion-{844,915,740}.png；对应layout/测量JSON和全部日志。失败日志可追溯真实修复，不将静态截图替代交互。
复现：NINJA_TEST_ASSETS=work/logs/p2082-p33-candidate/dist，NINJA_P31_COUNTS=4,6,8或9,11，NINJA_CHECK_STAGE_AVOIDANCE=1，playwright test tests/ninja-landscape-p33-interaction.spec.ts tests/ninja-landscape-p33.spec.ts --workers=1。事件加NINJA_LANDSCAPE_STATES=1。双牌固定复现串行events后9人interaction、seed83，NINJA_P33_EVIDENCE=p2082-p33-double-（保存独立证据）；不要同时启动相同测试端口或超过30注册/分钟/实例。桌面对照fixture用P33_BASELINE=old/new切换P32/P33静态目录。
最终状态：隔离测试实例/浏览器由Playwright自动关闭，未暂存、提交、推送、部署。无未解决P3.3浏览器功能阻塞；可交ChatGPT+RDC独立核验，再另行决定定向提交和3216部署。NEXT_ACTION：独立复核本摘要/证据及用户Android真机验收（全屏/系统方向锁/真实键盘/安全区/触控），不能把Web VERIFIED写成真机或正式发布；不提前扩展后续阶段。

P3.3.1 F1/F2真实复现：before11初始740下resolving元素存在但visibility:hidden；private-before初始身份图片突破30px容器。修复View updateSeatLayout独立于仅桌面placeIdentityCards，且不再对801～1000横屏执行桌面算法；F2仅横屏统一身份32x44与compact130/图32x44、等级框14、honor36及flex边界。当前small4/6已通过，其他测试运行；新增刷新/可见CSS与面板图片/等级/牌间矩形断言。最新文本min-width修补尚未重新构建，需随后最终候选再验，不能提前VERIFIED。
P3.3.1当前：最终直接740首入4/6/8三例3/3，private+9/11批次3/3，已包含刷新、旋转尺寸、返回大厅原match继续、visibility/display/opacity、每牌触控与严格矩形。9人真实双牌证据已复制为p331-double-*避免后续覆盖。私人面板新增三视口逐条确认/图片等级框及牌间检查和盲眼提示实测；桌面P33/P331私密卡框/公开牌对照批次运行中。仅View和landscape产品变更，最终文字min-width修补已构建。

## 最新有效摘要：P3.3.1 VERIFIED（隔离浏览器验收，2026-11-20）
分支feature/night-of-the-ninja，实际Git HEAD d0af520；P3.1/P3.2/P3.3既有未提交修改及Gen7/Qwen/ML并行成果均保留。仅本次增量产品View.vue与landscape.css，未提交/暂存/推送/部署，未操作3199/3213/3216/FRP或既有数据库。3216已为P3.3来自用户说明，本轮不访问或宣称其健康实测。
F1 DONE：真实旧候选before.txt在11人直接740首入、未先经过844时复现：queued/resolving DOM存在但visibility:hidden。根因placeIdentityCards的>=801门槛令seatLayout一直0。新增独立updateSeatLayout更新版本，ResizeObserver及首次watch均调用；桌面placeIdentityCards只在真正桌面执行，不把801～1000横屏交给桌面调整算法。TablePlays可见状态/候选/避让/动画代码均未修改。5种人数均真实直接740注册/开局/两次轮抽/秘密提交，全员前0公开牌，全员后完整预期数量可见；刷新及返回大厅继续原match后仍可见；再切844/915/1366，逐牌visibility/display/opacity、边界、舞台/席位/身份/其他牌零交叠、归属与触控详情、目标确认通过。
F2 DONE：private-before.txt真实复现原身份图片突破30px外框。仅横屏私人面板中统一身份外框32x44及图片100%+cover、等级14x14、compact130宽/图片32x44、honor36x36，flex子项不缩扁、文字min-width:0、卡间距；不改IdentityCard/CardFace或p20.css共享规则。本人身份、隐士身份+手牌、被看手牌、变形者多条、盲眼通知/镜僧及新轮队列均按真实规则完成；每条在740/844/915逐一测量图片/等级在框内、卡间和图文无相交、object-fit不拉伸、普通面板无纵滚、确定完整可见真实可点击，保持手机主动确认与桌面8秒。
F3 DONE：small-final.txt 3/3（4/6/8首入/刷新/重进及尺寸切换）；dense-final.txt 3/3（9/11同场景及私人流程）；private-complete.txt 1/1为加强后的私人流程，覆盖三横屏逐条确认/边界/图文/盲眼。按去重后手机5场+私人1场计6个，桌面old/new各1场，总定向8场通过，不重复累计复验。
真实双牌：dense-final中私人流程预热后9人，三横屏5张牌/4位执行者/同人2牌，严格避让和详情通过；独立保存double-d-target-9.json/png、double-d-after-9-{740,844,915}.json及double-coverage.json，避免普通批次覆盖。
桌面：desktop-old.txt/new.txt各1/1，对照P3.3与本候选真实1366场景；desktop-comparison.json公开牌位置/尺寸差0px，私人面板/图片/等级框及identity前后状态完全一致，入场动画名/时长相同。首次抽样落在nn-enter不同动画帧而非产品差异，现等待有限入场动画结束再做精确对照，未改变桌面产品或放宽断言。
最终check.txt退出0，build.txt退出0；隔离产物work/logs/p2082-p331-candidate/dist（index-CXxnBsnR.js，以build.txt为准）。仅前端初始化及局部CSS，不重跑规则全量155，沿用已验证P3.3规则/聊天证据；引擎、协议、公共服务端与数据库均未修改。
证据统一work/logs/p2082-p331-*：before/private-before旧版失败、small-final/dense-final/private-complete通过日志；initial-740-{4,6,8,9,11}.png首次公开截图、d-after和d-target矩形/截图；private-frame-*.json含视口、信息文本、图片/外框/卡面/确定矩形；event-reaction-mobile/event-death-4等真实技能截图；double-*与desktop-*。历史预期失败不计通过。
复现：NINJA_TEST_ASSETS=work/logs/p2082-p331-candidate/dist，NINJA_P31_COUNTS=4,6,8或9,11，NINJA_CHECK_STAGE_AVOIDANCE=1，playwright test tests/ninja-landscape-p331.spec.ts --workers=1。私人用p331-private并设NINJA_LANDSCAPE_STATES=1；固定双牌用private后9/11串行同批、seed83。桌面p331-desktop以P33_BASELINE=old/new及P3.3/P3.3.1静态目录对照。批次串行，避免端口/认证30次每分钟限流。
新增测试tests/ninja-landscape-p331.spec.ts、p331-private.spec.ts、p331-desktop.spec.ts；没有重做P3.3。隔离浏览器/服务器均已由Playwright关闭。无未解决本补丁浏览器功能阻塞，可交ChatGPT+RDC独立核验后再决定更新3216；本轮不执行部署。Android实体浏览器/工具栏/键盘/方向锁仍应由用户实机确认，不能将Web VERIFIED写成真机已完成。NEXT_ACTION：独立复核最新摘要、initial740/私人矩形/桌面对照；不得重复从旧失败重做已通过部分，不擅自提交或部署。

## P3.3.2 IN PROGRESS（2026-11-20）
已实现首批F1～F6必要源码：独立commitPicked只映射服务端原合法CSV，单牌逐个选中/取消/组合按钮不渲染；canonical单测1/1、check/build通过。RoomChat仅忍者横屏landscapeInline复用原滚动状态机、底栏右侧常驻；名片名字独立全宽、编号保留；底部说明/阶段分行、商人专用双列令牌与变形者双目标手机标签。原11人首测180秒超时且finally关闭上下文卡住，未算通过；后续已整理布局并加阶段日志/trace复验。尚未VERIFIED。保护全部此前及机器人未提交差异，无部署。

P3.3.2追加：11人真实首入740/844/915/1366全部目标取消重选、公开牌严格避让及详情通过（eleven-fix3.txt 1/1）。此前聊天84px超过78px底栏，修正78/低72；名片相对定位意外继承旧手机top/left，已显式auto并整理姓名+状态两行。正在用真实引擎合法命令推进到第二轮商人交换测试（独立3227），发现并修复商人width100%+margin导致手牌覆盖放弃按钮，最终复验中。新canonical双牌/桌面多选、聊天滚动及技能回归待完成，不可标VERIFIED。

P3.3.2 F1～F6源码已稳定：merchant-final.txt合法第二轮交换与聊天三视口通过；double-final双端2/2通过（测试原先错误断言DOM展示顺序，已改为真实resolving先3后6）；156/156全量单测退出0。private-final.txt长姓名变形者三视口/取消重选/确认时聊天、隐士、盲眼、镜僧、死亡、跨轮/private队列全流程1/1通过。实际修复为显式分配nn-decision-intel列，避免隐式第三列把确认区挤到出牌上；普通二次选择采用紧凑合法按钮。最终候选重新check/build及五人数/复杂技能/桌面批次正在串行验收，尚未最终VERIFIED。独立测试端口3197/3198/3214/3215由Playwright管理；商人/双牌夹具3227按实际规则命令推进，不操作既有服务。下一步读取p332-small-final/dense-private-final/desktop-final日志，执行双牌timeout和merchant-many及经典聊天回归，比较桌面矩形。

P3.3.2最终回归进展：small-final 3/3（4/6/8；额外4人跨竖屏抽屉/横屏常驻切换）、dense-private-final 3/3（长姓名复杂私人技能1场+9/11两场）均为最终构建。desktop-final 1/1；desktop-comparison.json对P3.3.1既有同种子1366数据：席位/身份/舞台/圆桌/公开牌矩形差0px、私人卡面及有限入场动画记录完全一致。merchant-many-final 1/1在真实引擎合法到第4轮、双方各3荣誉下三横屏逐枚选中/取消、横滚、放弃/确认、聊天通过；只向本人展示被查看的一枚目标荣誉。双牌含timeout及经典/冠军回归串行运行中，最后读取对应final日志再决定VERIFIED；未提交、推送、部署。

## 最新有效摘要：P3.3.2 VERIFIED（隔离浏览器验收，2026-11-20）
基线/当前HEAD d0af520，feature/night-of-the-ninja；P3.1～P3.3.1未提交成果、Gen7/Qwen/ML及机器人并行差异完整保留。本轮未暂存/提交/推送/部署；未访问或操作3199/3213/3216、FRP及既有数据库。
F1 DONE：View.vue独立commitPicked + 新commit-choice.ts仅查找服务器原始合法value；OperationStage不渲染组合按钮，逐张多选/取消/不出牌、显示数量、统一确认；阶段/轮次/match/恢复清理及pending防重沿用。双端真实合法轮抽双牌：AB/BA、单/双切换、刷新清空未确认、确认后保密直到全员提交、同一归属2牌公开、服务器按3→6执行；双击确认仍只结算2牌。30秒真实超时自动不出牌、手牌保持2张、新阶段无残留选择。
F2 DONE：仅横屏名片姓名独占第一行、头像+状态在第二行；修正position:relative继承旧手机top/left造成的内部偏移。测试机器人01～11实际scrollWidth检查通过，长名仍可由title/身份详情查看。外部席位布局/顺序/身份权限不改。
F3 DONE：RoomChat新增可选landscapeInline，仅忍者横屏启用；复用原scroll/unread/ack状态机。底栏按27vw聊天+操作区分配，聊天78px/低屏72px严格在底栏内；历史独立滚动，未读浮标、自己发送到底、发送失败留草稿、相同快照不重置、输入/发送可操作。4人真实消息回归+竖屏抽屉与横屏常驻互切、变形者/商人操作中聊天均通过。其他游戏及竖屏原行为保留。
F4/F6 DONE：提示/手牌说明/目标1和2明确行列；变形者短标题、双目标有序标签，三横屏长姓名/取消重选/确认期间聊天通过。私人技能预览显式放入左列，出现预览时说明按钮分配专用52px列，避免Grid隐式列挤压操作区；普通二次选择紧凑化，交换/揭示/反应实际可点。桌面原布局不变。
F5 DONE：merchant状态专用双列荣誉+放弃/确认，面板宽度auto避免100%+margin覆盖手牌；令牌可横滚、所有合法令牌可逐枚选/取消，目标仅被查看的一枚显示值。测试夹具用真实引擎合法命令推进第二轮/第四轮，后者双方各3枚，三横屏交换/放弃/聊天/最终提交通过；未注入DOM假状态，未修改规则或服务端生产模块。
F7 DONE：最终small-final 3/3（4/6/8），dense-private-final 3/3（长姓名复杂技能+9/11），desktop-final 1/1，merchant-many-final 1/1，double-final 3/3（手机/桌面/timeout），classic-final 3/3（骰子完整加赛冠军、蜡烛双方胜利及聊天），tournament-final 1/1（忍者多轮、复盘与冠军）；去重15场。双击确认附加复验double-repeat-final 2/2，不重复计入15场。旧失败均已有实际修复/复验，不计通过。
五人数均直接740首入，三横屏+1366真实目标/取消/确认、公开牌数量/归属/详情/严格矩形碰撞、姓名字宽、提示与手牌说明避让、刷新/返回大厅继续通过。复杂技能包含隐士、变形者、盲眼、镜僧、死亡/离线灰白、公开身份、私人队列/图片和等级边界、新轮清理；私人弹窗P3.3.1修补不回归。
桌面desktop-comparison.json：与P3.3.1已验证同种子1366的名片/身份/圆桌/舞台/公开牌位置和尺寸差0px；私人卡面/有限入场动画记录完全一致。仅双牌多选是预期的桌面交互变化。
最终check-final退出0，unit-final全量156/156退出0，build-final退出0。隔离候选work/logs/p2082-p332-candidate/dist（index-AVNTvIh2.js，以构建日志为准）。git diff --check定向通过。
本轮产品文件：games/night-of-the-ninja/{View.vue,OperationStage.vue,landscape.css,commit-choice.ts}、apps/web/components/RoomChat.vue；新canonical单测及tests/ninja-landscape-p332*.spec.ts、ninja-p332-{scenario,server}.ts/ninja-p332.config.ts。既有TablePlays/引擎/协议/数据库/机器人本轮未改。
证据work/logs/p2082-p332-*：summary.json含去重计数，所有*-final.txt；initial-740/d-target/d-after/name矩形与各人数截图；private-frame-*、before-shift-choice、event-*；merchant-many三视口截图/矩形及合法跨轮场景；double-mobile/desktop；desktop-comparison.json。README/TEST_REPORT/STATE/TASKS仅追加简短本阶段结果。
隔离服务3197/3198/3214/3215/3227与测试浏览器均由Playwright关闭，最终无这些端口监听。3216未更新。
复现：NINJA_TEST_ASSETS=work/logs/p2082-p332-candidate/dist；NINJA_P31_COUNTS=4,6,8或9,11 + NINJA_CHECK_STAGE_AVOIDANCE=1，playwright test tests/ninja-landscape-p332.spec.ts --workers=1；复杂技能用p332-private，NINJA_LANDSCAPE_STATES=1；桌面p332-desktop、count4、P33_BASELINE=new。商人设置NINJA_P332_SCENARIO=merchant-many；双牌=double，playwright test -c tests/ninja-p332.config.ts --workers=1。经典online/dice-online --grep 'three guests'；冠军p33-tournament。串行批次，不超过单实例30次/分钟注册。
已知限制：未执行实体Android手机验收；真实软键盘、浏览器工具栏、系统方向锁/全屏行为需用户真机复核，不将隔离浏览器通过写为硬件通过。无已知未解决的本阶段浏览器功能阻塞。
NEXT_ACTION：ChatGPT+RDC独立核验summary/截图/矩形及当前未提交差异，再由用户决定定向提交和3216更新；本任务明确不提交、不部署，不提前扩展下一阶段。

## TDM-1.0 开始（2026-11-21，未完成，禁止标记VERIFIED）
已读取完整附件任务书、AGENTS及当前状态；分支feature/night-of-the-ninja，保护现有P3.3.2、启停管理器和机器人未提交差异。本次尚未连接或改变3216及其他既有服务。
新增games/night-of-the-ninja/test-data.ts、test-data.test.ts：纯函数预设发牌（部分/全部随机、实体唯一、33张守恒）；荣誉分配/创建/归还/退役/改值/转移/批量设置，复制状态后校验，不在原状态失败半写；仅安全阶段允许。定向2/2通过，日志work/logs/tdm-1-unit.txt；类型检查见tdm-1-check.txt。
这些只是未接入的内部函数，不是可用的管理器。尚未实现：命名管道TDM指令/3216实例限定、事务/版本并发与审计、预设持久化及消费、CMD菜单、真实通道/重启/隐私/浏览器/跨管理器验收。不能宣称P0～P7完成或可部署。
已定位：apps/server/local-admin.ts使用认证Windows管道，仅接受list/stop/dissolve，4096请求上限；service.ts 639～691 manageMatch通过BEGIN IMMEDIATE/save/broadcast更新，已有并行差异必须逐块保护；scripts/local-match-manager.mjs已有普通用户通道客户端。不得把新函数直接用于运行SQLite JSON。
NEXT_ACTION：定向阅读service.ts的Room/load/save/开始比赛流程、持久化schema及SDK插件契约；设计仅ninja-p20实例启用的插件测试适配层，通过现有认证管道的独立TDM动作调用，新增原子事务+revision预设/审计存储，然后接入成功开局消费与CLI。先补强测试（满配置发牌、退役/创建ID、批量失败回滚、所有不安全阶段），再做真实管道和浏览器验收。当前没有本轮运行中的测试实例；无提交/推送/部署。
TDM补充：首轮类型检查发现测试联合类型及操作判别收窄错误，已局部修复，最终check退出0、定向2/2；仍未接入，其他TODO不变。

TDM-1.0 继续执行（2026-11-21）：P0～P6已实际接入，P7最后综合复验中。新增认证管道tdm动作、可选SDK测试适配器、test-manager.ts事务/版本/审计/持久化消费、ninja-test-manager.cmd与交互脚本；生产入口仅3216+ninja-p20启用，隔离夹具3228显式启用。开局消费位于公共BEGIN IMMEDIATE事务内，save改为UPSERT避免删除触发器误删待消费预设；房间删除触发器清理所有预设。荣誉编辑复制真实状态并守卫阶段/到期/冠军，独立审计，不伪造游戏历史。测试目前全量162/162、TDM专项7项、新CMD非管理员实际cmd.exe执行、四视口真实商人/轮抽/聊天、真实机器人3名加入退出与stop/dissolve兼容已通过；新增下一轮不再应用预设已单测通过，最终全量将为163项。未触碰既有3216/3213/3199/FRP、数据库与机器人源文件。最后读取tdm-1-full-final/check-final/browser-final/build日志，全部通过后写VERIFIED及短使用说明；本轮不提交/推送/部署。

## 最新有效摘要：TDM-1.0 VERIFIED（隔离环境验收，2026-11-21）
TDM-P0～P7 DONE。feature/night-of-the-ninja，HEAD d0af520；不提交/推送/部署，不连接、重启或修改3199/3213/3216/FRP/EMS及原数据库；保留P3.3.2和Gen7/Qwen/ML并行成果。没有修改网页界面、引擎规则、机器人或原管理器代码。
新增ninja-test-manager.cmd、scripts/ninja-test-manager.mjs、games/night-of-the-ninja/test-data.ts/test-data.test.ts/test-adapter.ts、apps/server/test-manager.ts/test-manager.test.ts、tests/tdm-server.ts/tdm.config.ts/tdm.spec.ts、docs/TDM-1.0.md。必要局部接入apps/server/index.ts/local-admin.ts/service.ts及packages/game-sdk/index.ts；service.ts原有并行差异必须分块保护，禁止整体暂存。
P0：沿用认证Windows命名管道，新增tdm白名单动作；UTF8流解码保护中文跨包。生产只在PORT3216+scope ninja-p20绑定可选游戏测试适配器，其他端口/实例默认关闭。隔离3228显式开启独立scope/key。无HTTP测试入口，普通Socket指令拒绝，错误管道密钥拒绝。每次匹配room code/match ID，游戏必须night-of-the-ninja。
P1：本机查询真实房间、暂停/在线/剩余时间、玩家ID/昵称、身份、手牌及中文名称、荣誉/总分、池和33张实体卡归属；已结算桌面牌标为历史来源，不能当成当前持有。所有敏感查询仅认证本机通道，不进入玩家投影。
P2/P5：下一场第一轮0～3张指定牌，其余随机，1～11名等待成员的预设验证，实际开局仍受4～11规则校验；33实体唯一。下一轮不重复应用。待消费、命名手牌+荣誉组合均保存在SQLite test_data，成功开局在原BEGIN IMMEDIATE事务里消费，失败回滚保留。rooms使用UPSERT避免删除触发器误删；真正解散/清理触发器删除所有关联预设。builtin支持merchant/merchant-known/shift/dig/mirror/martyr/double，双牌/已知身份额外设置右手邻座并打印合法两步轮抽路径。honor-preset逐玩家累积，支持0/1/3枚等组合，save/load/clear/remove-saved。
P3/P4：荣誉allocate/create/return/retire/value/transfer/set均用真实实体，唯一ID、nextHonor更新、总分由数组求和，不写独立积分字段。仅允许安全阶段，拒绝演出/技能/商人/奖励/冠军/阶段到期等；暂停状态按真实暂停处理。CAS revision+BEGIN IMMEDIATE串行，实际两个并发管道请求只允许一个成功。修改失败SQL回滚且不广播，成功更新所有合法快照。不改submissions或伪造历史奖励。test_audit独立保存修改前后、意图、match、版本及时间，CLI查看最近20条摘要；管理通道容量守卫在提交前拒绝过大数据。
P6：中文持续菜单、玩家序号/唯一昵称/ID选择、卡牌序号/名称/类别+编号/实体ID选择、前后对照和YES确认、错误可恢复、退出不停止服务。实际非管理员进程cmd.exe执行新CMD --verify通过；真实交互子进程完整走菜单3修改荣誉并验证版本增加，记录cli-transcript。现有机器人管理器职责/源文件不变，实际fillNinjaRoom随机3机器人加入/退出并还原1人房间，stop/dissolve原命令兼容。
P7：全量163/163通过（tdm-1-full-final.txt）；最后补强后TDM7/7通过（target-final，含非法原型名称、并发CAS、错误认证、开局消费SQL失败回滚、荣誉SQL失败回滚、存档重启、saved保留、解散清理、下一轮随机）。类型检查check-final退出0、build退出0。后续UTF8/容量/审计补强只影响管理模块，已用最终7项和真实浏览器复验，不反复跑无影响规则测试。
浏览器最终1/1（browser-final）：真实4玩家注册、真实认证管道设置第一人商人手牌、双方各3荣誉、所有玩家荣誉数量/本人9分同步、未授权玩家看不到他人初始商人、两步轮抽/统一亮牌、正常商人查阅和交换、聊天；740x320、844x390、915x412及1366x768确认可见可点/截图。有效Origin的POST /api/tdm返回404；普通游戏管理指令被拒绝。真实新CMD启动/交互写入、机器人加入退出及管理器关闭后服务继续响应已通过。
失败及修复记录：早期集成账户名过长HTTP400→缩短测试用户名；误用select命令→改现有lobby指令；额外HTTP无Origin得到403→补有效Origin再验证确无路由404。均实际重跑通过，未计历史失败为通过。容量/UTF8问题是源码审查防御修复，不虚称已在Android复现。
证据：work/logs/tdm-1-summary.json、full-final/target-final/integration-final/check-final/browser-final/build日志、cli-transcript.txt、browser-result.json、merchant-{740,844,915,1366}.png。测试服务/浏览器由Playwright关闭；仅测试自己的数据库和凭证文件，未动既有服务/数据库。
手动隔离：本工作树node tests/tdm-server.ts启动3228，默认持久库work/logs/tdm-1-isolated.db；另一窗口ninja-test-manager.cmd --isolated-test。退出管理器不停止游戏；服务窗口Ctrl+C关闭。自动化数据库由tdm.config指定唯一文件，不与手动/3216共用。
限制：不提供任意阶段跳转、任意状态/JS注入。双方各3+查阅荣誉+交换已实际浏览器走通；0枚/1枚、查看流派、已知身份等有明确配置及合法路径（docs/TDM-1.0.md），不宣称10种场景全都实体手机逐一实测。当前3216进程仍为旧版，默认新管理动作需另行批准更新后使用；本轮只交隔离验收。旧两个CMD未重写，不宣称重新执行了其全部模型/GUI选项。
NEXT_ACTION：ChatGPT+RDC独立核验TDM说明、summary/CLI/截图和精确差异，再决定是否批准3216候选更新；不要自动部署/提交，不重复从早期未接入断点开发。

P3.3.3 IN PROGRESS（2026-11-21）：用户已授权F1～F4完整隔离交付，3216已部署TDM来自用户说明，本轮不访问/操作既有服务。已读任务书及最新状态，保留所有并行差异。新增MobileSkill.vue，将手机复杂技能的真实合法选项Teleport到原nn-stage，不改变圆桌/公开牌边界；原桌面分支保留。OperationStage加复杂技能标记/转发原select/give/take，landscape.css仅手机规则新增查阅网格、双方荣誉网格、双目标/双身份及轮末获奖网格。引擎、协议、权限、SDK、后台、机器人未作本轮修改。首轮check/build通过；商人0/3、1/1、3/3真实流程先通过，3个查看流派测试因旧aria标签查看身份与新显示查看流派不一致失败，现统一mobile标签后复验。变形者刷新后选项未找到待诊断，未VERIFIED。
测试夹具tests/p333-scenarios.ts用真实引擎合法命令与TDM初始deal/honor配置推进；独立3229及唯一SQLite。P333_CASES以分号分组，单项可@人数；merchant:own:target[:known/house/pass]、shift:3:3[:hide/no-hide]、award:seed:attack/pass（9人seed6 attack真实单名浪人获奖；普通pass真实多人获奖）。现70914串行shift诊断及6商人复验运行；证据work/logs/p2082-p333-*。下一步读取shift-diagnostic与after-refresh JSON定位刷新后隐藏原因，补known/交换/放弃、4变形者组合、多人数获奖、旧新桌面0px和受影响P332回归。继续直到通过，不提交/推送/部署。
P3.3.3进度补记：F1商人基础6/6、已知/零荣誉/放弃/11人5/5、极端双方7枚局部滚动1/1均真实通过；此前31账户批次最后账户触发认证限流，已拆独立实例重跑7枚通过，新增配置预检每批最多30注册，不跳过任何场景。F2四种交换/揭示组合+9人5/5已通过，最终批次正在重跑。F3真实honor事件旧Grid行高8px压缩是头像溢出根因，手机max-content行修复后4/6/8/9/11和单名浪人6项通过，最终追加继续按钮三视口断言复验中。桌面对照旧/新6状态区域几何差0px，待最终新构建复核。已实际查看11人商人及9人双身份740截图，卡面/按钮完整，保持原圆桌空间。尚未VERIFIED，剩最终专项批次与P332/TDM/双牌/冠军回归；继续执行，不操作3216。
P3.3.3 F1～F3专项最终有效结果：基础商人6/6、分支/11人5/5、极端7枚滚动1/1；变形者四组合+9人5/5；获奖small3/3、dense3/3、factions3/3，含4/6/8/9/11全员、9人单名浪人、4人2名获奖者及两主流派。全部三横屏DOMRect/命中、轮末继续按钮/进入新轮通过。日志p2082-p333-{merchants-final,branches-verified,merchant-scroll-final,shifts-verified,awards-small-verified,awards-dense-verified,awards-factions-verified}.txt。P332小人数最新3/3通过，综合回归session24535继续串行执行dense/private、真实双牌、完整冠军、TDM、桌面对照与变形者返回恢复。尚未写VERIFIED，必须读取最终日志。脚本work/logs/p2082-p333-regression.ps1可精确恢复后续命令；已经通过的批次不用重复。

## 最新有效摘要：P3.3.3 VERIFIED（隔离环境验收，2026-11-21）
F1～F4全部完成。feature/night-of-the-ninja，HEAD d0af520；本轮没有提交、推送、部署，不访问或操作3199/3213/3216/FRP/EMS及原数据库，保护P332/TDM与Gen7/Qwen/ML全部并行差异。
产品仅改games/night-of-the-ninja/{MobileSkill.vue（新增）,OperationStage.vue,landscape.css,View.vue}。MobileSkill复用本人真实private options及原select/give/take/confirm，在原中央舞台内提供手机专用操作；桌面旧模板保留。只在target/second/choice/shift-disclosure合法复杂技能阶段显示，不在权威演出、提交等待或ready错误覆盖舞台。
F1：商人查阅流派/荣誉网格，完整背面及编号；双方荣誉分栏，自己明值/对方仅实际查阅枚明值，放弃和原统一确认保持可达，聊天正常。0/0、0/3、3/0、1/1、3/3、已知/未知、查阅流派/荣誉、交换/放弃、混合正背、11人及双方7枚局部滚动均真实验证。没有修改权限/技能规则。
F2：真实圆桌双目标顺序、取消/重选，双身份卡及完整数字等级/取得时目标说明，交换/不交换×隐藏/揭示四组合、长昵称、9人、三横屏、刷新和返回大厅继续原choice完成。私人队列原主动确认保留，卡面/文字/等级边界及触控命中验证通过。旧重复action-deck因!important仍显示导致重复选项，已仅在手机复杂操作中准确隐藏重复旧控件，未隐藏合法选项。
F3：旧Grid自动行把honor容器压成8px而内容约196px，是头像越框直接原因。手机round-result行改max-content、内容不收缩，公开reveal/honor获奖者自适应网格，头像/昵称/授权身份标记/荣誉完整；低高度使用实际可访问内部滚动。4/6/8/9/11全员获奖、4人2名获奖、9人两主流派及单名浪人均通过；合法引擎seed1莲派、seed2鹤派、seed6浪人首脑对应证据award-factions.json。身份仅取公开投影，未公开者标为身份未公开。
F4最终有效浏览器：主覆盖40项全部通过（merchants6、branches5、scroll1、shifts5、awards三个批次各3、P332 small3+dense/private3、double3、tournament1、TDM1、desktop new3）；另旧版桌面对照3、返回恢复增强1、9人身份边界+11人在线获奖增强2共6项复验通过。不是把旧失败计入通过。真实冠军赛3轮ready→ready→champion，当前轮/完整复盘、房间管理入口正常。P332覆盖私人卡框、隐士/变形者/盲眼/镜僧、死亡/公开/队列、新轮清理、目标、公开牌碰撞、重连/返回；双牌mobile/desktop/timeout真实通过。TDM真实管道/CLI写入/荣誉同步/商人/聊天/机器人加入退出及stop/dissolve通过；没有修改其生产实现。
最终npm.cmd run check退出0（check-final.txt），npm.cmd run build -- --outDir work/logs/p2082-p333-dist退出0（build-final.txt），最终资源index-C7if6p0b.js。引擎/服务端/协议/公共UI生产模块本轮未改，按任务书复用tdm-1-full-final.txt全量163/163与此前经典共享回归证据，没有虚称重新执行规则全量。
桌面1366旧P332候选与新候选实际同场景比较：商人target/choice/exchange、变形者target/choice、honor共6状态，圆桌/名片/身份/公开牌/舞台/操作区等所有已测矩形差0px（desktop-comparison.json）。对应old/new PNG均保存。三横屏740×320、844×390、915×412所有必要按钮/图片框/数字角标/卡片相交、实际中心命中、页面溢出断言通过。普通<=3荣誉同时可见，极端7枚每个选项滚动后完整可见并真实点击。
测试补充/调整：tests/p333-{scenarios,server}.ts、p333.config.ts、p333.spec.ts新增；已有P332/private/double、p33-tournament、tdm.spec/tdm-server仅真实UI定位/可选证据前缀及候选资源参数更新，未跳过/放宽有效碰撞断言。P333每批最多30注册预检；先前31账户批次最后注册失败属于认证限流，独立7枚重跑通过。早期标签、重复旧控件、Grid行高失败均实际修复复验，不计入最终结果。
证据统一work/logs/p2082-p333-*：summary.json机器可核对40+6；*-verified/*-final.txt；merchant-1-1-4-exchange-740.png、merchant-3-3-11-exchange-740.png；shift-3-3-hide-9-targets/identities-740.png；online-award-1-pass-11.png、award-*-awards-740.png；tournament-champion-740.png；desktop-old/new-*；各对应JSON实际矩形与命中、award-count及award-factions。regression.ps1保存串行复现；不得把过去失败日志当成最终通过。
隔离服务3197/3198/3214/3215/3227/3228/3229及测试浏览器均已由Playwright关闭；isolation-final.json为无这些监听的[]，最终Git状态存git-status.txt。既有服务/数据库保持不变。无已知未解决的本阶段浏览器功能阻塞。
复现：NINJA_TEST_ASSETS=work/logs/p2082-p333-dist；P333_CASES用分号组合、@人数，merchant:own:target[:known/house/pass]、shift:3:3[:hide/reveal/no-hide/no-reveal]、award:seed:attack/pass，node_modules/.bin/playwright.cmd test -c tests/p333.config.ts。单实例每批注册合计<=30。P332/TDM/双牌/冠军/桌面对照完整命令见work/logs/p2082-p333-regression.ps1。额外增强P333_CASES='shift:3:3:hide@9;award:1:pass@11'对应enhanced-final.txt。
限制：未执行实体Android；浏览器工具栏变化、真实触控/软键盘仍需用户手机验收，不把桌面Edge触控模拟等同硬件通过。超量荣誉采用已验证可达的局部滚动。不新增规则、素材、服务器或数据库迁移。
NEXT_ACTION：交ChatGPT+RDC核验summary、代表截图/矩形及精确本轮差异；用户决定是否定向提交和更新3216，本轮不得自行部署。不要从旧IN PROGRESS摘要重做；P3.3.3已达到VERIFIED，不自动扩展下阶段。


## 2026-11-21 | P3.3.3 | DEPLOYED（3216 测试服）
- 状态：P3.3.3 隔离 VERIFIED（40 项主覆盖＋6 项复验）；2026-11-21 已经用户授权部署到 3216，HTTP/静态资源/SQLite 基础冒烟通过。Android 真机仍待 MOBILE VERIFIED。
- 内容：手机商人荣誉查阅与交换网格、变形者双目标与双身份、轮末多人获奖自适应；源码 games/night-of-the-ninja/{MobileSkill.vue,OperationStage.vue,View.vue,landscape.css}。
- 证据：work/logs/p2082-p333-summary.json；最终 JS index-C7if6p0b.js，重新构建于 work/logs/p2082-p333-deploy-dist，已发布至 work/logs/ninja-p20/dist。
- 部署前：3216 HTTP 200，认证本地管理通道无房间；SQLite preview.db 使用 Python sqlite3 backup 一致性快照，integrity_check=ok，11 表；旧 dist 备份。备份目录 work/logs/ninja-p20/backup-p333-20261121-164917；旧 dist 同时保留为 work/logs/ninja-p20/dist-p333-prev。
- 部署后：通过 ninja-p20.cmd stop/start；3216 /api/catalog HTTP 200，首页引用 index-C7if6p0b.js、JS HTTP 200，preview.db integrity_check=ok、11 表，本地管理通道无房间。
- 边界：未操作 3199/3213/FRP；未提交/推送；其他并行未提交源码保留。尚未进行实体 Android 触控/浏览器工具栏/软键盘验收，也未进行本次部署后的完整真人多房间联机回归。
- 下一步：3216 真人/机器人针对性功能验收与 Android 真机；通过后再考虑正式服发布。

P4 START（2026-11-21）：HEAD d0af520/feature/night-of-the-ninja；用户附件P4已读。复用P333商人/变形者/获奖40+6证据及用户3216人工通过陈述，禁止重做P4.9/.10。P4.2已有常驻聊天及滚动/未读保护，P4.3已有visualViewport变量，P4.4～.6已有原生dialog/局部滚动/复盘；只补必要修复与真实回归。缺项P4.1抽屉双列、P4.7独立手机七图/切换。计划新增隔离3230测试或复用独立3215环境，不操作3228/3216等现有服务；不提交推送部署。保留全部P3/TDM/机器人并行差异。NEXT精确修改出牌网格、局部横屏弹层/聊天展开，然后构建+真实多人辅助界面和截图验收。
P4 开发/定向进度：出牌区真实0/1/2/多张、五视口两列/竖屏单列及情报/规则/设置/身份/时间线弹层初次4场中3通过；shift恢复失败是测试结束在桌面调用手机专用标签、以及网络重连未就绪即提交，已修正测试等待后shift-final 1/1通过，没有改游戏规则。真实聊天输入focus→按钮click会提前收回导致未发送，已用form:focus-within修复，private-capture 1/1及draft聊天/未读/长消息/缩到740x210发送恢复通过。手机七图已从最终相关真实流程保存apps/web/components/guides/ninja-mobile-*.jpg，桌面旧图未覆盖；GameUIGuide独立双版本，Vite NodeNext不允许import.meta.glob已改静态资源导入。P4.9/.10仅复验，不重构。下一步最终4场、全人数/经典共享回归、复盘冠军、旧新桌面比较、check/full/build，然后路线图状态更新；不部署3216。
P4稳定检查点：P4辅助界面最终4/4通过，真实draft(0牌)/shift(1牌+多目标)/double(2牌)/9人award(多牌)，三横屏+390竖屏+1366桌面，聊天长消息/未读/上翻/自身发送、740x210输入恢复、所有弹层滚动关闭及后续合法操作。private-capture 1/1通过并生成独立手机七图（462703字节），未覆盖桌面七图。最终全量163/163、check/build退出0，候选work/logs/p2082-p4-dist（index-K3EZpzTo.js）；4/6/8座位3/3通过，密集/冠军、经典公共聊天/指南、P333保护项与桌面对照串行继续session13154。新增更严格的出牌区归一化滚动坐标/左右→上下顺序/卡面文本碰撞断言，待最终double+award增强复验。P4尚未标VERIFIED，NEXT读regression日志后完成增强2项、最终类型检查/矩形对照/路线图。

## 最新有效断点：P20.8.2-P4 VERIFIED（隔离浏览器，2026-11-21）
状态：CODE READY=YES，VERIFIED=YES；本轮DEPLOYED=NO，MOBILE VERIFIED=NO。feature/night-of-the-ninja，HEAD d0af520，全部保留未提交；不提交/推送/合并。没有访问或改变3199/3213/3216/3228/FRP/EMS或其数据库。P333的3216既有部署记录保留，不把本轮候选写成已部署。
已核验复用：P4.9/.10商人/变形者/获奖为P333既有成果，用户任务书已报告实机通过；本轮不重构这些模块，只在新候选回归。原聊天未读/滚动/自身发送、visualViewport、安全区、原生dialog、私人投影、规则与复盘均已存在，复用而非重复开发。
实际产品变更：games/night-of-the-ninja/View.vue加nn-play-grid包裹原played数组（不改顺序/内容），p20.css加桌面双列/窄屏单列；landscape.css局部手机牌面双列、长内容换行、主标题/关闭sticky、聊天展开及低高度焦点避让；apps/web/components/RoomChat.vue仅landscapeInline模式增加展开/收起和焦点恢复；GameUIGuide.vue独立手机/桌面选择，新增guides/ninja-mobile-{draft1,draft2,commit,target,choice,reaction,review}.jpg七图。没有修改MobileSkill/OperationStage/引擎/公共服务协议/数据库/机器人/其他游戏源码。
P4.1～.10均隔离VERIFIED，逐项复用/新增情况见p2082-p4-summary.json和路线图P4表。0/1/2/多张真实公开牌、长昵称/双目标、左右→上下原顺序、严格矩形碰撞、卡面图片/文字边界、三横屏/竖屏/桌面、情报/规则/设置/身份/时间线滚动及关闭按钮实际中心命中通过。变形者弹层后恢复合法choice/disclosure完成；完整三轮比赛冠军及当前轮/完整复盘关闭/阅读通过。
聊天真实回归：checkRoomChat长消息、未读、上翻稳定、非聊天快照不重置、本人发送跟随及错误草稿保留；新增展开/关闭焦点、模拟740x210低高度后发送/恢复通过。修复发现的输入焦点展开后，点击发送因失焦导致面板提前收起的问题：以form:focus-within保持（自动放大仅低高度<=260px；普通横屏保持既有常驻栏），不另建键盘计算体系。Android实体键盘未测。
最终单元163/163（unit-final.txt，失败/跳过0）、check-final退出0、build-final退出0，独立候选work/logs/p2082-p4-dist，入口资源index-K3EZpzTo.js。仅最终测试增强后重新typecheck，不重复无影响规则全量。
最终浏览器主覆盖24项：private-capture1、auxiliary-final4、seats-small-final3、dense-replay-final3、classics-ux-final7、protected-final3、desktop-new-final3；另desktop-old-final3、grid-geometry-final2、online-console-final1共6项对照/增强，全部退出0。旧失败不计通过。4/6/8/9/11、740x320/844x390/915x412、390x844竖屏和1366x768桌面；用户已验收技能仅必要回归。经典两款完整流程/聊天、三款导航/指南/恢复7项通过，未修改它们源码。
桌面对照：P333旧候选和P4新候选同场景6状态（商人target/choice/exchange、变形target/choice、honor）的牌桌/名片/身份/公开牌/操作区矩形差0px，desktop-comparison.json及old/new截图可查。桌面出牌抽屉双列与指南版本选择是本轮明确要求的变化，不能把这些有意变化说成完全无变化。
手机指南七图均844x390真实规则流程+DOM教学编号，约462703字节；guides.json记录尺寸/哈希，desktop-guide-preservation.json证明原桌面七图Git哈希未变。非AI图，未覆盖旧素材。capture环境NINJA_GUIDE_CAPTURE=mobile只写ninja-mobile-*，源测试正常通过。
控制台：无应用运行异常、无指南/游戏资源错误；原项目/favicon.ico固定404已准确定位并保存在console-draft.json，列为既有非功能提示，本轮不越界修改公共favicon。专项只允许该准确URL/404，其他控制台错误仍使测试失败，不隐藏真实应用失败。
失败与修复：初始Vue NodeNext不支持import.meta.glob→改七张实际资源静态导入；新配置cwd误为tests/tests→改工作树cwd；shift测试结束在桌面找手机选项、以及离线恢复未等待连接→改回手机并等待真实在线后提交，实际复验通过。聊天失焦故障已修产品；没有删除场景、降低碰撞阈值或隐藏合法控件。
证据统一work/logs/p2082-p4-*：summary.json含每批通过数/命令结果/任务矩阵；各*-final.txt、private-capture.txt、*metrics.json、drawer-{740,844,915,390,1366}.png、tournament-replay/冠军、desktop-old/new-*、guides.json、console-draft.json。isolation-final.json=[]（测试自有3197/3198/3214/3215/3227/3229/3230无监听），浏览器/测试服务已关闭。未触碰历史3228服务。最终git-status.txt保存未提交清单，保护P3/TDM/Gen7/Qwen/ML全部并行文件。
恢复命令：work/logs/p2082-p4-regression.ps1保存集中check/test/build和串行浏览器命令；新增tests/p4.config.ts + p4-server.ts + p4.spec.ts使用独立3230/PID数据库及真实引擎合法场景，P4_CASES=draft;shift;double;award@9。几何增强P4_CASES=double;award@9，控制台在线P4_CASES=draft。NINJA_TEST_ASSETS指向work/logs/p2082-p4-dist；不要覆盖3216构建。重复全部回归前先确认是否确有代码影响。
NEXT_ACTION：交ChatGPT+RDC独立核验候选/矩形/截图及P4差异。P5执行Android实体手机：横竖/工具栏/键盘展开收起/输入发送、触控与全屏方向失败回退、多人数完整比赛/断线重连、公网环境。3216更新需另行用户授权、确认无活跃比赛、SQLite一致性备份和旧构建回退后进行；本轮不部署，也不把浏览器视口模拟写成Android通过。

## 2026-11-21 | P20.8.2-P4 | DEPLOYED（3216 测试服）
- 用户授权部署P4；部署前3216本地管理通道无房间，HTTP 200。
- 一致性SQLite备份及旧dist：work/logs/ninja-p20/backup-p4-20261121-195343（preview.db integrity_check=ok），旧dist另保留work/logs/ninja-p20/dist-p4-pre-swap。
- 3216已切换P4隔离验收候选work/logs/p2082-p4-dist，当前入口index-K3EZpzTo.js；实际HTTP首页引用P4、JS HTTP 200、手机指南7张资源存在；运行库integrity_check=ok、11表，部署后管理通道无房间。
- 未操作3199/3213/3228/FRP、未提交推送、未修改数据库结构；Android真机及真人完整联机验收仍待P5，不能标记MOBILE VERIFIED。

## 2026-11-21 | P4 desktop-only play drawer tightening | DEPLOYED 3216
- CSS only: games/night-of-the-ninja/p20.css; desktop (min-width:1001px) drawer 52rem -> 26rem, grid gap .7rem -> .45rem; mobile unchanged.
- check/build/git diff --check passed; candidate work/logs/p2082-p4-desktop-tight-dist (index-4NPM7v6b.js).
- Before deploy: 3216 manager no rooms. Backup: work/logs/ninja-p20/backup-p4-tight-20261121-223651 (SQLite backup integrity ok and old dist); prior dist also kept at work/logs/ninja-p20/dist-p4-tight-previous.
- After deploy: HTML references new entry, JS HTTP 200, /api/catalog HTTP 200, SQLite integrity ok, no rooms. No production/3213/3228 modifications; no commit/push. Visual acceptance pending.

## 2026-11-21 | P4 desktop compact drawer | USER ACCEPTED
- 用户在3216实际查看后确认电脑端出牌区紧凑双列抽屉通过人工验收。
- 本次仅桌面端CSS微调（p20.css，min-width:1001px）：最大宽度26rem、两列间距.45rem；手机端不变。
- 部署构建index-4NPM7v6b.js，3216首页/JS/API HTTP200、SQLite integrity_check=ok，部署前后无房间；备份work/logs/ninja-p20/backup-p4-tight-20261121-223651。
- P4桌面抽屉视觉验收CLOSED；P5 Android真机软键盘/触控/方向/全屏、公网对局/重连仍待执行。
- Git发布范围须隔离P20移动前端与并行Gen7/Qwen/ML/TDM实验；禁止无差别提交。
