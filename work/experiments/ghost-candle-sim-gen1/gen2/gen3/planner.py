"""Information-set bounded lookahead, only caller's private beliefs + public records.
Monte-Carlo models hypothetical future observation for each ghost-identity hypothesis.
Never inspect ground-truth opponent actions or opponent private posterior.
"""
from __future__ import annotations
import math,random
from pathlib import Path
from collections import Counter

def entropy(p):
    p=min(.999999,max(.000001,p))
    return -p*math.log2(p)-(1-p)*math.log2(1-p)

def candidate_pools(remaining,records,rng):
    pref=Counter()
    for rec in records[-2:]:
        for target in rec.reports.values():
            if target in remaining:pref[target]+=1
    ordered=sorted(remaining,key=lambda x:(-pref[x],x))
    pools=set()
    for k in (2,3):
        if len(remaining)<k:continue
        pools.add(tuple(sorted(ordered[:k])))
        pools.add(tuple(sorted(rng.sample(remaining,k))))
        pools.add(tuple(sorted(remaining[-k:])))
    return sorted(pools)

def pick_pool(remaining,records,thinker,Record,event_likelihood,rng=None,samples=20):
    """Estimate expected evidence value by counterfactual N(x) rollout.
    Returns pool, reason. Uses a deterministic local RNG, not environment RNG.
    """
    if not records:return tuple(remaining),{'kind':'N1-no-protocol'}
    if len(remaining)<=2:return tuple(remaining),{'kind':'few-intact'}
    if thinker.role!='HUMAN':
        # A ghost proposer uses publicly available destruction pressure only.
        destroyed=sum(r.public_result[1]=='DESTROYED' for r in records)
        k=3 if destroyed<=2 else 2
        return tuple(sorted(remaining[:k])),{'kind':'ghost-public-proposal'}
    seed=100009*len(records)+sum(r.public_result[0]*31+(r.public_result[1]=='DESTROYED')*43 for r in records)
    seed+=thinker.seat*103+int(max(thinker.p.values())*1000)
    local=random.Random(seed)
    pools=candidate_pools(remaining,records,local)
    own=thinker.seat
    identities=list(thinker.p)
    p0=dict(thinker.p)
    original=entropy(p0[identities[0]])
    destroyed=sum(r.public_result[1]=='DESTROYED' for r in records)
    scored=[]
    for pool in pools:
        gain=0;light=0
        for _ in range(samples):
            # Hypothetical hidden reality is SAMPLED FROM CURRENT BELIEF, not known.
            ghost=identities[0] if local.random()<p0[identities[0]] else identities[1]
            partner=next(x for x in (0,1,2) if x not in (own,ghost))
            own_choice=local.choice(pool)
            partner_choice=local.choice(pool)
            gtarget=local.choice(pool) if local.random()<.85 else local.choice(remaining)
            gaction='DESTROY' if local.random()<.97 else 'LIGHT'
            if own_choice==partner_choice:
                obs=(own_choice,'DESTROYED' if gtarget==own_choice and gaction=='DESTROY' else 'LIT')
            elif gtarget in (own_choice,partner_choice):
                obs=(gtarget,'DESTROYED' if gaction=='DESTROY' else 'LIT')
            else:obs=(local.choice(remaining),'DESTROYED')
            light+=obs[1]=='LIT'
            # Public reports: human truthful; ghost either imitates another public
            # report or chooses in scope. No one reads hidden partner choice as ghost.
            ghost_claim=(partner_choice if local.random()<.45 else local.choice(pool))
            reports={own:own_choice,partner:partner_choice,ghost:ghost_claim}
            rec=Record(len(records)+1,tuple(pool),tuple(remaining),obs,reports,
                       (own,partner,ghost),{}, {},(0,'DESTROY'))
            w={}
            for hypothesis in identities:
                other=next(x for x in (0,1,2) if x not in (own,hypothesis))
                w[hypothesis]=p0[hypothesis]*thinker.report_likelihood(rec,other,own_choice)
            z=sum(w.values())
            after=w[identities[0]]/z if z else .5
            gain+=original-entropy(after)
        info=gain/samples
        pr_light=light/samples
        # Utility rewards evidence, modest survival insurance, and controls search
        # degeneracy by limiting the penalty of a noisy estimated information gain.
        risk_weight=.07 if destroyed<3 else (.16 if destroyed==3 else .28)
        score=info+risk_weight*pr_light
        scored.append((score,pool,info,pr_light))
    scored.sort(key=lambda x:(x[0],-len(x[1]),x[1]),reverse=True)
    score,pool,info,pr_light=scored[0]
    return pool,{'kind':'sampled-information-lookahead','score':round(score,4),
                 'estimated_information_bits':round(info,4),
                 'estimated_light_probability':round(pr_light,4),
                 'candidates':len(scored),'belief':{str(k):round(v,4) for k,v in p0.items()}}
