import { useEffect, useState } from 'react'
import { api } from '../api'
import TrajectoryTimeline from './TrajectoryTimeline'
import TwinStage from './TwinStage'
import { METRICS, STATUS } from './twinLenses'
import { useCounterfactual } from './useCounterfactual'

const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`)

// "My Twin" (patient) and "Patient Twin" (researcher): the same twin and
// projected trajectory, without simulation controls. Audience changes copy
// and information density only.
export default function TwinExplorer({ patientId, twin, audience = 'patient', refreshKey, profile, trial }) {
  const { original, error } = useCounterfactual(patientId, refreshKey)
  const [week, setWeek] = useState(0)
  const [metricKey, setMetricKey] = useState('risk_score')
  const [journey, setJourney] = useState(null)
  const patient = audience === 'patient'

  useEffect(() => {
    if (patient) return undefined
    // Researcher-only extras (uncertainty, safety signals) from the team's journey engine.
    let live = true
    api.getResearcherJourney(patientId).then((data) => live && setJourney(data)).catch(() => {})
    return () => { live = false }
  }, [patientId, patient, refreshKey])

  const cur = original[week]
  const jw = cur && journey?.weeks?.find((w) => w.week === cur.week)
  const metricDef = METRICS.find((m) => m.key === metricKey)
  const metric = { ...metricDef, title: metricDef.label[audience], subtitle: metricDef.note[audience] }

  return <div className="studio-view explorer-view">
    {patient && <header className="studio-intro page-width">
      <div><p className="eyebrow">YOUR DIGITAL TWIN</p><h2>What is happening<br /><em>with me?</em></h2></div>
      <p>Your twin combines your health profile, your check-ins and the demo’s simulated projections. Pick a week to see how it may look, and turn the views to explore symptoms, treatment and labs.</p>
    </header>}
    {patient && profile && <div className="page-width twin-profile-chips" aria-label="Initialized from your health profile">
      <span>FROM YOUR HEALTH PROFILE</span>
      {trial && <b>{trial.name}</b>}
      <b>Age {new Date().getFullYear() - Number(profile.birthYear)}</b>{profile.conditions.map((c) => <b key={c}>{c}</b>)}<b>{profile.stage}</b><b>{profile.activity}</b>
      {profile.currentTreatments?.filter((x) => x !== 'None yet').map((x) => <b key={x}>{x}</b>)}
      {profile.organIssues && profile.organIssues !== 'none' && <b>{profile.organIssues === 'unsure' ? 'Kidney/liver: not sure' : `${profile.organIssues} issues noted`}</b>}
    </div>}
    <div className="explorer-shell page-width">
      {error && <p className="form-error" role="alert">{error}</p>}
      <TwinStage twin={twin} original={original} modified={original} week={week} audience={audience} uncertainty={jw?.prediction?.uncertainty} compare={false} />

      <aside className="studio-outcomes explorer-side">
        <span className="eyebrow">{patient ? 'THIS WEEK, IN PLAIN TERMS' : 'PARTICIPANT SIGNALS'} · {cur ? cur.label.toUpperCase() : '—'}</span>
        <h2>{patient ? <>How your twin <em>looks</em></> : <>Current <em>state</em></>}</h2>
        {cur && <p className="studio-summary">{patient
          ? <>Your twin’s status is <b>{STATUS[cur.status]}</b>. These are simulated projections for the demo, not measurements.</>
          : <>Status <b>{STATUS[cur.status]}</b> · projection at 100% dose from the counterfactual engine{jw ? '; safety and uncertainty from the journey engine.' : '.'}</>}</p>}
        <div className="studio-metrics">{cur && METRICS.map((m) => <button type="button" key={m.key} className={`studio-metric ${m.key === metricKey ? 'selected' : ''}`} aria-pressed={m.key === metricKey} onClick={() => setMetricKey(m.key)}>
          <span>{m.label[audience]}</span>
          <strong><span className="v-mod">{m.format(cur[m.key])}</span></strong>
          {patient && <small className="studio-metric-note">{m.note.patient}</small>}
        </button>)}</div>
        {!patient && <dl className="explorer-signals">
          <div><dt>Forecast uncertainty</dt><dd>{pct(jw?.prediction?.uncertainty)}</dd></div>
          <div><dt>Adverse event risk</dt><dd>{pct(jw?.prediction?.adverse_event_risk)}</dd></div>
          <div><dt>Dropout risk</dt><dd>{pct(jw?.prediction?.dropout_risk)}</dd></div>
          <div><dt>Alerts this week</dt><dd>{jw ? jw.alerts?.length ?? 0 : '—'}</dd></div>
          <div><dt>Main risk driver</dt><dd>{journey?.main_risk_driver?.replaceAll('_', ' ') || '—'}</dd></div>
          <p>{cur?.week === 0 ? 'Journey-engine signals start at Week 1.' : 'Journey engine: deterministic prototype, not clinically validated.'}</p>
        </dl>}
      </aside>
    </div>
    <div className="page-width"><TrajectoryTimeline original={original} metric={metric} week={week} onWeek={setWeek} /></div>
    <p className="studio-disclaimer page-width">✳ {patient ? 'Your digital twin is a demo built from synthetic data and simulated projections. It is not a diagnosis or medical advice. Please talk to your study or care team about how you feel.' : 'Synthetic participant. Projections are mock heuristics and prototype forecasts, not clinical guidance.'}</p>
  </div>
}
