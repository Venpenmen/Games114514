"""Build human-readable Chinese report from simulation output, no external packages."""
import json, math
from pathlib import Path
root=Path(__file__).resolve().parent
results=root/'results'
rotate=json.loads((results/'rotate'/'summary.json').read_text(encoding='utf-8'))
rows=rotate['results']
def pct(x):
    return f'{x*100:.2f}%' if x is not None else '—'
def mean(seq):
    return sum(seq)/len(seq) if seq else None
def wilson(p,n,z=1.96):
    if n==0:return None
    center=(p+z*z/(2*n))/(1+z*z/n)
    radius=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/(1+z*z/n)
    return max(0,center-radius),min(1,center+radius)
lines=[
'# 《诡吹灯》第一代离线推演报告',
'',
'## 1. 实验规模与边界',
'',
'- 使用独立 Python 标准库模拟器；没有修改或启动 Games114514 的服务、数据库、页面或机器人客户端。',
'- 真实夜晚结算参考 GC-RULES-1.3 / games/ghost-candle/engine.ts。',
'- 时间顺序为 N1→D2→N2→D3→N3→D4；未结束时继续至终局。N1 为无协议随机行动。',
'- 5 种人类候选协议 × 6 种诡异策略，每组 2,000 局，轮换报告顺序，共 60,000 局。',
'- 额外各进行 30,000 局（诡异先报告、诡异最后报告），合计 120,000 局。',
'- 人类在候选范围内独立均匀选蜡烛，并在白天如实报告；这尚不是会主动策划和协商的真人模拟。',
'- 诡异可从候选范围内/外攻击、低概率点亮、模仿、误导或保持沉默；没有读取人类秘密行动。',
'- 身份推断使用规则精确似然和简化诡异攻击先验。诡异真实策略与推断先验可能不同，故概率可能失准。',
'- 目前用结构化行动报告替代自然语言聊天；寻找表决/指认采用公开嫌疑声明和固定阈值的简化策略。',
'',
'## 2. 关键指标定义',
'',
'- D4 正确指认率：D4 已开放寻找时，实际成功以两票指认诡异的比例。',
'- D4 双人识别率：两名人类各自最大后验嫌疑都是诡异的比例；不意味着已经协商投票。',
'- 最坏条件：N1、N2、N3 连续三夜全部被摧毁；该条件下仅统计符合该条件的对局。',
'- 最终人类胜率：包含第五天及以后续局、点亮五根和指认两种胜利路径。',
'',
'## 3. 各协议 × 诡异策略（轮换报告）',
'',
'| 人类协议 | 诡异策略 | D4 双人识别 | D4 正确指认 | 连续三夜摧毁条件下正确指认 | 最终人类胜率 |',
'|---|---|---:|---:|---:|---:|'
]
labels={'p2':'每夜2根','p3':'每夜3根','p23':'2→3交替','p32':'3→2交替',
'adaptive':'按已摧毁数量调整','random':'随机范围内外攻击/随机报告',
'targeted':'范围内固定优先攻击/真实报告','mimic':'范围内攻击/模仿先报告者',
'mislead':'25%范围外攻击/报告反向目标','quiet':'范围内攻击/不报告',
'bluff':'12%点亮/其余范围内摧毁'}
for s in rows:
    x=s['d4_conditional'];w=s['d4_worst_conditional']
    lines.append('| '+ ' | '.join([labels[s['policy']],labels[s['ghost_strategy']],
        pct(x['d4_both_identify']),pct(x['d4_correct']),pct(w['d4_correct']),
        pct(s['human_wins_full'])])+' |')
lines.extend(['','## 4. 每种协议的等权策略混合概览','',
'六种诡异策略各占 1/6，仅作为基准平均数；并非真实玩家的策略出现频率。',
'','| 协议 | D4 正确指认（六策略等权） | 连续三夜摧毁时的正确指认* | 最终人类胜率 |',
'|---|---:|---:|---:|'])
for policy in ('p2','p3','p23','p32','adaptive'):
    block=[s for s in rows if s['policy']==policy]
    correct=mean([s['d4_conditional']['d4_correct'] for s in block])
    worst=[s['d4_worst_conditional'] for s in block]
    denom=sum(s['n'] for s in worst)
    wc=sum(s['n']*s['d4_correct'] for s in worst if s['d4_correct'] is not None)/denom if denom else None
    final=mean([s['human_wins_full'] for s in block])
    lines.append(f"| {labels[policy]} | {pct(correct)} | {pct(wc)} | {pct(final)} |")
lines.extend(['','*最坏条件列按符合连续三夜摧毁条件的样本数加权；不是六种策略简单平均。','','## 5. 报告顺序敏感性',''])
order_rows={}
for order in ('rotate','ghost-first','ghost-last'):
    doc=json.loads((results/order/'summary.json').read_text(encoding='utf-8'))
    order_rows[order]=doc['results']
lines.extend(['| 诡异策略 | 轮换顺序：D4正确指认 | 诡异先说 | 诡异最后说 |',
'|---|---:|---:|---:|'])
for gp in ('random','targeted','mimic','mislead','quiet','bluff'):
    values=[]
    for order in ('rotate','ghost-first','ghost-last'):
        a=[r['d4_conditional']['d4_correct'] for r in order_rows[order] if r['ghost_strategy']==gp]
        values.append(pct(mean(a)))
    lines.append('| '+labels[gp]+' | '+' | '.join(values)+' |')
lines.extend(['','## 6. 解释与后续工作','','- 模仿、沉默和报告先后顺序的影响应重点看策略间比较；不可把任何单组 2,000 局结果解释为真实人机对局的确定胜率。',
'- 两根与三根协议的优劣会随诡异报告策略改变。不能仅比较每夜点亮概率。',
'- 若连续三夜摧毁后身份仍对称，D4 可能没有足够证据；此时应评估继续调查的失败风险。',
'- 当前协议仅公开候选集合，两个真人实际会有非均匀数字偏好、临时改口、背离约定及复杂语言说服；这些是第二代重点。',
'- 下一代应加入对抗式诡异报告优化、双人协商、行动前承诺、动态阈值与重投后行为改变，并与现有 TS 引擎进行逐项结果交叉核对。',
'',
'## 7. 文件与复现','','- `sim.py`：独立模拟器；`test_sim.py`：规则与隔离校验；`make_report.py`：本报告生成器。',
'- `results/<报告顺序>/summary.csv`：30组策略结果；`summary.json`：完整统计；`examples.json`：样例对局逐夜真相及公开记录。',
'- 复现命令：`python -m unittest -v test_sim.py`；`python sim.py --n 2000 --full --order rotate`。',
'- 固定报告顺序另运行 `--order ghost-first` 和 `--order ghost-last`（本次各组 n=1000）。',
'',
'## 8. 重要限制','','本模型是第一代策略研究，不是已接入游戏的 AI，也不是对真人沟通行为的经验性统计。当前人类不主动说服，诡异不真正估计人类思想，D4 的第二次重投沿用首轮偏好；因此报告结果只能用于识别算法方向与比较假设。'
])
(root/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('REPORT.md ready; '+str(len(lines))+' lines')
