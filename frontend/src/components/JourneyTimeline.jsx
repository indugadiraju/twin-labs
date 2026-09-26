import { useState } from 'react'

const metrics = [
  ['Fatigue', 'fatigue'], ['Nausea', 'nausea'], ['Pain', 'pain'],
  ['Anxiety', 'anxiety'], ['Sleep', 'sleep_quality'], ['Mood', 'mood'],
  ['Wellbeing', 'overall_wellbeing'],
]
const label = (value) => value == null ? '—' : typeof value === 'number' ? `${value}/10` : value
const symptomValue = (report, key) => report?.[key] ?? report?.symptoms?.find((item) => item.name.toLowerCase() === key)?.severity

const weekText = (prediction = {}) => {
  const details = prediction.condition_specific_risks || {}
  const likely = []

  if ((prediction.fatigue || 0) >= 0.6) likely.push('fatigue')
  if ((prediction.nausea || 0) >= 0.45) likely.push('nausea')
  if ((prediction.sleep_disruption || 0) >= 0.45) likely.push('sleep disruption')
  if ((prediction.pain || 0) >= 0.4) likely.push('pain')
  if ((details.neuropathy || 0) >= 0.35) likely.push('tingling or numbness')
  if (!likely.length) likely.push('mild fatigue or light sleep changes')

  const contactText = (prediction.adverse_event || 0) >= 0.55 || (prediction.dropout_risk || 0) >= 0.4
    ? 'If you experience fever, repeated vomiting, severe weakness, or trouble eating/drinking, reach out to your care team right away.'
    : 'If symptoms become more intense or start interfering with daily activities, reach out to your care team.'

  const providerMessage = (prediction.adverse_event || 0) >= 0.55
    ? 'Message your provider or researcher if you have questions, new symptoms, or changes in your treatment schedule.'
    : 'If you have questions or need guidance before your next visit, message your provider or researcher.'

  return {
    headline: 'You may experience the following symptoms this week:',
    symptoms: likely,
    contact: contactText,
    providerMessage,
  }
}

export default function JourneyTimeline({ timeline, baseline, onRefresh }) {
  const [selected, setSelected] = useState(null)
  if (!timeline) return null
  const weeks = timeline.weeks || []
  const currentWeek = selected ?? timeline.current_week
  const item = currentWeek === 0 ? null : weeks.find((week) => week.week === currentWeek)
  const report = item?.checkin
  const previous = weeks.find((week) => week.week === currentWeek - 1)?.checkin
  const baselineValues = currentWeek === 1 ? { fatigue: baseline?.baseline_fatigue, nausea: baseline?.baseline_nausea, pain: baseline?.baseline_pain } : null
  const rows = report ? metrics.map(([name, key]) => ({ name, key, value: symptomValue(report, key), before: previous ? symptomValue(previous, key) : baselineValues?.[key] })).filter((row) => row.value != null) : []
  const detailPrediction = item?.prediction?.prediction || item?.prediction || {}
  const guidance = weekText(detailPrediction)

  return <section className="journey-section page-width" id="journey"><div className="section-heading"><div><p className="eyebrow eyebrow-dark">THE PATIENT JOURNEY</p><h2>See the whole picture,<br /><em>week by week.</em></h2></div><p>Follow your reported changes and upcoming study milestones in one place.</p></div>
    <div className="trial-ribbon"><div><span className="eyebrow eyebrow-dark">REAL PUBLIC TRIAL</span><strong>{timeline.trial?.short_name || 'Study information'} <small>{timeline.trial?.nct_id}</small></strong><p>{timeline.trial?.purpose}</p></div>{timeline.trial?.source_url && <a href={timeline.trial.source_url} target="_blank" rel="noreferrer">View public trial record ↗</a>}</div>
    <div className="journey-panel"><div className="journey-track" role="tablist" aria-label="Study weeks"><div className="track-line" aria-hidden="true" /><button type="button" role="tab" aria-selected={currentWeek === 0} aria-controls="week-detail" className={`journey-node ${currentWeek === 0 ? 'selected' : ''}`} onClick={() => setSelected(0)}><span className="node-circle">✳</span><span className="node-label">Baseline</span><small>SYNTHETIC START</small></button>{weeks.map((week) => <button type="button" role="tab" aria-selected={currentWeek === week.week} aria-controls="week-detail" key={week.week} className={`journey-node ${currentWeek === week.week ? 'selected' : ''} ${week.week === timeline.current_week ? 'active' : ''}`} onClick={() => setSelected(week.week)}><span className="node-circle">{String(week.week).padStart(2, '0')}</span><span className="node-label">Week {week.week}</span><small>{week.checkin ? 'CHECK-IN RECORDED' : week.week === timeline.current_week ? 'CURRENT WEEK' : 'NO CHECK-IN'}</small></button>)}</div>
      <div className="week-detail" id="week-detail" role="tabpanel"><div className="detail-main"><span className="eyebrow">{currentWeek === timeline.current_week ? 'CURRENT CHAPTER' : 'JOURNEY CHAPTER'} · {String(currentWeek).padStart(2, '0')}</span><h3>{currentWeek === 0 ? 'Your baseline' : `Week ${currentWeek}`}</h3><p>{currentWeek === 0 ? 'The beginning of your journey' : item?.visit?.title || 'Weekly check-in'}</p><span className="data-label">{currentWeek === 0 ? 'Synthetic patient baseline' : 'Simulated demo visit schedule'}</span><p className="visit-copy">{currentWeek === 0 ? 'This is a fabricated starting point. The demo visit schedule begins in Week 1.' : item?.visit?.details || 'No visit scheduled in this demo week.'}</p></div>
        <div className="detail-report"><span className="eyebrow">REPORTED STATE</span>{report ? <><strong className="wellbeing-value">{report.overall_wellbeing}<small> / 10</small></strong><span className="metric-caption">Overall wellbeing</span><div className="journey-values">{rows.map((row) => <div key={row.key}><span>{row.name}</span><strong>{row.before != null && row.before !== row.value ? `${label(row.before, row.key)} → ` : ''}{label(row.value, row.key)}</strong></div>)}</div><div className="detail-symptoms">{report.symptoms?.length ? report.symptoms.map((symptom) => <span key={symptom.name}>{symptom.name} <b>{symptom.severity}/10</b></span>) : <span>No additional symptoms reported</span>}</div>{report.new_symptoms?.length > 0 && <p className="new-symptom-note">New: {report.new_symptoms.join(', ')}</p>}<span className="data-label">Simulated patient check-in</span></> : currentWeek === 0 ? <div className="baseline-detail"><p>Synthetic baseline</p><span>Fatigue {baseline?.baseline_fatigue ?? '—'}/10 · Nausea {baseline?.baseline_nausea ?? '—'}/10 · Pain {baseline?.baseline_pain ?? '—'}/10</span></div> : <p className="empty-report">No check-in exists for this week. Your report will appear here after submission.</p>}</div>
        <div className="detail-prediction">
          <div className="prediction-header">
            <span className="eyebrow">LOOKING AHEAD</span>
            <span className="prediction-pill">{item?.prediction ? `${Math.round(item.prediction.mock_risk_score * 100)}%` : '—'}</span>
          </div>
          <div className="prediction-meta">
            <strong>{item?.prediction ? `${Math.round(item.prediction.mock_risk_score * 100)}%` : '—'}</strong>
            <span className="metric-caption">Mock risk score</span>
          </div>
          <div className="prediction-bar"><span style={{ width: `${Math.min(100, Math.max(0, (Number(item?.prediction?.mock_risk_score) || 0) * 100))}%` }} /></div>
          {currentWeek !== 0 && <div className="guidance-card">
            <p className="guidance-title">{guidance.headline}</p>
            <ul className="guidance-list">
              {guidance.symptoms.map((symptom) => <li key={symptom}>{symptom}</li>)}
            </ul>
            <p className="guidance-note">{guidance.contact}</p>
            <p className="provider-note">{guidance.providerMessage}</p>
          </div>}
          {currentWeek === 0 && <p className="baseline-note">No baseline prediction is available.</p>}
          {rows.some((row) => row.before != null && row.before !== row.value) && <div className="change-list"><span className="eyebrow">WHAT CHANGED</span>{rows.filter((row) => row.before != null && row.before !== row.value).map((row) => <span key={row.key}>{row.name} <b>{label(row.before, row.key)} → {label(row.value, row.key)}</b></span>)}</div>}</div></div></div><button className="text-button refresh-button" type="button" onClick={onRefresh}>↻ Refresh journey</button>
  </section>
}
