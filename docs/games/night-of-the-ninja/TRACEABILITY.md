# Game 03 需求追踪

实现与验证分别记录。源行用于首次核对，编号自本次建表起固定。

- 规则 117 项已实现，其中 70 项有直接验证，47 项只完成组合需求中的部分验证。另有两个规则表头用于保留源文定位。
- 33 张卡牌逐张验证元数据，再按效果共用对应裁决测试。13 种效果均有针对性证据。
- 46 项美术约定中，31 项已实现并验证、8 项已实现并部分验证、5 项部分实现、2 项保留给未来公共音频。另有一条用户音频补充已接入语义事件接口。
- 复现命令、样本及未执行的验收见 [验证记录](TEST_REPORT.md)。

| ID | 来源与要求 | 代码／资源 | 验收 | 实现／验证 |
|---|---|---|---|---|
| R-001 | RULES.md §1 L10 · [原版] 4～11 名玩家。身份为鹤派 Crane、莲派 Lotus，以及奇数人数时额外加入的浪人 Ronin。每个流派使用等级 1～5（1 最高）的身份卡，按人数加入前几个等级；每轮重新分发。游戏中身份可因变形者改变。 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-002 | RULES.md §1 L14 · 4 ／ 2 ／ 2 ／ 0 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-003 | RULES.md §1 L15 · 5 ／ 2 ／ 2 ／ 1 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-004 | RULES.md §1 L16 · 6 ／ 3 ／ 3 ／ 0 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-005 | RULES.md §1 L17 · 7 ／ 3 ／ 3 ／ 1 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-006 | RULES.md §1 L18 · 8 ／ 4 ／ 4 ／ 0 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-007 | RULES.md §1 L19 · 9 ／ 4 ／ 4 ／ 1 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-008 | RULES.md §1 L20 · 10 ／ 5 ／ 5 ／ 0 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-009 | RULES.md §1 L21 · 11 ／ 5 ／ 5 ／ 1 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-010 | RULES.md §1 L23 · [原版] 每轮存活成员中，等级更高（数字更小）的一派获胜；最高等级相同时继续比较双方下一位存活者。完全打平则无获胜流派，所有存活者各获得一枚荣誉标记。获胜流派的所有成员（含死者）各抽一枚荣誉；存活浪人亦抽一枚。荣誉是个人财产，比赛在完整轮次、揭示及全部荣誉结算后检查：有人总分达到 10 分则比较达标者的最高分，并列最高者共同获胜。不加赛。 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-011 | RULES.md §1 L25 · [原版] 荣誉面朝下持有，每枚价值 2、3 或 4 分；公开每人持有的枚数，隐藏他人标记分值与累计分数。自己可以查看自己的标记和总分。荣誉标记上的分值不因换主人而改变。 | engine.ts／identity | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 部分验证 |
| R-012 | RULES.md §2 L29 · 1. 分发流派卡：各人秘密获得一张身份卡，能在尚未被交换限制时查看自己身份。 | engine.ts／draft | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-013 | RULES.md §2 L30 · 2. 轮抽第一步：每人获得 3 张忍者牌，秘密留 1 张，其余 2 张向左传给下一人。 | engine.ts／draft | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-014 | RULES.md §2 L31 · 3. 轮抽第二步：从收到的 2 张中秘密留 1 张，其余 1 张加入弃牌区；未发出的忍者牌暂放旁边。 | engine.ts／draft | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-015 | RULES.md §2 L32 · 4. 五阶段夜晚：密探 Spy → 隐士 Mystic → 骗徒 Trickster → 盲眼刺客 Blind Assassin → 上忍 Shinobi。 | engine.ts／draft | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-016 | RULES.md §2 L33 · 5. 流派揭示：活着的玩家公开当前真实流派；可用的首脑特殊牌在此阶段处理。 | engine.ts／draft | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-017 | RULES.md §2 L34 · 6. 流派及浪人奖励：先确认获奖集合，必要时补荣誉池，再随机发放。 | engine.ts／draft | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-018 | RULES.md §2 L35 · 7. 比赛终局检查：全部奖励发放后，判断是否出现达到 10 分者；否则进入轮间结算和准备，接着下一轮。 | engine.ts／draft | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 已验证 |
| R-019 | RULES.md §2 L37 · [原版] 夜晚各阶段可以讨论、欺骗、公开声称情报；死亡玩家仍可说话，但不继续正常出牌。死亡不自动公开流派。 | engine.ts／draft | engine.test.ts／ninja.test.ts：逐人数与轮次不变量 | 已实现 / 部分验证 |
| R-020 | RULES.md §2 L39 · [数字版] 轮抽和夜晚公聊开放。所有当前有操作资格的玩家提交后立即推进；否则倒计时到期按对应超时规则处理。每阶段先秘密提交是否出牌，到提交屏障后统一亮牌，再按该阶段牌面编号从小到大逐张结算。反应必须在当前攻击结束前处理，之后才能执行下一张牌。 | engine.ts／draft | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-021 | RULES.md §3 L43 · [原版／交叉核验] 忍者牌总计 33 张：密探、隐士、盲眼刺客、上忍各 6 张（每种编号 1～6），六张技能各异的骗徒（编号 1～6）及三张特殊牌（镜僧、殉道者、首脑各 1 张）。即 6×4 + 6 + 3 = 33。类别分布由实体开箱资料直接列明，与官方规则书的总数、五阶段及骗徒编号一致；见 SOURCE_AUDIT.md。 | cards.ts／engine.ts | deck, all player counts and finite pool | 已实现 / 已验证 |
| R-022 | RULES.md §3 L47 · 1 ／ 密探 Spy ／ 私下查看其他一名玩家的当前流派卡 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-023 | RULES.md §3 L48 · 2 ／ 隐士 Mystic ／ 私下查看其他一名玩家的流派卡与其一张忍者牌；目标若有两张，由查看者随机选其中一张 | cards.ts／engine.ts | engine.test.ts: mystic draws either card privately… | 已实现 / 已验证 |
| R-024 | RULES.md §3 L49 · 3 / 骗徒 1 ／ 变形者 Shapeshifter ／ 查看两名玩家流派，可以秘密交换这两张卡；被交换者不能自由查看新身份 | cards.ts／engine.ts | shapeshifter truth, memory… | 已实现 / 已验证 |
| R-025 | RULES.md §3 L50 · 3 / 骗徒 2 ／ 掘墓人 Grave Digger ／ 查看两张弃置忍者牌，取其中一张；可立即使用或留待之后的合法使用时机 | cards.ts／engine.ts | grave digger timeout… | 已实现 / 已验证 |
| R-026 | RULES.md §3 L51 · 3 / 骗徒 3 ／ 捣乱者 Troublemaker ／ 查看一名其他玩家流派，可将其公开 | cards.ts／engine.ts | troublemaker publishes no identity… | 已实现 / 已验证 |
| R-027 | RULES.md §3 L52 · 3 / 骗徒 4 ／ 灵媒商人 Spirit Merchant ／ 查看另一人的一枚荣誉标记或其流派，可与其交换各一枚荣誉；不必交换已查看那枚 | cards.ts／engine.ts | merchant may exchange an unseen token… | 已实现 / 已验证 |
| R-028 | RULES.md §3 L53 · 3 / 骗徒 5 ／ 窃贼 Thief ／ 公开自身流派，从荣誉枚数比自己多的人处取走一枚荣誉 | cards.ts／engine.ts | merchant … and thief compares counts | 已实现 / 已验证 |
| R-029 | RULES.md §3 L54 · 3 / 骗徒 6 ／ 审判者 Judge ／ 公开自身流派，指定并杀死一名玩家；镜僧/殉道者不能响应 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-030 | RULES.md §3 L55 · 4 ／ 盲眼刺客 Blind Assassin ／ 指定一名玩家并刺杀 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-031 | RULES.md §3 L56 · 5 ／ 上忍 Shinobi ／ 指定一名玩家、查看其流派，再决定是否杀死 | cards.ts／engine.ts | attack shinobi / … | 已实现 / 已验证 |
| R-032 | RULES.md §3 L57 · 反应 ／ 镜僧 Mirror Monk ／ 遭盲眼刺客或上忍刺杀时，反杀攻击者，自己免于该次杀害 | cards.ts／engine.ts | attack blind / mirror；真实镜僧浏览器 | 已实现 / 已验证 |
| R-033 | RULES.md §3 L58 · 反应 ／ 殉道者 Martyr ／ 遭盲眼刺客或上忍刺杀时，获得一枚荣誉，自己仍承受攻击 | cards.ts／engine.ts | attack blind / martyr | 已实现 / 已验证 |
| R-034 | RULES.md §3 L59 · 揭示 ／ 首脑 Mastermind ／ 持有人活到揭示时，使自己流派胜利；浪人持有则两大流派均不获流派奖励，存活浪人仍得奖励 | cards.ts／engine.ts | mastermind, dead teammates…；ronin mastermind… | 已实现 / 已验证 |
| R-035 | RULES.md §3 L63 · - 密探/隐士看到的内容可以自行告诉其他人，也可以撒谎，系统不自动公开秘密结果。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-036 | RULES.md §3 L64 · - 变形后玩家不能自行再次查看变更后的新流派，但可通过后续合法技能得知。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-037 | RULES.md §3 L65 · - 掘墓人获得其他阶段的牌时，原版允许立即打出，或保留到尚未到来的合法阶段。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-038 | RULES.md §3 L66 · - 灵媒商人可以查看一枚荣誉，却交换对方另一枚未查看的荣誉。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-039 | RULES.md §3 L67 · - 窃贼比较的是荣誉枚数而不是累计分数；夜晚提前达到 10 分不立刻结束比赛。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-040 | RULES.md §3 L68 · - 原版刺杀反应只针对盲眼刺客/上忍；审判者攻击不可用镜僧或殉道者响应。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-041 | RULES.md §3 L72 · - 强制目标未提交且超时：系统从当前合法目标中随机代选。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-042 | RULES.md §3 L73 · - 可选效果超时：默认不发动；不可强迫变形者交换、上忍杀人或灵媒商人交换荣誉。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-043 | RULES.md §3 L74 · - 已公开技能原目标失效：若技能允许重选则重新选合法目标，超时随机选择；无合法目标时效果失效。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-044 | RULES.md §3 L75 · - 已死亡者不能继续正常发动未执行技能。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-045 | RULES.md §3 L76 · - 同次刺杀中同时持有镜僧和殉道者的目标，最多选择使用其中一张反应牌。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-046 | RULES.md §3 L77 · - 仅攻击目标收到秘密反应提示，超时不反应；完成反应后才结算后续牌。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-047 | RULES.md §3 L78 · - 掘墓人先看到两张弃牌并选一张，再选立即使用或保留；超时默认保留。错过合法时机后本轮不能发动；所有牌本轮结束收回，不跨轮保留。 | cards.ts／engine.ts | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-048 | RULES.md §3 L79 · - 使用首脑的浪人阻止两大流派取得流派奖励，但自己如存活仍有奖励；由揭示阶段自动结算。 | cards.ts／engine.ts | ronin mastermind… | 已实现 / 已验证 |
| R-049 | RULES.md §4 L85 · 1. 按夜晚阶段逐个进入，相关存活玩家秘密提交打牌意愿。 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-050 | RULES.md §4 L86 · 2. 统一亮牌，按牌面编号排序；同阶段无人亮牌则继续下一个阶段。 | engine.ts／resolution | commit stays secret until barrier… | 已实现 / 已验证 |
| R-051 | RULES.md §4 L87 · 3. 逐张确认操作者有资格、牌有效，必要时选择合法目标。 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-052 | RULES.md §4 L88 · 4. 对查看/交换/公开/夺取/杀害逐项处理；属于私人信息的仅发给有权限玩家。 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-053 | RULES.md §4 L89 · 5. 对可响应的刺杀先打开反应窗口，结算镜僧或殉道者，再完成当前攻击结果。 | engine.ts／resolution | attack 矩阵与真实镜僧浏览器 | 已实现 / 已验证 |
| R-054 | RULES.md §4 L90 · 6. 该张牌执行完毕后才执行下一张；所有本阶段牌结束后进入下一阶段。 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-055 | RULES.md §4 L92 · 攻击 ／ 无反应 ／ 镜僧 ／ 殉道者 | 规则表表头 | 不适用 | 说明行 / 不适用 |
| R-056 | RULES.md §4 L94 · 盲眼刺客 ／ 目标死亡 ／ 攻击者死亡、目标存活 ／ 目标死亡、目标先获得一枚荣誉 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-057 | RULES.md §4 L95 · 上忍确认刺杀 ／ 目标死亡 ／ 攻击者死亡、目标存活 ／ 目标死亡、目标先获得一枚荣誉 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-058 | RULES.md §4 L96 · 上忍放弃刺杀 ／ 无伤害 ／ 不触发 ／ 不触发 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-059 | RULES.md §4 L97 · 审判者 ／ 目标死亡 ／ 不可发动 ／ 不可发动 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-060 | RULES.md §4 L99 · [数字版] 对同一次攻击，最多有一张反应牌生效；超时视为无反应。一次行动只结算一次，重复提交和断线重发不得重复杀害或发荣誉。 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-061 | RULES.md §4 L103 · 状态 ／ 处理 | 规则表表头 | 不适用 | 说明行 / 不适用 |
| R-062 | RULES.md §4 L105 · 同阶段多牌 ／ 先统一亮牌，再严格按卡牌编号逐张结算 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-063 | RULES.md §4 L106 · 反应中 ／ 暂停后续牌结算，先完成该次攻击 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-064 | RULES.md §4 L107 · 亮牌玩家在执行前已死亡 ／ 不继续执行其未结算的普通技能 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-065 | RULES.md §4 L108 · 技能目标在执行前已死亡/不合法 ／ 按技能合法目标范围检查；允许时重选，超时合法随机；无目标则失效 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-066 | RULES.md §4 L109 · 可选交换或可选杀害未确认 ／ 不发动可选效果 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-067 | RULES.md §4 L110 · 攻击不触发反应条件 ／ 不展示反应操作 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-068 | RULES.md §4 L111 · 玩家本轮未使用的牌 ／ 回收、下一轮重新洗牌并轮抽 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 部分验证 |
| R-069 | RULES.md §4 L113 · [已核实] 同一普通阶段内的编号均为 1～6 且每号各一张，不存在同阶段重号；特殊牌在独立反应／揭示窗口使用。按原版从小到大执行即可，不需要人为发明同号先后。 | engine.ts／resolution | engine.test.ts：出牌屏障、技能与反应 | 已实现 / 已验证 |
| R-070 | RULES.md §5 L117 · 1. 完成所有五阶段和可触发的合法反应。 | engine.ts／honor | engine.test.ts：荣誉池、整批奖励及冠军 | 已实现 / 已验证 |
| R-071 | RULES.md §5 L118 · 2. 对存活的首脑持有者执行揭示效果；不存在适用首脑时按最高存活等级比较。 | engine.ts／honor | engine.test.ts：荣誉池、整批奖励及冠军 | 已实现 / 已验证 |
| R-072 | RULES.md §5 L119 · 3. 确定获奖玩家：获胜流派所有成员（即使死亡）、存活浪人；完全平局则按原版向所有存活者发奖。 | engine.ts／honor | engine.test.ts：荣誉池、整批奖励及冠军 | 已实现 / 部分验证 |
| R-073 | RULES.md §5 L120 · 4. [数字版] 若所有人死亡，既无获胜流派亦无存活奖励；已经通过技能获得的荣誉保留。 | engine.ts／honor | ronin mastermind … no survivors receive none | 已实现 / 已验证 |
| R-074 | RULES.md §5 L121 · 5. [数字版] 奖励前先检查剩余荣誉标记；不足覆盖全部获奖者，先按原组成补池，再为每位获奖者分别随机抽取一枚，记录补池事件。 | engine.ts／honor | engine.test.ts：荣誉池、整批奖励及冠军 | 已实现 / 部分验证 |
| R-075 | RULES.md §5 L122 · 6. 奖励发完后检查冠军；有达标者则结束整场，未达标则进入 30 秒轮间准备；全员提前确认可立即进入下一轮。 | engine.ts／honor | engine.test.ts：荣誉池、整批奖励及冠军 | 已实现 / 部分验证 |
| R-076 | RULES.md §5 L124 · [原版／已核实] 原版 SETUP 正文指定洗混 35 枚荣誉标记，每枚价值 2、3 或 4 分。不同版次盒内清单有“30 + 5 extra”和“35 + 5 extra”差异；尚无官方明确公布的三种分值构成。玩家清点 40 枚配件为 2 分×16、3 分×16、4 分×8，但未辨认 5 枚备用。[数字版推定配置／经用户授权] 正式 35 枚池采用 2 分×14、3 分×14、4 分×7（概率 40%／40%／20%，新池单抽期望 2.8 分，合计 98 分）：严格保留该实物清点中的 2:2:1 比例，不伪称官方确认。抽取采用有限奖池无放回；不足发放时按已冻结规则补入同样 14／14／7 的新池并公开记录。该分布为数字版自主设定。 | engine.ts／honor | deck, all player counts and finite pool | 已实现 / 已验证 |
| R-077 | RULES.md §6 L130 · 房间名单、阶段、计时、存活/死亡、荣誉枚数 ／ 可见 ／ 可见 ／ 可见 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 部分验证 |
| R-078 | RULES.md §6 L131 · 自己当前真实流派 ／ 仅在尚有查看权限时显示；被换后不自动更新 ／ 未公开不可见 ／ 未公开不可见 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 部分验证 |
| R-079 | RULES.md §6 L132 · 私人流派查看、对手忍者牌查看 ／ 仅技能授权查看者 ／ 不可见 ／ 不可见 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 部分验证 |
| R-080 | RULES.md §6 L133 · 本人忍者手牌及尚未提交的选择 ／ 本人可见 ／ 不可见 ／ 不可见 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 部分验证 |
| R-081 | RULES.md §6 L134 · 同阶段已统一公开的忍者牌 ／ 可见 ／ 可见 ／ 可见 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 已验证 |
| R-082 | RULES.md §6 L135 · 正式公开的流派事实及历史公开记录 ／ 可见 ／ 可见 ／ 可见 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 部分验证 |
| R-083 | RULES.md §6 L136 · 秘密身份交换后的真实映射 ／ 仅合法获知者可见 ／ 不自动更新 ／ 不可见 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 部分验证 |
| R-084 | RULES.md §6 L137 · 荣誉标记具体数值、本人总分 ／ 本人可见 ／ 隐藏 ／ 隐藏 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 已验证 |
| R-085 | RULES.md §6 L138 · 最终正式公布的比赛结算 ／ 可见 ／ 可见 ／ 可见 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 已验证 |
| R-086 | RULES.md §6 L140 · [数字版] 身份、忍者牌和荣誉的私人情报保存带轮次和取得时刻的快照。变形后旧快照不更新，已公开的旧流派事实也只作为历史事实保留，不能标记为交换后的实时身份。受交换影响的玩家只收到“你的流派卡可能发生变化”的提示，不自动获知新身份。 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 部分验证 |
| R-087 | RULES.md §6 L142 · [数字版] 重连只能恢复：公开局面、本人当前合法行动、本人荣誉、自己有权限查看的历史快照与公开事件；不因刷新泄露已经失去查看权限的真实身份。 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 部分验证 |
| R-088 | RULES.md §6 L144 · [数字版] 旁观者可看公开行动、合法公开的流派事实、存活状态和荣誉枚数；不参与聊天、不参加投票/出牌、不能获取任何未公开的卡牌、技能目标、个人荣誉分值或私人情报；全场结束后可看正式公布的终局结算。 | engine.ts／projection | ninja.test.ts／ninja-events.spec.ts：权限投影、流派交换、刷新 | 已实现 / 已验证 |
| R-089 | RULES.md §7 L148 · [数字版] 房主设置并锁定 4～11 的人数，必须满员且所有正式玩家准备才开局。开局后禁止新增正式席位。允许仅看公开信息的旁观者。正式玩家退出只视为离线，保留席位、身份和荣誉；玩家本人重连后恢复控制。 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 已验证 |
| R-090 | RULES.md §7 L150 · [数字版默认倒计时] 轮抽 45 秒；阶段出牌提交/统一亮牌 30 秒；技能目标 30 秒；刺杀反应 15 秒；轮间结算与准备 30 秒。房主可以调整前四类时间，调整范围待定。计时由服务端主持，不以客户端本地计时为准。 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-091 | RULES.md §7 L154 · 所有相关玩家提前完成操作 ／ 立即进入下一步，非参与者不阻塞 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 已验证 |
| R-092 | RULES.md §7 L155 · 轮抽超时/掉线 ／ 从合法手牌中随机代选 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-093 | RULES.md §7 L156 · 本阶段是否亮牌未提交 ／ 视为不打出 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-094 | RULES.md §7 L157 · 必须选择目标超时 ／ 从合法目标中随机代选 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-095 | RULES.md §7 L158 · 可选效果超时 ／ 不发动 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-096 | RULES.md §7 L159 · 被刺杀者反应超时 ／ 不反应 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-097 | RULES.md §7 L160 · 掘墓人已取得牌但未选择使用方式 ／ 默认保留，不跨轮 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-098 | RULES.md §7 L161 · 一名玩家掉线或主动退出 ／ 保留正式席位及整场角色，超时托管，重连恢复 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-099 | RULES.md §7 L162 · 房主主动退出 ／ 向另一位在线正式玩家移交管理权，不变更游戏身份 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-100 | RULES.md §7 L163 · 房主掉线超时 ／ 自动转移房主管理权；精确阈值待定 | service.ts／engine.ts | 真实 Socket.IO 房主 119／121 秒 | 已实现 / 已验证 |
| R-101 | RULES.md §7 L164 · 没有在线正式玩家可接管房主 ／ 暂缓转移，待有效玩家重连处理 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-102 | RULES.md §7 L165 · 所有正式玩家离线 ／ 暂停计时与托管推进，保留当前状态 | service.ts／engine.ts | 真实 Socket.IO 全离线＋48h 重启 | 已实现 / 已验证 |
| R-103 | RULES.md §7 L166 · 仅旁观者在线 ／ 仍按全部正式玩家离线处理 | service.ts／engine.ts | 真实 Socket.IO 仅旁观者在线 | 已实现 / 已验证 |
| R-104 | RULES.md §7 L167 · 任意有效正式玩家重连 ／ 恢复原剩余计时和正常流程 | service.ts／engine.ts | 真实 Socket.IO 恢复剩余期限 | 已实现 / 已验证 |
| R-105 | RULES.md §7 L168 · 轮间有人未确认 ／ 30 秒到期自动准备；全员提前确认立即推进 | service.ts／engine.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-106 | RULES.md §7 L169 · 玩家开局后企图替换掉线席位 ／ 拒绝作为新的正式玩家加入 | service.ts／engine.ts | 真实 Socket.IO 拒绝替补席 | 已实现 / 已验证 |
| R-107 | RULES.md §7 L170 · 重复行动、并发推进 ／ 同一动作和结算不得重复生效 | service.ts／engine.ts | 真实 Socket.IO 并发＋重复＋超时 | 已实现 / 已验证 |
| R-108 | RULES.md §8 L178 · 房间 ／ 4/5/7/11 人，人数不足，未准备 ／ 正确派系数量/浪人，仅满足满员且全准备才开局 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-109 | RULES.md §8 L179 · 轮抽 ／ 正常两轮、第一轮超时、提交先后不同 ／ 每人两张，向左传牌，超时随机，提交顺序不泄密 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-110 | RULES.md §8 L180 · 出牌 ／ 同阶段多牌、无人亮牌、不出牌、玩家提前死亡 ／ 批量公开、编号顺序、合法跳过、死者普通技能无效 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-111 | RULES.md §8 L181 · 情报 ／ 密探/隐士、历史查看、身份交换、刷新 ／ 只授权查看；旧快照不变；未知新身份不泄露 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-112 | RULES.md §8 L182 · 骗徒 ／ 变形者、掘墓人、捣乱者、灵媒商人、窃贼、审判者 ／ 逐项遵守原版目标、效果、公开和可选条件 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-113 | RULES.md §8 L183 · 刺杀 ／ 盲刺/上忍，镜僧、殉道者、审判者 ／ 反应顺序正确，单次最多一反应，审判者不可反应 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-114 | RULES.md §8 L184 · 终局 ／ 流派比较/完全平局、浪人首脑、全员死亡 ／ 对应获奖集合正确，不误发奖励 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-115 | RULES.md §8 L185 · 荣誉 ／ 标记数量与分值、补池、夜晚跨过 10 分、同分冠军 ／ 数值保密；发奖后判终局；并列获胜 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-116 | RULES.md §8 L186 · 托管 ／ 目标超时、可选超时、掉线、重连、全离线 ／ 合法随机/跳过，恢复原剩余时间，状态不重复结算 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-117 | RULES.md §8 L187 · 旁观 ／ 读取公开与私有信息，尝试聊天或行动 ／ 仅公开权限，其余拒绝 | engine.test.ts／ninja.test.ts | 真实 Socket.IO 观战与权限拒绝 | 已实现 / 已验证 |
| R-118 | RULES.md §8 L188 · 房主 ／ 掉线、主动退出、无人可接管 ／ 游戏不终止，管理权按约定处理 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| R-119 | RULES.md §8 L189 · 轮间 ／ 30 秒、全部提前准备、全离线 ／ 自动准备/立即推进/暂停计时 | engine.test.ts／ninja.test.ts | ninja.test.ts：真实 Socket.IO 比赛及房间生命周期 | 已实现 / 部分验证 |
| A-1.01 | ART_DIRECTION.md L11 · 整体美术：暗黑电影感与半写实插画，不是水墨风或原版仿制风。 | castle.webp／castle-mobile.webp／theme.css | 原画总览、4／11 席截图 | 已实现 / 已验证 |
| A-1.02 | ART_DIRECTION.md L12 · 气氛：神秘、紧张，但不压抑；适当保留娱乐性。 | castle.webp／portrait-*.webp | 原画总览 | 已实现 / 已验证 |
| A-1.03 | ART_DIRECTION.md L13 · 色彩：藏青、墨黑、月白为主；朱红与金色点缀。 | castle.webp／theme.css | 原画总览、4／11 席截图 | 已实现 / 已验证 |
| A-1.04 | ART_DIRECTION.md L14 · 环境：月夜日式城堡、屋顶与庭院。 | castle.webp／castle-mobile.webp | 原画总览、4／11 席截图 | 已实现 / 已验证 |
| A-1.05 | ART_DIRECTION.md L15 · 原版关系：保留玩法及经典忍者元素，重新设计独立美术，不直接使用原版牌面图。 | assets/*.webp／ASSET_STATUS.md | 原画来源和总览 | 已实现 / 已验证 |
| A-1.06 | ART_DIRECTION.md L16 · 细节密度：场景与人物精致，操作区域克制清晰。 | portrait-*.webp／theme.css | 11 席桌面、320px 截图 | 已实现 / 已验证 |
| A-1.07 | ART_DIRECTION.md L17 · 整体动效：常态轻微动态，关键技能有明显演出。无其他附加要求。 | View.vue／theme.css | 技能演出浏览器专项 | 已实现 / 部分验证 |
| A-2.01 | ART_DIRECTION.md L21 · 桌面：环形对局式，所有玩家围绕中央行动区；不是中心舞台上下分列。 | View.vue／theme.css | 11 席桌面实测 | 已实现 / 已验证 |
| A-2.02 | ART_DIRECTION.md L22 · 自身座位：画面下方正中固定，其他玩家按相对座位顺序排列；4–11 人自适应，不能用动画挤压自己的席位。 | View.vue／theme.css | 4／11 席桌面实测 | 已实现 / 已验证 |
| A-2.03 | ART_DIRECTION.md L23 · 玩家席位：半身人物头像 + 昵称 + 生死状态 + 荣誉标记枚数；头像不可暗示实际秘密流派。 | View.vue／portrait-*.webp／honor-back.webp | 11 席实测、协议秘密投影 | 已实现 / 已验证 |
| A-2.04 | ART_DIRECTION.md L24 · 手机竖屏：当前目标优先；其他玩家在可滚动的紧凑席位区，320px 起保证可点击。 | View.vue／theme.css | 320px 实测、席位滚动容器与无横向溢出 | 已实现 / 已验证 |
| A-2.05 | ART_DIRECTION.md L25 · 本人手牌：底部固定手牌栏；轮抽时手牌放大至中央操作区，放大不等于公开。 | View.vue／theme.css | 正式轮抽及手机操作区 | 已实现 / 已验证 |
| A-2.06 | ART_DIRECTION.md L26 · 私人信息：私人情报抽屉，按轮次、阶段、取得时刻记历史快照；不自动更新变形后的身份。 | engine.ts／View.vue | 交换后历史快照单测＋刷新专项 | 已实现 / 已验证 |
| A-2.07 | ART_DIRECTION.md L27 · 选目标：点选席位高亮 → 明确二次确认；先判断合法目标，未确认的秘密选择不可对外展示。 | View.vue／engine.ts | 变形者二次选择及交换确认 | 已实现 / 已验证 |
| A-2.08 | ART_DIRECTION.md L28 · 社交：聊天抽屉与公共事件时间线分开；死人可按规则公聊，旁观者不可聊天。 | View.vue／RoomChat.vue／service.ts | 浏览器观战、协议拒绝旁观聊天 | 已实现 / 部分验证 |
| A-2.09 | ART_DIRECTION.md L29 · 旁观：相近的公开场景，但不提供手牌、私人信息、正式玩家行动入口，后台也不发私有投影。无其他附加要求。 | View.vue／service.ts | 浏览器公开旁观及私有帧检查 | 已实现 / 已验证 |
| A-3.01 | ART_DIRECTION.md L33 · 忍者牌：塔罗式竖长卡，修长构图、精细装饰、神秘符号；人物/背景继续服务于半写实电影感。 | assets/13 张技能原画／theme.css | 原画总览、手牌截图 | 已实现 / 已验证 |
| A-3.02 | ART_DIRECTION.md L34 · 牌背：统一黑金忍者纹章，暗纹与金属压印；未公开牌背不能据类别区分真实牌型。 | assets/card-back.webp／View.vue | 11 席截图、协议卡背公开属性 | 已实现 / 已验证 |
| A-3.03 | ART_DIRECTION.md L35 · 五阶段：各自辅助色 + 专属图标 + 中文文字名称，颜色并非唯一识别方式。 | View.vue／cards.ts／theme.css | 五阶段流程和状态标题 | 已实现 / 已验证 |
| A-3.04 | ART_DIRECTION.md L36 · 流派：鹤派银白鹤纹、莲派朱红莲纹、浪人灰金孤月；仅当授权获知或确实公开时展示身份。 | assets/crane.webp、lotus.webp、ronin.webp／engine.ts | 徽章总览、真实投影和身份交换 | 已实现 / 已验证 |
| A-3.05 | ART_DIRECTION.md L37 · 身份等级：显眼的 1–5 等级数字 + 身份称谓 + 等级装饰；明确数字越小等级越高。 | View.vue／theme.css／engine.ts | 实测数字徽记；独立各级称谓未制作 | 部分实现／部分验证 |
| A-3.06 | ART_DIRECTION.md L38 · 席位角色：玩家自选中立忍者外观；外观与真实流派、技能、等级绝无关联。 | Lobby.vue／portrait-*.webp | 4／11 席浏览器换装及身份分发 | 已实现 / 已验证 |
| A-3.07 | ART_DIRECTION.md L39 · 肖像：半身人物，服饰、面具和姿势各异；为 11 人密集布局设计裁切和短昵称。 | assets/portrait-*.webp／theme.css | 全肖像总览、11 席头像截图 | 已实现 / 已验证 |
| A-3.08 | ART_DIRECTION.md L40 · 死亡：肖像去色、暗红边框、明确死亡标识，仍显示昵称与荣誉枚数；死亡不自动泄露流派。 | View.vue／theme.css／engine.ts | 镜僧实测及已死亡席位 | 已实现 / 已验证 |
| A-3.09 | ART_DIRECTION.md L41 · 荣誉：古铜/暗金家纹金属徽章；仅拥有者可看见面值，其他人看到背面与枚数。 | assets/honor-front.webp、honor-back.webp／View.vue／engine.ts | 私有荣誉 HTTP／Socket.IO 权限检查 | 已实现 / 已验证 |
| A-3.10 | ART_DIRECTION.md L42 · 技能文案：卡牌显示简短效果，选中后展开完整技能说明。无其他附加要求。 | cards.ts／View.vue | 逐张元数据及手牌展开；卡缩略视图以牌名编号为主 | 部分实现／部分验证 |
| A-4.01 | ART_DIRECTION.md L46 · 出牌：发动者席位聚光 → 塔罗牌飞入中央 → 翻转放大并展示技能名称。 | View.vue／theme.css／engine.ts | 真实浏览器出牌；席位到舞台的轨迹与翻放 | 已实现 / 已验证 |
| A-4.02 | ART_DIRECTION.md L47 · 目标：目标席位醒目的发光轮廓/脉冲，结算时局部放大；私选与公开结算有不同状态。 | View.vue／theme.css | 本机确认及攻击目标动态 | 已实现 / 已验证 |
| A-4.03 | ART_DIRECTION.md L48 · 情报：私人密函展开、封印解除，仅查看者得到真正情报；旁人只看公开出牌事件。 | View.vue／theme.css／engine.ts | 密函封印动态和私有快照；无实物展开多层 | 部分实现／部分验证 |
| A-4.04 | ART_DIRECTION.md L49 · 变形者：发生实际流派交换后，对所有人公开展示两名目标之间的符印互换，不展示交换前后身份。这是用户特意选择的数字版公开性约定；如果最终没有交换，不得伪造“已经交换”的公共动画。 | View.vue／theme.css／engine.ts | 确认前无动画；公开符印在两席之间，专项双轨迹断言 | 已实现 / 已验证 |
| A-4.05 | ART_DIRECTION.md L50 · 刺杀：中央快速暗场 → 刀光掠过目标 → 短暂冲击 → 公布真实生死，不提前宣告死亡；待反应未决时只能提示“遭受攻击”。 | View.vue／theme.css／engine.ts | 真实攻击及反应窗口 | 已实现 / 已验证 |
| A-4.06 | ART_DIRECTION.md L51 · 镜僧：镜光反弹刀锋；殉道者：暗金荣誉符印升起，随后死亡。攻击反应先于这次攻击最终死亡判定；审判者无这两种反应。 | View.vue／theme.css／engine.ts | 镜僧浏览器与殉道者规则时序；殉道者视觉未独立执行 | 已实现 / 部分验证 |
| A-4.07 | ART_DIRECTION.md L52 · 死亡：短暂红光与暗影冲击 → 逐渐去色 → 暗红边框和死亡标识。 | View.vue／theme.css／engine.ts | 真实死亡结果与状态；去色及局部红光 | 已实现 / 已验证 |
| A-4.08 | ART_DIRECTION.md L53 · 荣誉：金属徽章自奖池飞向获奖者；本人展示真实分值，其他人仅背面及枚数；交换荣誉也不能给第三方显露面值。 | View.vue／theme.css／honor-*.webp | 徽章从舞台飞至得主，飞行显示背面，面值仅可由本人查看 | 已实现 / 部分验证 |
| A-4.09 | ART_DIRECTION.md L54 · 轮末：存活者依次公开翻流派卡 → 中央比较双方存活等级 → 突出胜利流派；首脑和浪人按规则单独表达，按服务器结算记录排序；不得把“演出依次翻牌”误认为身份在逻辑上顺次改变。 | View.vue／theme.css／engine.ts | 真实冠军全流程、公开档案；首脑专项规则 | 已实现 / 部分验证 |
| A-4.10 | ART_DIRECTION.md L55 · 全场冠军：月光照亮城堡、冠军肖像与塔罗式名牌居中，个人荣誉与最终总分展示，支持多人并列冠军。 | View.vue／theme.css／portrait-*.webp | 冠军截图、最终分数；城郭底图常驻 | 部分实现／部分验证 |
| A-4.11 | ART_DIRECTION.md L56 · 所有在线正式玩家统一观看完整重大演出，再展示下一步骤（用户选项，不是“个人跳过”）。但这不能阻塞服务器合法响应时限、等待掉线者确认，亦不能更改结算、强制忽略减少动态功能。无其他第四轮要求，另要求严格符合平台公共机制反馈规范。 | engine.ts／View.vue | 时间戳与反应优先；未做跨端网络延迟/时钟偏差专项 | 已实现 / 部分验证 |
| A-5.01 | ART_DIRECTION.md L60 · 字体：标题/牌名为和风气质宋体；操作与规则正文为清楚易读黑体。统一字符度量，数字和操作状态可单独强调。 | theme.css／View.vue | 桌面及移动截图 | 已实现 / 已验证 |
| A-5.02 | ART_DIRECTION.md L61 · 音乐方向：电影配乐式弦乐、低频冲击、环境音；这只是创作方向，暂不引入背景音乐/音频素材，未来用户另设音乐。 | 无音源／DECISIONS.md | 尚无公共播放器；范围核对 | 按范围保留 |
| A-5.03 | ART_DIRECTION.md L62 · 设置：背景音乐与技能音效分开调节音量，提供一键静音，并保留设备静音行为。 | View.vue audioCue／ART_DIRECTION.md | 分控和一键静音随未来公共播放器 | 按范围保留 |
| A-5.04 | ART_DIRECTION.md L63 · 时间：出牌约 0.8s、刺杀约 1.8s、流派揭示约 3s、冠军约 5s；参考基于 L1–L4，不构成服务器回合计时。 | theme.css／engine.ts | 服务端窗口和局部视觉；未独立量化所有时长 | 已实现 / 部分验证 |
| A-5.05 | ART_DIRECTION.md L64 · 同步：服务器先裁决，客户端同步呈现；可存在统一展示窗口；限时反应/合法操作不被动画遮挡，不得等待全部客户端 ACK 后才推进。 | engine.ts／View.vue | 真实刺杀反应可交互、服务端有序事件 | 已实现 / 已验证 |
| A-5.06 | ART_DIRECTION.md L65 · 镜头：完全不使用屏幕震动，仅卡牌、局部缩放、光效表达冲击；不是“微量震动”。 | theme.css | 检查关键帧范围，仅舞台、卡面、席位或冠军卡 | 已实现 / 已验证 |
| A-5.07 | ART_DIRECTION.md L66 · 性能：完整 / 轻量 / 减少动态三档可手动设定，自动为低性能设备提供轻量特效；跟随系统 reduced-motion。 | View.vue／theme.css | 三档、CSS 减少动态；自动判断以移动视口为准 | 部分实现／部分验证 |
| A-5.08 | ART_DIRECTION.md L67 · 手机：中央紧凑演出 + 背景席位适度暗化，限时反应的按钮与剩余时间始终拥有最高优先级。 | View.vue／theme.css | 320px 实测；有限时反应控制与局部背景变暗 | 已实现 / 部分验证 |
| A-5.09 | ART_DIRECTION.md L68 · 回看：公开事件时间线保留文字与关键静态画面；私人历史情报另行保存，重连不得伪造历史动画。 | View.vue／engine.ts | 刷新不重复演出，历史事件和私有情报独立 | 已实现 / 已验证 |
| A-AUDIO | ART_DIRECTION.md L69 · 用户补充：音乐当前尚不完整，未来音乐系统做成类似聊天系统的公共插件/服务，所有旧/新游戏都可复用；此轮仅保留接口，不开发、不生成音乐。 | View.vue 的 audioCue | 公开事件序号与类型传出；无音源或播放器 | 接口已实现 / 音源按范围后续 |
| C-spy-01 | RULES.md §3 · spy-1 | cards.ts／engine.ts／assets/spy.webp | engine.test.ts: card metadata spy-1；commit stays secret … 私有身份 | 已实现 / 已验证 |
| C-spy-02 | RULES.md §3 · spy-2 | cards.ts／engine.ts／assets/spy.webp | engine.test.ts: card metadata spy-2；commit stays secret … 私有身份 | 已实现 / 已验证 |
| C-spy-03 | RULES.md §3 · spy-3 | cards.ts／engine.ts／assets/spy.webp | engine.test.ts: card metadata spy-3；commit stays secret … 私有身份 | 已实现 / 已验证 |
| C-spy-04 | RULES.md §3 · spy-4 | cards.ts／engine.ts／assets/spy.webp | engine.test.ts: card metadata spy-4；commit stays secret … 私有身份 | 已实现 / 已验证 |
| C-spy-05 | RULES.md §3 · spy-5 | cards.ts／engine.ts／assets/spy.webp | engine.test.ts: card metadata spy-5；commit stays secret … 私有身份 | 已实现 / 已验证 |
| C-spy-06 | RULES.md §3 · spy-6 | cards.ts／engine.ts／assets/spy.webp | engine.test.ts: card metadata spy-6；commit stays secret … 私有身份 | 已实现 / 已验证 |
| C-mystic-01 | RULES.md §3 · mystic-1 | cards.ts／engine.ts／assets/mystic.webp | engine.test.ts: card metadata mystic-1；mystic draws either card privately… | 已实现 / 已验证 |
| C-mystic-02 | RULES.md §3 · mystic-2 | cards.ts／engine.ts／assets/mystic.webp | engine.test.ts: card metadata mystic-2；mystic draws either card privately… | 已实现 / 已验证 |
| C-mystic-03 | RULES.md §3 · mystic-3 | cards.ts／engine.ts／assets/mystic.webp | engine.test.ts: card metadata mystic-3；mystic draws either card privately… | 已实现 / 已验证 |
| C-mystic-04 | RULES.md §3 · mystic-4 | cards.ts／engine.ts／assets/mystic.webp | engine.test.ts: card metadata mystic-4；mystic draws either card privately… | 已实现 / 已验证 |
| C-mystic-05 | RULES.md §3 · mystic-5 | cards.ts／engine.ts／assets/mystic.webp | engine.test.ts: card metadata mystic-5；mystic draws either card privately… | 已实现 / 已验证 |
| C-mystic-06 | RULES.md §3 · mystic-6 | cards.ts／engine.ts／assets/mystic.webp | engine.test.ts: card metadata mystic-6；mystic draws either card privately… | 已实现 / 已验证 |
| C-trickster-01 | RULES.md §3 · trickster-1 | cards.ts／engine.ts／assets/shift.webp | engine.test.ts: card metadata trickster-1；shapeshifter truth, memory… | 已实现 / 已验证 |
| C-trickster-02 | RULES.md §3 · trickster-2 | cards.ts／engine.ts／assets/dig.webp | engine.test.ts: card metadata trickster-2；grave digger timeout… | 已实现 / 已验证 |
| C-trickster-03 | RULES.md §3 · trickster-3 | cards.ts／engine.ts／assets/trouble.webp | engine.test.ts: card metadata trickster-3；troublemaker publishes no identity… | 已实现 / 已验证 |
| C-trickster-04 | RULES.md §3 · trickster-4 | cards.ts／engine.ts／assets/merchant.webp | engine.test.ts: card metadata trickster-4；merchant may exchange an unseen token… | 已实现 / 已验证 |
| C-trickster-05 | RULES.md §3 · trickster-5 | cards.ts／engine.ts／assets/thief.webp | engine.test.ts: card metadata trickster-5；merchant … and thief compares counts | 已实现 / 已验证 |
| C-trickster-06 | RULES.md §3 · trickster-6 | cards.ts／engine.ts／assets/judge.webp | engine.test.ts: card metadata trickster-6；attack judge / pass、mirror、martyr | 已实现 / 已验证 |
| C-blind-01 | RULES.md §3 · blind-1 | cards.ts／engine.ts／assets/blind.webp | engine.test.ts: card metadata blind-1；attack blind / pass、mirror、martyr | 已实现 / 已验证 |
| C-blind-02 | RULES.md §3 · blind-2 | cards.ts／engine.ts／assets/blind.webp | engine.test.ts: card metadata blind-2；attack blind / pass、mirror、martyr | 已实现 / 已验证 |
| C-blind-03 | RULES.md §3 · blind-3 | cards.ts／engine.ts／assets/blind.webp | engine.test.ts: card metadata blind-3；attack blind / pass、mirror、martyr | 已实现 / 已验证 |
| C-blind-04 | RULES.md §3 · blind-4 | cards.ts／engine.ts／assets/blind.webp | engine.test.ts: card metadata blind-4；attack blind / pass、mirror、martyr | 已实现 / 已验证 |
| C-blind-05 | RULES.md §3 · blind-5 | cards.ts／engine.ts／assets/blind.webp | engine.test.ts: card metadata blind-5；attack blind / pass、mirror、martyr | 已实现 / 已验证 |
| C-blind-06 | RULES.md §3 · blind-6 | cards.ts／engine.ts／assets/blind.webp | engine.test.ts: card metadata blind-6；attack blind / pass、mirror、martyr | 已实现 / 已验证 |
| C-shinobi-01 | RULES.md §3 · shinobi-1 | cards.ts／engine.ts／assets/shinobi.webp | engine.test.ts: card metadata shinobi-1；attack shinobi / pass、mirror、martyr、decline | 已实现 / 已验证 |
| C-shinobi-02 | RULES.md §3 · shinobi-2 | cards.ts／engine.ts／assets/shinobi.webp | engine.test.ts: card metadata shinobi-2；attack shinobi / pass、mirror、martyr、decline | 已实现 / 已验证 |
| C-shinobi-03 | RULES.md §3 · shinobi-3 | cards.ts／engine.ts／assets/shinobi.webp | engine.test.ts: card metadata shinobi-3；attack shinobi / pass、mirror、martyr、decline | 已实现 / 已验证 |
| C-shinobi-04 | RULES.md §3 · shinobi-4 | cards.ts／engine.ts／assets/shinobi.webp | engine.test.ts: card metadata shinobi-4；attack shinobi / pass、mirror、martyr、decline | 已实现 / 已验证 |
| C-shinobi-05 | RULES.md §3 · shinobi-5 | cards.ts／engine.ts／assets/shinobi.webp | engine.test.ts: card metadata shinobi-5；attack shinobi / pass、mirror、martyr、decline | 已实现 / 已验证 |
| C-shinobi-06 | RULES.md §3 · shinobi-6 | cards.ts／engine.ts／assets/shinobi.webp | engine.test.ts: card metadata shinobi-6；attack shinobi / pass、mirror、martyr、decline | 已实现 / 已验证 |
| C-special-01 | RULES.md §3 · mirror | cards.ts／engine.ts／assets/mirror.webp | engine.test.ts: card metadata mirror；attack blind/shinobi / mirror | 已实现 / 已验证 |
| C-special-02 | RULES.md §3 · martyr | cards.ts／engine.ts／assets/martyr.webp | engine.test.ts: card metadata martyr；attack blind/shinobi / martyr | 已实现 / 已验证 |
| C-special-03 | RULES.md §3 · master | cards.ts／engine.ts／assets/master.webp | engine.test.ts: card metadata master；mastermind, dead teammates…；ronin mastermind… | 已实现 / 已验证 |
