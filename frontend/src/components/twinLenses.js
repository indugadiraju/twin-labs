// Maps API + patient data onto the digital twin for each carousel lens.
// Every callout/hotspot is derived from a real value in the counterfactual
// response or the (synthetic) patient twin — nothing is invented here.
// `audience` only changes wording ('patient' | 'researcher'), never the data.

export const LENSES = [
  { id: 'full', label: 'Full twin' },
  { id: 'treatment', label: 'Treatment' },
  { id: 'symptoms', label: 'Symptoms' },
  { id: 'labs', label: 'Labs' },
  { id: 'response', label: 'Response' },
]

// Points on the body surface as [x, y, z, nx, nz] in the 600 x 720 viewBox
// (centreline x = 300, +z faces the viewer at the front view). (nx, nz) is the
// outward surface normal, so hotspots stay on the correct anatomy as the twin
// rotates and fade only when that surface turns away (e.g. kidneys sit at the back).
export const ANCHORS = {
  head: [300, 62, 46, 0, 1], sternum: [300, 172, 43, 0, 1], chest: [316, 208, 42, 0.3, 1], core: [282, 252, 37, -0.3, 1], abdomen: [300, 304, 35, 0, 1],
  shoulder: [362, 172, 20, 0.6, 1], shoulderL: [238, 172, 20, -0.6, 1], hip: [350, 356, 20, 0.6, 1], kidneyL: [274, 284, -26, -0.3, -1], kidneyR: [326, 284, -26, 0.3, -1],
  armL: [214, 258, 12, -0.4, 1], forearmR: [396, 344, 12, 0.4, 1], handL: [186, 426, 8, -0.6, 1], handR: [414, 426, 8, 0.6, 1], footL: [258, 648, 34, 0, 1], footR: [342, 648, 34, 0, 1],
}

// Display only: tidy a free-text dose (units, superscripts, spacing, "x4" → "× 4").
export const formatDose = (dose = '') => String(dose)
  .replace(/\^2/g, '²').replace(/\^3/g, '³')
  .replace(/(\d)(mg|mcg|g|mL|ml|IU)\b/g, '$1 $2')
  .replace(/\bx\s?(\d+)\b/g, '× $1')
  .replace(/\s+/g, ' ').trim()

// Split a dose into [{ name, amount }] per drug plus a schedule line, for multi-line display.
export function doseParts(dose) {
  const parts = formatDose(dose).split(/\s*\+\s*/)
  const [lastDrug, ...schedule] = parts.pop().split(/,\s*/)
  const drugs = [...parts, lastDrug].map((d) => { const i = d.search(/\d/); return i > 0 ? { name: d.slice(0, i).trim(), amount: d.slice(i).trim() } : { name: '', amount: d } })
  return { drugs, schedule: schedule.join(' · ') }
}

export const STATUS = { stable: 'Stable', watch: 'Watch', needs_attention: 'Needs attention' }
// Display only: one decimal at most, no trailing ".0" (5.0 → 5, 4.25 → 4.3).
const t10 = (v) => String(Number(Number(v).toFixed(1)))
const pct = (v) => `${Math.round(v * 100)}%`

// Outcome metrics shared by the twin pages and the What-If Studio.
export const METRICS = [
  { key: 'risk_score', format: pct, delta: (d) => `${Math.round(d * 100)} pts`, label: { researcher: 'Risk', patient: 'Simulated symptom burden' }, note: { researcher: 'Mock risk score', patient: 'Overall simulated symptom load' } },
  { key: 'response_score', format: pct, delta: (d) => `${Math.round(d * 100)} pts`, label: { researcher: 'Predicted response', patient: 'Predicted treatment response' }, note: { researcher: 'Response proxy', patient: 'How strongly the model expects treatment to work' } },
  { key: 'fatigue', format: t10, delta: t10, label: { researcher: 'Fatigue', patient: 'Tiredness' }, note: { researcher: 'Projected / 10', patient: 'Out of 10' } },
  { key: 'nausea', format: t10, delta: t10, label: { researcher: 'Nausea', patient: 'Nausea' }, note: { researcher: 'Projected / 10', patient: 'Out of 10' } },
  { key: 'pain', format: t10, delta: t10, label: { researcher: 'Pain', patient: 'Pain' }, note: { researcher: 'Projected / 10', patient: 'Out of 10' } },
  { key: 'wellbeing', format: t10, delta: t10, label: { researcher: 'Wellbeing', patient: 'How you may feel overall' }, note: { researcher: 'Projected / 10', patient: 'Out of 10' } },
]

const PROJECTED = ['fatigue', 'nausea', 'pain']
// Reported (check-in) symptoms other than the projected three, by body region.
const REGION_MATCH = [
  ['head', /head|migraine|dizz|neuro|confus|brain fog|anxiety/i],
  ['chest', /breath|cough|chest|palpit/i],
  ['abdomen', /vomit|diarrh|constip|appetite|stomach|abdom|bloat/i],
  ['extremities', /numb|tingl|neuropath|pins and needles|hand|foot|feet/i],
]

const COPY = {
  researcher: {
    status: 'Twin status', dose: 'Treatment dose', regimen: 'Regimen', kidney: 'Kidney function', nausea: 'Nausea', fatigue: 'Fatigue · systemic',
    pain: 'Pain', response: 'Response proxy', risk: 'Risk', wellbeing: 'Wellbeing', uncertainty: 'Forecast uncertainty',
    sim: 'Simulated projection · mock heuristic', base: 'Synthetic baseline', reported: 'Reported at latest check-in',
    kidneyNote: 'Used for exposure in the heuristic', painNote: 'Location not reported', riskSource: 'Mock trajectory + heuristic effect',
  },
  patient: {
    status: 'Twin status', dose: 'Treatment dose', regimen: 'Current treatment', kidney: 'Kidney function', nausea: 'Nausea', fatigue: 'Tiredness',
    pain: 'Pain', response: 'Predicted treatment response', risk: 'Simulated symptom burden', wellbeing: 'How you may feel', uncertainty: 'Forecast uncertainty',
    sim: 'Simulated for this demo', base: 'From your synthetic starting profile', reported: 'From your latest check-in',
    kidneyNote: 'A baseline lab value', painNote: 'Where you feel it isn’t recorded', riskSource: 'Simulated for this demo',
  },
}

export function buildLens(lens, { twin, cur, other, otherLabel, original, modified, mode, dose, audience = 'researcher', uncertainty }) {
  const t = COPY[audience] || COPY.researcher
  const b = twin?.synthetic_baseline || {}
  const labs = b.labs || {}
  const egfr = b.kidney_function?.egfr_ml_min_1_73m2
  const cmp = (key, fmt) => (other && fmt(other[key]) !== fmt(cur[key]) ? `${otherLabel} ${fmt(other[key])}` : null)
  const series = (key) => ({ original: original.map((w) => w[key]), modified: modified.map((w) => w[key]) })
  // 'compare' shows the modified twin with the original as a ghost reference.
  const comparing = mode === 'compare' && !!other
  const shownDose = mode === 'original' ? 100 : dose
  const doseCompare = dose === 100 || comparing ? null : mode === 'modified' ? `${otherLabel} 100%` : `${otherLabel} ${dose}%`
  const metric = (key, fmt, level) => (comparing
    ? { value: `${fmt(other[key])} → ${fmt(cur[key])}`, compare: null, level: level(cur[key]), ghost: level(other[key]) }
    : { value: fmt(cur[key]), compare: cmp(key, fmt), level: level(cur[key]) })
  const per10 = (v) => v / 10
  const unit = (v) => v
  const tenOf = (v) => `${t10(v)}/10`

  const reported = (twin?.active_symptoms || [])
    .filter((s) => !PROJECTED.includes(s.name.toLowerCase()))
    .map((s) => {
      const region = REGION_MATCH.find(([, re]) => re.test(s.name))?.[0]
      const anchor = { head: 'head', chest: 'chest', abdomen: 'abdomen', extremities: 'handR' }[region] || 'shoulder'
      return {
        id: `reported-${s.name}`, anchor: ANCHORS[anchor], label: s.name, value: `${s.severity}/10`, level: s.severity / 10, tone: 'symptom',
        source: t.reported, extra: region === 'extremities' ? [ANCHORS.handL, ANCHORS.footL, ANCHORS.footR] : [],
      }
    })

  const c = {
    status: { id: 'status', anchor: ANCHORS.sternum, label: t.status, value: STATUS[cur.status], compare: other && other.status !== cur.status ? `${otherLabel} ${STATUS[other.status]}` : null, level: 0, tone: 'info', source: audience === 'patient' ? 'A simple demo indicator, not a diagnosis' : 'Check-in thresholds applied to the projection' },
    dose: { id: 'dose', anchor: ANCHORS.chest, label: t.dose, value: comparing ? `100% → ${dose}%` : `${shownDose}%`, compare: doseCompare, level: shownDose / 150, ghost: comparing ? 100 / 150 : undefined, tone: 'info', source: formatDose(b.dose) },
    regimen: { id: 'regimen', anchor: ANCHORS.sternum, label: t.regimen, value: (b.treatment || '—').split(' (')[0], note: (b.treatment || '').match(/\(([^)]+)\)/)?.[1], level: 0.3, tone: 'info', source: t.base },
    kidney: { id: 'kidney', anchor: ANCHORS.kidneyR, label: t.kidney, value: `${egfr ?? '—'} eGFR`, note: t.kidneyNote, level: 0.35, tone: 'lab', source: t.base },
    nausea: { id: 'nausea', anchor: ANCHORS.abdomen, label: t.nausea, ...metric('nausea', tenOf, per10), tone: 'symptom', source: t.sim },
    fatigue: { id: 'fatigue', anchor: ANCHORS.shoulder, label: t.fatigue, ...metric('fatigue', tenOf, per10), tone: 'symptom', source: t.sim },
    pain: { id: 'pain', anchor: ANCHORS.hip, label: t.pain, ...metric('pain', tenOf, per10), note: t.painNote, tone: 'symptom', source: t.sim },
    response: { id: 'response', anchor: ANCHORS.chest, label: t.response, ...metric('response_score', pct, unit), spark: series('response_score'), tone: 'info', source: t.sim },
    risk: { id: 'risk', anchor: ANCHORS.core, label: t.risk, ...metric('risk_score', pct, unit), spark: series('risk_score'), tone: 'info', source: t.riskSource },
    wellbeing: { id: 'wellbeing', anchor: ANCHORS.head, label: t.wellbeing, ...metric('wellbeing', tenOf, per10), spark: series('wellbeing'), tone: 'info', source: t.sim },
    hemoglobin: { id: 'hemoglobin', anchor: ANCHORS.chest, label: 'Hemoglobin', value: `${labs.hemoglobin_g_dl ?? '—'} g/dL`, level: 0.5, tone: 'lab', source: t.base },
    wbc: { id: 'wbc', anchor: ANCHORS.armL, label: 'White blood cells', value: `${labs.wbc_10e9_l ?? '—'} ×10⁹/L`, level: 0.5, tone: 'lab', source: t.base },
    platelets: { id: 'platelets', anchor: ANCHORS.forearmR, label: 'Platelets', value: `${labs.platelets_10e9_l ?? '—'} ×10⁹/L`, level: 0.5, tone: 'lab', source: t.base },
    creatinine: { id: 'creatinine', anchor: ANCHORS.kidneyL, label: 'Creatinine', value: `${labs.creatinine_mg_dl ?? '—'} mg/dL`, level: 0.5, tone: 'lab', source: t.base },
    egfr: { id: 'egfr', anchor: ANCHORS.kidneyR, label: 'eGFR', value: `${egfr ?? '—'}`, note: 'mL/min/1.73m²', level: 0.5, tone: 'lab', source: t.base },
  }
  // Only shown when the researcher journey provides it for the selected week.
  const unc = uncertainty != null ? [{ id: 'uncertainty', anchor: ANCHORS.shoulderL, label: t.uncertainty, value: pct(uncertainty), level: 0.3, tone: 'info', source: 'Researcher journey engine · prototype forecast' }] : []

  const byLens = {
    full: [c.status, c.dose, c.nausea, c.fatigue, c.risk, ...reported],
    treatment: [c.regimen, c.dose, c.kidney, c.response],
    symptoms: [c.nausea, c.fatigue, c.pain, ...reported],
    labs: [c.hemoglobin, c.wbc, c.platelets, c.creatinine, c.egfr],
    response: [c.wellbeing, c.response, c.risk, ...unc],
  }
  const fatigue = cur.fatigue / 10
  return {
    callouts: byLens[lens],
    // Whole-body systemic glow follows projected fatigue; dimmed in lenses that aren't about symptoms.
    aura: lens === 'full' || lens === 'symptoms' ? fatigue : fatigue * 0.35,
    field: lens === 'treatment' ? { type: 'exposure', level: shownDose / 150 } : lens === 'response' ? { type: 'response', level: cur.response_score } : null,
  }
}
