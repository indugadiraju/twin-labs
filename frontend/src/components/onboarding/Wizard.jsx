import './onboarding.css'

// Shared shell for the patient onboarding and researcher study setup:
// step rail + progress bar + animated step body + Back / Continue / Skip to Demo.
export function Wizard({ kicker, title, steps, step, onStep, onSkip, onExit, children, continueLabel, onContinue, canContinue = true, aside }) {
  const pct = Math.round(((step + 1) / steps.length) * 100)
  return <div className="wizard">
    <aside className="wizard-rail">
      <button type="button" className="wizard-brand" onClick={onExit}><span>✳</span> TwinLabs<i>.</i></button>
      <p className="wizard-kicker">{kicker}</p>
      <h1>{title}</h1>
      <ol className="wizard-steps">{steps.map((s, i) => <li key={s} className={i === step ? 'current' : i < step ? 'done' : ''}>
        <button type="button" onClick={() => i < step && onStep(i)} disabled={i > step}><b>{i < step ? '✓' : String(i + 1).padStart(2, '0')}</b>{s}</button>
      </li>)}</ol>
      {aside}
      <button type="button" className="wizard-skip" onClick={onSkip}>Skip to demo ↗</button>
    </aside>
    <main className="wizard-main">
      <div className="wizard-progress" aria-label={`Step ${step + 1} of ${steps.length}`}><span style={{ width: `${pct}%` }} /></div>
      <div className="wizard-topline"><span>STEP {step + 1} OF {steps.length}</span><span>{steps[step]}</span></div>
      <section className="wizard-body" key={step}>{children}</section>
      <div className="wizard-actions">
        <button type="button" className="wizard-back" onClick={() => (step ? onStep(step - 1) : onExit())}>← {step ? 'Back' : 'Portal'}</button>
        <button type="button" className="primary-button" onClick={onContinue} disabled={!canContinue}>{continueLabel || 'Continue'} <span aria-hidden="true">↗</span></button>
      </div>
    </main>
  </div>
}

export function StepHead({ eyebrow, title, em, children }) {
  return <header className="step-head"><p className="eyebrow eyebrow-dark">{eyebrow}</p><h2>{title} {em && <em>{em}</em>}</h2>{children && <p>{children}</p>}</header>
}

export function Field({ label, hint, children, wide }) {
  // A div, not a <label>: a label wrapping chip buttons would "click" the first chip.
  return <div className={`wz-field ${wide ? 'wide' : ''}`} role="group"><span>{label}</span>{children}{hint && <small>{hint}</small>}</div>
}

export function Chips({ options, value, onChange, multi }) {
  const selected = (o) => (multi ? value.includes(o) : value === o)
  const toggle = (o) => (multi ? onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]) : onChange(o))
  return <div className="wz-chips">{options.map((o) => { const [id, label] = Array.isArray(o) ? o : [o, o]; return <button type="button" key={id} aria-pressed={selected(id)} className={`choice-pill ${selected(id) ? 'chosen' : ''}`} onClick={() => toggle(id)}>{multi && (selected(id) ? '✓ ' : '+ ')}{label}</button> })}</div>
}

export function CardChoice({ options, value, onChange }) {
  return <div className="wz-cards">{options.map(([id, title, sub]) => <button type="button" key={id} aria-pressed={value === id} className={value === id ? 'selected' : ''} onClick={() => onChange(id)}><strong>{title}</strong><small>{sub}</small></button>)}</div>
}

export function Toggle({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} className={`wz-toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}><i />{label}</button>
}

// Renders one study-defined question (disease-independent: type drives the control).
export function QuestionField({ q, value, onChange }) {
  const label = <>{q.text}{q.required ? <b className="req"> *</b> : <small className="opt"> optional</small>}</>
  if (q.type === 'yesno') return <Field label={label}><Chips options={['Yes', 'No', ['unsure', 'Not sure']]} value={value} onChange={onChange} /></Field>
  if (q.type === 'choice') return <Field label={label}><Chips options={q.options || []} value={value} onChange={onChange} /></Field>
  if (q.type === 'number') return <Field label={label}><input className="plain-input" type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Field>
  if (q.type === 'date') return <Field label={label}><input className="plain-input" type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Field>
  return <Field label={label}><input className="plain-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></Field>
}
