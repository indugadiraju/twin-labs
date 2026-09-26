import { useEffect, useState } from 'react'
import { api } from '../api'
import './ResearcherDashboard.css'

const percent = (value) => `${Math.round((Number(value) || 0) * 100)}%`
const pretty = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function ResearcherDashboard({ patientId, onPatientView }) {
  const [cohort, setCohort] = useState(null)
  const [patients, setPatients] = useState([])
  const [selectedId, setSelectedId] = useState(patientId)
  const [journey, setJourney] = useState(null)
  const [loading, setLoading] = useState(true)
  const [labStatus, setLabStatus] = useState('')
  const [error, setError] = useState('')

  const loadJourney = async (id) => {
    setSelectedId(id)
    setJourney(await api.getResearcherJourney(id))
  }

  const loadDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const [nextCohort, patientResult] = await Promise.all([
        api.getCohortSummary(),
        api.getResearcherPatients(),
      ])
      const nextPatients = patientResult.patients || []
      const nextId = nextPatients.find((item) => item.patient_id === selectedId)?.patient_id
        || nextPatients[0]?.patient_id
        || patientId
      setCohort(nextCohort)
      setPatients(nextPatients)
      await loadJourney(nextId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([api.getCohortSummary(), api.getResearcherPatients()])
      .then(async ([nextCohort, patientResult]) => {
        const nextPatients = patientResult.patients || []
        const nextId = nextPatients.find((item) => item.patient_id === patientId)?.patient_id
          || nextPatients[0]?.patient_id
          || patientId
        const nextJourney = await api.getResearcherJourney(nextId)
        if (cancelled) return
        setCohort(nextCohort)
        setPatients(nextPatients)
        setSelectedId(nextId)
        setJourney(nextJourney)
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [patientId])

  const addDemoLab = async () => {
    setLabStatus('saving')
    setError('')
    try {
      const result = await api.addLabUpdate(selectedId, {
        week: 2,
        name: 'kidney_function',
        value: 61,
        unit: 'eGFR mL/min/1.73m²',
      })
      setJourney(result.journey)
      setLabStatus('saved')
      const [nextCohort, patientResult] = await Promise.all([
        api.getCohortSummary(),
        api.getResearcherPatients(),
      ])
      setCohort(nextCohort)
      setPatients(patientResult.patients || [])
    } catch (err) {
      setLabStatus('')
      setError(err.message)
    }
  }

  const latest = journey?.weeks?.at(-1)
  const metrics = cohort ? [
    ['Active patients', cohort.active_patients, 'in demo cohort'],
    ['Worsening trajectories', cohort.worsening_symptom_trajectories, 'need a closer look'],
    ['Requires review', cohort.patients_requiring_review, 'researcher attention'],
    ['New symptoms', cohort.new_symptoms_reported, 'reported this cycle'],
  ] : []
  const riskRows = [
    ['Fatigue', 'fatigue_risk'],
    ['Nausea', 'nausea_risk'],
    ['Adverse event', 'adverse_event_risk'],
    ['Dropout', 'dropout_risk'],
  ]

  return <div className="researcher-shell">
    <header className="researcher-header">
      <nav className="researcher-nav page-width" aria-label="Researcher navigation">
        <a className="wordmark researcher-wordmark" href="#researcher-top"><span>✳</span> twinlab<span className="wordmark-dot">.</span></a>
        <div className="experience-switch" aria-label="Experience switcher">
          <button type="button" onClick={onPatientView}>Patient</button>
          <button type="button" className="selected" aria-current="page">Researcher</button>
        </div>
        <span className="researcher-avatar" aria-label="Researcher profile">CL</span>
      </nav>
      <div className="researcher-hero page-width" id="researcher-top">
        <div><p className="researcher-kicker">TRIAL INTELLIGENCE · LIVE DEMO</p><h1>See what changed.<br /><em>Know who needs attention.</em></h1><p>Patient-reported signals, labs, and prototype forecasts in one longitudinal view.</p></div>
        <div className="researcher-hero-status"><span className="live-pulse" />DETERMINISTIC DEMO MODEL<strong>{journey?.requires_review ? 'Review queue active' : 'Monitoring cohort'}</strong></div>
      </div>
    </header>

    <main className="researcher-main page-width">
      {error && <div className="researcher-error" role="alert">{error}<button type="button" onClick={loadDashboard}>Try again</button></div>}
      {loading ? <div className="researcher-loading" role="status"><div /><div /><div /></div> : <>
        <section className="cohort-overview" aria-labelledby="cohort-title">
          <div className="researcher-section-heading"><div><p className="researcher-kicker">TRIAL OVERVIEW</p><h2 id="cohort-title">The cohort, at a glance.</h2></div><p>{cohort?.disclaimer || 'Summary derived from the available demo cohort.'}</p></div>
          <div className="cohort-metrics">{metrics.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</div>
          <div className="common-changes"><span>Most common changes</span>{cohort?.common_changes?.map((item, index) => <div key={item}><b>{String(index + 1).padStart(2, '0')}</b>{pretty(item)}</div>)}</div>
        </section>

        <section className="researcher-workspace" aria-labelledby="patient-intelligence-title">
          <aside className="researcher-patient-list"><div><p className="researcher-kicker">REVIEW QUEUE</p><span>{patients.filter((item) => item.requires_review).length} live demo patients flagged</span></div>{patients.length ? patients.map((patient) => <button type="button" key={patient.patient_id} className={selectedId === patient.patient_id ? 'selected' : ''} onClick={() => loadJourney(patient.patient_id)}><span className={`review-dot ${patient.requires_review ? 'attention' : ''}`} /><span><strong>{patient.display_name}</strong><small>{patient.main_risk_driver}</small></span><b>{patient.alert_count}</b></button>) : <p className="empty-queue">No demo patients are available.</p>}</aside>

          <div className="patient-intelligence">
            <div className="patient-intelligence-top"><div><p className="researcher-kicker">PATIENT INTELLIGENCE</p><h2 id="patient-intelligence-title">Patient 024</h2><span>{journey?.condition}</span></div><div className={`review-badge ${journey?.requires_review ? 'attention' : ''}`}><span className="review-dot attention" />{journey?.requires_review ? 'Requires review' : 'Monitoring'}</div></div>

            <div className="intelligence-summary"><article><span>Main risk driver</span><strong>{pretty(journey?.main_risk_driver)}</strong><small>Transparent prototype attribution</small></article><article><span>New concern</span><strong>{pretty(journey?.new_patient_concern) || 'None detected'}</strong><small>From structured mood and check-in text</small></article><article><span>Predicted peak</span><strong>Week {journey?.peak_fatigue_week}</strong><small>Highest fatigue-risk forecast</small></article><article><span>Uncertainty</span><strong>{percent(latest?.prediction?.uncertainty)}</strong><small>Prototype model estimate</small></article></div>

            <div className="trend-panel"><div className="panel-heading"><div><span>Four-week trajectory</span><strong>Predicted risk signals</strong></div><span>MOCK · NOT CLINICAL GUIDANCE</span></div><div className="risk-grid"><div className="risk-grid-head"><span>Signal</span>{journey?.weeks?.map((week) => <span key={week.week}>W{week.week}</span>)}</div>{riskRows.map(([label, key]) => <div className="risk-row" key={key}><strong>{label}</strong>{journey?.weeks?.map((week) => <div key={week.week}><span style={{ '--risk': `${Math.round(week.prediction[key] * 100)}%` }} /><b>{percent(week.prediction[key])}</b></div>)}</div>)}</div></div>

            <div className="researcher-detail-grid"><section className="alert-panel"><div className="panel-heading"><div><span>Researcher alerts</span><strong>What changed, and why</strong></div><b>{journey?.alerts?.length || 0}</b></div>{journey?.alerts?.length ? <div className="alert-list">{journey.alerts.map((alert) => <article key={`${alert.type}-${alert.title}`}><span className={`alert-level ${alert.severity}`}>{alert.severity}</span><div><strong>{alert.title}</strong><p>{alert.explanation}</p><small>Week {alert.week} · Transparent demo rule</small></div></article>)}</div> : <p className="empty-alerts">No meaningful changes detected yet. Submit a patient check-in to update the journey.</p>}</section>
              <section className="change-panel"><div className="panel-heading"><div><span>Changes from baseline</span><strong>Longitudinal state</strong></div></div>{journey?.changes_from_baseline?.length ? journey.changes_from_baseline.map((change) => <div className="baseline-change" key={change.field}><span>{pretty(change.field)}</span><strong>{change.before} <i>→</i> {change.after}</strong></div>) : <p className="empty-alerts">No changes from the synthetic baseline.</p>}<button type="button" className="lab-demo-button" onClick={addDemoLab} disabled={labStatus === 'saving'}>{labStatus === 'saving' ? 'Updating journey…' : labStatus === 'saved' ? '✓ eGFR 61 added · Re-run' : 'Add demo lab · eGFR 61'}<span>↗</span></button><small className="lab-note">Adds a simulated Week 2 result and recomputes future predictions.</small></section>
            </div>
          </div>
        </section>
      </>}
    </main>
    <footer className="researcher-footer page-width"><span>✳ twinlab.</span><p>All patient and cohort data shown here is synthetic or simulated. Forecasts use transparent deterministic prototype rules and are not medical advice.</p><b>RESEARCHER INTELLIGENCE</b></footer>
  </div>
}
