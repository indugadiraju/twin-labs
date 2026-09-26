// Demo onboarding model shared by the researcher Study Setup and the patient
// onboarding. Local/mock state only (persisted to localStorage so the two
// portals behave like one system in the same browser). Disease-independent:
// studies, criteria and questions are plain data.

export const QUESTION_TYPES = [
  { id: 'yesno', label: 'Yes / No' },
  { id: 'number', label: 'Number' },
  { id: 'choice', label: 'Multiple choice' },
  { id: 'text', label: 'Short text' },
  { id: 'date', label: 'Date' },
]

// What participants can report at a check-in. Keys match the existing CheckInForm / API fields.
export const TRACKABLE_FIELDS = [
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'pain', label: 'Pain' },
  { id: 'sleep_quality', label: 'Sleep quality' },
  { id: 'mood', label: 'Mood' },
  { id: 'new_symptoms', label: 'New symptoms' },
  { id: 'free_text', label: 'Free-text update' },
]

export const VISIT_ACTIVITIES = [
  { id: 'treatment', label: 'Treatment' },
  { id: 'labs', label: 'Lab collection' },
  { id: 'questionnaire', label: 'Patient questionnaire' },
  { id: 'assessment', label: 'Clinical assessment' },
]

export const DEMO_TRIAL_ID = 'TL-BC-201'

export const DEMO_STUDY = {
  info: {
    name: 'Phase II Breast Cancer Treatment Study',
    identifier: DEMO_TRIAL_ID,
    condition: 'Hormone-receptor-positive, HER2-negative breast cancer',
    conditionKeywords: ['breast'],
    phase: 'Phase II',
    intervention: 'Chemotherapy (TC regimen) followed by hormone therapy',
    description: 'A synthetic demo study following treatment response, symptoms and wellbeing week by week with a digital twin.',
    targetEnrollment: 120,
    durationWeeks: 4,
    locations: 'Palo Alto, CA · San Francisco, CA · Remote check-ins',
    mode: 'hybrid',
  },
  eligibility: [
    { id: 'age', label: 'Age', value: '18 – 75 years', kind: 'age', min: 18, max: 75 },
    { id: 'condition', label: 'Condition', value: 'HR+/HER2− breast cancer', kind: 'condition' },
    { id: 'stage', label: 'Disease stage', value: 'Early stage (I–II), node-negative', kind: 'review' },
    { id: 'treatment', label: 'Treatment history', value: 'No prior chemotherapy for this diagnosis', kind: 'treatment' },
    { id: 'labs', label: 'Lab requirements', value: 'eGFR ≥ 45 mL/min/1.73m²', kind: 'labs' },
  ],
  screening: [
    { id: 'prior_chemo', text: 'Have you previously received chemotherapy?', type: 'yesno', required: true },
    { id: 'hormone_therapy', text: 'Are you currently receiving hormone therapy?', type: 'yesno', required: true },
    { id: 'last_treatment', text: 'When was your most recent cancer treatment?', type: 'date', required: false },
  ],
  checkins: {
    fields: ['fatigue', 'nausea', 'pain', 'sleep_quality', 'mood', 'new_symptoms', 'free_text'],
    custom: [],
    cadence: 'weekly',
  },
  visits: [
    { id: 'baseline', label: 'Baseline', activities: ['labs', 'questionnaire', 'assessment'] },
    { id: 'w1', label: 'Week 1', activities: ['treatment', 'questionnaire'] },
    { id: 'w2', label: 'Week 2', activities: ['treatment', 'labs', 'questionnaire'] },
    { id: 'w3', label: 'Week 3', activities: ['questionnaire'] },
    { id: 'w4', label: 'Week 4', activities: ['labs', 'questionnaire', 'assessment'] },
  ],
}

// Synthetic patient profile used to pre-fill onboarding so the demo is fast.
export const DEMO_PATIENT_PROFILE = {
  birthYear: 1979, sex: 'Female', heightCm: 165, weightKg: 64, location: 'Palo Alto, CA',
  conditions: ['Breast cancer (HR+/HER2−)'], diagnosisDate: '2026-06-12', stage: 'Stage I', history: ['None of these'], allergies: 'None known',
  organIssues: 'none', activity: 'Fully active',
  medications: 'Vitamin D', currentTreatments: ['None yet'], previousTreatments: ['Surgery'], priorTrial: 'no',
  travelMiles: 25, visitMode: 'hybrid', visitFrequency: 'weekly', timeCommitment: '1–2 hours / week', compensation: 'no preference',
}

// Two further synthetic trials so matching is meaningful. The breast-cancer demo
// trial is built from the researcher's study setup so both sides share one study.
const OTHER_TRIALS = [
  {
    id: 'TL-FAT-114', name: 'Cancer-Related Fatigue & Activity Study', phase: 'Phase II', sponsor: 'TwinLabs demo program',
    summary: 'A remote study of a guided activity program for fatigue during or after cancer treatment.',
    conditionKeywords: ['cancer'], minAge: 18, maxAge: 80, modes: ['remote', 'hybrid'], hasLabs: false, reviewsTreatment: false,
    screening: [
      { id: 'active_days', text: 'On how many days per week are you physically active for 20+ minutes?', type: 'number', required: true },
      { id: 'wearable', text: 'Do you use a wearable activity tracker?', type: 'yesno', required: false },
    ],
  },
  {
    id: 'TL-LNG-307', name: 'Lung Cancer Symptom Monitoring Study', phase: 'Phase II', sponsor: 'TwinLabs demo program',
    summary: 'Weekly remote symptom monitoring for people receiving systemic therapy for non-small cell lung cancer.',
    conditionKeywords: ['lung'], minAge: 18, maxAge: 85, modes: ['remote'], hasLabs: true, reviewsTreatment: true,
    screening: [
      { id: 'smoking', text: 'What is your smoking history?', type: 'choice', options: ['Never', 'Former', 'Current'], required: true },
      { id: 'breathless', text: 'Do you become short of breath with light activity?', type: 'yesno', required: true },
    ],
  },
]

export function demoTrialFromStudy(study) {
  const age = study.eligibility.find((c) => c.kind === 'age')
  return {
    id: study.info.identifier || DEMO_TRIAL_ID, name: study.info.name, phase: study.info.phase, sponsor: 'TwinLabs demo study',
    summary: study.info.description, conditionKeywords: study.info.conditionKeywords?.length ? study.info.conditionKeywords : [study.info.condition.split(' ')[0].toLowerCase()],
    minAge: age?.min ?? 18, maxAge: age?.max ?? 99, modes: [study.info.mode, study.info.mode === 'hybrid' ? 'in-person' : study.info.mode],
    hasLabs: study.eligibility.some((c) => c.kind === 'labs'), reviewsTreatment: study.eligibility.some((c) => c.kind === 'treatment'),
    screening: study.screening, isDemo: true,
  }
}

export const trialsFor = (study) => [demoTrialFromStudy(study), ...OTHER_TRIALS]

// Transparent, rule-based pre-screen for the demo. NOT an eligibility engine:
// the study team always makes the final decision.
export function matchTrial(profile, trial, now = new Date()) {
  const age = profile.birthYear ? now.getFullYear() - Number(profile.birthYear) : null
  const conditionText = (profile.conditions || []).join(' ').toLowerCase()
  const factors = []
  const conditionMatch = trial.conditionKeywords.some((k) => conditionText.includes(k.toLowerCase()))
  factors.push(conditionText ? { ok: conditionMatch, text: conditionMatch ? 'Condition matches the study focus' : 'Condition differs from the study focus' } : { ok: null, text: 'Condition not provided' })
  factors.push(age == null ? { ok: null, text: 'Age not provided' } : { ok: age >= trial.minAge && age <= trial.maxAge, text: `Age range ${trial.minAge}–${trial.maxAge} ${age >= trial.minAge && age <= trial.maxAge ? 'matches' : 'does not match'}` })
  const modeOk = trial.modes.includes(profile.visitMode) || profile.visitMode === 'hybrid'
  factors.push({ ok: modeOk, text: modeOk ? 'Visit / location preference matches' : 'Visit format may not fit your preference' })
  if (trial.hasLabs) factors.push({ ok: null, text: 'Lab criteria require confirmation' })
  if (trial.reviewsTreatment) factors.push({ ok: null, text: 'Treatment history requires review' })
  const misses = factors.filter((f) => f.ok === false).length
  const unknown = factors.filter((f) => f.ok === null).length
  const level = !conditionMatch && conditionText ? 'possible' : misses === 0 && unknown <= 2 ? 'potential' : misses <= 1 ? 'possible' : 'info'
  return { level: unknown > 2 && misses === 0 ? 'info' : level, factors, age }
}

export const MATCH_LABELS = { potential: 'Potential match', possible: 'Possible match', info: 'Additional information needed' }

const STUDY_KEY = 'twinlabs.demo.study'
const PATIENT_KEY = 'twinlabs.demo.patient'
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback } catch { return fallback } }
export const loadStudy = () => read(STUDY_KEY, DEMO_STUDY)
export const saveStudy = (study) => localStorage.setItem(STUDY_KEY, JSON.stringify(study))
export const loadPatient = () => read(PATIENT_KEY, null)
export const savePatient = (patient) => localStorage.setItem(PATIENT_KEY, JSON.stringify(patient))
