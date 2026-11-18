"""Reproducible Gen4 research report, using completed simulations only."""
import json, math
from pathlib import Path
P=Path(__file__).resolve().parent
series={s:json.loads((P/'results'/s/'summary.json').read_text(encoding='utf-8')) for s in ('rotate','ghost-last')}
for obj in series.values():
    for r in obj['results']:
        assert sum(r['counts'].values())==r['n']
        assert abs(r['human_total']+r['ghost_total']-1)<1e-10
        assert abs(sum(r[x] for x in ('correct_accuse','light5','wrong_accuse','destroy5'))-1)<1e-10
modes=('baseline','claims','persuasion','strategic')
protocols=('fixed3','lookahead')
gpolicies=('targeted','mimic','mislead','pressure','adaptive')
names={'baseline':'无额外社交','claims':'仅公开立场','persuasion':'证据说服','strategic':'策略性讨论','fixed3':'固定三根协议','lookahead':'Gen3信息前瞻',
       'targeted':'偏好攻击','mimic':'模仿报告','mislead':'范围外扰动','pressure':'高压破坏','adaptive':'自适应诡异'}
pct=lambda v:'—' if v is None else f'{v*100:.2f}%'
def aggregate(rows):
    n=sum(r['n'] for r in rows)
    result={k:sum(r[k]*r['n'] for r in rows)/n for k in ('human_total','ghost_total','correct_accuse','light5','wrong_accuse','destroy5')}
    d4_n=sum(r['d4_n'] for r in rows)
    worst_n=sum(r['worst_d4_n'] for r in rows)
    result.update(n=n,d4_n=d4_n,worst_n=worst_n,
      d4_correct=sum(r['d4_correct']*r['d4_n'] for r in rows if r['d4_correct'] is not None)/d4_n if d4_n else None,
      worst_correct=sum(r['worst_d4_correct']*r['worst_d4_n'] for r in rows if r['worst_d4_correct'] is not None)/worst_n if worst_n else None,
      avg_speech=sum(r['avg_speech']*r['n'] for r in rows)/n)
    return result
def wilson(x,n):
    if not n:return '—'
    z=1.96
    m=(x+z*z/(2*n))/(1+z*z/n)
    e=z*math.sqrt(x*(1-x)/n+z*z/(4*n*n))/(1+z*z/n)
    return f'{pct(max(0,m-e))}–{pct(min(1,m+e))}'
rows=series['rotate']['results']
lines=['# 《诡吹灯》Gen4 公开交流与社会博弈推演报告','',
'## 一、实验范围与准确口径','',
f'- 轮换报告顺序：2种候选协议 × 5种诡异策略 × 4种社交策略 × 每组{series["rotate"]["settings"]["n_per_combination"]}局 = {series["rotate"]["total_games"]:,}局。',
f'- 诡异最后报告：2 × 5 × 4 × 每组{series["ghost-last"]["settings"]["n_per_combination"]}局 = {series["ghost-last"]["total_games"]:,}局。',
f'- 共完成 {sum(d["total_games"] for d in series.values()):,} 局，全部对局均到达阵营终局。',
'- N1→D2→N2→D3→N3→D4，D4后允许继续N4、D5；在D4前只交流不指认。',
'- 夜晚结算与原 GC-RULES-1.3 相同，找出诡异或五根点亮使人类胜；错指人类或五根被毁使诡异胜。',
'- 公开语句采用受控结构化意图（ACCUSE、EVIDENCE、QUESTION、SUPPORT等），并非自然语言模型。',
'- 社交发言属于“非保证真实”的廉价信息（cheap talk）；假证据只产生有限、可回退的信念变化，不会直接变成证明。',
'- 人类默认遵守候选集合且报告真话；诡异使用预设攻击与报告混合，当前不是拟人化真人分布。',
'',
'## 二、人类/诡异总胜率及四种终局方式（轮换报告）','',
'| 协议 | 社交策略 | 正确指认(人类胜) | 点亮5根(人类胜) | **人类总胜率** | 错指人类(诡异胜) | 摧毁5根(诡异胜) | **诡异总胜率** |',
'|---|---|---:|---:|---:|---:|---:|---:|']
for p in protocols:
    for m in modes:
        z=aggregate([r for r in rows if r['protocol']==p and r['social_mode']==m])
        lines.append('| '+names[p]+' | '+names[m]+' | '+' | '.join(pct(z[k]) for k in (
            'correct_accuse','light5','human_total','wrong_accuse','destroy5','ghost_total'))+' |')
lines+=['','**检查公式**：人类总胜率＝正确指认＋点亮五根；诡异总胜率＝错误指认＋摧毁五根；双方总胜率＝100%。',
'',
'## 三、D4 与连续三夜摧毁最坏情况','',
'| 协议 | 社交策略 | D4正确指认率¹ | 连续N1、N2、N3均被毁后D4正确指认率² | 最坏样本数 | 平均发言条数 |',
'|---|---|---:|---:|---:|---:|']
for p in protocols:
    for m in modes:
        z=aggregate([r for r in rows if r['protocol']==p and r['social_mode']==m])
        lines.append(f"| {names[p]} | {names[m]} | {pct(z['d4_correct'])} | {pct(z['worst_correct'])} | {z['worst_n']} | {z['avg_speech']:.1f} |")
lines+=['','¹ 分母为到达 D4 的对局；² 分母为到达 D4 且 N1–N3 全部摧毁的对局。','',
'## 四、对手分组结果（轮换报告）','',
'| 协议 | 社交策略 | 诡异策略 | 人类总胜率 | 诡异总胜率 | D4正确指认 |',
'|---|---|---|---:|---:|---:|']
for r in rows:
    lines.append(f"| {names[r['protocol']]} | {names[r['social_mode']]} | {names[r['ghost_strategy']]} | {pct(r['human_total'])} | {pct(r['ghost_total'])} | {pct(r['d4_correct'])} |")
lines+=['','## 五、诡异最后报告压力测试','',
'| 协议 | 社交策略 | 轮换报告人类胜率 | 诡异最后报告人类胜率 |',
'|---|---|---:|---:|']
for p in protocols:
    for m in modes:
        a=aggregate([r for r in rows if r['protocol']==p and r['social_mode']==m])
        b=aggregate([r for r in series['ghost-last']['results'] if r['protocol']==p and r['social_mode']==m])
        lines.append(f"| {names[p]} | {names[m]} | {pct(a['human_total'])} | {pct(b['human_total'])} |")
lines+=['','## 六、解释与下一代建议','',
'- 应优先比较**同一社交模拟器内**的baseline、claims、persuasion和strategic：这属于消融实验，但社交机制也会改变对手反应，不能理解为现实胜率。',
'- 引用“证据”仅核对历史公共记录的存在与声明，尚未真正验证推理论证的有效性；解释能力必须继续提升。',
'- 当前心理模型只使用公开立场、可信度与简单响应预测；不具备成熟二阶心智理论，也没有完整信息集蒙特卡洛树搜索。',
'- 不同社交策略会改变随机数使用轨迹；种子相同只保证可复现与初始设置匹配，不能保证所有随机夜间结果逐项相同。',
'- 统计比例与95% Wilson区间需要结合样本量和对手分布解释；没有概率校准或跨人群验证。',
'',
'## 七、复现与文件','',
'- `social.py`：社会信念、结构化聊天、两轮投票规则。',
'- `sim4.py`：独立完整对局和双阵营胜率聚合。',
'- `test_sim4.py`：夜晚规则、隐藏信息隔离、票型、总胜率校验。',
'- `results/rotate/summary.csv`、`summary.json`、`examples.json`：正式轮换报告统计及样例。',
'- `results/ghost-last/`：诡异最后报告压力测试。',
'- `python -m unittest -v test_sim4.py`',
'- `python sim4.py --n 800 --seed 20261118 --order rotate`',
'- `python sim4.py --n 400 --seed 20261119 --order ghost-last`',
'- `python make_report4.py`',
]
(P/'REPORT_GEN4.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('REPORT_GEN4.md generated',len(lines),'lines')
