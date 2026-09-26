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

## Structure

```
backend/
  models/
    patient_twin.py     # PatientTwin state
    checkin.py           # PatientCheckIn model
  services/
    twin_service.py       # create_patient_twin(), update_patient_twin()
    checkin_service.py     # submit_patient_checkin(), apply_checkin_to_twin()
    timeline_service.py    # Week 1-4 journey (real check-ins + mock predictions)
    trial_assistant.py     # patient-facing Q&A, redirects treatment decisions
  data/
    store.py               # in-memory data store (demo only)
    mock_trial_docs.py      # mock trial document set (visit schedule, FAQ)
    mock_predictions.py     # mock prediction outputs (stands in for Indu's model)
  api.py                    # FastAPI app wiring the above into HTTP endpoints

frontend/
  src/
    components/
      CheckInForm.jsx       # weekly check-in UI
      JourneyTimeline.jsx    # Week 1-4 timeline view
      TrialAssistant.jsx     # Trial Assistant chat UI
    api.js                  # thin client for the backend API
    App.jsx                 # wires the three views together
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
- The Week 1-4 timeline's "predicted risk score" is explicitly mocked
  (`backend/data/mock_predictions.py`, `source: "mock"`) — it is a placeholder
  for Indu's real prediction model, not an attempt to replicate it.
- The Trial Assistant answers study logistics only, from a small mock trial
  document set (`backend/data/mock_trial_docs.py`). It never makes or
  suggests treatment decisions — questions about stopping/changing treatment
  are always redirected to the study team.
