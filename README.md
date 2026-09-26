# TwinLab

Patient digital twin platform for clinical trials. Combines clinical data,
treatment info, labs, patient-reported symptoms, and weekly check-ins into a
continuously updated model of each patient. Demoed with a breast cancer trial,
while staying disease-independent.

This repo currently contains **Samhita's portion**: patient data & digital
twin state, weekly check-ins, the Week 1–4 patient journey timeline, and the
patient-facing Trial Assistant. It intentionally does **not** include Indu's
prediction model, Betania's counterfactual model, or Crystal's researcher
dashboard — those use mock outputs here as placeholders.

## Data provenance — read this first

Four different kinds of data appear side by side in this demo. Every
response and every UI section is labeled with which one it is:

| Kind | What it is | Source |
|---|---|---|
| **Real** | Trial name, sponsor, purpose, eligibility criteria, treatment arms, and follow-up cadence | The public ClinicalTrials.gov record for **TAILORx (NCT00310180)**, a real, NCI-sponsored Phase 3 breast cancer trial — [clinicaltrials.gov/study/NCT00310180](https://clinicaltrials.gov/study/NCT00310180). See `backend/data/trial_docs.py` (`REAL_TRIAL`). |
| **Simulated for demo** | The Week 1–4 visit-by-visit schedule (what happens each week, fasting instructions) | Invented for this demo. The public trial record does not publish visit-by-visit protocol detail — TAILORx's real follow-up cadence is "every 3–6 months for 5 years, then annually for 15 years," not weekly. See `SIMULATED_VISIT_SCHEDULE` in `backend/data/trial_docs.py`, tagged `"source": "simulated_for_demo"` everywhere it appears. |
| **Synthetic** | The demo patient's baseline profile — age, condition, treatment, dose, kidney function, labs, baseline fatigue/nausea/pain, sleep, tumor/receptor details | Fabricated for the demo by `backend/data/synthetic_patient_profiles.py`. Not a real patient and not drawn from any public dataset — the UCI Wisconsin diagnostic tumor-morphology dataset was considered and deliberately not used, since it measures tumor cell nuclei rather than the longitudinal patient-state variables (labs, symptoms, treatment, sleep) a digital twin needs. Tagged `"is_synthetic": true`. |
| **Patient-reported (simulated)** | Weekly check-ins | Submitted through this demo's real check-in flow, but there are no real trial participants behind them yet — someone using the UI is standing in for a patient. |
| **Mock** | The Week 1–4 "predicted risk score" | A placeholder for Indu's prediction model, which is not implemented here. `backend/data/mock_predictions.py`, tagged `"source": "mock"`. |

Every `GET /timeline` response includes a top-level `data_sources` block
naming all four categories explicitly, and the frontend renders a colored
tag ("Real trial data" / "Simulated for demo" / "Synthetic (demo)" /
"Mock") next to each corresponding section.

## Structure

```
backend/
  models/
    patient_twin.py     # PatientTwin state (includes synthetic_baseline)
    checkin.py           # PatientCheckIn model
  services/
    twin_service.py       # create_patient_twin(), update_patient_twin()
    checkin_service.py     # submit_patient_checkin(), apply_checkin_to_twin()
    timeline_service.py    # Week 1-4 journey (real trial + simulated schedule + mock predictions)
    trial_assistant.py     # patient-facing Q&A: real trial FAQ + simulated visit schedule
  data/
    store.py                       # in-memory data store (demo only)
    trial_docs.py                    # REAL_TRIAL (TAILORx, sourced) + SIMULATED_VISIT_SCHEDULE
    synthetic_patient_profiles.py     # synthetic demo patient baseline generator
    mock_predictions.py               # mock prediction outputs (stands in for Indu's model)
  api.py                    # FastAPI app wiring the above into HTTP endpoints

frontend/
  src/
    components/
      PatientBaseline.jsx    # synthetic baseline profile view
      CheckInForm.jsx         # weekly check-in UI (simulated check-ins)
      JourneyTimeline.jsx      # real trial info + simulated Week 1-4 schedule + mock predictions
      TrialAssistant.jsx       # Trial Assistant chat UI
    api.js                  # thin client for the backend API
    App.jsx                 # wires the views together
```

## Running locally

Backend:

```bash
pip install -r backend/requirements.txt
uvicorn backend.api:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api/*` to `http://127.0.0.1:8000`, so run the
backend first. Open the printed local URL (default `http://localhost:5173`).

## Notes

- State is in-memory only (`backend/data/store.py`) — restarting the backend
  clears all twins and check-ins. Fine for a demo; swap for a real DB later
  without touching the service layer.
- The demo trial is real (TAILORx / NCT00310180); the Week 1–4 visit schedule
  layered on top of it is simulated, because that granularity isn't public.
  Both are clearly tagged in the data and the UI — see "Data provenance" above.
- The demo patient's baseline profile is entirely synthetic, generated
  deterministically per `patient_id` so the same demo patient looks stable
  across a session.
- The Week 1-4 timeline's "predicted risk score" is explicitly mocked
  (`backend/data/mock_predictions.py`, `source: "mock"`) — it is a placeholder
  for Indu's real prediction model, not an attempt to replicate it.
- The Trial Assistant answers real-trial questions (purpose, sponsor,
  eligibility, treatment arms, duration) from the sourced TAILORx record, and
  visit-logistics questions (fasting, "what happens at my Week 2 visit") from
  the simulated schedule — answers say which is which. It never makes or
  suggests treatment decisions — questions about stopping/changing treatment
  are always redirected to the study team.
