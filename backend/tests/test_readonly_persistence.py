import unittest
from unittest import mock

from backend.data import researcher_store, store
from backend.services import checkin_service


class ReadOnlyPersistenceTests(unittest.TestCase):
    """Deployed (Vercel) filesystems can be read-only: never fail a request because the cache can't be written."""

    def tearDown(self):
        store._persistence_enabled = False
        researcher_store._persistence_enabled = False
        store.reset()
        researcher_store.reset()

    def test_checkin_succeeds_when_state_file_is_not_writable(self):
        store.reset()
        with mock.patch("pathlib.Path.mkdir", side_effect=PermissionError("read-only")):
            store.enable_persistence("/read-only/patient_state.json")
            checkin = checkin_service.submit_patient_checkin(store.DEMO_PATIENT_ID, week=1, overall_wellbeing=6, fatigue=3, symptoms=[])
        self.assertEqual(store.list_checkins(store.DEMO_PATIENT_ID)[-1].checkin_id, checkin.checkin_id)

    def test_lab_update_succeeds_when_state_file_is_not_writable(self):
        with mock.patch("pathlib.Path.mkdir", side_effect=PermissionError("read-only")):
            researcher_store.enable_persistence("/read-only/researcher_state.json")
            researcher_store.save_lab_update(store.DEMO_PATIENT_ID, week=2, name="kidney_function", value=61)
        self.assertTrue(researcher_store.list_lab_updates(store.DEMO_PATIENT_ID))


if __name__ == "__main__":
    unittest.main()
