import unittest

from backend.data import store
from backend.services import counterfactual_service, timeline_service


class DemoTwinBootstrapTests(unittest.TestCase):
    """The demo twin survives an in-memory reset (backend restart / new worker)."""

    def setUp(self):
        store.reset()  # same state as a freshly restarted backend

    def test_demo_twin_is_recreated_on_demand(self):
        twin = store.get_twin(store.DEMO_PATIENT_ID)
        self.assertIsNotNone(twin)
        self.assertEqual(twin.patient_id, store.DEMO_PATIENT_ID)

    def test_recreated_twin_is_deterministic(self):
        first = store.get_twin(store.DEMO_PATIENT_ID).synthetic_baseline
        store.reset()
        self.assertEqual(store.get_twin(store.DEMO_PATIENT_ID).synthetic_baseline, first)

    def test_demo_endpoints_work_after_restart(self):
        self.assertTrue(timeline_service.get_patient_journey(store.DEMO_PATIENT_ID)["weeks"])
        result = counterfactual_service.simulate_counterfactual(store.DEMO_PATIENT_ID, {"variable": "dose_pct", "value": 80})
        self.assertEqual(len(result["original"]["trajectory"]), 5)

    def test_demo_patient_is_always_listed(self):
        self.assertIn(store.DEMO_PATIENT_ID, [t.patient_id for t in store.list_twins()])

    def test_other_patients_are_not_invented(self):
        self.assertIsNone(store.get_twin("pt_does_not_exist"))


if __name__ == "__main__":
    unittest.main()
