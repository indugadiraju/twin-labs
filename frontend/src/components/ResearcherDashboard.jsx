import { useEffect, useState } from 'react'
import { api } from '../api'
import './ResearcherDashboard.css'
import './ResearcherDashboardSoft.css'

const percent = (value) => `${Math.round((Number(value) || 0) * 100)}%`
const pretty = (value) => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const riskRows = [
  { label: 'Fatigue', key: 'fatigue_risk', color: '#7954c7' },
  { label: 'Nausea', key: 'nausea_risk', color: '#a06edb' },
  { label: 'Adverse event', key: 'adverse_event_risk', color: '#e385b7' },
  { label: 'Dropout', key: 'dropout_risk', color: '#ffb45e' },
]

function DigitalTwinCore({ journey }) {
  const alertCount = journey?.alerts?.length || 0
  const weekCount = journey?.weeks?.length || 0

  return <div className="digital-twin-stage" aria-label={`Digital twin synchronized with ${weekCount} forecast weeks and ${alertCount} active alerts`}>
    <div className="twin-halo halo-one" aria-hidden="true" />
    <div className="twin-halo halo-two" aria-hidden="true" />
    <div className="twin-halo halo-three" aria-hidden="true" />
    <div className="twin-axis axis-x" aria-hidden="true" />
    <div className="twin-axis axis-y" aria-hidden="true" />
    <div className="twin-node node-one" aria-hidden="true" />
    <div className="twin-node node-two" aria-hidden="true" />
    <div className="twin-node node-three" aria-hidden="true" />
    <div className="twin-core">
      <span className="twin-core-icon">✳</span>
      <small>DIGITAL TWIN</small>
      <strong>SYNCED</strong>
      <i>{String(weekCount).padStart(2, '0')} forecast weeks</i>
    </div>
    <div className="twin-callout callout-left"><span>ACTIVE SIGNALS</span><strong>{String(alertCount).padStart(2, '0')}</strong></div>
    <div className="twin-callout callout-right"><span>MODEL STATE</span><strong>READY</strong></div>
    <div className="twin-scan" aria-hidden="true" />
  </div>
}

function RiskTrajectory({ weeks = [] }) {
  const width = 760
  const height = 290
  const left = 52
  const right = 24
  const top = 24
  const bottom = 42
  const chartWidth = width - left - right
  const chartHeight = height - top - bottom
  const xFor = (index) => left + (weeks.length <= 1 ? 0 : (index / (weeks.length - 1)) * chartWidth)
  const yFor = (value) => top + (1 - Math.max(0, Math.min(1, Number(value) || 0))) * chartHeight
  const pointsFor = (key) => weeks.map((week, index) => `${xFor(index)},${yFor(week.prediction?.[key])}`).join(' ')

  if (!weeks.length) return <p className="empty-alerts">No forecast data is available yet.</p>

  return <div className="trajectory-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="risk-chart-title risk-chart-desc">
      <title id="risk-chart-title">Four-week predicted risk trajectories</title>
      <desc id="risk-chart-desc">Line chart showing fatigue, nausea, adverse event, and dropout risk percentages across four forecast weeks.</desc>
      <defs>
        <linearGradient id="risk-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7954c7" stopOpacity=".2" />
          <stop offset="100%" stopColor="#7954c7" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, .25, .5, .75, 1].map((tick) => {
        const y = yFor(tick)
        return <g key={tick}>
          <line className="chart-grid-line" x1={left} y1={y} x2={width - right} y2={y} />
          <text className="chart-axis-label" x={left - 12} y={y + 4} textAnchor="end">{Math.round(tick * 100)}</text>
        </g>
      })}
      {weeks.map((week, index) => {
        const x = xFor(index)
        return <g key={week.week}>
          <line className="chart-week-line" x1={x} y1={top} x2={x} y2={height - bottom} />
          <text className="chart-week-label" x={x} y={height - 13} textAnchor="middle">WEEK {week.week}</text>
        </g>
      })}
      <polygon
        className="chart-area"
        points={`${left},${height - bottom} ${pointsFor('fatigue_risk')} ${width - right},${height - bottom}`}
        fill="url(#risk-area)"
      />
      {riskRows.map((series) => <g key={series.key}>
        <polyline className="risk-line" points={pointsFor(series.key)} fill="none" stroke={series.color} />
        {weeks.map((week, index) => <g key={week.week}>
          <circle className="risk-point-halo" cx={xFor(index)} cy={yFor(week.prediction?.[series.key])} r="7" fill={series.color} />
          <circle className="risk-point" cx={xFor(index)} cy={yFor(week.prediction?.[series.key])} r="3.5" fill={series.color} />
        </g>)}
      </g>)}
    </svg>
    <div className="trajectory-legend">
      {riskRows.map((series) => <span key={series.key}><i style={{ background: series.color }} />{series.label}<b>{percent(weeks.at(-1)?.prediction?.[series.key])}</b></span>)}
    </div>
  </div>
}

function RiskGauge({ score, label }) {
  const normalized = Math.max(0, Math.min(1, Number(score) || 0))
  const circumference = 289

  return <div className="risk-gauge-wrap">
    <svg className="risk-gauge" viewBox="0 0 120 120" aria-label={`${label} is ${percent(normalized)}`}>
      <circle className="gauge-track" cx="60" cy="60" r="46" />
      <circle className="gauge-value" cx="60" cy="60" r="46" style={{ strokeDashoffset: circumference * (1 - normalized) }} />
    </svg>
    <div><strong>{percent(normalized)}</strong><span>PEAK SIGNAL</span></div>
  </div>
}

// Optional extra researcher sections (e.g. Patient Twin, What-If Studio) share this
// header: [{ id, label, kicker?, title?, em?, description?, content? }]. Without
// `sections` the dashboard renders exactly as before.
export default function ResearcherDashboard({ patientId, onExit, sections, section = 'dashboard', onSection }) {
  const extra = sections?.find((item) => item.id === section && item.content)
  const [cohort, setCohort] = useState(null)
  const [patients, setPatients] = useState([])
  const [selectedId, setSelectedId] = useState(patientId)
  const [journey, setJourney] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [labStatus, setLabStatus] = useState('')
  const [labDraft, setLabDraft] = useState({ week: 2, name: 'kidney_function', value: 61, unit: 'eGFR mL/min/1.73m²' })
  const [error, setError] = useState('')

  const loadJourney = async (id) => {
    setError('')
    setSelectedId(id)
    try {
      setJourney(await api.getResearcherJourney(id))
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    }
  }

  const loadDashboard = async (showInitialLoader = false) => {
    if (showInitialLoader) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      await api.createTwin(patientId)
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
      setLastUpdated(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    api.createTwin(patientId)
      .then(() => Promise.all([api.getCohortSummary(), api.getResearcherPatients()]))
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
        setLastUpdated(new Date())
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [patientId])

  const addDemoLab = async (event) => {
    event.preventDefault()
    setLabStatus('saving')
    setError('')
    try {
      const result = await api.addLabUpdate(selectedId, {
        week: Number(labDraft.week),
        name: labDraft.name,
        value: Number(labDraft.value),
        unit: labDraft.unit || null,
      })
      setJourney(result.journey)
      setLabStatus('saved')
      const [nextCohort, patientResult] = await Promise.all([
        api.getCohortSummary(),
        api.getResearcherPatients(),
      ])
      setCohort(nextCohort)
      setPatients(patientResult.patients || [])
      setLastUpdated(new Date())
    } catch (err) {
      setLabStatus('')
      setError(err.message)
    }
  }

  const latest = journey?.weeks?.at(-1)
  const selectedPatient = patients.find((patient) => patient.patient_id === selectedId)
  const cohortIsSynthetic = cohort?.is_synthetic_aggregate ?? cohort?.source === 'deterministic_synthetic_cohort_aggregate'
  const metrics = cohort ? [
    ['01', cohortIsSynthetic ? 'Simulated patients' : 'Active demo patients', cohort.active_patients, cohortIsSynthetic ? 'in synthetic cohort' : 'available now'],
    ['02', 'Worsening trajectories', cohort.worsening_symptom_trajectories, 'need a closer look'],
    ['03', 'Requires review', cohort.patients_requiring_review, 'researcher attention'],
    ['04', 'New symptoms', cohort.new_symptoms_reported, 'reported this cycle'],
  ] : []
  const highestRisk = riskRows.reduce((highest, series) => {
    const score = Number(latest?.prediction?.[series.key]) || 0
    return score > highest.score ? { ...series, score } : highest
  }, { label: 'No active signal', key: '', color: '#7cf7ff', score: 0 })

  return <div className="researcher-command-shell">
    {/* Patient Twin / What-If Studio sections use the deep-purple studio theme. */}
    <header className={`researcher-header ${extra ? 'researcher-header-studio' : ''}`}>
      <nav className="researcher-nav page-width" aria-label="Researcher navigation">
        <a className="wordmark researcher-wordmark" href="#researcher-top"><span>✳</span> TwinLabs<span className="wordmark-dot">.</span></a>
        <button type="button" className="researcher-exit" onClick={onExit}>Exit researcher portal</button>
        <span className="researcher-avatar" aria-label="Researcher profile">CL</span>
      </nav>
      {sections && <nav className="app-tabs research-tabs page-width" aria-label="Researcher sections">{sections.map(({ id, label }) => <button type="button" key={id} aria-current={section === id ? 'page' : undefined} className={section === id ? 'active' : ''} onClick={() => onSection(id)}>{label}</button>)}</nav>}
      {extra ? <div className="studio-header page-width"><div><p className="researcher-kicker">{extra.kicker}</p><h1>{extra.title} <em>{extra.em}</em></h1></div><p>{extra.description}</p></div> : <>
      <div className="researcher-hero page-width" id="researcher-top">
        <div className="researcher-hero-copy">
          <div className="live-model-label"><span className="live-pulse" />DIGITAL TWIN NETWORK · DEMO</div>
          <h1>See the signal<br /><em>before it becomes risk.</em></h1>
          <p>Longitudinal patient intelligence, transparent forecasts, and actionable cohort signals—synchronized in one researcher command center.</p>
          <div className="hero-readouts">
            <span><small>MODEL</small><strong>DETERMINISTIC</strong></span>
            <span><small>FORECAST</small><strong>{journey?.weeks?.length || 0} WEEKS</strong></span>
            <span><small>STATUS</small><strong>{journey?.requires_review ? 'REVIEW ACTIVE' : 'MONITORING'}</strong></span>
          </div>
        </div>
        <DigitalTwinCore journey={journey} />
      </div>

      <div className="signal-rail" aria-hidden="true">
        <div><span>SIMULATED COHORT DATA</span><b>✳</b><span>PATIENT-REPORTED SIGNALS</span><b>✳</b><span>4-WEEK RISK FORECAST</span><b>✳</b><span>TRANSPARENT ATTRIBUTION</span></div>
      </div>
      </>}
    </header>

    {extra ? extra.content : <main className="researcher-main page-width">
      {error && <div className="researcher-error" role="alert">{error}<button type="button" onClick={() => loadDashboard(true)}>Try again</button></div>}
      {loading ? <div className="researcher-loading" role="status"><div /><div /><div /></div> : <>
        <section className="cohort-overview" aria-labelledby="cohort-title">
          <div className="researcher-section-heading">
            <div><p className="researcher-kicker">01 / COHORT SIGNALS</p><h2 id="cohort-title">Trial pulse, explained.</h2></div>
            <div className="cohort-heading-actions"><p>{cohort?.scope_label || cohort?.disclaimer || 'Summary derived from the available demo cohort.'}</p><button type="button" onClick={() => loadDashboard(false)} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh data'} <span>↻</span></button><small>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for data'}</small></div>
          </div>
          <div className="cohort-metrics">
            {metrics.map(([index, label, value, note]) => <article key={label}>
              <div><b>{index}</b><span>{label}</span></div>
              <strong>{String(value).padStart(2, '0')}</strong>
              <small><i />{note}</small>
              <div className="metric-wave" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /></div>
            </article>)}
          </div>
          <div className="common-changes"><span>DOMINANT COHORT SHIFTS</span>{cohort?.common_changes?.map((item, index) => <div key={item}><b>{String(index + 1).padStart(2, '0')}</b>{pretty(item)}</div>)}</div>
        </section>

        <section className="researcher-workspace" aria-labelledby="patient-intelligence-title">
          <aside className="researcher-patient-list">
            <div><p className="researcher-kicker">02 / REVIEW QUEUE</p><span>{patients.filter((item) => item.requires_review).length} live demo patients flagged</span></div>
            {patients.length ? patients.map((patient) => <button type="button" key={patient.patient_id} className={selectedId === patient.patient_id ? 'selected' : ''} onClick={() => loadJourney(patient.patient_id)}>
              <span className={`review-dot ${patient.requires_review ? 'attention' : ''}`} />
              <span><strong>{patient.display_name}</strong><small>{patient.main_risk_driver}</small></span>
              <b>{String(patient.alert_count).padStart(2, '0')}</b>
            </button>) : <p className="empty-queue">No demo patients are available.</p>}
            <div className="queue-system-status"><span>QUEUE STATUS</span><strong><i />REFRESHABLE</strong></div>
          </aside>

          <div className="patient-intelligence">
            <div className="patient-intelligence-top">
              <div><p className="researcher-kicker">PATIENT INTELLIGENCE</p><h2 id="patient-intelligence-title">{selectedPatient?.display_name || journey?.patient_id || 'Patient'}</h2><span>{journey?.condition}</span></div>
              <div className={`review-badge ${journey?.requires_review ? 'attention' : ''}`}><span className="review-dot attention" />{journey?.requires_review ? 'Requires review' : 'Monitoring'}<small>DEMO</small></div>
            </div>

            <div className="intelligence-summary">
              <article><span>Main risk driver</span><strong>{pretty(journey?.main_risk_driver)}</strong><small>Transparent prototype attribution</small></article>
              <article><span>New concern</span><strong>{pretty(journey?.new_patient_concern) || 'None detected'}</strong><small>From structured mood and check-in text</small></article>
              <article><span>Predicted peak</span><strong>Week {journey?.peak_fatigue_week}</strong><small>Highest fatigue-risk forecast</small></article>
              <article><span>Uncertainty</span><strong>{percent(latest?.prediction?.uncertainty)}</strong><small>Prototype model estimate</small></article>
            </div>

            <div className="risk-command-grid">
              <section className="trend-panel">
                <div className="panel-heading"><div><span>Four-week trajectory</span><strong>Predicted risk signals</strong></div><span>MOCK · NOT CLINICAL GUIDANCE</span></div>
                <RiskTrajectory weeks={journey?.weeks} />
              </section>
              <aside className="risk-now-panel">
                <div className="panel-heading"><div><span>Dominant signal</span><strong>Risk concentration</strong></div><span>W{latest?.week || '—'}</span></div>
                <RiskGauge score={highestRisk.score} label={highestRisk.label} />
                <div className="dominant-risk-copy"><span>HIGHEST CURRENT RISK</span><strong>{highestRisk.label}</strong><p>{journey?.requires_review ? 'Signal exceeds the prototype review threshold.' : 'Signals remain within the monitoring range.'}</p></div>
                <div className="signal-confidence"><span>MODEL UNCERTAINTY</span><b>{percent(latest?.prediction?.uncertainty)}</b><i><span style={{ width: percent(latest?.prediction?.uncertainty) }} /></i></div>
              </aside>
            </div>

            <div className="researcher-detail-grid">
              <section className="alert-panel">
                <div className="panel-heading"><div><span>Researcher alerts</span><strong>What changed, and why</strong></div><b>{String(journey?.alerts?.length || 0).padStart(2, '0')}</b></div>
                {journey?.alerts?.length ? <div className="alert-list">{journey.alerts.map((alert, index) => <article key={`${alert.type}-${alert.title}`}>
                  <span className={`alert-index ${alert.severity}`}>{String(index + 1).padStart(2, '0')}</span>
                  <div><span className={`alert-level ${alert.severity}`}>{alert.severity}</span><strong>{alert.title}</strong><p>{alert.explanation}</p><small>WEEK {alert.week} · TRANSPARENT DEMO RULE</small></div>
                </article>)}</div> : <p className="empty-alerts">No meaningful changes detected yet. Submit a patient check-in to update the journey.</p>}
              </section>
              <section className="change-panel">
                <div className="panel-heading"><div><span>Changes from baseline</span><strong>Longitudinal state</strong></div><span>Δ DEMO</span></div>
                {journey?.changes_from_baseline?.length ? journey.changes_from_baseline.map((change) => <div className="baseline-change" key={change.field}><span>{pretty(change.field)}</span><strong>{change.before} <i>→</i> {change.after}</strong></div>) : <p className="empty-alerts">No changes from the synthetic baseline.</p>}
                <form className="lab-demo-form" onSubmit={addDemoLab}>
                  <div className="lab-fields">
                    <label><span>Week</span><select value={labDraft.week} onChange={(event) => { setLabStatus(''); setLabDraft((draft) => ({ ...draft, week: event.target.value })) }}>{[1, 2, 3, 4].map((week) => <option key={week} value={week}>Week {week}</option>)}</select></label>
                    <label><span>Lab</span><select value={labDraft.name} onChange={(event) => { setLabStatus(''); setLabDraft((draft) => ({ ...draft, name: event.target.value })) }}><option value="kidney_function">Kidney function</option><option value="hemoglobin_g_dl">Hemoglobin</option><option value="wbc_10e9_l">WBC</option><option value="platelets_10e9_l">Platelets</option></select></label>
                    <label><span>Value</span><input type="number" step="0.1" required value={labDraft.value} onChange={(event) => { setLabStatus(''); setLabDraft((draft) => ({ ...draft, value: event.target.value })) }} /></label>
                    <label><span>Unit</span><input type="text" value={labDraft.unit} onChange={(event) => { setLabStatus(''); setLabDraft((draft) => ({ ...draft, unit: event.target.value })) }} /></label>
                  </div>
                  <button type="submit" className="lab-demo-button" disabled={labStatus === 'saving'}>{labStatus === 'saving' ? 'Updating journey…' : labStatus === 'saved' ? '✓ Lab saved · Add another' : 'Add simulated lab result'}<span>↗</span></button>
                </form>
                <small className="lab-note">Stores a simulated result, recomputes future predictions, and persists it across API restarts.</small>
              </section>
            </div>
          </div>
        </section>
      </>}
    </main>}
    <footer className="researcher-footer page-width"><span>✳ TwinLabs.</span><p>All patient and cohort data shown here is synthetic or simulated. Forecasts use transparent deterministic prototype rules and are not medical advice.</p><b>RESEARCHER INTELLIGENCE · 2026</b></footer>
  </div>
}
