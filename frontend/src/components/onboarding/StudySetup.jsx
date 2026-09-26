import { useState } from 'react'
import { CADENCES, scheduleDays } from '../checkinSchedule'
import { Chips, Field, StepHead, Toggle, Wizard } from './Wizard'
import { DEMO_STUDY, QUESTION_TYPES, TRACKABLE_FIELDS, VISIT_ACTIVITIES } from './demoStudy'

const STEPS = ['Study information', 'Eligibility', 'Screening questions', 'Participant check-ins', 'Study visits', 'Review study']
const uid = () => Math.random().toString(36).slice(2, 8)

// Researcher Demo: configure a study, then launch the existing researcher dashboard.
// The saved study drives patient screening, patient check-ins and the twin's check-in cadence.
export default function StudySetup({ initialStudy, onLaunch, onExit }) {
  const [step, setStep] = useState(0)
  // Pre-filled with the demo study (or the last saved setup) so a live demo is fast; everything stays editable.
  const [s, setS] = useState(initialStudy || DEMO_STUDY)
  const patch = (section, value) => setS((old) => ({ ...old, [section]: value }))
  const info = (key) => (e) => patch('info', { ...s.info, [key]: e?.target ? e.target.value : e })
  const updateList = (section, id, change) => patch(section, s[section].map((item) => (item.id === id ? { ...item, ...change } : item)))
  const removeFrom = (section, id) => patch(section, s[section].filter((item) => item.id !== id))
  const cadence = CADENCES.find((c) => c.id === s.checkins.cadence)
  const observations = scheduleDays({ cadence: s.checkins.cadence, durationDays: Number(s.info.durationWeeks || 4) * 7 }).length
  const tracked = TRACKABLE_FIELDS.filter((f) => s.checkins.fields.includes(f.id))
  const infoReady = s.info.name && s.info.condition

  return <Wizard kicker="RESEARCHER DEMO · STUDY SETUP" title={<>Set up your<br /><em>clinical study.</em></>} steps={STEPS} step={step} onStep={setStep}
    onExit={onExit} onSkip={() => onLaunch(DEMO_STUDY)} onContinue={() => (step === STEPS.length - 1 ? onLaunch(s) : setStep(step + 1))}
    continueLabel={step === STEPS.length - 1 ? 'Launch study demo' : undefined} canContinue={step !== 0 || !!infoReady}
    aside={<button type="button" className="wizard-fill" onClick={() => setS(DEMO_STUDY)}>✳ Use TwinLabs demo study</button>}>

    {step === 0 && <>
      <StepHead eyebrow="STEP 1 · STUDY INFORMATION" title="Tell us about" em="your study.">Pre-filled with the TwinLabs demo study. Edit anything, or reset it in one click.</StepHead>
      <button type="button" className="wizard-fill inline" onClick={() => setS(DEMO_STUDY)}>✳ Use TwinLabs demo study</button>
      <div className="wz-grid">
        <Field label="Study name" wide><input className="plain-input" value={s.info.name} onChange={info('name')} placeholder="e.g. Phase II Breast Cancer Treatment Study" /></Field>
        <Field label="Study identifier"><input className="plain-input" value={s.info.identifier} onChange={info('identifier')} placeholder="e.g. TL-BC-201" /></Field>
        <Field label="Phase"><Chips options={['Phase I', 'Phase II', 'Phase III', 'Observational']} value={s.info.phase} onChange={info('phase')} /></Field>
        <Field label="Condition / indication" wide><input className="plain-input" value={s.info.condition} onChange={(e) => patch('info', { ...s.info, condition: e.target.value, conditionKeywords: e.target.value.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4).slice(0, 2) })} /></Field>
        <Field label="Intervention / treatment" wide><input className="plain-input" value={s.info.intervention} onChange={info('intervention')} /></Field>
        <Field label="Short description" wide><textarea rows="2" value={s.info.description} onChange={info('description')} /></Field>
        <Field label="Target enrollment"><input className="plain-input" type="number" value={s.info.targetEnrollment} onChange={info('targetEnrollment')} /></Field>
        <Field label="Duration (weeks)"><input className="plain-input" type="number" min="1" max="52" value={s.info.durationWeeks} onChange={info('durationWeeks')} /></Field>
        <Field label="Study locations" wide><input className="plain-input" value={s.info.locations} onChange={info('locations')} /></Field>
        <Field label="Visit format" wide><Chips options={[['remote', 'Remote'], ['hybrid', 'Hybrid'], ['in-person', 'In person']]} value={s.info.mode} onChange={info('mode')} /></Field>
      </div>
    </>}

    {step === 1 && <>
      <StepHead eyebrow="STEP 2 · ELIGIBILITY" title="Who can" em="take part?">A prototype configuration: criteria are shown to participants as a transparent pre-screen, not evaluated by an eligibility engine.</StepHead>
      <div className="criteria-list">{s.eligibility.map((c) => <div key={c.id} className="criterion">
        <input className="plain-input crit-label" value={c.label} onChange={(e) => updateList('eligibility', c.id, { label: e.target.value })} aria-label="Criterion" />
        {c.kind === 'age'
          ? <div className="crit-age"><input className="plain-input" type="number" value={c.min} onChange={(e) => updateList('eligibility', c.id, { min: Number(e.target.value), value: `${e.target.value} – ${c.max} years` })} aria-label="Minimum age" /><span>to</span><input className="plain-input" type="number" value={c.max} onChange={(e) => updateList('eligibility', c.id, { max: Number(e.target.value), value: `${c.min} – ${e.target.value} years` })} aria-label="Maximum age" /><span>years</span></div>
          : <input className="plain-input" value={c.value} onChange={(e) => updateList('eligibility', c.id, { value: e.target.value })} aria-label={`${c.label} requirement`} />}
        <button type="button" className="crit-remove" onClick={() => removeFrom('eligibility', c.id)} aria-label={`Remove ${c.label}`}>✕</button>
      </div>)}</div>
      <button type="button" className="wz-add" onClick={() => patch('eligibility', [...s.eligibility, { id: uid(), label: 'New criterion', value: '', kind: 'custom' }])}>+ Add eligibility criterion</button>
    </>}

    {step === 2 && <>
      <StepHead eyebrow="STEP 3 · SCREENING QUESTIONS" title="Additional" em="screening questions.">TwinLabs collects a standard participant health profile. Add questions specific to your study.</StepHead>
      <div className="question-list">{s.screening.map((q, i) => <div key={q.id} className="question-row">
        <b>{String(i + 1).padStart(2, '0')}</b>
        <input className="plain-input" value={q.text} onChange={(e) => updateList('screening', q.id, { text: e.target.value })} aria-label="Question text" />
        <select value={q.type} onChange={(e) => updateList('screening', q.id, { type: e.target.value, options: e.target.value === 'choice' ? (q.options || ['Option A', 'Option B']) : q.options })} aria-label="Question type">{QUESTION_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        <Toggle checked={q.required} onChange={(v) => updateList('screening', q.id, { required: v })} label={q.required ? 'Required' : 'Optional'} />
        <button type="button" className="crit-remove" onClick={() => removeFrom('screening', q.id)} aria-label="Remove question">✕</button>
        {q.type === 'choice' && <input className="plain-input choice-options" value={(q.options || []).join(', ')} onChange={(e) => updateList('screening', q.id, { options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean) })} aria-label="Options, comma separated" placeholder="Options, comma separated" />}
      </div>)}</div>
      <button type="button" className="wz-add" onClick={() => patch('screening', [...s.screening, { id: uid(), text: 'New question', type: 'yesno', required: false }])}>+ Add question</button>
      <p className="wizard-hint">Participants see these after TwinLabs suggests this study, as study-specific screening.</p>
    </>}

    {step === 3 && <>
      <StepHead eyebrow="STEP 4 · PARTICIPANT CHECK-INS" title="What should participants" em="report?">This shapes the participant check-in form and the digital twin’s observation timeline.</StepHead>
      <div className="wz-chips track-chips">{TRACKABLE_FIELDS.map((f) => { const on = s.checkins.fields.includes(f.id); return <button type="button" key={f.id} aria-pressed={on} className={`choice-pill ${on ? 'chosen' : ''}`} onClick={() => patch('checkins', { ...s.checkins, fields: on ? s.checkins.fields.filter((x) => x !== f.id) : [...s.checkins.fields, f.id] })}>{on ? '✓' : '+'} {f.label}</button> })}</div>
      <div className="question-list compact">{s.checkins.custom.map((q) => <div key={q.id} className="question-row">
        <b>+</b><input className="plain-input" value={q.text} onChange={(e) => patch('checkins', { ...s.checkins, custom: s.checkins.custom.map((c) => (c.id === q.id ? { ...c, text: e.target.value } : c)) })} aria-label="Custom check-in question" />
        <select value={q.type} onChange={(e) => patch('checkins', { ...s.checkins, custom: s.checkins.custom.map((c) => (c.id === q.id ? { ...c, type: e.target.value } : c)) })} aria-label="Question type">{QUESTION_TYPES.filter((t) => t.id !== 'choice').map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
        <button type="button" className="crit-remove" onClick={() => patch('checkins', { ...s.checkins, custom: s.checkins.custom.filter((c) => c.id !== q.id) })} aria-label="Remove question">✕</button>
      </div>)}</div>
      <button type="button" className="wz-add" onClick={() => patch('checkins', { ...s.checkins, custom: [...s.checkins.custom, { id: uid(), text: 'Did you take your medication as planned this week?', type: 'yesno', required: false }] })}>+ Add custom question</button>
      <Field label="Check-in frequency" wide hint={`${observations} expected observations over ${s.info.durationWeeks || 4} weeks · feeds the digital twin’s check-in timeline`}><Chips options={CADENCES.map((c) => [c.id, c.label])} value={s.checkins.cadence} onChange={(v) => patch('checkins', { ...s.checkins, cadence: v })} /></Field>
    </>}

    {step === 4 && <>
      <StepHead eyebrow="STEP 5 · STUDY VISITS" title="A simple" em="visit schedule." />
      <div className="visit-grid" role="table" aria-label="Visit schedule">
        <div className="visit-row head" role="row"><span role="columnheader">Visit</span>{VISIT_ACTIVITIES.map((a) => <span key={a.id} role="columnheader">{a.label}</span>)}</div>
        {s.visits.map((v) => <div key={v.id} className="visit-row" role="row"><strong role="cell">{v.label}</strong>{VISIT_ACTIVITIES.map((a) => { const on = v.activities.includes(a.id); return <button type="button" role="cell" key={a.id} aria-pressed={on} aria-label={`${v.label}: ${a.label}`} className={`visit-cell ${on ? 'on' : ''}`} onClick={() => updateList('visits', v.id, { activities: on ? v.activities.filter((x) => x !== a.id) : [...v.activities, a.id] })}>{on ? '✓' : ''}</button> })}</div>)}
      </div>
      <button type="button" className="wz-add" onClick={() => patch('visits', [...s.visits, { id: uid(), label: `Week ${s.visits.length}`, activities: ['questionnaire'] }])}>+ Add visit</button>
    </>}

    {step === 5 && <>
      <StepHead eyebrow="REVIEW STUDY" title="Ready to" em="launch.">Participants will see this study’s screening questions and check-ins, and the digital twin will follow its check-in schedule.</StepHead>
      <div className="review-grid">
        <div><span>STUDY</span><strong>{s.info.name || '—'}</strong><small>{s.info.phase} · {s.info.identifier}</small></div>
        <div><span>PARTICIPANTS</span><strong>Target: {s.info.targetEnrollment || '—'}</strong><small>{s.info.locations}</small></div>
        <div><span>DURATION</span><strong>{s.info.durationWeeks} weeks</strong><small>{s.info.mode} visits</small></div>
        <div><span>CHECK-INS</span><strong>{cadence?.label}</strong><small>{observations} expected observations</small></div>
        <div><span>TRACKING</span><strong>{tracked.map((f) => f.label).join(', ') || '—'}</strong><small>{s.checkins.custom.length} custom question{s.checkins.custom.length === 1 ? '' : 's'}</small></div>
        <div><span>SCREENING</span><strong>{s.screening.length} study-specific questions</strong><small>{s.eligibility.length} eligibility criteria</small></div>
        <div className="wide"><span>VISITS</span><strong>{s.visits.map((v) => v.label).join(' · ')}</strong><small>{s.visits.filter((v) => v.activities.includes('labs')).length} with lab collection</small></div>
      </div>
    </>}
  </Wizard>
}
