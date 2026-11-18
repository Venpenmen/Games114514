import unittest,random,copy
from sim3 import (match,aggregate,Record,Thinker,choose_protocol,SEATS,HUMAN_POLICIES,GHOST_POLICIES,
                  event_likelihood)
from planner import pick_pool
from sim import exact_checks
class Gen3Tests(unittest.TestCase):
 def test_night_rules_exact(self):
  self.assertTrue(exact_checks())
 def test_no_unauthorized_information_to_planner(self):
  r=Record(1,tuple(range(1,10)),tuple(range(1,10)),(4,'DESTROYED'),
           {0:3,1:7,2:8},(0,1,2),{}, {0:3,1:7},(4,'DESTROY'))
  s=copy.deepcopy(r);s.private_actions={0:9,1:9};s.ghost_actual=(1,'LIGHT')
  a=Thinker(0,'HUMAN');a.observe(r,3)
  b=Thinker(0,'HUMAN');b.observe(s,3)
  x=pick_pool(list(range(1,10)),[r],a,Record,event_likelihood)
  y=pick_pool(list(range(1,10)),[s],b,Record,event_likelihood)
  self.assertEqual(x,y)
 def test_lookahead_distinct_from_fixed(self):
  for seed in range(10):
   r=match('lookahead','mimic',seed,trace=True)
   self.assertEqual(len(r['trace'][0]['pact']),9)
   for night in r['trace'][1:]:
    self.assertIn(len(night['pact']),(2,3))
 def test_gen3_complete_and_stats_add_to_one(self):
  for p in HUMAN_POLICIES:
   for g in GHOST_POLICIES:
    r=match(p,g,714,full=True,trace=True)
    self.assertEqual(r,match(p,g,714,full=True,trace=True))
    self.assertLessEqual(r['nights'],9)
    self.assertIn(r['reason'],('correct_accuse','wrong_accuse','light5','destroy5'))
  rows=[match('lookahead','adaptive',s) for s in range(100)]
  a=aggregate(rows)
  self.assertAlmostEqual(a['human_final']+a['ghost_final'],1)
  self.assertAlmostEqual(sum(a[k] for k in ('win_correct_accuse','win_light5','lose_wrong_accuse','lose_destroy5')),1)
  self.assertEqual(sum(a['win_counts'].values()),len(rows))
 def test_no_vote_before_d4(self):
  for s in range(50):
   r=match('lookahead','pressure',s)
   if r['nights']<3:self.assertIn(r['reason'],('light5','destroy5'))
if __name__=='__main__':unittest.main()
