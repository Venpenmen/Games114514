"""Gen4 public speech / personal mental model / rule-faithful ballots.
No model receives other participants' private beliefs or hidden actions.
Public utterances are cheap talk: conviction never becomes a verified fact.
"""
from __future__ import annotations
from dataclasses import dataclass
from collections import Counter
import math

SEATS=(0,1,2)

@dataclass(frozen=True)
class Message:
    day:int
    speaker:int
    kind:str
    target:int|None
    source_night:int|None=None
    text:str=''

class SocialAgent:
    def __init__(self,seat,role,thinker):
        self.seat=seat;self.role=role;self.thinker=thinker
        self.trust={x:.5 for x in SEATS if x!=seat}
        self.public_claims={}
        self.estimated_peer_votes={x:None for x in SEATS if x!=seat}
        self.speech_history=[]
        self.own_public_position=None
    def belief(self,target):
        return self.thinker.p.get(target,0) if self.role=='HUMAN' else 0
    def top(self):
        return self.thinker.top() if self.role=='HUMAN' else None
    def observe_speech(self,msg,records,mode):
        # Only data in msg and already PUBLIC record data is used.
        self.speech_history.append(msg)
        if msg.speaker==self.seat:return
        if msg.kind in ('ACCUSE','EVIDENCE','SUPPORT','CHALLENGE') and msg.target is not None:
            self.public_claims[msg.speaker]=msg.target
            self.estimated_peer_votes[msg.speaker]=msg.target
        if self.role!='HUMAN' or mode in ('baseline','claims'):return
        if msg.target not in self.thinker.p:return
        # Validate whether the claimed evidence references a public record.
        verified=bool(msg.source_night is not None and
                      1<=msg.source_night<=len(records))
        if msg.kind=='EVIDENCE' and verified:
            rec=records[msg.source_night-1]
            # A public claim from speaker may be compared with the night report.
            # This only checks referential consistency, not truthfulness.
            verified=(rec.n==msg.source_night and rec.reports.get(msg.speaker) is not None)
        evidence_weight=.038 if verified else .014
        if msg.kind=='CHALLENGE':evidence_weight=.012
        if msg.kind=='SUPPORT':evidence_weight=.008
        # A player accusing me can be a ghost or a mistaken human. Do not alter
        # self identity or assume source credibility.
        sender_trust=self.trust.get(msg.speaker,.5)
        old=self.thinker.p[msg.target]
        agreement=old-.5
        if agreement<-.18:
            self.trust[msg.speaker]=max(.12,sender_trust-.03)
        elif agreement>.18:
            self.trust[msg.speaker]=min(.80,sender_trust+.015)
        # Cheap talk can update beliefs only weakly; cannot overwhelm rule evidence.
        delta=evidence_weight*(.55+sender_trust)
        new=min(.999,max(.001,old+delta))
        other=next(x for x in self.thinker.p if x!=msg.target)
        self.thinker.p[msg.target]=new
        self.thinker.p[other]=1-new
    def choose_message(self,day,records,mode,visible_messages,rng,ghost):
        destroyed=sum(r.public_result[1]=='DESTROYED' for r in records)
        if self.role=='HUMAN':
            suspect=self.top()
            confidence=self.belief(suspect)
            threshold=.59 if destroyed<4 else .515
            if confidence<threshold and mode!='strategic':
                return Message(day,self.seat,'QUESTION',None,records[-1].n,'请解释上一夜的行动')
            if mode=='strategic':
                # Approximate one-step response planning against public stances:
                # pick a reasoned argument over a bare claim if teammate persuasion
                # is needed, but avoid exposing ungrounded high certainty.
                public_agree=sum(m.target==suspect for m in visible_messages
                                 if m.speaker!=self.seat and m.target is not None)
                if confidence<.53:
                    return Message(day,self.seat,'QUESTION',None,records[-1].n,'还需要核对行动报告')
                kind='EVIDENCE' if public_agree==0 else 'SUPPORT'
            else:kind='EVIDENCE' if mode=='persuasion' else 'ACCUSE'
            return Message(day,self.seat,kind,suspect,records[-1].n,
                           f'依据N{records[-1].n}结果，我倾向怀疑玩家{suspect}')
        # Ghost's private knowledge of own role / the other two human seats is legal.
        humans=[x for x in SEATS if x!=self.seat]
        earlier=Counter(m.target for m in visible_messages if m.target in humans)
        earlier.update({t:1 for t in self.public_claims.values() if t in humans})
        # Try to align accusation with a human's PUBLIC stance, not their secret belief.
        target=max(humans,key=lambda h:(earlier[h],-h)) if earlier else rng.choice(humans)
        if mode=='baseline':kind='ACCUSE'
        elif mode=='claims':kind='ACCUSE'
        elif mode=='persuasion':kind='EVIDENCE'
        else:kind='SUPPORT' if earlier[target]>0 else 'EVIDENCE'
        return Message(day,self.seat,kind,target,records[-1].n,
                       f'我认为玩家{target}有疑点')

def talk_day(social,records,mode,ghost,rng):
    day=records[-1].n+1
    # Fixed public speaking order depends on day only, never secret identity.
    order=SEATS[(day-1)%3:]+SEATS[:(day-1)%3]
    messages=[]
    if mode=='baseline':return messages
    rounds=1 if mode=='claims' else 2
    for turn in range(rounds):
        for speaker in order:
            bot=social[speaker]
            msg=bot.choose_message(day,records,mode,messages,rng,ghost)
            messages.append(msg)
            for listener in social.values():
                listener.observe_speech(msg,records,mode)
    return messages

def vote_result(votes,ghost):
    assert all(v in SEATS and v!=speaker for speaker,v in votes.items())
    for t in SEATS:
        if sum(v==t for v in votes.values())>=2:
            return ('HUMAN' if t==ghost else 'GHOST'),t
    return 'CONTINUE',None

def day_vote(social,ghost,records,mode,messages,rng):
    """DAY_DECISION -> ACCUSATION -> RESULT -> REVOTE -> RESULT, exact majorities."""
    destroyed=sum(r.public_result[1]=='DESTROYED' for r in records)
    day=records[-1].n+1
    public_targets=Counter(m.target for m in messages if m.target in SEATS)
    yes={}
    for seat,agent in social.items():
        if seat==ghost:
            # Ghost approves only if public attacks against humans exist or urgency.
            yes[seat]=any(t!=ghost for t in public_targets) or destroyed>=4
        else:
            conf=agent.thinker.suspicion()
            # Limited expected value of proceeding: confidence and public coalition.
            support=public_targets.get(agent.top(),0)
            threshold=.61 if destroyed<4 else .505
            if mode=='strategic' and support>=2:threshold-=.045
            yes[seat]=conf>=threshold
    if sum(yes.values())<2:
        return 'CONTINUE',False,False,{}, {},yes
    def human_target(seat,first=None):
        agent=social[seat];target=agent.top()
        if first is None or mode in ('baseline','claims'):
            return target
        # After the public ballot, reconsider in light of both private evidence
        # and PUBLIC first-ballot choices. No voter reads another's hidden beliefs.
        alternatives=[x for x in SEATS if x!=seat and x!=target]
        alt=alternatives[0]
        peer_support=sum(first[v]==alt for v in first if v!=seat)
        conf=agent.belief(target)
        if mode in ('persuasion','strategic') and conf<(.64 if mode=='strategic' else .58) and peer_support>=2:
            return alt
        return target
    def ghost_target(first=None):
        humans=[x for x in SEATS if x!=ghost]
        if first is not None:
            # Ghost sees first ballot publicly and seeks wrong majority.
            seen=Counter(first[s] for s in first if s!=ghost and first[s] in humans)
            if seen:return max(humans,key=lambda x:(seen[x],-x))
        claimed=Counter(m.target for m in messages if m.speaker!=ghost and m.target in humans)
        return max(humans,key=lambda x:(claimed[x],-x)) if claimed else rng.choice(humans)
    ballot={s:(ghost_target() if s==ghost else human_target(s)) for s in SEATS}
    verdict,_=vote_result(ballot,ghost)
    if verdict!='CONTINUE':
        return verdict,True,False,ballot,{},yes
    revote={s:(ghost_target(ballot) if s==ghost else human_target(s,ballot)) for s in SEATS}
    verdict,_=vote_result(revote,ghost)
    return verdict,True,True,ballot,revote,yes
