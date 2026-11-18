import copy,random,unittest
from sim2 import (SEATS,Thinker,Record,choose_protocol,ghost_night,
                  ghost_report,match,aggregate,entropy,HUMAN_POLICIES,GHOST_POLICIES)
from sim import exact_checks
class Gen2Tests(unittest.TestCase):
 def test_reference_rules(self):self.assertTrue(exact_checks())
 def test_reproducibility_and_terminal(self):
  for p in HUMAN_POLICIES:
   for g in GHOST_POLICIES:
    a=match(p,g,733,full=True,trace=True)
    b=match(p,g,733,full=True,trace=True)
    self.assertEqual(a,b)
    self.assertLessEqual(a['nights'],9)
    self.assertIn(a['reason'],('correct_accuse','wrong_accuse','light5','destroy5'))
 def test_public_observation_only(self):
  # Changing only the other player's hidden action MUST NOT change agent inference.
  base=Record(2,(3,5),tuple(range(1,9)),(3,'DESTROYED'),
              {0:3,1:5,2:5},(0,1,2),{}, {0:3,1:5},(3,'DESTROY'))
  altered=copy.deepcopy(base)
  altered.private_actions={0:3,1:3}
  altered.ghost_actual=(8,'LIGHT')
  a,b=Thinker(0,'HUMAN'),Thinker(0,'HUMAN')
  a.observe(base,3);b.observe(altered,3)
  self.assertEqual(a.p,b.p)
 def test_ghost_night_no_hidden_actions(self):
  a=ghost_night('adaptive',(3,5),tuple(range(1,10)),[],{},random.Random(1))
  b=ghost_night('adaptive',(3,5),tuple(range(1,10)),[],{},random.Random(1))
  self.assertEqual(a,b)
 def test_public_reproducibility_and_pool(self):
  for p in HUMAN_POLICIES:
   for x in range(12):
    r=match(p,'mimic',x,trace=True)
    for night in r['trace']:
     self.assertTrue(set(night['pact']).issubset(set(range(1,10))))
     self.assertIn(night['public_result'][0],range(1,10))
 def test_first_night_no_pact(self):
  r=match('information','targeted',4432,trace=True)
  self.assertEqual(len(r['trace'][0]['pact']),9)
 def test_belief_normalization(self):
  for i in range(30):
   r=match('information','mislead',i,trace=True)
   for night in r['trace']:
    for posterior in night['private_human_beliefs'].values():
     self.assertAlmostEqual(sum(posterior.values()),1)
 def test_gen2_adaptation_uses_belief(self):
  records=[Record(1,tuple(range(1,10)),tuple(range(1,10)),(4,'DESTROYED'),{},(),{}, {},(4,'DESTROY'))]
  agents={i:Thinker(i,'HUMAN') for i in SEATS}
  # After N1 proposer seat 0. Compare low vs high certainty under SAME public information.
  low=choose_protocol('information',list(range(1,10)),records,agents,random.Random(3))
  agents[0].p={1:.999,2:.001}
  high=choose_protocol('information',list(range(1,10)),records,agents,random.Random(3))
  self.assertNotEqual(len(low),len(high))
if __name__=='__main__':unittest.main()
