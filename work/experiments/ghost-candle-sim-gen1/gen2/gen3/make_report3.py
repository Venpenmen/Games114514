"""Gen3 final reproducible Chinese report; standard library only."""
from __future__ import annotations
import json,math
from pathlib import Path
P=Path(__file__).resolve().parent
data={o:json.loads((P/'results'/o/'summary.json').read_text(encoding='utf-8'))
      for o in ('rotate','ghost-last')}
rot=data['rotate']['rows']
policies=('fixed2','fixed3','adaptive','information','lookahead')
opponents=('targeted','mimic','mislead','pressure','adaptive')
pn={'fixed2':'固定2根','fixed3':'固定3根','adaptive':'摧毁进度自适应','information':'信念自适应','lookahead':'有限前瞻'}
gn={'targeted':'偏好定点','mimic':'模仿报告','mislead':'扰动/误导','pressure':'高压破坏','adaptive':'综合'}
fmt=lambda x:'—' if x is None else f'{x*100:.2f}%'
def summ(rows,key):
    n=sum(r['n'] for r in rows)
    return sum(r[key]*r['n'] for r in rows)/n
def worst(rows):
    n=sum(r['worst_n123'] for r in rows)
    return sum(r['worst_d4_correct']*r['worst_n123'] for r in rows if r['worst_d4_correct'] is not None)/n if n else None
def ci(p,n):
    z=1.96
    mid=(p+z*z/(2*n))/(1+z*z/n)
    r=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/(1+z*z/n)
    return f'[{fmt(mid-r)}, {fmt(mid+r)}]'
for o,doc in data.items():
    for row in doc['rows']:
        assert abs(row['human_final']+row['ghost_final']-1)<1e-8
        assert abs(sum(row[k] for k in ('win_correct_accuse','win_light5','lose_wrong_accuse','lose_destroy5'))-1)<1e-8
        assert sum(row['win_counts'].values())==row['n']
lines=['# 《诡吹灯》Gen3 有限前瞻调查与双阵营胜率报告','',
'## 1. 实验范围','',
f'- **轮换报告顺序**：5个人类协议 × 5种诡异策略 × 每组 {data["rotate"]["n"]} 局 = {len(rot)*data["rotate"]["n"]:,} 局。',
f'- **诡异最后报告**：5 × 5 × 每组 {data["ghost-last"]["n"]} 局 = {len(rot)*data["ghost-last"]["n"]:,} 局。',
'- 总计 '+f'{sum(len(v["rows"])*v["n"] for v in data.values()):,}'+' 局，独立工作区中完成，未启动或修改游戏服务。',
'- N1 无约定，D2/N2/D3/N3/D4时间顺序与GC-RULES-1.3一致；D4及以后可继续夜晚，直至正确/错误指认或五根蜡烛终局。',
'- 人类严格遵守约定、如实声明；诡异行为由五种规则策略驱动。本实验的胜率均是该人工模拟环境内的条件统计。',
'- 新的 lookahead 允许轮值提议者根据**自己**的私有身份后验（或诡异自己身份）和公开历史，枚举候选集合并取样预测下一夜结算与次日报告；对模拟的身份信息增益与短期存活综合评分。',
'','## 2. 两阵营总胜率与四种获胜方式（轮换报告）','',
'| 人类协议 | 正确指认 人类胜 | 点亮5根 人类胜 | **人类总胜率** | 错误指认 诡异胜 | 摧毁5根 诡异胜 | **诡异总胜率** |',
'|---|---:|---:|---:|---:|---:|---:|']
for p in policies:
    rs=[r for r in rot if r['policy']==p]
    lines.append('| '+pn[p]+' | '+' | '.join(fmt(summ(rs,k)) for k in
        ('win_correct_accuse','win_light5','human_final','lose_wrong_accuse','lose_destroy5','ghost_final'))+' |')
lines+=['','**重要说明**：两种人类获胜方式相加等于人类总胜率；两种诡异获胜方式相加等于诡异总胜率；双方总胜率相加为100%。','',
'## 3. 与 Gen2 四种策略进行同一模拟器内的公平比较','',
'| 人类协议 | D4正确指认率 | 连续N1–N3摧毁时D4正确指认 | 最终人类总胜率 | 人类胜率95% Wilson区间 |',
'|---|---:|---:|---:|---:|']
for p in policies:
    rs=[r for r in rot if r['policy']==p]
    h=summ(rs,'human_final')
    lines.append(f"| {pn[p]} | {fmt(summ(rs,'d4_correct'))} | {fmt(worst(rs))} | {fmt(h)} | {ci(h,sum(r['n'] for r in rs))} |")
lines+=['','- Gen3 保留了 Gen2 的 fixed2、fixed3、adaptive、information 同名策略和相同的五类诡异；它们在同一版本引擎内运行，使用相同种子索引，适合进行内部对照。',
'- 不同协议可能改变随机数消耗轨迹，属于共享初始种子而非完全相同的逐夜随机事件；微小差异需要重复独立种子确认。',
'- **新前瞻策略如果没有优于固定三根，必须如实报告**，不能因为模型复杂就认定更强。',
'','## 4. 按诡异策略拆解的人类/诡异总胜率（轮换报告）','',
'| 人类协议 | 诡异策略 | 人类总胜率 | 诡异总胜率 | 人类正确指认 | 人类点亮 | 诡异错误指认 | 诡异摧毁 |',
'|---|---|---:|---:|---:|---:|---:|---:|---:|']
for p in policies:
    for g in opponents:
        r=next(r for r in rot if r['policy']==p and r['ghost']==g)
        lines.append('| '+pn[p]+' | '+gn[g]+' | '+' | '.join(fmt(r[k]) for k in
            ('human_final','ghost_final','win_correct_accuse','win_light5','lose_wrong_accuse','lose_destroy5'))+' |')
lines+=['','## 5. 诡异最后报告压力测试','',
'| 人类协议 | 轮换报告时人类总胜率 | 诡异最后报告时人类总胜率 |',
'|---|---:|---:|']
for p in policies:
    first=[r for r in data['rotate']['rows'] if r['policy']==p]
    last=[r for r in data['ghost-last']['rows'] if r['policy']==p]
    lines.append(f"| {pn[p]} | {fmt(summ(first,'human_final'))} | {fmt(summ(last,'human_final'))} |")
lines+=['','## 6. 最坏情况与信息泄露防护','',
'- 最坏情况定义为 N1、N2、N3 连续摧毁；单独报告 D4 正确指认率（条件分母为确实进入D4并满足上述条件的对局）。',
'- lookahead 的假想未来身份从**当事机器人的后验概率**中抽样，仅用于规划；不能读取真实诡异身份或其他玩家夜间行动。',
'- 真实裁判的隐藏真相只写入隔离调试样例，正式机器人不得读取。',
'- 模拟器对规则和信息隔离执行自动测试；比对资料：Gen1 sim.py、Gen2 sim2.py 和 games/ghost-candle/engine.ts。',
'','## 7. 关键限制与后续工作','',
'- 当前是**有限取样的一步前瞻**，不是完整 IS-MCTS、POMCP，也不是具有自然语言理解的大语言模型。',
'- 仍未实现人类违约、行动承诺、复杂聊天谈判与真实心理博弈；投票使用 Gen2 的简化公开立场和二轮决策。',
'- 一步前瞻的预测模型与推断模型可能存在共同偏差，信息增益不是已校准的真实概率，部分固定策略可能胜过前瞻。',
'- 下一阶段优先优化次日声明真实性建模、反欺骗、真正面向队友共识的投票计划，避免只提升推理概率而降低胜率。',
'','## 8. 复现与文件','',
'- `sim3.py`：独立 Gen3 结算与对抗主程序。',
'- `planner.py`：依据信息集的候选集合短期前瞻规划。',
'- `test_sim3.py`：规则、信息隔离、最终胜率拆分与确定性测试。',
'- `results/rotate/summary.json`、`summary.csv`、`examples.json`：完整统计与典型对局。',
'- `results/ghost-last/`：诡异最后报告对照。',
'- 复现：`python -m unittest -v test_sim3.py`；`python sim3.py --n 1200 --seed 20261118 --order rotate`；`python sim3.py --n 600 --seed 20261119 --order ghost-last`；`python make_report3.py`。',
]
(P/'REPORT_GEN3.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('REPORT_GEN3.md generated; rows:',len(lines))
