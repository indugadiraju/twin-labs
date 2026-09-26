import { useState } from 'react'
import { api } from '../api'
import TwinFlow from './TwinFlow'

const MOODS = ['Calm', 'Okay', 'Anxious', 'Low']
const EXTRA_SYMPTOMS = ['Fever', 'Shortness of breath']
const metricLabels = { fatigue: 'Fatigue', sleep_quality: 'Sleep quality', nausea: 'Nausea', pain: 'Pain', anxiety: 'Anxiety', mood: 'Mood', overall_wellbeing: 'Wellbeing', status: 'Status' }
const statusLabels = { stable: 'Stable', watch: 'Watch', needs_attention: 'Needs attention' }
const display = (key, value) => value == null ? '—' : key === 'status' ? statusLabels[value] : typeof value === 'number' ? `${value}/10` : value

// `config` (optional) comes from the researcher's study setup: which fields to
// collect and any custom study questions. Without it the form is unchanged.
export default function CheckInForm({ patientId, currentWeek, existingCheckin, onSubmitted, update, onAdvance, advancing, config }) {
  const tracks = (field) => !config || config.fields.includes(field)
  const [custom, setCustom] = useState({})
  const [wellbeing, setWellbeing] = useState(7)
  const [sleep, setSleep] = useState(7)
  const [mood, setMood] = useState('Calm')
  const [scores, setScores] = useState({ fatigue: 0, nausea: 0, pain: 0, anxiety: 0 })
  const [extras, setExtras] = useState({})
  const [newSymptom, setNewSymptom] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setStatus('saving')
    setError('')
    try {
      const symptom = tracks('new_symptoms') ? newSymptom.trim() : ''
      // Anxiety is part of mood reporting; untracked fields are not sent at all.
      const trackedScores = Object.fromEntries(Object.entries(scores).filter(([name]) => tracks(name === 'anxiety' ? 'mood' : name)))
      const result = await api.submitCheckin(patientId, {
        week: currentWeek,
        overall_wellbeing: wellbeing,
        ...(tracks('sleep_quality') && { sleep_quality: sleep }),
        ...(tracks('mood') && { mood }),
        ...trackedScores,
        new_symptoms: symptom ? [symptom] : [],
        symptoms: [
          ...Object.entries(trackedScores).filter(([, severity]) => severity > 0).map(([name, severity]) => ({ name, severity })),
          ...Object.entries(extras).map(([name, severity]) => ({ name, severity })),
          ...(symptom ? [{ name: symptom, severity: 3 }] : []),
        ],
        free_text: [notes.trim(), ...(config?.custom || []).filter((q) => custom[q.id]).map((q) => `${q.text} ${custom[q.id]}`)].filter(Boolean).join('\n') || null,
      })
      onSubmitted?.(result.twin, result.checkin)
      setStatus('saved')
    } catch (err) { setStatus('error'); setError(err.message) }
  }
  const range = (label, value, setter, id) => <div className="score-field" key={id}><label className="range-question" htmlFor={id}>{label} <strong>{value} / 10</strong></label><input id={id} type="range" min="0" max="10" value={value} onChange={(e) => setter(Number(e.target.value))} /><div className="range-ends"><span>None / poor</span><span>High / good</span></div></div>
  const changes = update && ['fatigue', 'sleep_quality', 'nausea', 'pain', 'anxiety', 'mood', 'overall_wellbeing', 'status'].filter((key) => update.previous?.[key] !== update.current?.[key])

  return <div className="checkin-panel"><div className="panel-top"><span className="eyebrow eyebrow-dark">WEEKLY CHECK-IN</span><span className="step-mark">WEEK {String(currentWeek).padStart(2, '0')} / 04</span></div>
    {status === 'saved' && update ? <div className="success-state" role="status"><TwinFlow compact active /><div className="success-content"><div className="success-icon">✳</div><h3>Your twin has<br /><em>been updated.</em></h3><p>Your report is now reflected in your twin and Week {update.checkin.week} journey.</p><div className="success-changes">{changes?.length ? changes.map((key) => <div key={key}><span>{metricLabels[key]}</span><strong>{display(key, update.previous?.[key])} → {display(key, update.current?.[key])}</strong></div>) : <div><span>State</span><strong>Report recorded</strong></div>}</div><div className="success-actions">{currentWeek < 4 && <button className="primary-button" onClick={onAdvance} disabled={advancing}>{advancing ? 'Moving forward…' : `Continue to Week ${currentWeek + 1}`} <span>↗</span></button>}<button className="secondary-button" onClick={() => setStatus(null)}>Edit this check-in</button></div></div></div> : <form onSubmit={submit}>{existingCheckin && currentWeek < 4 && <div className="existing-checkin"><span>Week {currentWeek} report recorded</span><button type="button" onClick={onAdvance} disabled={advancing}>{advancing ? "Moving forward…" : `Continue to Week ${currentWeek + 1} ↗`}</button></div>}<h3>How are you<br /><em>feeling today?</em></h3><p className="form-intro">Take a moment. Your answers help shape your journey.</p>{range('Overall, how have you felt this week?', wellbeing, setWellbeing, 'wellbeing')}
      <div className="form-rule" /><p className="form-question">What have you noticed?</p>{Object.entries(scores).filter(([name]) => tracks(name === 'anxiety' ? 'mood' : name)).map(([name, value]) => range(name[0].toUpperCase() + name.slice(1), value, (next) => setScores((old) => ({ ...old, [name]: next })), name))}
      {tracks('new_symptoms') && <><p className="form-question">Any other symptoms?</p><div className="pill-group">{EXTRA_SYMPTOMS.map((name) => <button key={name} type="button" aria-pressed={name in extras} className={`choice-pill ${name in extras ? 'chosen' : ''}`} onClick={() => setExtras((old) => { const next = { ...old }; if (name in next) delete next[name]; else next[name] = 3; return next })}>{name in extras ? '✓ ' : '+ '}{name}</button>)}</div>{Object.entries(extras).map(([name, value]) => range(name, value, (next) => setExtras((old) => ({ ...old, [name]: next })), `extra-${name}`))}<label className="field-label" htmlFor="new-symptom">A new symptom?</label><input id="new-symptom" className="plain-input" value={newSymptom} onChange={(e) => setNewSymptom(e.target.value)} placeholder="Add a symptom, if needed" /></>}
      <div className="form-rule" />{tracks('sleep_quality') && range('How has your sleep been?', sleep, setSleep, 'sleep')}{tracks('mood') && <><p className="form-question mood-question">What best describes your mood?</p><div className="pill-group">{MOODS.map((item) => <button key={item} type="button" aria-pressed={mood === item} className={`choice-pill ${mood === item ? 'chosen' : ''}`} onClick={() => setMood(item)}>{item}</button>)}</div></>}
      {config?.custom?.length > 0 && <><p className="form-question">From your study team</p>{config.custom.map((q) => <div className="score-field" key={q.id}><label className="field-label" htmlFor={`cq-${q.id}`}>{q.text}</label>{q.type === 'yesno' ? <div className="pill-group">{['Yes', 'No'].map((a) => <button key={a} type="button" aria-pressed={custom[q.id] === a} className={`choice-pill ${custom[q.id] === a ? 'chosen' : ''}`} onClick={() => setCustom((c) => ({ ...c, [q.id]: a }))}>{a}</button>)}</div> : <input id={`cq-${q.id}`} className="plain-input" type={q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'} value={custom[q.id] || ''} onChange={(e) => setCustom((c) => ({ ...c, [q.id]: e.target.value }))} />}</div>)}</>}
      {tracks('free_text') && <><label className="field-label" htmlFor="notes">Anything else you want your study team to know?</label><textarea id="notes" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Share what's on your mind..." /></>}<div className="form-actions"><span>Simulated demo check-in</span><button className="primary-button" type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'Updating your twin…' : 'Update my twin'} <span aria-hidden="true">↗</span></button></div>{status === 'error' && <p className="form-error" role="alert">{error}</p>}</form>}
  </div>
}
