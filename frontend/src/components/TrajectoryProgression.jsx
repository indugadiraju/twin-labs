import { useEffect, useState } from 'react'
import { COLLECTED_FIELDS, scheduleDays } from './checkinSchedule'
import { METRICS, STATUS } from './twinLenses'

// Longitudinal progression of ONE digital twin: large nodes are simulated twin
// states (Today → Week N); small markers are participant check-ins
// (observations). Solid = observed up to Today, dashed = projected.
const OBSERVED_FIELD = { fatigue: 'fatigue', nausea: 'nausea', pain: 'pain', wellbeing: 'overall_wellbeing' }
const CHECKIN_ROWS = [['Overall wellbeing', 'overall_wellbeing', '/10'], ['Fatigue', 'fatigue', '/10'], ['Nausea', 'nausea', '/10'], ['Pain', 'pain', '/10'], ['Anxiety', 'anxiety', '/10'], ['Sleep quality', 'sleep_quality', '/10'], ['Mood', 'mood', '']]
const STEP_MS = 1200

export default function TrajectoryProgression({ original, modified, mode, week, onWeek, metricKey, onMetric, audience = 'researcher', cadence, completed = [], durationDays = 28 }) {
  const [playing, setPlaying] = useState(false)
  const [marker, setMarker] = useState(null)
  const last = original.length - 1

  // Replay: advance one twin state per step, stop at the final week.
  useEffect(() => {
    if (!playing) return undefined
    const id = setTimeout(() => { if (week >= last) setPlaying(false); else onWeek(week + 1) }, STEP_MS)
    return () => clearTimeout(id)
  }, [playing, week, last, onWeek])

  if (!original.length) return null
  const patient = audience === 'patient'
  const labels = patient ? ['Current treatment', 'Scenario'] : ['Original', 'Modified']
  const series = mode === 'original' ? [['original', original]] : mode === 'modified' ? [['modified', modified]] : [['original', original], ['modified', modified]]
  const shown = mode === 'original' ? original : modified

  // Time axis spans any real past check-ins through the end of the projection.
  const minDay = Math.min(0, ...completed.map((c) => c.day))
  const maxDay = Math.max(durationDays, last * 7)
  const x = (day) => 9 + ((day - minDay) / (maxDay - minDay)) * 82
  const field = OBSERVED_FIELD[metricKey]
  const history = field ? completed.filter((c) => c.day < 0 && typeof c.checkin[field] === 'number').map((c) => ({ day: c.day, v: c.checkin[field] })) : []
  const observed = [...history, { day: 0, v: original[0][metricKey] }]
  const values = [...series.flatMap(([, s]) => s.map((w) => w[metricKey])), ...observed.map((p) => p.v)]
  const pad = Math.max((Math.max(...values) - Math.min(...values)) * 0.2, metricKey.endsWith('_score') ? 0.03 : 0.5)
  const low = Math.min(...values) - pad
  const high = Math.max(...values) + pad
  const y = (v) => 8 + (1 - (v - low) / (high - low)) * 84
  const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.day)},${y(p.v)}`).join(' ')

  const scheduled = scheduleDays({ cadence, durationDays }).filter((d) => !completed.some((c) => c.day === d)).map((day) => ({ day, kind: 'scheduled' }))
  const markers = [...completed.map((c) => ({ ...c, kind: 'completed' })), ...scheduled]
  const dense = scheduled.length > 12
  const selectedMarker = marker && markers.find((m) => m.kind === marker.kind && m.day === marker.day)

  const play = () => { if (week >= last) onWeek(0); setPlaying(true) }
  const pickMarker = (m) => { setMarker({ kind: m.kind, day: m.day }); if (m.kind === 'completed' && m.day === 0) onWeek(0) }

  return <section className="progression" aria-label="Longitudinal progression">
    <div className="progression-head">
      <div>
        <span className="eyebrow">LONGITUDINAL PROGRESSION · {mode === 'compare' ? `${labels[0]} vs ${labels[1]}` : mode === 'modified' ? labels[1] : labels[0]}</span>
        <h3>The same twin, <em>week by week.</em></h3>
      </div>
      <div className="progression-controls">
        <button type="button" className="play-button" onClick={playing ? () => setPlaying(false) : play} aria-pressed={playing}>
          {playing ? <><i aria-hidden="true">❚❚</i> Pause</> : week >= last && week !== 0 ? <><i aria-hidden="true">↻</i> Replay progression</> : <><i aria-hidden="true">▶</i> Play progression</>}
        </button>
        <div className="metric-pills" role="group" aria-label="Metric shown on the progression">{METRICS.map((m) => <button type="button" key={m.key} className={m.key === metricKey ? 'active' : ''} aria-pressed={m.key === metricKey} onClick={() => onMetric(m.key)}>{m.label[audience]}</button>)}</div>
      </div>
    </div>

    <div className="progression-legend">
      <span><i className="lg-state" />Twin state</span>
      <span><i className="lg-checkin" />Patient check-in</span>
      <span><i className="lg-observed" />Observed</span>
      <span><i className="lg-projected" />Projected</span>
      <span><i className="lg-done">✓</i>Completed</span>
      <span><i className="lg-sched" />Scheduled</span>
      {mode === 'compare' && <><span><i className="lg-line original" />{labels[0]}</span><span><i className="lg-line modified" />{labels[1]}</span></>}
    </div>

    <div className="progression-chart">
      <span className="prog-zone" style={{ left: `${x(0)}%` }} aria-hidden="true" />
      <span className="prog-future" style={{ left: `${x(0)}%` }} aria-hidden="true"><b>TODAY</b><small>Observed ← · → Projected</small></span>
      <span className="prog-cursor" style={{ left: `${x(shown[week].week * 7)}%` }} aria-hidden="true" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {series.map(([name, s]) => <path key={name} d={line(s.map((w) => ({ day: w.week * 7, v: w[metricKey] })))} className={`prog-projected ${name}`} vectorEffect="non-scaling-stroke" />)}
        {observed.length > 1 && <path d={line(observed)} className="prog-observed" vectorEffect="non-scaling-stroke" />}
      </svg>
      {history.map((p) => <span key={`h${p.day}`} className="prog-point observed" style={{ left: `${x(p.day)}%`, top: `${y(p.v)}%` }} />)}
      {series.map(([name, s]) => s.map((w, i) => <span key={`${name}${i}`} className={`prog-point ${i === 0 ? 'observed' : name} ${i === week ? 'current' : ''}`} style={{ left: `${x(w.week * 7)}%`, top: `${y(w[metricKey])}%` }} />))}
    </div>

    <div className={`progression-checkins ${dense ? 'dense' : ''}`} aria-label="Participant check-ins">
      <span className="checkin-rail" aria-hidden="true" />
      {markers.map((m) => <button type="button" key={`${m.kind}${m.day}`} className={`checkin-mark ${m.kind} ${selectedMarker?.kind === m.kind && selectedMarker?.day === m.day ? 'selected' : ''}`} style={{ left: `${x(m.day)}%` }}
        aria-label={m.kind === 'completed' ? `Completed check-in, study week ${m.studyWeek}` : `Scheduled check-in, day ${m.day}`} onClick={() => pickMarker(m)}>{m.kind === 'completed' ? '✓' : ''}</button>)}
    </div>

    <div className="progression-states" role="tablist" aria-label="Twin states">
      <span className="state-rail" style={{ left: `${x(0)}%`, right: `${100 - x(maxDay)}%` }} aria-hidden="true" />
      {shown.map((w, i) => <button type="button" role="tab" key={w.week} aria-selected={week === i} className={`state-node ${week === i ? 'selected' : ''} ${i < week ? 'passed' : ''}`} style={{ left: `${x(w.week * 7)}%` }} onClick={() => { setPlaying(false); onWeek(i) }}>
        <span className="state-circle">{w.week === 0 ? '✳' : String(w.week).padStart(2, '0')}</span>
        <span className="state-label">{w.label}</span>
      </button>)}
    </div>

    <div className="progression-cards">
      {shown.map((w, i) => {
        const o = original[i]
        return <button type="button" key={w.week} className={`state-card ${week === i ? 'selected' : ''}`} style={{ left: `${x(w.week * 7)}%` }} onClick={() => { setPlaying(false); onWeek(i) }} aria-label={`${w.label} twin state`}>
          <span className="state-card-status"><i className={`status-dot ${w.status}`} />{STATUS[w.status]}</span>
          {METRICS.map((m) => <span key={m.key} className={m.key === metricKey ? 'hl' : ''}><small>{m.label[audience]}</small><b>{m.format(w[m.key])}{mode === 'compare' && m.format(o[m.key]) !== m.format(w[m.key]) && <em>{w[m.key] > o[m.key] ? '▲' : '▼'}</em>}</b></span>)}
        </button>
      })}
    </div>

    <div className="checkin-detail" aria-live="polite">
      {!selectedMarker ? <p className="checkin-hint">Select a check-in marker to see what it contains. {completed.length ? `${completed.length} completed check-in${completed.length > 1 ? 's' : ''} on record.` : 'No completed check-ins on record yet.'} Demo assumption: “Today” is the participant’s current study week; everything after Today is projected.</p>
        : selectedMarker.kind === 'completed' ? <>
          <div><span className="eyebrow">WEEK {selectedMarker.studyWeek} CHECK-IN · {selectedMarker.day === 0 ? 'TODAY' : `${-selectedMarker.day / 7} WK BEFORE TODAY`}</span>
            <dl className="checkin-values">{CHECKIN_ROWS.filter(([, key]) => selectedMarker.checkin[key] != null && selectedMarker.checkin[key] !== '').map(([label, key, suffix]) => <div key={key}><dt>{label}</dt><dd>{selectedMarker.checkin[key]}{suffix}</dd></div>)}
              {selectedMarker.checkin.new_symptoms?.length > 0 && <div><dt>New symptoms</dt><dd>{selectedMarker.checkin.new_symptoms.join(', ')}</dd></div>}</dl>
          </div>
          <div className="checkin-flow" aria-label="How a check-in updates the twin"><span>Patient check-in</span><i>↓</i><span>Digital twin update</span><i>↓</i><span>Updated future trajectory</span>
            <p>{selectedMarker.day === 0 ? 'This is the latest check-in: the twin’s Today state is built from it, and the projection starts there.' : 'An earlier observation. The current Today state uses the most recent check-in.'}</p></div>
        </> : <>
          <div><span className="eyebrow">SCHEDULED CHECK-IN · DAY {selectedMarker.day}{selectedMarker.day === 0 ? ' · DUE TODAY' : ` · WEEK ${Math.ceil(selectedMarker.day / 7)}`}</span>
            <p className="checkin-hint">Upcoming observation. No data yet.</p>
            <dl className="checkin-values">{COLLECTED_FIELDS.map((f) => <div key={f}><dt>{f}</dt><dd>expected</dd></div>)}</dl></div>
          <div className="checkin-flow muted"><span>Scheduled check-in</span><i>↓</i><span>Would update the twin</span><i>↓</i><span>Would refresh the projection</span></div>
        </>}
    </div>
  </section>
}
