"""
Minimal FastAPI wiring for Samhita's portion of TwinLab:
patient twin state, weekly check-ins, Week 1-4 timeline, and the
patient-facing Trial Assistant.

Run: uvicorn backend.api:app --reload --port 8000
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.data import researcher_store, store
from backend.data.trial_docs import TRIAL_ID
from backend.services import checkin_service, researcher_service, timeline_service, trial_assistant, twin_service

app = FastAPI(title="TwinLab — Patient API (demo)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo only
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- request/response models ----------

class CreateTwinRequest(BaseModel):
    patient_id: str | None = None
    trial_id: str = TRIAL_ID


class SymptomIn(BaseModel):
    name: str
    severity: int = Field(ge=0, le=10)
    notes: str | None = None


class CheckInRequest(BaseModel):
    week: int
    overall_wellbeing: int = Field(ge=0, le=10)
    symptoms: list[SymptomIn] = []
    free_text: str | None = None


class AssistantQuestionRequest(BaseModel):
    question: str


class LabUpdateRequest(BaseModel):
    week: int = Field(ge=1, le=4)
    name: str = "kidney_function"
    value: float
    unit: str | None = None


# ---------- patient twin ----------

@app.post("/api/patients/twin")
def create_twin(req: CreateTwinRequest):
    twin = twin_service.create_patient_twin(trial_id=req.trial_id, patient_id=req.patient_id)
    return twin.to_dict()


@app.get("/api/patients/{patient_id}/twin")
def get_twin(patient_id: str):
    twin = store.get_twin(patient_id)
    if twin is None:
        raise HTTPException(status_code=404, detail="No twin found for this patient")
    return twin.to_dict()


# ---------- check-ins ----------

@app.post("/api/patients/{patient_id}/checkins")
def submit_checkin(patient_id: str, req: CheckInRequest):
    try:
        checkin = checkin_service.submit_patient_checkin(
            patient_id=patient_id,
            week=req.week,
            overall_wellbeing=req.overall_wellbeing,
            symptoms=[s.model_dump() for s in req.symptoms],
            free_text=req.free_text,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    twin = checkin_service.apply_checkin_to_twin(checkin)
    return {"checkin": checkin.to_dict(), "twin": twin.to_dict()}


# ---------- Week 1-4 journey timeline ----------

@app.get("/api/patients/{patient_id}/timeline")
def get_timeline(patient_id: str, weeks: int = 4):
    try:
        return timeline_service.get_patient_journey(patient_id, weeks=weeks)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ---------- Crystal's researcher intelligence ----------

@app.get("/api/researcher/patients")
def list_researcher_patients():
    return {"patients": researcher_service.list_patients(), "source": "synthetic_patient_demo"}


@app.get("/api/researcher/patients/{patient_id}/journey")
def get_researcher_journey(patient_id: str, weeks: int = 4):
    try:
        return researcher_service.get_patient_journey(patient_id, weeks=weeks)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/researcher/patients/{patient_id}/summary")
def get_researcher_summary(patient_id: str):
    try:
        return researcher_service.get_patient_summary(patient_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/researcher/patients/{patient_id}/labs")
def add_researcher_lab(patient_id: str, req: LabUpdateRequest):
    if store.get_twin(patient_id) is None:
        raise HTTPException(status_code=404, detail="No twin found for this patient")
    update = researcher_store.save_lab_update(
        patient_id,
        week=req.week,
        name=req.name,
        value=req.value,
        unit=req.unit,
    )
    return {"lab_update": update, "journey": researcher_service.get_patient_journey(patient_id)}


@app.get("/api/researcher/cohort-summary")
def get_researcher_cohort_summary():
    return researcher_service.get_cohort_summary()


# ---------- Trial Assistant ----------

@app.post("/api/patients/{patient_id}/assistant")
def ask_assistant(patient_id: str, req: AssistantQuestionRequest):
    twin = store.get_twin(patient_id)
    current_week = twin.current_week if twin else None
    return trial_assistant.ask_trial_assistant(req.question, current_week=current_week)


@app.get("/api/health")
def health():
    return {"status": "ok"}
