import unittest,copy,random
from sim4 import match,calc,public_only,Record,Thinker,SocialAgent,SEATS,MODES,PROTOCOLS,GHOSTS
from social import Message,vote_result,talk_day,day_vote
from sim3 import outcome
from sim import exact_checks
class Gen4Tests(unittest.TestCase):
 def test_exact_night_rules(self):
  self.assertTrue(exact_checks())
 def test_private_record_sanitization(self):
  original=Record(2,(3,5),tuple(range(1,10)),(3,'DESTROYED'),{0:3,1:5,2:5},
                  (0,1,2),{}, {0:3,1:5},(3,'DESTROY'))
  view=public_only(original)
  self.assertEqual(view.private_actions,{})
  self.assertEqual(view.public_result,original.public_result)
  self.assertNotEqual(view.ghost_actual,original.ghost_actual)
 def test_false_claim_not_true_fact(self):
  agent=Thinker(0,'HUMAN')
  social=SocialAgent(0,'HUMAN',agent)
  before=dict(agent.p)
  social.observe_speech(Message(4,1,'EVIDENCE',2,2,'我有证据'),[], 'strategic')
  self.assertLess(agent.p[2]-before[2],.05)
  self.assertAlmostEqual(sum(agent.p.values()),1)
 def test_vote_majority_and_no_self_vote(self):
  self.assertEqual(vote_result({0:2,1:2,2:0},2),('HUMAN',2))
  self.assertEqual(vote_result({0:1,1:2,2:0},2),('CONTINUE',None))
  self.assertEqual(vote_result({0:1,1:0,2:0},2),('GHOST',0))
  with self.assertRaises(AssertionError):vote_result({0:0,1:2,2:0},2)
 def test_d4_not_early_and_both_camps_win(self):
  for pol in PROTOCOLS:
   for mode in MODES:
    for ghost in GHOSTS:
     a=match(pol,ghost,mode,501,trace=True)
     b=match(pol,ghost,mode,501,trace=True)
     self.assertEqual(a,b)
     self.assertIn(a['reason'],('correct_accuse','light5','wrong_accuse','destroy5'))
     self.assertLessEqual(a['nights'],9)
     self.assertTrue(all(v['day']>=4 for v in a['ballots']))
     self.assertTrue(all(v['day']>=2 for v in a['dialogue']))
     for v in a['ballots']:
      self.assertTrue(all(target!=seat for seat,target in v['ballot1'].items()))
      self.assertTrue(all(target!=seat for seat,target in v['ballot2'].items()))
 def test_terminal_probabilities(self):
  rows=[match('fixed3','mimic','strategic',i) for i in range(150)]
  r=calc(rows)
  self.assertEqual(sum(r['counts'].values()),150)
  self.assertAlmostEqual(sum(r[k] for k in ('correct_accuse','light5','wrong_accuse','destroy5')),1)
  self.assertAlmostEqual(r['human_total']+r['ghost_total'],1)
 def test_public_social_invariance(self):
  # Swapping a recorded secret action must not alter the publicly delivered
  # argument or the listener's resulting posterior.
  a=Thinker(0,'HUMAN');b=Thinker(0,'HUMAN')
  x=Record(1,tuple(range(1,10)),tuple(range(1,10)),(3,'DESTROYED'),
           {0:3,1:7,2:7},(0,1,2),{}, {0:3,1:7},(3,'DESTROY'))
  y=copy.deepcopy(x);y.private_actions={0:9,1:9};y.ghost_actual=(8,'LIGHT')
  from social import talk_day
  sa={i:SocialAgent(i,'HUMAN',Thinker(i,'HUMAN')) for i in SEATS}
  sb={i:SocialAgent(i,'HUMAN',Thinker(i,'HUMAN')) for i in SEATS}
  msgs_a=talk_day(sa,[public_only(x)],'persuasion',2,random.Random(7))
  msgs_b=talk_day(sb,[public_only(y)],'persuasion',2,random.Random(7))
  self.assertEqual(msgs_a,msgs_b)
  self.assertEqual(sa[0].thinker.p,sb[0].thinker.p)
if __name__=='__main__':unittest.main()
