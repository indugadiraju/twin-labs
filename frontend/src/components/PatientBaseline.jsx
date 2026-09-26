export default function PatientBaseline({ baseline }) {
  if (!baseline) return null
  const cells = [
    ['Age', baseline.age],
    ['Condition', baseline.condition],
    ['Treatment', baseline.treatment],
    ['Dose', baseline.dose],
    ['Kidney function', `${baseline.kidney_function?.egfr_ml_min_1_73m2 ?? '—'} eGFR`],
    ['Baseline symptoms', `Fatigue ${baseline.baseline_fatigue}/10 · Nausea ${baseline.baseline_nausea}/10 · Pain ${baseline.baseline_pain}/10`],
  ]
  return <section className="baseline-section page-width"><div className="baseline-heading"><div><p className="eyebrow eyebrow-dark">AT THE START</p><h2>Your starting point.</h2></div><span>SYNTHETIC DEMO PROFILE</span></div><div className="baseline-grid">{cells.map(([name, value]) => <div key={name}><span>{name}</span><strong>{value}</strong></div>)}</div><p>Fabricated patient data for this demo. No real patient record is used.</p></section>
}
