import { useState } from 'react'
import DigitalTwinBody from './DigitalTwinBody'
import { LENSES, STATUS, buildLens } from './twinLenses'

// The interactive twin panel (body + lens carousel + detail), shared by the
// patient/researcher twin pages and both What-If Studios.
const TITLES = {
  researcher: { original: <>Original <em>twin</em></>, modified: <>Simulated <em>twin</em></>, compare: <>Original <em>vs</em> simulated</>, current: <>Participant <em>twin</em></> },
  patient: { original: <>Your twin · <em>current treatment</em></>, modified: <>Your twin · <em>scenario</em></>, compare: <>Current treatment <em>vs</em> scenario</>, current: <>Your <em>digital twin</em></> },
}
const MODE_LABELS = {
  researcher: { original: 'Original', modified: 'Modified', compare: 'Compare' },
  patient: { original: 'Current treatment', modified: 'Scenario', compare: 'Compare' },
}

export default function TwinStage({ twin, original, modified, week, mode = 'original', onMode, ranDose = 100, audience = 'researcher', uncertainty, compare = true }) {
  const [lens, setLens] = useState('full')
  const [dir, setDir] = useState(1)
  const [selected, setSelected] = useState(null)
  // 'compare' renders the modified twin with the original as a ghost reference.
  const cur = (mode === 'original' ? original : modified)[week]
  if (!cur) return <section className="twin-stage"><div className="studio-empty">Preparing your digital twin…</div></section>

  const simulated = compare && ranDose !== 100
  const other = simulated ? (mode === 'original' ? modified : original)[week] : null
  const patient = audience === 'patient'
  const modeLabels = MODE_LABELS[audience] || MODE_LABELS.researcher
  const otherLabel = mode === 'original' ? modeLabels.modified : modeLabels.original
  const view = buildLens(lens, { twin, cur, other, otherLabel, original, modified: compare ? modified : original, mode, dose: ranDose, audience, uncertainty })
  const active = view.callouts.find((c) => c.id === selected) || view.callouts[0]
  const lensIndex = LENSES.findIndex((l) => l.id === lens)
  const lensAt = (offset) => LENSES[(lensIndex + offset + LENSES.length) % LENSES.length]
  const go = (id, nextDir) => { setDir(nextDir); setLens(id); setSelected(null) }
  const title = TITLES[audience] || TITLES.researcher

  return <section className={`twin-stage mode-${mode}`} aria-label="Digital twin">
    <div className="twin-stage-top">
      <div>
        <span className="eyebrow">DIGITAL TWIN · {cur.label.toUpperCase()}</span>
        <h2>{onMode ? title[mode] : title.current}</h2>
        <div className="twin-status"><i className={`status-dot ${cur.status}`} />{STATUS[cur.status]}{onMode && ` · ${patient ? 'Treatment dose' : 'Dose'} ${mode === 'compare' ? `100% → ${ranDose}%` : mode === 'modified' ? `${ranDose}%` : '100%'}`}{onMode && mode !== 'original' && !simulated && ' · No change yet'}</div>
      </div>
      {onMode && <div className="mode-toggle" role="tablist" aria-label="Twin state">
        {['original', 'modified', 'compare'].map((m) => <button type="button" role="tab" key={m} aria-selected={mode === m} className={mode === m ? 'active' : ''} onClick={() => onMode(m)}>{modeLabels[m]}</button>)}
      </div>}
    </div>
    <DigitalTwinBody view={view} lens={lens} dir={dir} selected={active?.id} onSelect={setSelected} mode={mode} animKey={`${lens}-${mode}-${week}-${ranDose}`} />
    <div className="twin-carousel" role="group" aria-label="Digital twin views" onKeyDown={(e) => { if (e.key === 'ArrowLeft') go(lensAt(-1).id, -1); if (e.key === 'ArrowRight') go(lensAt(1).id, 1) }}>
      <button type="button" className="carousel-arrow" aria-label={`Previous view: ${lensAt(-1).label}`} onClick={() => go(lensAt(-1).id, -1)}>‹</button>
      <div className="carousel-track" aria-live="polite">
        <span className="carousel-side">{lensAt(-1).label}</span>
        <strong key={lens} className="carousel-current" style={{ '--dir': dir }}>{LENSES[lensIndex].label}</strong>
        <span className="carousel-side">{lensAt(1).label}</span>
      </div>
      <button type="button" className="carousel-arrow" aria-label={`Next view: ${lensAt(1).label}`} onClick={() => go(lensAt(1).id, 1)}>›</button>
    </div>
    <div className="carousel-dots">{LENSES.map((l, i) => <button type="button" key={l.id} aria-label={`${l.label} view`} aria-pressed={l.id === lens} className={l.id === lens ? 'active' : ''} onClick={() => go(l.id, i >= lensIndex ? 1 : -1)} />)}</div>
    {active && <div className="twin-detail" aria-live="polite">
      <div><span className="eyebrow">{LENSES[lensIndex].label.toUpperCase()} · {cur.label.toUpperCase()}</span><h3>{active.label}</h3></div>
      <div className="twin-detail-items"><div>
        <span>{active.note || (active.tone === 'lab' ? 'Baseline value' : mode === 'compare' ? `${modeLabels.original} → ${modeLabels.modified}` : mode === 'modified' ? (patient ? 'In the scenario' : 'Simulated twin') : (patient ? 'On current treatment' : 'Original twin'))}</span>
        <span><b>{active.value}</b>{active.compare && <em> {active.compare}</em>}<small>{active.source}</small></span>
      </div></div>
    </div>}
  </section>
}
