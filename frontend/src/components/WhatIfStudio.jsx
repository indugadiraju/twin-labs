import { useState } from 'react'
import { CADENCES, DEFAULT_PROTOCOL, completedCheckins, observationDensity, scheduleDays } from './checkinSchedule'
import TrajectoryProgression from './TrajectoryProgression'
import TwinStage from './TwinStage'
import { METRICS, doseParts } from './twinLenses'
import { useCounterfactual } from './useCounterfactual'

// Display only: "Docetaxel / 75 mg/m²" per drug, then the schedule.
const DoseLines = ({ dose }) => {
  const { drugs, schedule } = doseParts(dose)
  return <span className="dose-lines">{drugs.map((d) => <span key={d.name + d.amount}>{d.name && <b>{d.name}</b>}<span>{d.amount}</span></span>)}{schedule && <small>{schedule}</small>}</span>
}

const signed = (metric, d) => {
  const text = metric.delta(Math.abs(d))
  if (parseFloat(text) === 0) return { text: 'No change', dir: 'flat' }
  return { text: `${d > 0 ? '↑ +' : '↓ −'}${text}`, dir: d > 0 ? 'up' : 'down' }
}

const PATIENT_DISCLAIMER = 'Simulated what-if for educational/demo purposes. Not medical guidance. Treatment changes should be discussed with the study or care team.'

// Audience-specific wording; the simulation, data and layout are shared.
const COPY = {
  researcher: {
    context: 'PATIENT CONTEXT', control: 'SIMULATION CONTROL', dose: 'Treatment dose', current: '100% · current',
    hint: (d) => (d === 100 ? 'Current prescribed dose.' : `${d}% of the current prescribed dose.`),
    run: 'Run simulation', idle: 'One variable at a time. More controls coming.', stale: 'Slider changed. Run to update the modified twin.',
    outcomes: 'PREDICTED OUTCOMES', heading: <>Original <b>→</b> <em>Modified</em></>,
    fields: (b, _profile, study) => [...(study ? [['Study', `${study.phase} · ${study.name}`]] : []), ['Age', b.age], ['Treatment', b.treatment], ['Current treatment', <DoseLines key="dose" dose={b.dose} />], ['Kidney function', `${b.kidney_function?.egfr_ml_min_1_73m2 ?? '—'} eGFR`], ['Recurrence score', b.condition_specific?.oncotype_dx_recurrence_score ?? '—']],
  },
  patient: {
    context: 'ABOUT YOUR TWIN', control: 'EXPLORE A SCENARIO', dose: 'Treatment dose', current: '100% · current treatment',
    hint: (d) => (d === 100 ? 'Matches your current treatment.' : `This scenario uses ${d}% of your current dose. Your real treatment does not change.`),
    run: 'Run what-if', idle: 'This only changes the simulation.', stale: 'Slider moved. Run to see the new scenario.',
    outcomes: 'PREDICTED OUTCOMES', heading: <>Current <b>→</b> <em>Scenario</em></>,
    fields: (b, p, study) => [...(study ? [['Your study', study.name]] : []), ...(p ? [['Age', new Date().getFullYear() - Number(p.birthYear)], ['Condition', p.conditions.join(', ')], ['Activity', p.activity]] : []), ['Treatment', (b.treatment || '—').split(' (')[0]], ['Current treatment', <DoseLines key="dose" dose={b.dose} />], ['Kidney function', `${b.kidney_function?.egfr_ml_min_1_73m2 ?? '—'} eGFR`]],
  },
}

export default function WhatIfStudio({ patientId, patientName, twin, timeline, audience = 'researcher', refreshKey, profile, trial, cadence }) {
  const sim = useCounterfactual(patientId, refreshKey)
  const [dose, setDose] = useState(100)
  const [metricKey, setMetricKey] = useState('risk_score')
  const [selectedWeek, setSelectedWeek] = useState(null)
  const [mode, setMode] = useState('original')
  // The study setup's check-in cadence is the starting schedule (still adjustable here).
  const [protocol, setProtocol] = useState({ ...DEFAULT_PROTOCOL, cadence: cadence || DEFAULT_PROTOCOL.cadence })
  const t = COPY[audience] || COPY.researcher
  const patient = audience === 'patient'

  const run = async () => {
    if (await sim.run(dose)) { setSelectedWeek(null); setMode('modified') }
  }

  const { original, modified, ranDose } = sim
  const simulated = ranDose !== 100
  const stale = sim.result && dose !== ranDose
  const week = selectedWeek ?? original.length - 1
  const cur = original[week]
  const baseline = twin?.synthetic_baseline
  const completed = completedCheckins(timeline, twin?.current_week || 1)
  const planned = scheduleDays(protocol)
  const cadenceInfo = CADENCES.find((c) => c.id === protocol.cadence)

  return <div className="studio-view" id="what-if">
    {patient && <header className="studio-intro page-width">
      <div><p className="eyebrow">WHAT-IF STUDIO · EDUCATIONAL SIMULATION</p><h2>What might change<br /><em>in a different scenario?</em></h2></div>
      <p>Explore how your simulated twin responds when one treatment variable is changed. This is a model, not advice. Only your study or care team can change your treatment.</p>
    </header>}
    <div className="studio-shell page-width">
      <aside className="checkin-panel studio-controls">
        <div className="panel-top"><span className="eyebrow eyebrow-dark">{t.context}</span><span className="step-mark">SYNTHETIC</span></div>
        <h3 className="studio-patient">{patientName}</h3>
        <dl className="studio-context">{baseline && t.fields(baseline, profile, trial).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
        <div className="form-rule" />
        <span className="eyebrow eyebrow-dark">{t.control}</span>
        <label className="range-question studio-dose-label" htmlFor="dose">{t.dose} <strong>{dose}%</strong></label>
        <input id="dose" type="range" min="50" max="150" step="5" value={dose} onChange={(e) => setDose(Number(e.target.value))} />
        <div className="range-ends"><span>50%</span><span>{t.current}</span><span>150%</span></div>
        <p className="studio-hint">{t.hint(dose)}</p>
        <button className="primary-button studio-run" type="button" disabled={sim.busy} onClick={run}>{sim.busy ? 'Simulating…' : t.run} <span aria-hidden="true">↗</span></button>
        <p className="studio-hint">{stale ? t.stale : t.idle}</p>
        {sim.error && <p className="form-error" role="alert">{sim.error}</p>}
        {!patient && <>
          <div className="form-rule" />
          <span className="eyebrow eyebrow-dark">DATA COLLECTION</span>
          <p className="range-question studio-dose-label">Check-in schedule</p>
          <div className="pill-group cadence-pills" role="radiogroup" aria-label="Check-in schedule">{CADENCES.map((c) => <button type="button" role="radio" key={c.id} aria-checked={protocol.cadence === c.id} className={`choice-pill ${protocol.cadence === c.id ? 'chosen' : ''}`} onClick={() => setProtocol((p) => ({ ...p, cadence: c.id }))}>{c.label}</button>)}</div>
          <div className="checkin-plan">
            <span>CHECK-IN PLAN</span>
            <strong>{cadenceInfo.label}{cadenceInfo.note && <small> · {cadenceInfo.note}</small>}</strong>
            <p>{planned.length} expected observations over {protocol.durationDays / 7} weeks</p>
            <p>Observation density: <b>{observationDensity(planned.length, protocol.durationDays)}</b></p>
            <p>Completed on record: <b>{completed.length}</b></p>
            <small>Cadence changes when we observe the participant, not the simulated clinical trajectory.</small>
          </div>
        </>}
      </aside>

      <TwinStage twin={twin} original={original} modified={modified} week={week} mode={mode} onMode={setMode} ranDose={ranDose} audience={audience} />

      <aside className="studio-outcomes">
        <span className="eyebrow">{t.outcomes} · {cur ? cur.label.toUpperCase() : '—'}</span>
        <h2>{t.heading}</h2>
        {patient && cur && <p className="studio-summary">{simulated
          ? <>In this simulation, changing the treatment dose from <b>100%</b> to <b>{ranDose}%</b> changes the modeled trajectory at {cur.label} in the following ways:</>
          : <>Move the slider and run a what-if to compare a scenario with your current treatment.</>}</p>}
        <div className={`studio-metrics mode-${mode}`}>{cur && METRICS.map((m) => {
          const o = original[week][m.key]
          const d = modified[week][m.key]
          const change = signed(m, d - o)
          return <button type="button" key={m.key} className={`studio-metric ${m.key === metricKey ? 'selected' : ''}`} aria-pressed={m.key === metricKey} onClick={() => setMetricKey(m.key)}>
            <span>{m.label[audience]}<small className={`studio-delta ${change.dir}`}>{patient && change.dir !== 'flat' ? (change.dir === 'up' ? 'Higher in scenario' : 'Lower in scenario') : change.text}</small></span>
            <strong><span className="v-orig">{m.format(o)}</span> <b>→</b> <span className="v-mod">{m.format(d)}</span></strong>
            {patient && <small className="studio-metric-note">{m.note.patient}</small>}
          </button>
        })}</div>
      </aside>
    </div>

    <div className="page-width"><TrajectoryProgression original={original} modified={modified} mode={mode} week={week} onWeek={setSelectedWeek} metricKey={metricKey} onMetric={setMetricKey} audience={audience} cadence={protocol.cadence} durationDays={protocol.durationDays} completed={completed} /></div>
    <p className="studio-disclaimer page-width">✳ {patient ? PATIENT_DISCLAIMER : `${sim.result?.disclaimer || 'Simulated what-if for demo purposes. Not clinical guidance.'} Body highlights visualize the simulated model state only. Risk baseline is the existing mock trajectory; the dose effect is a transparent mock heuristic.`}</p>
  </div>
}
