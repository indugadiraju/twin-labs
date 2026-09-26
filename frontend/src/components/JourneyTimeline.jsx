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

      {timeline.trial && (
        <div className="trial-info">
          <div className="row-between">
            <strong>{timeline.trial.short_name}</strong>
            <span className="tag source-real">Real trial data</span>
          </div>
          <p className="small">{timeline.trial.purpose}</p>
          <p className="muted small">
            Sponsor: {timeline.trial.sponsor} · Follow-up: {timeline.trial.follow_up} ·{' '}
            <a href={timeline.trial.source_url} target="_blank" rel="noreferrer">
              {timeline.trial.nct_id} on ClinicalTrials.gov
            </a>
          </p>
        </div>
      )}

      <div className="row-between schedule-heading">
        <h3 className="no-margin">Visit schedule</h3>
        <span className="tag source-simulated">Simulated for demo</span>
      </div>
      <p className="muted small">
        The public trial record doesn't publish a week-by-week visit schedule, so this weekly
        cadence is simulated for the demo.
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
                <br />
                <span className="tag source-simulated">Simulated check-in</span>
              </p>
            ) : (
              <p className="muted">No check-in submitted yet.</p>
            )}

            {w.prediction && (
              <p className="muted mock-tag">
                Mock predicted risk score: {w.prediction.mock_risk_score}{' '}
                <span className="tag source-mock">Mock — placeholder for Indu's model</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
