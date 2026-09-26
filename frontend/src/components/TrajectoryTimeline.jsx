// Today → Week N chart + selectable week track, shared by the twin pages and
// the What-If Studios. Pass `modified` to compare two trajectories.
function ComparisonChart({ original, modified, metric, week }) {
  const values = [...original, ...(modified || [])].map((w) => w[metric.key])
  const pad = Math.max((Math.max(...values) - Math.min(...values)) * 0.25, metric.key.endsWith('_score') ? 0.03 : 0.5)
  const low = Math.min(...values) - pad
  const high = Math.max(...values) + pad
  const x = (i) => (i + 0.5) * (100 / original.length)
  const y = (v) => 100 - ((v - low) / (high - low)) * 100
  const path = (series) => series.map((w, i) => `${i ? 'L' : 'M'}${x(i)},${y(w[metric.key])}`).join(' ')
  return <div className="studio-chart" aria-label={`${metric.title} across weeks`}>
    <span className="chart-week" style={{ left: `${x(week)}%` }} />
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="studio-modified" x1="0" x2="1"><stop offset="0" stopColor="#9157ed" /><stop offset="1" stopColor="#e38bd8" /></linearGradient></defs>
      <path d={path(original)} className={modified ? 'chart-original' : 'chart-modified'} vectorEffect="non-scaling-stroke" />
      {modified && <path d={path(modified)} className="chart-modified" vectorEffect="non-scaling-stroke" />}
    </svg>
    {original.map((w, i) => <span key={`o${i}`} className={`chart-dot ${modified ? 'original' : 'modified'}`} style={{ left: `${x(i)}%`, top: `${y(w[metric.key])}%` }} />)}
    {modified?.map((w, i) => <span key={`m${i}`} className="chart-dot modified" style={{ left: `${x(i)}%`, top: `${y(w[metric.key])}%` }} />)}
  </div>
}

export default function TrajectoryTimeline({ original, modified, metric, week, onWeek, legend = ['Original', 'Modified'], hint = 'SELECT A WEEK' }) {
  if (!original.length) return null
  return <div className="studio-timeline">
    <div className="studio-legend"><span className="eyebrow">{metric.title.toUpperCase()} · {metric.subtitle.toUpperCase()} · {hint}</span>
      {modified ? <><span><i className="legend-original" />{legend[0]}</span><span><i className="legend-modified" />{legend[1]}</span></> : <span><i className="legend-modified" />Projected</span>}
    </div>
    <ComparisonChart original={original} modified={modified} metric={metric} week={week} />
    <div className="journey-track studio-track" role="tablist" aria-label="Simulated weeks">
      <div className="track-line" aria-hidden="true" />
      {original.map((w, i) => <button type="button" role="tab" aria-selected={week === i} key={w.week} className={`journey-node ${week === i ? 'selected' : ''}`} onClick={() => onWeek(i)}>
        <span className="node-circle">{w.week === 0 ? '✳' : String(w.week).padStart(2, '0')}</span>
        <span className="node-label">{w.label}</span>
        <small>{metric.format(w[metric.key])}{modified && ` → ${metric.format(modified[i][metric.key])}`}</small>
      </button>)}
    </div>
  </div>
}
