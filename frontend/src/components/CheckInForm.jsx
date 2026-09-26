import { useState } from 'react'
import { api } from '../api'

const SYMPTOMS = ['Fatigue', 'Nausea', 'Pain', 'Anxiety', 'Fever', 'Shortness of breath']
const MOODS = ['Calm', 'Okay', 'Anxious', 'Low']

export default function CheckInForm({ patientId, currentWeek, onSubmitted, update }) {
  const week = currentWeek || 1
  const [wellbeing, setWellbeing] = useState(7)
  const [symptoms, setSymptoms] = useState({})
  const [mood, setMood] = useState('')
  const [sleep, setSleep] = useState(7)
  const [notes, setNotes] = useState('')
  const [newSymptom, setNewSymptom] = useState('')
  const [status, setStatus] = useState(null)
  const [error, setError] = useState('')

  const toggle = (name) => setSymptoms((old) => {
    const next = { ...old }
    if (name in next) delete next[name]
    else next[name] = 3
    return next
  })
  const submit = async (event) => {
    event.preventDefault()
    setStatus('saving')
    setError('')
    try {
      const reported = { ...symptoms }
      if (newSymptom.trim()) reported[newSymptom.trim()] = reported[newSymptom.trim()] ?? 3
      if (mood === 'Anxious') reported.Anxiety = reported.Anxiety ?? 3
      const context = [`Mood: ${mood || 'not selected'}`, `Sleep quality: ${sleep}/10`, notes.trim()].filter(Boolean).join('\n')
      const result = await api.submitCheckin(patientId, { week: Number(week), overall_wellbeing: Number(wellbeing), symptoms: Object.entries(reported).map(([name, severity]) => ({ name, severity })), free_text: context })
      setStatus('saved')
      onSubmitted?.(result.twin, result.checkin)
    } catch (err) { setStatus('error'); setError(err.message) }
  }
  return <div className="checkin-panel"><div className="panel-top"><span className="eyebrow eyebrow-dark">WEEKLY CHECK-IN</span><span className="step-mark">WEEK {String(week).padStart(2, '0')} / 04</span></div>{status === 'saved' && update ? <div className="success-state" role="status"><div className="success-icon">✳</div><h3>Your twin has<br /><em>been updated.</em></h3><p>Your latest report now appears in your journey and current twin state.</p><div className="success-changes"><div><span>Wellbeing</span><strong>{update.previous?.overall_wellbeing ?? '—'} → {update.current?.overall_wellbeing ?? '—'}</strong></div>{update.checkin?.symptoms?.slice(0, 3).map((item) => <div key={item.name}><span>{item.name}</span><strong>{item.severity}/10</strong></div>)}</div><button className="secondary-button" onClick={() => setStatus(null)}>Edit this check-in</button></div> : <form onSubmit={submit}><h3>How are you<br /><em>feeling today?</em></h3><p className="form-intro">Take a moment. Your answers help shape your journey.</p><label className="range-question" htmlFor="wellbeing">Overall, how have you felt this week? <strong>{wellbeing} / 10</strong></label><input id="wellbeing" type="range" min="0" max="10" value={wellbeing} onChange={(e) => setWellbeing(Number(e.target.value))} /><div className="range-ends"><span>Not well</span><span>Feeling good</span></div><div className="form-rule" /><p className="form-question">What have you noticed?</p><div className="pill-group">{SYMPTOMS.map((name) => <button key={name} type="button" aria-pressed={name in symptoms} className={`choice-pill ${name in symptoms ? 'chosen' : ''}`} onClick={() => toggle(name)}>{name in symptoms ? '✓ ' : '+ '}{name}</button>)}</div>{Object.entries(symptoms).map(([name, value]) => <label className="symptom-slider" key={name}>{name} <strong>{value}/10</strong><input type="range" min="0" max="10" value={value} onChange={(e) => setSymptoms((old) => ({ ...old, [name]: Number(e.target.value) }))} /></label>)}<label className="field-label" htmlFor="new-symptom">Another symptom?</label><input id="new-symptom" className="plain-input" value={newSymptom} onChange={(e) => setNewSymptom(e.target.value)} placeholder="Add a symptom, if needed" /><div className="form-rule" /><label className="range-question" htmlFor="sleep">How has your sleep been? <strong>{sleep} / 10</strong></label><input id="sleep" type="range" min="0" max="10" value={sleep} onChange={(e) => setSleep(Number(e.target.value))} /><div className="range-ends"><span>Poor</span><span>Restful</span></div><p className="form-question mood-question">What best describes your mood?</p><div className="pill-group">{MOODS.map((item) => <button key={item} type="button" aria-pressed={mood === item} className={`choice-pill ${mood === item ? 'chosen' : ''}`} onClick={() => setMood(item)}>{item}</button>)}</div><label className="field-label" htmlFor="notes">Anything else you want your study team to know?</label><textarea id="notes" rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Share what's on your mind..." /><div className="form-actions"><span>Simulated demo check-in</span><button className="primary-button" type="submit" disabled={status === 'saving'}>{status === 'saving' ? 'Updating your twin…' : 'Update my twin'} <span aria-hidden="true">↗</span></button></div>{status === 'error' && <p className="form-error" role="alert">{error}</p>}</form>}</div>
}
