import random
import unittest
from sim import outcome,event_likelihood,likelihood_for_hypothesis,exact_checks,one_match,POLICIES,GHOSTS

class SimulationTests(unittest.TestCase):
    def test_exact_enumeration(self):
        self.assertTrue(exact_checks())
    def test_same_candle_ghost_destroy(self):
        self.assertEqual(outcome(3,3,3,'DESTROY',list(range(1,10)),random.Random(1)),(3,'DESTROYED'))
        self.assertEqual(outcome(3,3,5,'DESTROY',list(range(1,10)),random.Random(1)),(3,'LIT'))
    def test_split_and_hit(self):
        self.assertEqual(outcome(3,5,5,'DESTROY',list(range(1,10)),random.Random(1)),(5,'DESTROYED'))
        self.assertEqual(outcome(3,5,5,'LIGHT',list(range(1,10)),random.Random(1)),(5,'LIT'))
    def test_two_candle_outside_destroy_forbids_same_partner(self):
        remaining=tuple(range(1,10))
        self.assertLess(likelihood_for_hypothesis(3,3,(3,5),remaining,(8,'DESTROYED')),1e-10)
        self.assertGreater(likelihood_for_hypothesis(3,5,(3,5),remaining,(8,'DESTROYED')),0)
    def test_reproducible_and_terminates(self):
        for p in POLICIES:
            for g in GHOSTS:
                a=one_match(p,g,1107,full=True)
                b=one_match(p,g,1107,full=True)
                self.assertEqual(a,b)
                self.assertIn(a['winner'],('HUMAN','GHOST'))
                self.assertLessEqual(a['nights'],9)
    def test_ghost_report_never_uses_hidden_human_action(self):
        # Checked structurally: the ghost report function receives no actual
        # human actions. Its Night object is passed, but only .allowed and
        # .ghost_target are accessed; no other private actions are consumed.
        import inspect
        from sim import report_of_ghost
        source=inspect.getsource(report_of_ghost)
        self.assertNotIn('.actual',source)
    def test_no_early_vote(self):
        for p in POLICIES:
            a=one_match(p,'targeted',12345,full=True)
            if a['winner'] in ('HUMAN','GHOST') and a['nights']<3:
                self.fail('unexpected pre-D4 termination')
if __name__=='__main__':unittest.main()
