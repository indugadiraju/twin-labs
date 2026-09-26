const STATUS_LABEL = {
  stable: 'Stable',
  watch: 'Watch',
  needs_attention: 'Needs Attention',
}

export default function JourneyTimeline({ timeline, onRefresh }) {
  if (!timeline) {
    return (
      <div className="card">
        <h2>Week 1–4 Journey</h2>
        <p>No timeline yet — create a twin to get started.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="row-between">
        <h2>Week 1–4 Journey</h2>
        <button onClick={onRefresh}>Refresh</button>
      </div>
      <p>
        Current status: <span className={`badge ${timeline.status}`}>{STATUS_LABEL[timeline.status]}</span>
      </p>

      <div className="timeline">
        {timeline.weeks.map((w) => (
          <div key={w.week} className={`timeline-week ${w.week === timeline.current_week ? 'current' : ''}`}>
            <h3>Week {w.week}</h3>
            {w.visit && (
              <p className="visit">
                <strong>{w.visit.title}</strong>
                <br />
                {w.visit.details}
              </p>
            )}

            {w.checkin ? (
              <p>
                Wellbeing: {w.checkin.overall_wellbeing}/10
                {w.checkin.symptoms.length > 0 && (
                  <>
                    <br />
                    Symptoms: {w.checkin.symptoms.map((s) => `${s.name} (${s.severity}/10)`).join(', ')}
                  </>
                )}
              </p>
            ) : (
              <p className="muted">No check-in submitted yet.</p>
            )}

            {w.prediction && (
              <p className="muted mock-tag">
                Mock predicted risk score: {w.prediction.mock_risk_score} (placeholder — not a real model)
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
