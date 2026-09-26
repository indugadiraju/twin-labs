// Thin client for Samhita's TwinLabs patient-facing API.
// Talks to the FastAPI backend (see backend/api.py), proxied at /api in dev.

const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  createTwin: (patientId) =>
    request('/patients/twin', {
      method: 'POST',
      body: JSON.stringify({ patient_id: patientId }),
    }),

  getTwin: (patientId) => request(`/patients/${patientId}/twin`),

  submitCheckin: (patientId, checkin) =>
    request(`/patients/${patientId}/checkins`, {
      method: 'POST',
      body: JSON.stringify(checkin),
    }),

  getTimeline: (patientId) => request(`/patients/${patientId}/timeline`),

  advanceWeek: (patientId) => request(`/patients/${patientId}/advance-week`, { method: 'POST' }),

  getResearcherPatients: () => request('/researcher/patients'),

  getResearcherJourney: (patientId) => request(`/researcher/patients/${patientId}/journey`),

  getResearcherSummary: (patientId) => request(`/researcher/patients/${patientId}/summary`),

  getCohortSummary: () => request('/researcher/cohort-summary'),

  addLabUpdate: (patientId, lab) =>
    request(`/researcher/patients/${patientId}/labs`, {
      method: 'POST',
      body: JSON.stringify(lab),
    }),

  askAssistant: (patientId, question) =>
    request(`/patients/${patientId}/assistant`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
}
