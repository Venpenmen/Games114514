"""Gen4 independent structured social deception experiment (standard library).
Time: N1 D2 N2 D3 N3 D4, then N4 D5 ... until terminal.
Game rules imported from prior isolated research; NO live game APIs.
"""
from __future__ import annotations
import argparse,csv,json,random,sys
from collections import Counter
from dataclasses import replace
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent))
from sim3 import Thinker,Record,choose_protocol,ghost_night,ghost_report,outcome
from social import SocialAgent,talk_day,day_vote
SEATS=(0,1,2)
MODES=('baseline','claims','persuasion','strategic')
PROTOCOLS=('fixed3','lookahead')
GHOSTS=('targeted','mimic','mislead','pressure','adaptive')
REASONS=('correct_accuse','light5','wrong_accuse','destroy5')

def public_only(rec):
    return replace(rec,private_actions={},ghost_actual=(0,'DESTROY'))

def match(protocol,ghost_strategy,mode,seed,order='rotate',trace=False):
    rng=random.Random(seed)
    ghost=rng.randrange(3)
    agents={seat:Thinker(seat,'GHOST' if seat==ghost else 'HUMAN') for seat in SEATS}
    social={seat:SocialAgent(seat,agents[seat].role,agents[seat]) for seat in SEATS}
    remaining=list(range(1,10));records=[];talk_log=[];votes_log=[]
    destroyed=lit=0;d4=None;winner=reason=None
    for n in range(1,10):
        # The protocol proposer receives ONLY public history and their own belief.
        safe_history=[public_only(r) for r in records]
        pool=choose_protocol(protocol,remaining,safe_history,agents,rng)
        humans=[seat for seat in SEATS if seat!=ghost]
        choices={h:agents[h].choice(pool,rng) for h in humans}
        ghost_target,ghost_action=ghost_night(ghost_strategy,pool,remaining,safe_history,{},rng)
        result=outcome(choices[humans[0]],choices[humans[1]],
                       ghost_target,ghost_action,remaining,rng)
        if order=='ghost-last':turns=tuple(humans)+(ghost,)
        elif order=='ghost-first':turns=(ghost,)+tuple(humans)
        else:turns=SEATS[n%3:]+SEATS[:n%3]
        reports={}
        for seat in turns:
            reports[seat]=(ghost_report(ghost_strategy,ghost,pool,ghost_target,reports,rng)
                           if seat==ghost else choices[seat])
        actual=Record(n,tuple(pool),tuple(remaining),result,reports,tuple(turns),{},
                      dict(choices),(ghost_target,ghost_action))
        records.append(actual)
        public=public_only(actual)
        for h in humans:agents[h].observe(public,choices[h])
        remaining.remove(result[0])
        if result[1]=='DESTROYED':destroyed+=1
        else:lit+=1
        if destroyed==5:
            winner='GHOST';reason='destroy5';break
        if lit==5:
            winner='HUMAN';reason='light5';break
        safe_history=[public_only(r) for r in records]
        messages=talk_day(social,safe_history,mode,ghost,rng)
        talk_log.append({'day':n+1,'messages':[vars(m) for m in messages]})
        if n<3:continue
        # Identify D4 posterior before social voting, AFTER public D4 discussion.
        both_identify=all(agents[h].belief(ghost)>.5 for h in humans)
        mean_true=sum(agents[h].belief(ghost) for h in humans)/2
        verdict,attempted,revoted,b1,b2,yes=day_vote(social,ghost,safe_history,mode,messages,rng)
        votes_log.append({'day':n+1,'consent':yes,'ballot1':b1,'ballot2':b2,
                          'result':verdict,'revote':revoted})
        if n==3:
            d4={'both_identify':both_identify,'mean_true_posterior':mean_true,
                'correct':verdict=='HUMAN','wrong':verdict=='GHOST',
                'attempted':attempted,'revote':revoted,'destroyed':destroyed}
        if verdict!='CONTINUE':
            winner=verdict
            reason='correct_accuse' if verdict=='HUMAN' else 'wrong_accuse'
            break
    assert winner in ('HUMAN','GHOST'),(protocol,ghost_strategy,mode,seed)
    row={'protocol':protocol,'ghost_strategy':ghost_strategy,'social_mode':mode,
         'seed':seed,'ghost_seat':ghost,'winner':winner,'reason':reason,
         'nights':len(records),'destroyed':destroyed,'lit':lit,
         'd4_reached':d4 is not None,'d4_correct':bool(d4 and d4['correct']),
         'd4_wrong':bool(d4 and d4['wrong']),
         'd4_both_identify':bool(d4 and d4['both_identify']),
         'd4_mean_true_p':d4['mean_true_posterior'] if d4 else None,
         'd4_attempted':bool(d4 and d4['attempted']),
         'worst_n123':len(records)>=3 and all(r.public_result[1]=='DESTROYED' for r in records[:3]),
         'num_speech':sum(len(e['messages']) for e in talk_log)}
    if trace:
        row['dialogue']=talk_log
        row['ballots']=votes_log
        row['public_nights']=[{'night':r.n,'pool':r.pool,
                              'outcome':r.public_result,'reports':r.reports,
                              'report_order':r.report_order} for r in records]
        row['debug_ground_truth_separate']=[{'night':r.n,'actions':r.private_actions,
                                            'ghost_action':r.ghost_actual} for r in records]
        row['private_beliefs_debug']={h:agents[h].history for h in humans}
    return row

def calc(rows):
    n=len(rows)
    d4=[r for r in rows if r['d4_reached']]
    worst=[r for r in d4 if r['worst_n123']]
    def prop(rs,k):
        if not rs:return None
        return sum(float(r[k]) for r in rs)/len(rs)
    result={'n':n,'d4_n':len(d4),'worst_d4_n':len(worst),
            'd4_correct':prop(d4,'d4_correct'),
            'd4_wrong':prop(d4,'d4_wrong'),
            'd4_both_identify':prop(d4,'d4_both_identify'),
            'worst_d4_correct':prop(worst,'d4_correct'),
            'avg_speech':prop(rows,'num_speech'),
            'avg_nights':prop(rows,'nights')}
    counts={r:sum(x['reason']==r for x in rows) for r in REASONS}
    assert sum(counts.values())==n
    result['counts']=counts
    result.update({r:counts[r]/n for r in REASONS})
    result['human_total']=(counts['correct_accuse']+counts['light5'])/n
    result['ghost_total']=(counts['wrong_accuse']+counts['destroy5'])/n
    assert abs(result['human_total']+result['ghost_total']-1)<1e-10
    return result

def run(n=500,seed=20261118,order='rotate'):
    out=ROOT/'results'/order
    out.mkdir(parents=True,exist_ok=True)
    summaries=[];examples=[]
    for protocol in PROTOCOLS:
        for ghost_idx,ghost in enumerate(GHOSTS):
            for mode in MODES:
                rows=[]
                for j in range(n):
                    # Matched seed by ghost-type and trial across controllers.
                    trialseed=seed+j*1000003+ghost_idx*97
                    item=match(protocol,ghost,mode,trialseed,order,trace=j<2)
                    if j<2:examples.append(item)
                    rows.append({k:v for k,v in item.items() if k not in (
                        'dialogue','ballots','public_nights','debug_ground_truth_separate','private_beliefs_debug')})
                a=calc(rows)
                a.update(protocol=protocol,ghost_strategy=ghost,social_mode=mode)
                summaries.append(a)
                print(protocol,ghost,mode,'human',round(a['human_total'],4),
                      'ghost',round(a['ghost_total'],4),'d4',round(a['d4_correct'],4),flush=True)
    data={'settings':{'n_per_combination':n,'seed':seed,'order':order},
          'total_games':len(summaries)*n,'results':summaries}
    (out/'summary.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'examples.json').write_text(json.dumps(examples,ensure_ascii=False,indent=2),encoding='utf-8')
    fields=[k for k in summaries[0] if k!='counts']
    with (out/'summary.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        w.writerows([{k:r[k] for k in fields} for r in summaries])
    return data

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--n',type=int,default=500)
    ap.add_argument('--seed',type=int,default=20261118)
    ap.add_argument('--order',choices=('rotate','ghost-last','ghost-first'),default='rotate')
    args=ap.parse_args()
    run(args.n,args.seed,args.order)
