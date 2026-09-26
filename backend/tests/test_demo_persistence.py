import importlib
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from backend.data import researcher_store, store
from backend.data.trial_docs import TRIAL_ID
from backend.services import checkin_service, twin_service


class DemoPersistenceTests(unittest.TestCase):
    def test_patient_checkin_and_lab_survive_module_reload(self):
        with TemporaryDirectory() as directory:
            patient_file = Path(directory) / "patient.json"
            researcher_file = Path(directory) / "researcher.json"
            environment = {
                "TWINLABS_STATE_FILE": str(patient_file),
                "TWINLABS_RESEARCHER_STATE_FILE": str(researcher_file),
            }
            with patch.dict(os.environ, environment):
                importlib.reload(store)
                importlib.reload(researcher_store)
                store.enable_persistence()
                researcher_store.enable_persistence()

                twin_service.create_patient_twin(TRIAL_ID, "persistent_demo")
                checkin = checkin_service.submit_patient_checkin(
                    patient_id="persistent_demo",
                    week=1,
                    overall_wellbeing=6,
                    fatigue=4,
                )
                researcher_store.save_lab_update(
                    "persistent_demo",
                    week=2,
                    name="kidney_function",
                    value=61,
                    unit="eGFR",
                )

                importlib.reload(store)
                importlib.reload(researcher_store)
                store.enable_persistence()
                researcher_store.enable_persistence()

                self.assertEqual(store.get_twin("persistent_demo").patient_id, "persistent_demo")
                self.assertEqual(store.list_checkins("persistent_demo")[0].checkin_id, checkin.checkin_id)
                self.assertEqual(researcher_store.list_lab_updates("persistent_demo")[0]["value"], 61)

        importlib.reload(store)
        importlib.reload(researcher_store)


if __name__ == "__main__":
    unittest.main()
