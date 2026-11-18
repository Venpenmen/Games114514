"""Gen2 independent research sandbox. Based on frozen GC-RULES-1.3 settlement.
No application import, service access, or changes to existing games. Stdlib only.
N1,D2,N2,D3,N3,D4... model with independent human beliefs.
"""
from __future__ import annotations
import argparse,csv,json,math,random,sys
from collections import Counter
from dataclasses import dataclass,field
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT.parent))
sys.path.insert(0,str(ROOT.parent.parent))
from sim import outcome,event_likelihood,one_match as gen1_match
from planner import pick_pool
SEATS=(0,1,2)
HUMAN_POLICIES=('fixed2','fixed3','adaptive','information','lookahead')
GHOST_POLICIES=('targeted','mimic','mislead','pressure','adaptive')
EPS=1e-9

def clip(x,lo=.001,hi=.999):return min(hi,max(lo,x))
def entropy(p):
    p=clip(p);return -(p*math.log2(p)+(1-p)*math.log2(1-p))
def normalize(p):
    z=sum(p.values())
    return {k:v/z for k,v in p.items()} if z>0 else {k:1/len(p) for k in p}
def target_distribution(pool,remaining,mode):
    if mode=='range':return {g:(1/len(pool) if g in pool else 0) for g in remaining}
    if mode=='outside':
        outside=[g for g in remaining if g not in pool]
        if not outside:return target_distribution(pool,remaining,'range')
        return {g:1/len(outside) if g in outside else 0 for g in remaining}
    if mode=='favorite':
        return {g:(.65 if g==min(pool) else (.35/(len(pool)-1) if g in pool and len(pool)>1 else 0)) for g in remaining} if len(pool)>1 else target_distribution(pool,remaining,'range')
    return {g:(.8/len(pool) if g in pool else 0)+.2/len(remaining) for g in remaining}

@dataclass
class Record:
    n:int
    pool:tuple
    remaining:tuple
    public_result:tuple
    reports:dict
    report_order:tuple
    commitments:dict
    private_actions:dict=field(repr=False)
    ghost_actual:tuple=field(repr=False)
    public_claims:dict=field(default_factory=dict)

class Thinker:
    def __init__(self,seat,role):
        self.seat=seat
        self.role=role
        self.p={i:.5 for i in SEATS if i!=seat} if role=='HUMAN' else {}
        self.history=[]
        self.trust={i:1.0 for i in SEATS if i!=seat}
        self.public_claim=None
    def belief(self,seat):return self.p.get(seat,0.0)
    def report_likelihood(self,rec,partner,observed_target):
        """Marginalize over hidden ghost target/action, not knowing true ghost actions.
        Treat a player's announced target as evidence ONLY under the human hypothesis.
        A ghost report may be arbitrary, so it is marginalized rather than trusted.
        """
        claim=rec.reports.get(partner)
        partner_values=([claim] if claim in rec.pool else list(rec.pool))
        if claim is not None and claim not in rec.pool:partner_values=list(rec.pool)
        if not partner_values:return EPS
        rem=list(rec.remaining)
        # Mixture prior reduces overconfidence when a ghost changes tactic.
        mode_weights=(('range',.55),('uniform',.30),('outside',.15))
        total=0
        for mode,mw in mode_weights:
            tdist=target_distribution(rec.pool,rem,mode)
            for b in partner_values:
                for g,gprob in tdist.items():
                    if not gprob:continue
                    total+=mw*gprob*(.95*event_likelihood(observed_target,b,g,'DESTROY',rem,rec.public_result)
                         +.05*event_likelihood(observed_target,b,g,'LIGHT',rem,rec.public_result))/len(partner_values)
        # Trust should not be absolute. Human can misreport or parser can miss meaning.
        if claim is None:return max(total,EPS)
        if claim not in rec.pool:return max(.025*total,EPS)
        # Report timing is observed but its order alone is not independent identity proof.
        return max(.97*total+.03*sum(
            event_likelihood(observed_target,b,g,'DESTROY',rem,rec.public_result)
            for b in rec.pool for g in rem)/(len(rec.pool)*len(rem)),EPS)
    def observe(self,rec,own_target):
        if self.role!='HUMAN':return
        score={}
        for ghost in self.p:
            partner=next(x for x in SEATS if x not in (self.seat,ghost))
            likelihood=self.report_likelihood(rec,partner,own_target)
            score[ghost]=max(EPS,self.p[ghost]*likelihood)
        self.p=normalize(score)
        self.history.append({'n':rec.n,'identity':dict(self.p),
                             'result':rec.public_result,'partner_report':{x:rec.reports.get(x) for x in self.p}})
    def top(self):return max(self.p,key=self.p.get)
    def suspicion(self):return self.p[self.top()]
    def choice(self,pool,rng):
        # Equal baseline with limited human preference learned from past own selections.
        return rng.choice(pool)

def choose_protocol(policy,remaining,records,thinkers,rng):
    if not records:return tuple(remaining)
    if len(remaining)<=2:return tuple(remaining)
    if policy=='lookahead':
        proposer=(len(records)-1)%3
        pool,meta=pick_pool(remaining,records,thinkers[proposer],Record,event_likelihood)
        return pool
    if policy=='fixed2':k=2
    elif policy=='fixed3':k=3
    elif policy=='adaptive':
        # Credibility- and urgency-aware heuristic: public outcomes only.
        destroyed=sum(r.public_result[1]=='DESTROYED' for r in records)
        k=2 if destroyed>=2 else 3
    else:
        # Protocol proposer rotates in seat order. Only this player's personal
        # belief and public night history determine the selected set size.
        proposer=(len(records)-1)%3
        speaker=thinkers[proposer]
        destroyed=sum(r.public_result[1]=='DESTROYED' for r in records)
        if speaker.role=='HUMAN':
            uncertainty=entropy(speaker.suspicion())
            prior_uncertainty=entropy(max(speaker.history[-2]['identity'].values())) if len(speaker.history)>1 else 1.0
            little_learning=abs(uncertainty-prior_uncertainty)<.025
            # Higher uncertainty and low danger -> probe three. High danger,
            # strong inference or stale evidence -> more constrained two.
            two_score=.48+.085*destroyed+.16*(1-uncertainty)+(.07 if little_learning else 0)
            three_score=.67+.11*uncertainty-.045*destroyed
        else:
            # A ghost proposer may favor a larger pool to dilute constraints.
            two_score=.49+.075*destroyed
            three_score=.66-.025*destroyed
        k=2 if two_score>=three_score else 3
    # Randomize actual labels; the protocol's cardinality is the strategic choice.
    return tuple(sorted(rng.sample(list(remaining),min(len(remaining),k))))

def ghost_night(gpolicy,pool,remaining,public_history,public_claims,rng):
    # Ghost knows only candidate pool and publicly expressed action tendencies.
    preferences=Counter()
    for rec in public_history:
        for seat,claim in rec.reports.items():
            if claim is not None:preferences[claim]+=.2
    for seat,claim in public_claims.items():
        if claim is not None:preferences[claim]+=.7
    likely=max(pool,key=lambda c:(preferences[c],-c))
    if gpolicy=='targeted':return likely,'DESTROY'
    if gpolicy=='mimic':return rng.choice(pool),'DESTROY'
    if gpolicy=='mislead':
        off=[x for x in remaining if x not in pool]
        return (rng.choice(off),'DESTROY') if off and rng.random()<.20 else (rng.choice(pool),'DESTROY')
    if gpolicy=='pressure':return likely,'DESTROY'
    # Adaptive tries highly-predicted attack, occasionally adds unpredictability.
    if rng.random()<.78:return likely,'DESTROY'
    if rng.random()<.08:return rng.choice(pool),'LIGHT'
    return rng.choice(pool),'DESTROY'

def ghost_report(gpolicy,ghost,pool,ghost_target,already,rng):
    earlier=[r for seat,r in already.items() if seat!=ghost and r is not None]
    if gpolicy=='targeted':return ghost_target
    if gpolicy in ('mimic','adaptive') and earlier:return rng.choice(earlier)
    if gpolicy=='mislead':
        alt=[x for x in pool if x not in earlier]
        return rng.choice(alt or list(pool))
    if gpolicy=='pressure' and earlier:
        # First repeat a public declaration, if available.
        return rng.choice(earlier)
    return rng.choice(pool)

def talk(ghost,thinkers,records,rng):
    """Public suspicion utterances. Each speaker cannot read others' private beliefs."""
    statements={}
    for seat,agent in thinkers.items():
        if seat==ghost:continue
        # Ambivalent human speaks cautiously. In high-risk phase disclose a suspect.
        destroyed=sum(r.public_result[1]=='DESTROYED' for r in records)
        threshold=.60 if destroyed<4 else .52
        statements[seat]=agent.top() if agent.suspicion()>=threshold else None
    ghost_choices=[h for h in SEATS if h!=ghost]
    # Ghost observes PUBLIC statements, chooses a human who is publicly accused.
    social=Counter(x for x in statements.values() if x in ghost_choices)
    statements[ghost]=max(ghost_choices,key=lambda h:(social[h],-h)) if social else rng.choice(ghost_choices)
    return statements

def decide(ghost,thinkers,records,rng):
    destroyed=sum(r.public_result[1]=='DESTROYED' for r in records)
    statements=talk(ghost,thinkers,records,rng)
    # Public search consent. People believe this is risky; increase participation
    # when the fifth destruction is imminent.
    yes={}
    for seat,agent in thinkers.items():
        if seat==ghost:
            yes[seat]=any(v in [h for h in SEATS if h!=ghost] for v in statements.values())
        else:
            yes[seat]=agent.suspicion()>=(.57 if destroyed<4 else .505)
    if sum(yes.values())<2:return 'CONTINUE',statements,False,False
    # Ballot 1, private choices. Valid ballot MUST target another player.
    ballot={}
    for seat,agent in thinkers.items():
        if seat==ghost:
            accusations=Counter(v for other,v in statements.items() if other!=ghost and v!=ghost and v is not None)
            ballot[seat]=max(accusations,key=accusations.get) if accusations else rng.choice([x for x in SEATS if x!=ghost])
        else:
            ballot[seat]=agent.top()
    def resolved(votes):
        for target in SEATS:
            if sum(v==target for v in votes.values())>=2:
                return 'HUMAN' if target==ghost else 'GHOST'
        return 'CONTINUE'
    result=resolved(ballot)
    if result!='CONTINUE':return result,statements,True,False
    # Ballots are published after first vote. Revote strategy:
    # Humans do not automatically follow whichever player has the most
    # votes; they only switch if their own top suspicion and public ballots
    # agree enough (avoid trusting potential ghost vote).
    second=dict(ballot)
    for seat,agent in thinkers.items():
        if seat==ghost:
            # Ghost can adapt after observing public first vote.
            helpful=[x for x in SEATS if x!=ghost and sum(t==x for v,t in ballot.items() if v!=ghost)>0]
            second[seat]=rng.choice(helpful or [x for x in SEATS if x!=ghost])
        else:
            # Re-evaluate human-owned suspicion; never change to self.
            if agent.suspicion()<.53:
                other=next(x for x in SEATS if x!=seat and x!=agent.top())
                # Weak preference can switch if another human publicly voted there.
                if sum(v==other for p,v in ballot.items() if p!=seat)>=2 and other!=seat:
                    second[seat]=other
    return resolved(second),statements,True,True

def match(policy,gpolicy,seed,full=True,order='rotate',trace=False):
    rng=random.Random(seed)
    ghost=rng.randrange(3)
    agents={seat:Thinker(seat,'GHOST' if seat==ghost else 'HUMAN') for seat in SEATS}
    remaining=list(range(1,10));history=[]
    d4=None;winner=None;reason='';lit=destroyed=0
    for n in range(1,10):
        pool=choose_protocol(policy,remaining,history,agents,rng)
        humans=[x for x in SEATS if x!=ghost]
        human_choices={h:agents[h].choice(pool,rng) for h in humans}
        gtarget,gaction=ghost_night(gpolicy,pool,remaining,history,{},rng)
        result=outcome(human_choices[humans[0]],human_choices[humans[1]],gtarget,gaction,remaining,rng)
        if order=='ghost-last':reporters=tuple(humans)+(ghost,)
        elif order=='ghost-first':reporters=(ghost,)+tuple(humans)
        else:reporters=SEATS[n%3:]+SEATS[:n%3]
        published={}
        # Report by public turn only; no direct access to opponents' private night actions.
        for seat in reporters:
            published[seat]=ghost_report(gpolicy,ghost,pool,gtarget,published,rng) if seat==ghost else human_choices[seat]
        rec=Record(n,tuple(pool),tuple(remaining),result,published,tuple(reporters),{},
                   dict(human_choices),(gtarget,gaction))
        history.append(rec)
        for h in humans:agents[h].observe(rec,human_choices[h])
        remaining.remove(result[0])
        if result[1]=='DESTROYED':destroyed+=1
        else:lit+=1
        if destroyed==5:winner='GHOST';reason='destroy5';break
        if lit==5:winner='HUMAN';reason='light5';break
        if n>=3:
            conf=[agents[h].belief(ghost) for h in humans]
            verdict,statements,attempted,revote=decide(ghost,agents,history,rng)
            if n==3:
                d4={'both_identify':all(c>.5 for c in conf),
                    'mean_p_true':sum(conf)/2,'correct':verdict=='HUMAN',
                    'wrong':verdict=='GHOST','attempted':attempted,
                    'revote':revote,'pre_destroyed':destroyed,
                    'both_confident':all(c>=.6 for c in conf)}
            if verdict!='CONTINUE':
                winner=verdict;reason='correct_accuse' if verdict=='HUMAN' else 'wrong_accuse';break
        if not full and n==3:break
    if full:assert winner is not None
    row={'policy':policy,'ghost':gpolicy,'seed':seed,'ghost_seat':ghost,
         'nights':len(history),'winner':winner or 'ONGOING','reason':reason,
         'd4_reached':d4 is not None,'d4_correct':bool(d4 and d4['correct']),
         'd4_wrong':bool(d4 and d4['wrong']),'d4_both_identify':bool(d4 and d4['both_identify']),
         'd4_mean_p':d4['mean_p_true'] if d4 else None,'d4_revote':bool(d4 and d4['revote']),
         'worst_n123':len(history)>=3 and all(r.public_result[1]=='DESTROYED' for r in history[:3])}
    if trace:
        row['trace']=[{'stage':'N'+str(r.n),'pact':list(r.pool),'public_result':r.public_result,
        'public_reports':r.reports,'report_order':r.report_order,
        'ground_truth_for_debug_only':{'human_actions':r.private_actions,'ghost':r.ghost_actual},
        'private_human_beliefs':{h:agents[h].history[r.n-1]['identity'] for h in humans}}
        for r in history]
        row['d4']=d4
    return row

def aggregate(block):
    n=len(block);d4=[r for r in block if r['d4_reached']]
    worst=[r for r in d4 if r['worst_n123']]
    def avg(b,key):return sum(float(r[key]) for r in b)/len(b) if b else None
    return {'n':n,'d4_reached':len(d4),'worst_n123':len(worst),
            'd4_correct':avg(d4,'d4_correct'),'d4_wrong':avg(d4,'d4_wrong'),
            'd4_both_identify':avg(d4,'d4_both_identify'),
            'd4_mean_p':avg(d4,'d4_mean_p'),
            'worst_d4_correct':avg(worst,'d4_correct'),
            'human_final':avg([{'w':r['winner']=='HUMAN'} for r in block],'w'),
            'ghost_final':avg([{'w':r['winner']=='GHOST'} for r in block],'w'),
            'win_correct_accuse':sum(r['reason']=='correct_accuse' for r in block)/n,
            'win_light5':sum(r['reason']=='light5' for r in block)/n,
            'lose_wrong_accuse':sum(r['reason']=='wrong_accuse' for r in block)/n,
            'lose_destroy5':sum(r['reason']=='destroy5' for r in block)/n,
            'avg_nights':avg(block,'nights'),
            'win_counts':{reason:sum(r['reason']==reason for r in block) for reason in ('correct_accuse','light5','wrong_accuse','destroy5')}}

def run(n,seed,order,full=True):
    out=ROOT/'results'/order;out.mkdir(parents=True,exist_ok=True)
    rows=[];samples=[]
    for i,p in enumerate(HUMAN_POLICIES):
        for j,g in enumerate(GHOST_POLICIES):
            block=[]
            for k in range(n):
                # Same evaluation seed across policies => common random numbers.
                value=seed+1000003*k+97*j
                r=match(p,g,value,full,order,trace=k<2)
                if k<2:samples.append(r)
                r.pop('trace',None);r.pop('d4',None)
                block.append(r)
            x=aggregate(block);x.update(policy=p,ghost=g);rows.append(x)
            print(p,g,'D4',round(x['d4_correct'],4),'worst',round(x['worst_d4_correct'],4) if x['worst_d4_correct'] is not None else None,'human',round(x['human_final'],4),'ghost',round(x['ghost_final'],4),flush=True)
    (out/'summary.json').write_text(json.dumps({'n':n,'seed':seed,'order':order,'rows':rows},ensure_ascii=False,indent=2),encoding='utf-8')
    (out/'examples.json').write_text(json.dumps(samples,ensure_ascii=False,indent=2),encoding='utf-8')
    with (out/'summary.csv').open('w',newline='',encoding='utf-8-sig') as f:
        fields=[k for k in rows[0] if k!='win_counts']
        writer=csv.DictWriter(f,fieldnames=fields);writer.writeheader();writer.writerows([{k:r[k] for k in fields} for r in rows])
    return rows

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--n',type=int,default=400)
    ap.add_argument('--seed',type=int,default=20261118)
    ap.add_argument('--order',choices=('rotate','ghost-first','ghost-last'),default='rotate')
    ap.add_argument('--only-d4',action='store_true')
    args=ap.parse_args()
    run(args.n,args.seed,args.order,not args.only_d4)
