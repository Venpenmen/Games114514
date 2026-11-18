#!/usr/bin/env python3
"""GC-RULES-1.3 isolated first-generation N1-D4 / full-match strategy experiment.
No imports from, edits to, or networking with the game application.
"""
from __future__ import annotations
import argparse, csv, json, math, random, statistics
from dataclasses import dataclass
from pathlib import Path

ROOT=Path(__file__).resolve().parent
POLICIES=('p2','p3','p23','p32','adaptive')
GHOSTS=('random','targeted','mimic','mislead','quiet','bluff')
PLAYERS=(0,1,2)

def outcome(a,b,g,action,remaining,rng):
    assert a in remaining and b in remaining and g in remaining
    if a==b:
        return a, 'DESTROYED' if action=='DESTROY' and g==a else 'LIT'
    if g==a or g==b:
        return g, 'DESTROYED' if action=='DESTROY' else 'LIT'
    return rng.choice(remaining),'DESTROYED'

def event_likelihood(a,b,g,action,remaining,observed):
    """Exact probability of an observation, integrating fallback random destruction."""
    candle,status=observed
    if a==b:
        return float((a, 'DESTROYED' if action=='DESTROY' and g==a else 'LIT')==observed)
    if g==a or g==b:
        return float((g,'DESTROYED' if action=='DESTROY' else 'LIT')==observed)
    return (1/len(remaining)) if status=='DESTROYED' and candle in remaining else 0.0

def likelihood_for_hypothesis(own,claim,allowed,remaining,observed):
    """Human's subjective model: ghost mixes attacks, human obeys and reports truth.
    Ghost's own report is NOT trusted or treated as independent evidence.
    """
    if claim is not None and claim not in allowed: return 1e-12
    pool=[claim] if claim is not None else allowed
    if not pool: return 1e-12
    # Prior over ghost targets: 80% inside the announced range, 20% over all intact.
    weights={g:(0.8/len(allowed) if g in allowed else 0)+0.2/len(remaining) for g in remaining}
    prob=0.
    for other in pool:
        for g,w in weights.items():
            prob+=w*(0.96*event_likelihood(own,other,g,'DESTROY',remaining,observed)
                      +0.04*event_likelihood(own,other,g,'LIGHT',remaining,observed))
    return max(1e-12,prob/len(pool))

@dataclass
class Night:
    night:int
    remaining:tuple
    allowed:tuple
    actual:dict
    ghost_target:int
    ghost_action:str
    result:tuple
    reports:dict

class Agent:
    def __init__(self,seat,role):
        self.seat=seat
        self.role=role
        self.posterior={x:0.5 for x in PLAYERS if x!=seat} if role=='HUMAN' else {}
        self.records=[]
    def learn(self,night):
        if self.role!='HUMAN': return
        own=night.actual[self.seat]
        scores={}
        for suspected in self.posterior:
            partner=next(x for x in PLAYERS if x not in (self.seat,suspected))
            reported=night.reports.get(partner)
            scores[suspected]=self.posterior[suspected]*likelihood_for_hypothesis(
                own,reported,night.allowed,night.remaining,night.result)
        z=sum(scores.values())
        self.posterior={x:(scores[x]/z if z else 0.5) for x in scores}
        self.records.append({'night':night.night,'posteriors':dict(self.posterior)})
    def suspect(self,threshold=0.62):
        if not self.posterior: return None
        x=max(self.posterior,key=self.posterior.get)
        return x if self.posterior[x]>=threshold else None
    def confidence_true(self,ghost):
        return self.posterior.get(ghost,0)

def choose_pool(policy,night,remaining,rng,history):
    if night==1:return tuple(remaining)
    size={'p2':2,'p3':3,'p23':2 if night%2==0 else 3,
          'p32':3 if night%2==0 else 2}.get(policy)
    if size is None:
        # Adaptive rule based only on public destruction count, not real identities.
        destroyed=sum(n.result[1]=='DESTROYED' for n in history)
        size=2 if destroyed>=2 else 3
    return tuple(sorted(rng.sample(list(remaining),min(size,len(remaining)))))

def report_of_ghost(policy,ghost,night,spoken,rng):
    # No reading human actual targets here: only earlier PUBLIC reports and known pact.
    earlier=[spoken[x] for x in spoken if x!=ghost and spoken[x] is not None]
    valid=night.allowed
    if policy=='quiet':return None
    if policy=='targeted':return night.ghost_target
    if policy=='mimic' and earlier:return rng.choice(earlier)
    if policy=='mislead' and earlier:
        alternatives=[x for x in valid if x not in earlier]
        if alternatives:return rng.choice(alternatives)
    if policy=='bluff' and earlier:return rng.choice(earlier)
    return rng.choice(valid)

def perform_night(ghost,agents,policy,gpolicy,night_num,remaining,history,rng,order):
    allowed=choose_pool(policy,night_num,remaining,rng,history)
    humans=[x for x in PLAYERS if x!=ghost]
    actions={h:rng.choice(allowed) for h in humans}
    if gpolicy=='random':
        g=rng.choice(remaining)
    elif gpolicy=='targeted':
        # With uniform humans all candidates tie; choose a stable preferred target.
        g=min(allowed)
    elif gpolicy=='mimic':
        g=rng.choice(allowed)
    elif gpolicy=='mislead':
        # Sometimes attack outside to create an ambiguous public outcome.
        outside=[x for x in remaining if x not in allowed]
        g=rng.choice(outside) if outside and rng.random()<0.25 else rng.choice(allowed)
    elif gpolicy=='quiet':
        g=rng.choice(allowed)
    else:
        g=rng.choice(allowed)
    ga='LIGHT' if gpolicy=='bluff' and rng.random()<0.12 else 'DESTROY'
    result=outcome(actions[humans[0]],actions[humans[1]],g,ga,remaining,rng)
    # Report policy receives no human hidden actions, even as a data field.
    stub=Night(night_num,tuple(remaining),allowed,{},g,ga,result,{})
    reports={}
    for seat in order:
        if seat==ghost:reports[seat]=report_of_ghost(gpolicy,ghost,stub,reports,rng)
        else:reports[seat]=actions[seat]
    record=Night(night_num,tuple(remaining),allowed,actions,g,ga,result,reports)
    for h in humans:agents[h].learn(record)
    return record

def discussion_and_vote(ghost,agents,destructions,day,rng):
    # Simplified, explicit PUBLIC declaration model: cautious people declare the
    # leading suspect at confidence >= 0.62, or >=0.54 with 4 destructions.
    humans=[x for x in PLAYERS if x!=ghost]
    threshold=0.54 if destructions>=4 else 0.62
    statements={h:agents[h].suspect(threshold) for h in humans}
    # Ghost sees only public statements, never their hidden ballots.
    claimed=[x for x in statements.values() if x in humans]
    g_choice=rng.choice(claimed) if claimed else rng.choice(humans)
    # Seeking requires >=2 yes; ghost may say yes to exploit an exposed target.
    yes={h:statements[h] is not None for h in humans}
    yes[ghost]=bool(claimed)
    if sum(yes.values())<2:return 'CONTINUE',statements,False
    votes={h:statements[h] for h in humans}
    votes[ghost]=g_choice
    # A human can abstain on the secret ballot; counted as null.
    for target in PLAYERS:
        if sum(v==target for v in votes.values())>=2:
            return ('HUMAN' if target==ghost else 'GHOST'),statements,True
    # REVOTE: public ballots are revealed; simplified Gen1 agents keep their
    # preferences, so the second vote cannot produce a new majority.
    return 'CONTINUE',statements,True

def one_match(policy,gpolicy,seed,full=False,trace=False,report_order='rotate'):
    rng=random.Random(seed)
    ghost=rng.randrange(3)
    agents={x:Agent(x,'GHOST' if x==ghost else 'HUMAN') for x in PLAYERS}
    remaining=list(range(1,10)); history=[]
    winner=None; d4=None; d4_pre=None
    lit=0; destroyed=0; end_night=0; d4_attempted=False
    for night in range(1,10):
        if report_order=='ghost-last':
            order=tuple(x for x in PLAYERS if x!=ghost)+(ghost,)
        elif report_order=='ghost-first':
            order=(ghost,)+tuple(x for x in PLAYERS if x!=ghost)
        else:
            offset=(night-1)%3
            order=PLAYERS[offset:]+PLAYERS[:offset]
        rec=perform_night(ghost,agents,policy,gpolicy,night,remaining,history,rng,order)
        history.append(rec); remaining.remove(rec.result[0]);end_night=night
        if rec.result[1]=='LIT':lit+=1
        else:destroyed+=1
        if lit==5: winner='HUMAN';break
        if destroyed==5: winner='GHOST';break
        if night>=3:
            humans=[x for x in PLAYERS if x!=ghost]
            conf=[agents[h].confidence_true(ghost) for h in humans]
            if night==3:
                d4_pre={'both_correct_argmax':all(c>0.5 for c in conf),
                        'mean_true_posterior':sum(conf)/2,
                        'both_confident_correct':all(c>=0.62 for c in conf)}
            outcome_vote,statements,attempted=discussion_and_vote(ghost,agents,destroyed,night+1,rng)
            if night==3:
                d4={'result':outcome_vote,'attempted':attempted,
                    'correct':outcome_vote=='HUMAN','wrong':outcome_vote=='GHOST',
                    'continue':outcome_vote=='CONTINUE',
                    'both_correct_argmax':d4_pre['both_correct_argmax'],
                    'both_confident_correct':d4_pre['both_confident_correct'],
                    'mean_true_posterior':d4_pre['mean_true_posterior']}
                d4_attempted=True
            if outcome_vote!='CONTINUE':winner=outcome_vote;break
        if not full and night==3:break
    if full and winner is None:raise AssertionError('match not terminated')
    row={'policy':policy,'ghost_strategy':gpolicy,'seed':seed,'role_ghost':ghost,
         'nights':end_night,'destroyed':destroyed,'lit':lit,
         'all_first3_destroyed':len(history)>=3 and all(n.result[1]=='DESTROYED' for n in history[:3]),
         'd4_reached':d4 is not None,'d4_correct':bool(d4 and d4['correct']),
         'd4_wrong':bool(d4 and d4['wrong']),
         'd4_attempted':d4_attempted and bool(d4['attempted']) if d4 else False,
         'd4_both_identify':bool(d4 and d4['both_correct_argmax']),
         'd4_both_confident':bool(d4 and d4['both_confident_correct']),
         'd4_true_posterior':d4['mean_true_posterior'] if d4 else None,
         'winner':winner or 'ONGOING'}
    if trace:
        row['trace']=[{'night':n.night,'agreement':list(n.allowed),
            'public_result':list(n.result),'public_reports':n.reports,
            'ground_truth_human_choices':n.actual,'ground_truth_ghost':{'target':n.ghost_target,'action':n.ghost_action},
            'private_posteriors':{h:agents[h].records[i]['posteriors'] for h in agents
              if agents[h].role=='HUMAN' for i in [n.night-1] if len(agents[h].records)>i}}
            for n in history]
    return row

def exact_checks():
    rng=random.Random(6)
    r=list(range(1,10))
    for a in r:
        for b in r:
            for g in r:
                for action in ('LIGHT','DESTROY'):
                    obs=outcome(a,b,g,action,r,random.Random(19))
                    if a==b or g in (a,b):
                        assert event_likelihood(a,b,g,action,r,obs)==1
                    else:
                        assert obs[1]=='DESTROYED'
                    outcomes=[(x,status) for x in r for status in ('LIT','DESTROYED')]
                    assert abs(sum(event_likelihood(a,b,g,action,r,o) for o in outcomes)-1)<1e-9
    # Same pact, uniform independent human and in-pact ghost attacker:
    for k,expected in ((2,.25),(3,2/9)):
        acc=0
        for a in range(k):
            for b in range(k):
                for g in range(k):
                    for c in range(k):
                        acc+=event_likelihood(a,b,g,'DESTROY',list(range(9)),(c,'LIT'))
        assert abs(acc/k**3-expected)<1e-12,(k,acc)
    return True

def summarise(rows):
    total=len(rows)
    reached=[r for r in rows if r['d4_reached']]
    worst=[r for r in reached if r['all_first3_destroyed']]
    def stats(block):
        n=len(block)
        return {'n':n,'d4_both_identify':round(sum(x['d4_both_identify'] for x in block)/n,4) if n else None,
            'd4_both_confident':round(sum(x['d4_both_confident'] for x in block)/n,4) if n else None,
            'd4_correct':round(sum(x['d4_correct'] for x in block)/n,4) if n else None,
            'd4_wrong':round(sum(x['d4_wrong'] for x in block)/n,4) if n else None,
            'mean_true_posterior':round(sum(x['d4_true_posterior'] for x in block)/n,4) if n else None}
    return {'n':total,'d4_reached':len(reached),'d4_reached_rate':round(len(reached)/total,4),
      'all_first3_destroyed_rate':round(sum(x['all_first3_destroyed'] for x in rows)/total,4),
      'd4_conditional':stats(reached),'d4_worst_conditional':stats(worst),
      'human_wins_full':round(sum(x['winner']=='HUMAN' for x in rows)/total,4),
      'ghost_wins_full':round(sum(x['winner']=='GHOST' for x in rows)/total,4),
      'ongoing':sum(x['winner']=='ONGOING' for x in rows)}

def run(args):
    assert exact_checks()
    out=ROOT/'results'/args.order;out.mkdir(parents=True,exist_ok=True)
    all_stats=[];examples=[]
    for ip,policy in enumerate(POLICIES):
        for ig,ghost_policy in enumerate(GHOSTS):
            rows=[]
            for j in range(args.n):
                # Distinct seeds but deterministic and reproducible.
                seed=args.seed+1000003*j+10007*ip+53*ig
                row=one_match(policy,ghost_policy,seed,full=args.full,
                              trace=(j<2),report_order=args.order)
                if j<2:examples.append(row)
                row.pop('trace',None)
                rows.append(row)
            s=summarise(rows);s.update({'policy':policy,'ghost_strategy':ghost_policy})
            all_stats.append(s)
            print(f"{policy:8} {ghost_policy:9} D4={s['d4_reached_rate']:.3f} "
                  f"correct={s['d4_conditional']['d4_correct']} worst={s['d4_worst_conditional']['d4_correct']} "
                  f"human_final={s['human_wins_full']}",flush=True)
    fields=['policy','ghost_strategy','n','d4_reached','d4_reached_rate',
            'all_first3_destroyed_rate','human_wins_full','ghost_wins_full','ongoing']
    for group in ('d4_conditional','d4_worst_conditional'):
        fields.extend(group+'.'+k for k in ('n','d4_both_identify','d4_both_confident','d4_correct','d4_wrong','mean_true_posterior'))
    with (out/'summary.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
        for s in all_stats:
            flat={k:v for k,v in s.items() if k not in ('d4_conditional','d4_worst_conditional')}
            for group in ('d4_conditional','d4_worst_conditional'):
                flat.update({group+'.'+k:v for k,v in s[group].items()})
            w.writerow(flat)
    (out/'summary.json').write_text(json.dumps({'settings':vars(args),'results':all_stats},ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'examples.json').write_text(json.dumps(examples,ensure_ascii=False,indent=2),encoding='utf-8')
    return all_stats

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--n',type=int,default=2000,help='matches per strategy pair')
    parser.add_argument('--seed',type=int,default=20261117)
    parser.add_argument('--order',choices=('rotate','ghost-first','ghost-last'),default='rotate')
    parser.add_argument('--full',action='store_true',help='continue to terminal win')
    args=parser.parse_args()
    run(args)
