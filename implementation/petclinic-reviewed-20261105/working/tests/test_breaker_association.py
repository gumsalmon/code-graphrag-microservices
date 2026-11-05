"""Synthetic per-expression circuit breaker association regressions."""
import unittest
from src.parser import JavaASTParser


class BreakerAssociationTests(unittest.TestCase):
    def parse(self, body, extra=''):
        source = '''package demo;
import org.springframework.cloud.client.circuitbreaker.ReactiveCircuitBreaker;
class Controller {
 private Alpha alpha;
 private Beta beta;
 private Other other;
 Object handle(ReactiveCircuitBreaker guard) { %s }
 %s
}''' % (body, extra)
        _,_,_,calls,unresolved = JavaASTParser().parse_source(source,'demo-service/Controller.java')
        return {c.method_name:c for c in calls},unresolved

    def test_outer_call_does_not_inherit_inner_transform_fallback(self):
        calls,_ = self.parse('''return alpha.load().flatMap(value ->
 beta.fetch().transform(stream -> { return guard.run(stream, problem -> recover()); }));''')
        self.assertFalse(calls['load'].has_circuit_breaker)
        self.assertIsNone(calls['load'].fallback_method)
        self.assertTrue(calls['fetch'].has_circuit_breaker)
        self.assertEqual(calls['fetch'].fallback_method,'recover')

    def test_supplier_and_fallback_are_different_arguments(self):
        calls,_ = self.parse('''alpha.outside();
 return guard.run(() -> beta.inside(), error -> alpha.fallbackCall());''')
        self.assertFalse(calls['outside'].has_circuit_breaker)
        self.assertTrue(calls['inside'].has_circuit_breaker)
        self.assertFalse(calls['fallbackCall'].has_circuit_breaker)

    def test_two_transforms_keep_distinct_fallbacks(self):
        calls,_ = self.parse('''alpha.first().transform(a -> guard.run(a, x -> firstRecovery()));
 return beta.second().transform(b -> guard.run(b, y -> secondRecovery()));''')
        self.assertEqual(calls['first'].fallback_method,'firstRecovery')
        self.assertEqual(calls['second'].fallback_method,'secondRecovery')

    def test_unknown_alias_flow_is_unresolved_without_protected_assertion(self):
        calls,unresolved = self.parse('''Object saved = beta.fetch(); return guard.run(saved, e -> recover());''')
        self.assertFalse(calls['fetch'].has_circuit_breaker)
        self.assertIsNone(calls['fetch'].fallback_method)
        self.assertTrue(any('association' in u.reason for u in unresolved))

    def test_unrelated_run_or_comment_does_not_assert_protection(self):
        calls,_ = self.parse('''// cb.run and cbFactory are comments only
 return other.run(() -> beta.fetch(), throwable -> recover());''')
        self.assertFalse(calls['fetch'].has_circuit_breaker)

    def test_branching_transform_is_unresolved(self):
        calls,unresolved = self.parse('''return beta.fetch().transform(s -> {
 if (flag) return guard.run(s, e -> recover()); return s; });''')
        self.assertFalse(calls['fetch'].has_circuit_breaker)
        self.assertTrue(any('association' in u.reason for u in unresolved))

    def test_complex_fallback_has_no_invented_name(self):
        calls,unresolved = self.parse('''return guard.run(() -> beta.fetch(), e -> { log(e); return recover(); });''')
        self.assertFalse(calls['fetch'].has_circuit_breaker)
        self.assertIsNone(calls['fetch'].fallback_method)
        self.assertTrue(any('association' in u.reason for u in unresolved))

    def test_reassigned_breaker_is_unresolved(self):
        calls,unresolved = self.parse('''guard = unknown(); return guard.run(() -> beta.fetch(), e -> recover());''')
        self.assertFalse(calls['fetch'].has_circuit_breaker)
        self.assertTrue(any('association' in u.reason for u in unresolved))

    def test_lambda_shadows_typed_breaker(self):
        calls,unresolved = self.parse('''return alpha.load().flatMap(guard -> guard.run(() -> beta.fetch(), e -> recover()));''')
        self.assertFalse(calls['fetch'].has_circuit_breaker)
        self.assertTrue(any('association' in u.reason for u in unresolved))


if __name__=='__main__':
    unittest.main()
