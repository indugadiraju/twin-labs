from copy import deepcopy
import importlib.util
import unittest

from backend.data import researcher_store, store
from backend.data.trial_docs import TRIAL_ID
from backend.services import checkin_service, researcher_service, twin_service
from backend.services.journey_engine import simulate_journey
from backend.services.prediction_adapter import normalize_prediction


class ResearcherIntelligenceTests(unittest.TestCase):
    def setUp(self):
        store.reset()
        researcher_store.reset()
        self.twin = twin_service.create_patient_twin(TRIAL_ID, "pt_demo_patient")

    def _checkin(self):
        checkin = checkin_service.submit_patient_checkin(
            patient_id=self.twin.patient_id,
            week=1,
            overall_wellbeing=4,
            symptoms=[
                {"name": "Fatigue", "severity": 6},
                {"name": "Nausea", "severity": 3},
                {"name": "Headache", "severity": 3},
            ],
            free_text="Mood: Anxious\nSleep quality: 3/10\nFeeling anxious and sleeping poorly.",
        )
        checkin_service.apply_checkin_to_twin(checkin)
        return checkin

    def test_four_weeks_are_ordered_and_input_is_not_mutated(self):
        patient = self.twin.to_dict()
        original = deepcopy(patient)
        journey = simulate_journey(patient, weeks=4)
        self.assertEqual([week["week"] for week in journey["weeks"]], [1, 2, 3, 4])
        self.assertEqual(patient, original)

    def test_prediction_aliases_are_normalized(self):
        prediction = normalize_prediction(
            {"week": 2, "fatigue": 74, "nausea": 0.51, "adverse_event": 0.13, "dropout": 11}
        )
        self.assertEqual(prediction["fatigue_risk"], 0.74)
        self.assertEqual(prediction["adverse_event_risk"], 0.13)
        self.assertEqual(prediction["dropout_risk"], 0.11)

    def test_checkin_changes_future_risk_and_generates_alerts(self):
        baseline = researcher_service.get_patient_journey(self.twin.patient_id)
        self._checkin()
        updated = researcher_service.get_patient_journey(self.twin.patient_id)
        self.assertGreater(
            updated["weeks"][1]["prediction"]["fatigue_risk"],
            baseline["weeks"][1]["prediction"]["fatigue_risk"],
        )
        alert_types = {alert["type"] for alert in updated["alerts"]}
        self.assertIn("patient_concern", alert_types)
        self.assertIn("new_symptom", alert_types)
        self.assertTrue(updated["requires_review"])

    def test_lab_update_changes_safety_risk_and_driver(self):
        self._checkin()
        before = researcher_service.get_patient_journey(self.twin.patient_id)
        researcher_store.save_lab_update(
            self.twin.patient_id,
            week=2,
            name="kidney_function",
            value=61,
            unit="eGFR",
        )
        after = researcher_service.get_patient_journey(self.twin.patient_id)
        self.assertGreater(
            after["weeks"][1]["prediction"]["adverse_event_risk"],
            before["weeks"][1]["prediction"]["adverse_event_risk"],
        )
        self.assertEqual(after["main_risk_driver"], "declining kidney function")
        self.assertIn("lab_change", {alert["type"] for alert in after["alerts"]})

    def test_cohort_counts_are_consistent_and_labeled(self):
        cohort = researcher_service.get_cohort_summary()
        self.assertGreaterEqual(cohort["active_patients"], cohort["patients_requiring_review"])
        self.assertGreaterEqual(cohort["active_patients"], cohort["worsening_symptom_trajectories"])
        self.assertEqual(cohort["source"], "deterministic_synthetic_cohort_aggregate")
        self.assertTrue(cohort["is_synthetic_aggregate"])
        self.assertEqual(cohort["live_demo_patients"], 1)

    def test_non_kidney_lab_is_visible_as_a_baseline_change(self):
        researcher_store.save_lab_update(
            self.twin.patient_id,
            week=2,
            name="hemoglobin_g_dl",
            value=10.4,
            unit="g/dL",
        )
        journey = researcher_service.get_patient_journey(self.twin.patient_id)
        changes = {item["field"]: item for item in journey["changes_from_baseline"]}
        self.assertEqual(changes["hemoglobin_g_dl"]["before"], 12.8)
        self.assertEqual(changes["hemoglobin_g_dl"]["after"], 10.4)

    @unittest.skipUnless(importlib.util.find_spec("fastapi"), "FastAPI dependency is not installed")
    def test_existing_patient_api_smoke(self):
        from backend.api import CreateTwinRequest, create_twin, get_timeline, health

        store.reset()
        created = create_twin(CreateTwinRequest(patient_id="api_smoke"))
        timeline = get_timeline("api_smoke")
        self.assertEqual(created["patient_id"], "api_smoke")
        self.assertEqual(len(timeline["weeks"]), 4)
        self.assertEqual(health(), {"status": "ok"})


if __name__ == "__main__":
    unittest.main()
