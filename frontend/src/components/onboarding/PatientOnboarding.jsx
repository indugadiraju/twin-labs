import { useState } from 'react'
import { CardChoice, Chips, Field, QuestionField, StepHead, Toggle, Wizard } from './Wizard'
import { DEMO_PATIENT_PROFILE, MATCH_LABELS, matchTrial, trialsFor } from './demoStudy'

const STEPS = ['About you', 'Health profile', 'Treatment history', 'Trial preferences', 'Potential matches', 'Study screening', 'Confirm']
const CONDITIONS = ['Breast cancer (HR+/HER2−)', 'Lung cancer', 'Rheumatoid arthritis', 'Type 2 diabetes', 'Other']
const HISTORY = ['Heart disease', 'High blood pressure', 'Diabetes', 'Previous cancer', 'None of these']
const TREATMENTS = ['Surgery', 'Chemotherapy', 'Radiation', 'Hormone therapy', 'Immunotherapy', 'None yet']

// Patient Demo: build a reusable health profile → preferences → transparent trial
// pre-screen → study-defined screening → enter the existing patient experience.
export default function PatientOnboarding({ study, initialProfile, onComplete, onExit }) {
  const [step, setStep] = useState(0)
  const [p, setP] = useState(initialProfile || DEMO_PATIENT_PROFILE)
  const [trialId, setTrialId] = useState(null)
  const [openWhy, setOpenWhy] = useState(null)
  const [answers, setAnswers] = useState({})
  const set = (key) => (value) => setP((old) => ({ ...old, [key]: value }))
  const trials = trialsFor(study)
  const matches = trials.map((t) => ({ trial: t, ...matchTrial(p, t) }))
  const trial = trials.find((t) => t.id === trialId)
  const missingRequired = trial ? trial.screening.filter((q) => q.required && !answers[q.id]).length : 0
  const demoTrial = trials.find((t) => t.isDemo)
  const finish = (chosen = trial) => onComplete({ profile: p, trial: chosen?.isDemo ? chosen : demoTrial, appliedTo: chosen, screening: answers })

  const next = () => (step === STEPS.length - 1 ? finish() : setStep(step + 1))
  const labels = { 4: 'Continue with this study', 5: 'Send to research team', 6: 'Enter my study' }

  return <Wizard kicker="PATIENT DEMO · GETTING STARTED" title={<>Build your<br /><em>health profile.</em></>} steps={STEPS} step={step} onStep={setStep}
    onExit={onExit} onSkip={() => onComplete({ profile: DEMO_PATIENT_PROFILE, trial: demoTrial, appliedTo: demoTrial, screening: {}, skipped: true })}
    onContinue={next} continueLabel={labels[step]} canContinue={step === 4 ? !!trial : step === 5 ? missingRequired === 0 : true}
    aside={<p className="wizard-note">Your TwinLabs profile is reusable across studies. Pre-filled with demo data so you can move quickly.</p>}>

    {step === 0 && <>
      <StepHead eyebrow="STEP 1 · ABOUT YOU" title="A little" em="about you.">Basic details every study asks for.</StepHead>
      <div className="wz-grid">
        <Field label="Year of birth"><input className="plain-input" type="number" value={p.birthYear} onChange={(e) => set('birthYear')(e.target.value)} /></Field>
        <Field label="Sex"><Chips options={['Female', 'Male', 'Intersex', ['na', 'Prefer not to say']]} value={p.sex} onChange={set('sex')} /></Field>
        <Field label="Height (cm)"><input className="plain-input" type="number" value={p.heightCm} onChange={(e) => set('heightCm')(e.target.value)} /></Field>
        <Field label="Weight (kg)"><input className="plain-input" type="number" value={p.weightKg} onChange={(e) => set('weightKg')(e.target.value)} /></Field>
        <Field label="Approximate location" wide hint="City or ZIP code is enough."><input className="plain-input" value={p.location} onChange={(e) => set('location')(e.target.value)} /></Field>
      </div>
    </>}

    {step === 1 && <>
      <StepHead eyebrow="STEP 2 · HEALTH PROFILE" title="Your" em="health, in brief.">This helps TwinLabs suggest studies and set up your digital twin.</StepHead>
      <div className="wz-grid">
        <Field label="Diagnosed condition(s)" wide><Chips multi options={CONDITIONS} value={p.conditions} onChange={set('conditions')} /></Field>
        <Field label="Diagnosis date"><input className="plain-input" type="date" value={p.diagnosisDate} onChange={(e) => set('diagnosisDate')(e.target.value)} /></Field>
        <Field label="Stage / severity (if known)"><Chips options={['Stage I', 'Stage II', 'Stage III', 'Stage IV', ['unknown', 'Not sure']]} value={p.stage} onChange={set('stage')} /></Field>
        <Field label="Major medical history" wide><Chips multi options={HISTORY} value={p.history} onChange={set('history')} /></Field>
        <Field label="Allergies"><input className="plain-input" value={p.allergies} onChange={(e) => set('allergies')(e.target.value)} /></Field>
        <Field label="Kidney or liver issues"><Chips options={[['none', 'None'], ['kidney', 'Kidney'], ['liver', 'Liver'], ['unsure', 'Not sure']]} value={p.organIssues} onChange={set('organIssues')} /></Field>
        <Field label="Day-to-day activity" wide><CardChoice value={p.activity} onChange={set('activity')} options={[['Fully active', 'Fully active', 'No restrictions'], ['Light activity', 'Light activity', 'Some strenuous limits'], ['Limited', 'Limited', 'Resting part of the day']]} /></Field>
      </div>
    </>}

    {step === 2 && <>
      <StepHead eyebrow="STEP 3 · TREATMENT HISTORY" title="Treatments," em="past and present." />
      <div className="wz-grid">
        <Field label="Current medications" wide hint="Separate with commas."><input className="plain-input" value={p.medications} onChange={(e) => set('medications')(e.target.value)} /></Field>
        <Field label="Current treatments" wide><Chips multi options={TREATMENTS} value={p.currentTreatments} onChange={set('currentTreatments')} /></Field>
        <Field label="Previous treatments" wide><Chips multi options={TREATMENTS} value={p.previousTreatments} onChange={set('previousTreatments')} /></Field>
        <Field label="Taken part in a clinical trial before?"><Chips options={[['yes', 'Yes'], ['no', 'No']]} value={p.priorTrial} onChange={set('priorTrial')} /></Field>
      </div>
    </>}

    {step === 3 && <>
      <StepHead eyebrow="STEP 4 · TRIAL PREFERENCES" title="What would" em="work for you?">We use this to find studies that fit your life.</StepHead>
      <div className="wz-grid">
        <Field label={`Travel radius · ${p.travelMiles} miles`} wide><input type="range" min="5" max="200" step="5" value={p.travelMiles} onChange={(e) => set('travelMiles')(Number(e.target.value))} /></Field>
        <Field label="Visit format" wide><CardChoice value={p.visitMode} onChange={set('visitMode')} options={[['remote', 'Remote', 'From home'], ['hybrid', 'Hybrid', 'Mix of both'], ['in-person', 'In person', 'At a study site']]} /></Field>
        <Field label="Preferred visit frequency"><Chips options={[['weekly', 'Weekly'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Monthly']]} value={p.visitFrequency} onChange={set('visitFrequency')} /></Field>
        <Field label="Time commitment"><Chips options={['< 1 hour / week', '1–2 hours / week', '3+ hours / week']} value={p.timeCommitment} onChange={set('timeCommitment')} /></Field>
        <Field label="Compensation (optional)" wide><Toggle checked={p.compensation === 'preferred'} onChange={(on) => set('compensation')(on ? 'preferred' : 'no preference')} label="I'd prefer studies that offer compensation" /></Field>
      </div>
    </>}

    {step === 4 && <>
      <StepHead eyebrow="POTENTIAL TRIAL MATCHES" title="Studies that" em="may fit you.">A transparent pre-screen based on your profile. Final eligibility is determined by the clinical study team.</StepHead>
      <div className="match-list">{matches.map(({ trial: t, level, factors }) => <article key={t.id} className={`match-card ${trialId === t.id ? 'selected' : ''}`}>
        <div className="match-top"><span className={`match-badge ${level}`}>{MATCH_LABELS[level]}</span><small>{t.phase} · {t.id}{t.isDemo && ' · live demo'}</small></div>
        <h3>{t.name}</h3><p>{t.summary}</p>
        <div className="match-actions">
          <button type="button" className="text-button" onClick={() => setOpenWhy(openWhy === t.id ? null : t.id)} aria-expanded={openWhy === t.id}>{openWhy === t.id ? 'Hide reasons' : 'Why this match?'}</button>
          <button type="button" className={trialId === t.id ? 'primary-button' : 'match-select'} onClick={() => { setTrialId(t.id); setAnswers({}) }}>{trialId === t.id ? 'Selected ✓' : 'Select study'}</button>
        </div>
        {openWhy === t.id && <ul className="match-why">{factors.map((f) => <li key={f.text} className={f.ok === true ? 'ok' : f.ok === false ? 'no' : 'unknown'}><b>{f.ok === true ? '✓' : f.ok === false ? '✕' : '?'}</b>{f.text}</li>)}</ul>}
      </article>)}</div>
      <p className="wizard-disclaimer">Final eligibility is determined by the clinical study team. Matches are a demo pre-screen, not a medical decision.</p>
    </>}

    {step === 5 && trial && <>
      <StepHead eyebrow={`STUDY SCREENING · ${trial.id}`} title="A few questions" em="from this study.">These questions are set by the {trial.name} team, separate from your reusable TwinLabs profile.</StepHead>
      <div className="flow-chain"><span className="done">TwinLabs profile ✓</span><i>→</i><span className="done">{trial.name}</span><i>→</i><span className="now">Study-specific screening</span><i>→</i><span>Research team review</span></div>
      <div className="wz-grid">{trial.screening.map((q) => <QuestionField key={q.id} q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} />)}</div>
      {missingRequired > 0 && <p className="wizard-hint">{missingRequired} required question{missingRequired > 1 ? 's' : ''} left.</p>}
    </>}

    {step === 6 && trial && <>
      <StepHead eyebrow="CONFIRM" title="Sent for" em="team review.">In this demo the study team “accepts” you right away so you can explore the participant experience.</StepHead>
      <div className="review-grid">
        <div><span>STUDY</span><strong>{trial.name}</strong><small>{trial.phase} · {trial.id}</small></div>
        <div><span>PROFILE</span><strong>{p.conditions.join(', ') || '—'}</strong><small>{p.sex} · born {p.birthYear} · {p.location}</small></div>
        <div><span>SCREENING</span><strong>{Object.keys(answers).length} / {trial.screening.length} answered</strong><small>Reviewed by the study team</small></div>
        <div><span>DIGITAL TWIN</span><strong>Initialized from your profile</strong><small>Age, conditions, activity and treatments</small></div>
      </div>
      {!trial.isDemo && <p className="wizard-hint">Only the {demoTrial.name} has a live digital twin in this prototype, so we’ll open that study’s participant experience.</p>}
      <p className="wizard-disclaimer">Final eligibility is determined by the clinical study team.</p>
    </>}
  </Wizard>
}
