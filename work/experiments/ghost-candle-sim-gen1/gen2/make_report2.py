"""Generate Chinese report for independently completed Gen2 experiments."""
from __future__ import annotations
import json
from pathlib import Path
P=Path(__file__).resolve().parent
data={}
for order in ('rotate','ghost-last'):
    data[order]=json.loads((P/'results'/order/'summary.json').read_text(encoding='utf-8'))
rows=data['rotate']['rows']
def pc(x):
    return f'{x*100:.2f}%' if x is not None else '—'
labels={'fixed2':'两根固定','fixed3':'三根固定','adaptive':'摧毁进度自适应',
'information':'信念与风险自适应','targeted':'偏好预测攻击','mimic':'模仿公开报告',
'mislead':'范围外扰动/反向声明','pressure':'高压定点摧毁'}
ghost_labels={**labels,'adaptive':'综合自适应诡异'}
lines=[
'# 《诡吹灯》Gen2 自适应推理与博弈推演报告',
'',
'## 1. 实验概况',
'',
f'- Gen2 轮换发言：4 种人类协议 × 5 种诡异策略 × 每组 {data["rotate"]["n"]} 局，共 {len(rows)*data["rotate"]["n"]:,} 局。',
f'- Gen2 诡异最后报告：同样的 20 组，每组 {data["ghost-last"]["n"]} 局，共 {len(rows)*data["ghost-last"]["n"]:,} 局。',
'- 保留 Gen1 全部文件，本次新文件位于原 Gen1 目录下 gen2 子目录；不读取游戏运行状态，不编辑项目服务。',
'- N1 无约定；D2、D3 使用候选集合，N2、N3 之后记录报告、更新人类私有身份信念；D4 及以后进行寻找和两轮指认。',
'- 夜晚结算使用 Gen1 已核验的 GC-RULES-1.3 概率结算函数，完整终局由 Gen2 独立逻辑处理。',
'- 每组采用确定性随机种子，记录独立机器人的行为与调试真相。',
'',
'## 2. Gen2 新增能力',
'',
'- **独立信念**：两个 HUMAN 各自更新嫌疑分布；根据自己行动、公开结果和公开报告进行似然计算，不读取另一名人类夜间秘密行动。',
'- **历史推理**：保留跨夜身份后验，综合多个潜在诡异攻击分布，避免把单个猜测当作绝对事实。',
'- **动态候选协议**：信息策略根据当轮轮值提议者自己的身份信念熵、近期证据变化和摧毁进度决定两根/三根。',
'- **诡异策略**：在公开信息基础上进行偏好攻击、模仿人类已公开报告、范围外扰动和高压攻击。',
'- **D4 讨论与投票**：独立公开嫌疑、两票同意寻找、秘密指认；若首轮未形成多数，公布票型并进入第二轮。',
'',
'## 3. 轮换报告顺序：完整策略矩阵',
'',
'| 人类协议 | 诡异策略 | D4 双人识别率 | D4 正确指认率 | 连续 N1–N3 摧毁时 D4 正确指认 | 人类最终胜率 |',
'|---|---|---:|---:|---:|---:|',
]
for r in rows:
    lines.append(f"| {labels[r['policy']]} | {ghost_labels[r['ghost']]} | {pc(r['d4_both_identify'])} | {pc(r['d4_correct'])} | {pc(r['worst_d4_correct'])} | {pc(r['human_final'])} |")
lines+=['','## 4. 按协议汇总（五种诡异策略等权）','',
'| 协议 | D4 正确指认率 | D4 双人识别率 | 最终人类胜率 |',
'|---|---:|---:|---:|']
for policy in ('fixed2','fixed3','adaptive','information'):
    sub=[r for r in rows if r['policy']==policy]
    m=lambda key: sum(r[key] for r in sub)/len(sub)
    lines.append(f"| {labels[policy]} | {pc(m('d4_correct'))} | {pc(m('d4_both_identify'))} | {pc(m('human_final'))} |")
lines+=['','## 5. 获胜方式拆分（五策略 × 四协议样本加权）','',
'| 结束方式 | 占比 |',
'|---|---:|']
for key,name in [('win_correct_accuse','正确指认获胜'),('win_light5','点亮五根获胜'),
                 ('lose_wrong_accuse','错误指认导致诡异获胜'),('lose_destroy5','摧毁五根导致诡异获胜')]:
    v=sum(r[key] for r in rows)/len(rows)
    lines.append(f'| {name} | {pc(v)} |')
lines+=['','## 6. 诡异最后报告的影响','',
'| 诡异策略 | 轮换报告 D4 正确指认 | 诡异最后报告 D4 正确指认 |',
'|---|---:|---:|']
for g in GHOSTS if False else ('targeted','mimic','mislead','pressure','adaptive'):
    r1=[r for r in data['rotate']['rows'] if r['ghost']==g]
    r2=[r for r in data['ghost-last']['rows'] if r['ghost']==g]
    a=sum(r['d4_correct'] for r in r1)/len(r1)
    b=sum(r['d4_correct'] for r in r2)/len(r2)
    lines.append(f'| {ghost_labels[g]} | {pc(a)} | {pc(b)} |')
lines+=['','## 7. 与 Gen1 的对照边界','',
'- Gen1 有五种候选协议、六种诡异策略；Gen2 采用四种候选协议、五种诡异策略，且投票策略与攻击策略发生变化。',
'- 因此 Gen1 与 Gen2 的“最终胜率”**不能直接用于宣称算法变强**。本次直接可比的是 Gen2 内部固定协议与自适应协议在相同诡异类别和同组种子下的结果。',
'- 下一阶段要冻结相同对手策略与随机扰动，进行真正的 A/B 同环境比较，给出置信区间和条件统计。',
'',
'## 8. 已识别的模型限制',
'',
'- 这属于 **Gen2 原型**，尚未实现完整信息集蒙特卡洛树搜索、二阶心智理论或自然语言理解。',
'- 人类现在是“履行候选协议 + 报告真相”的理性简化模型，而非有个性、会违约和争辩的真人。',
'- 候选集合具体编号仍随机选择，当前主要优化集合大小；尚未搜索各具体编号的对抗收益。',
'- D4 说服使用公开嫌疑目标与固定风险阈值；第二轮指认仅做保守策略更新，没有完整的战略对话。',
'- 似然使用一组自定义诡异行为先验，未完成概率校准；不能把身份后验数值当作可信的现实概率。',
'- 模型中的私人信息只用于对应的人类推理；调试文件单独保存所有隐藏真相，不应接入用户公开游戏画面。',
'',
'## 9. 复现',
'',
'- `python -m unittest -v test_sim2.py`',
'- `python sim2.py --n 2000 --order rotate`',
'- `python sim2.py --n 1000 --order ghost-last`',
'- `python make_report2.py`',
'- 结果：`results/rotate/summary.csv`、`summary.json`、`examples.json`；`ghost-last` 同名文件。',
'',
'## 10. 后续建议',
'',
'1. 在固定外部对手策略下为 Gen1 和 Gen2 建立真正公平的 A/B 对照与统计显著性验证。',
'2. 增加基于私有信息集的有限步前瞻，而不是只依赖固定权重判断协议数量。',
'3. 将“公开行动承诺 → 秘密选择 → 次日声明 → 违约和解释”转化为显式信念事件。',
'4. 加入双人相互说服、诡异反向说服和保密投票的更加细致的模拟。',
]
(P/'REPORT_GEN2.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('generated',P/'REPORT_GEN2.md')
