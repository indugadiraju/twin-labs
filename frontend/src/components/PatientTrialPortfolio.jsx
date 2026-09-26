import { useState } from 'react'
import './PatientTrialPortfolio.css'

const demoTrials = [
  {
    id: 'TL-DEMO-ONC-02',
    name: 'Symptom Support Pilot',
    sponsor: 'TwinLabs demo program',
    status: 'active',
    statusLabel: 'Active demo',
    currentWeek: 2,
    totalWeeks: 8,
    activeMilestone: 2,
    nextVisit: 'Week 3 · symptom review',
    focus: 'Fatigue, nausea, and treatment experience',
    summary: 'A synthetic study workspace for tracking treatment-related symptoms between visits.',
    milestones: ['Enrollment', 'Baseline', 'Weekly review', 'Follow-up'],
  },
  {
    id: 'TL-DEMO-SR-03',
    name: 'Sleep & Recovery Study',
    sponsor: 'TwinLabs demo program',
    status: 'active',
    statusLabel: 'Active demo',
    currentWeek: 4,
    totalWeeks: 6,
    activeMilestone: 2,
    nextVisit: 'Week 5 · recovery check-in',
    focus: 'Sleep quality, energy, and recovery',
    summary: 'A separate synthetic journey focused on rest and day-to-day recovery.',
    milestones: ['Enrollment', 'Sleep baseline', 'Recovery review', 'Closeout'],
  },
  {
    id: 'TL-DEMO-NUTR-01',
    name: 'Nutrition Check-In',
    sponsor: 'TwinLabs demo program',
    status: 'invited',
    statusLabel: 'Invitation',
    currentWeek: 0,
    totalWeeks: 6,
    activeMilestone: 0,
    nextVisit: 'Review invitation',
    focus: 'Appetite, nutrition, and wellbeing',
    summary: 'An example invitation, shown separately from studies already in progress.',
    milestones: ['Invitation', 'Consent', 'Baseline', 'Check-ins'],
  },
]

const getProgress = (trial) => Math.round((trial.currentWeek / trial.totalWeeks) * 100)
const sortTrials = (items, sort) => [...items].sort((left, right) => {
  if (sort === 'progress') return getProgress(right) - getProgress(left) || left.name.localeCompare(right.name)
  if (sort === 'status') return left.status.localeCompare(right.status) || left.name.localeCompare(right.name)
  return left.name.localeCompare(right.name)
})

export default function PatientTrialPortfolio({ timeline }) {
  const publicTrial = timeline?.trial || {}
  const publicWeek = timeline?.current_week || 1
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('name')
  const [selectedId, setSelectedId] = useState(publicTrial.nct_id || 'NCT00310180')

  const trials = [
    {
      id: publicTrial.nct_id || 'NCT00310180',
      name: publicTrial.short_name || 'TAILORx',
      sponsor: publicTrial.sponsor || 'National Cancer Institute',
      status: 'active',
      statusLabel: 'Simulated journey',
      currentWeek: publicWeek,
      totalWeeks: timeline?.weeks?.length || 4,
      activeMilestone: Math.min(publicWeek - 1, 3),
      nextVisit: timeline?.weeks?.find((week) => week.week > publicWeek)?.visit?.title || 'Final demo week',
      focus: 'Individualized treatment options for breast cancer',
      summary: publicTrial.purpose || 'Public trial information alongside a synthetic patient journey.',
      milestones: timeline?.weeks?.map((week) => week.visit?.title || `Week ${week.week} check-in`) || [],
      sourceUrl: publicTrial.source_url,
      provenance: 'Public trial record · patient journey simulated',
    },
    ...demoTrials,
  ]

  const visibleTrials = sortTrials(trials.filter((trial) => filter === 'all' || trial.status === filter), sort)
  const selected = trials.find((trial) => trial.id === selectedId) || trials[0]
  const progress = getProgress(selected)
  const upcomingMilestones = selected.milestones.slice(0, 4)

  return <section className="trial-portfolio page-width" aria-labelledby="trial-portfolio-title">
    <header className="portfolio-heading">
      <div>
        <p className="eyebrow eyebrow-dark">YOUR STUDY WORKSPACES</p>
        <h1 id="trial-portfolio-title">Every study,<br /><em>in its own view.</em></h1>
        <p className="portfolio-intro">Keep each study's schedule, focus, and progress distinct. The additional TwinLabs studies below are synthetic demo scenarios, not real clinical trials.</p>
      </div>
      <div className="portfolio-count"><strong>{trials.filter((trial) => trial.status === 'active').length}</strong><span>JOURNEYS IN VIEW</span><small>including simulated demo studies</small></div>
    </header>

    <div className="portfolio-toolbar">
      <div className="portfolio-filters" role="group" aria-label="Filter studies">
        {[['all', 'All studies'], ['active', 'In progress'], ['invited', 'Invitations']].map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => { setFilter(value); const nextVisible = sortTrials(trials.filter((trial) => value === 'all' || trial.status === value), sort); if (!nextVisible.some((trial) => trial.id === selected.id)) setSelectedId(nextVisible[0]?.id || '') }}>{label}<span>{value === 'all' ? trials.length : trials.filter((trial) => trial.status === value).length}</span></button>)}
      </div>
      <label className="portfolio-sort">Sort by<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Study name</option><option value="progress">Progress</option><option value="status">Status</option></select></label>
    </div>

    <div className="portfolio-layout">
      <div className="portfolio-list" aria-label="Studies">
        {visibleTrials.length ? visibleTrials.map((trial) => <button type="button" key={trial.id} className={`portfolio-study ${selected.id === trial.id ? 'selected' : ''}`} aria-pressed={selected.id === trial.id} onClick={() => setSelectedId(trial.id)}>
          <span className="portfolio-study-top"><span className={`portfolio-status ${trial.status}`}>{trial.statusLabel}</span><span className="portfolio-study-id">{trial.id}</span></span>
          <strong>{trial.name}</strong>
          <span className="portfolio-study-focus">{trial.focus}</span>
          <span className="portfolio-progress-line"><i><b style={{ width: `${getProgress(trial)}%` }} /></i><small>{trial.currentWeek ? `Week ${trial.currentWeek} of ${trial.totalWeeks}` : 'Not started'}</small></span>
        </button>) : <p className="portfolio-empty">No studies match this filter.</p>}
      </div>

      <article className="portfolio-detail" aria-live="polite">
        <div className="portfolio-detail-head"><div><span className="eyebrow eyebrow-dark">SELECTED STUDY</span><h2>{selected.name}</h2><p>{selected.sponsor} <span>·</span> {selected.id}</p></div><span className={`portfolio-status ${selected.status}`}>{selected.statusLabel}</span></div>
        <p className="portfolio-summary">{selected.summary}</p>
        <div className="portfolio-data-note"><span className="portfolio-note-mark">i</span><span>{selected.provenance || 'Synthetic TwinLabs demo scenario · not a real clinical trial'}</span>{selected.sourceUrl && <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Public record ↗</a>}</div>
        <div className="portfolio-progress-heading"><span>PARTICIPATION PROGRESS</span><strong>{selected.currentWeek ? `${selected.currentWeek} / ${selected.totalWeeks} weeks` : 'Invitation received'}</strong></div>
        <div className="portfolio-progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="portfolio-milestones">{upcomingMilestones.map((milestone, index) => <div key={`${selected.id}-${index}`} className={index < selected.activeMilestone ? 'complete' : index === selected.activeMilestone ? 'current' : ''}><i /><span>{milestone}</span></div>)}</div>
        <div className="portfolio-next"><span>NEXT MILESTONE</span><strong>{selected.nextVisit}</strong></div>
      </article>
    </div>
  </section>
}