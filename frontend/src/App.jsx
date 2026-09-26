import { useEffect, useState } from 'react'
import { api } from './api'
import CheckInForm from './components/CheckInForm'
import JourneyTimeline from './components/JourneyTimeline'
import PatientBaseline from './components/PatientBaseline'
import PatientTrialPortfolio from './components/PatientTrialPortfolio'
import ResearcherDashboard from './components/ResearcherDashboard'
import PortalLogin from './components/PortalLogin'
import TrialAssistant from './components/TrialAssistant'
import TwinFlow from './components/TwinFlow'
import TwinExplorer from './components/TwinExplorer'
import TwinSnapshot from './components/TwinSnapshot'
import WhatIfStudio from './components/WhatIfStudio'
import './App.css'
import './tabbed.css'

const PATIENT_ID = 'pt_demo_patient'
const tabs = ['Overview', 'My Trials', 'My Twin', 'What-If Studio', 'Check-In', 'Journey', 'Trial Assistant']
const labels = { stable: 'Stable', watch: 'Watch', needs_attention: 'Needs attention' }
const comparisonFields = [['Fatigue', 'fatigue'], ['Sleep', 'sleep_quality'], ['Mood', 'mood'], ['Nausea', 'nausea']]

export default function App() {
  const [twin, setTwin] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [update, setUpdate] = useState(null)
  const [flowVersion, setFlowVersion] = useState(0)
  const [platform, setPlatform] = useState(null)
  const [tab, setTab] = useState('Overview')
  const [advancing, setAdvancing] = useState(false)
  const [researchSection, setResearchSection] = useState('dashboard')

  useEffect(() => {
    // Load the demo patient for either portal: the researcher Patient Twin / What-If Studio need it too.
    if (!platform) return
    async function start() {
      setLoading(true)
      try {
        let patient
        try { patient = await api.getTwin(PATIENT_ID) }
        catch { patient = await api.createTwin(PATIENT_ID) }
        setTwin(patient)
        setTimeline(await api.getTimeline(PATIENT_ID))
      } catch (err) { setError(err.message) }
      finally { setLoading(false) }
    }
    start()
  }, [platform])
  const refresh = async () => setTimeline(await api.getTimeline(PATIENT_ID))
  const onSubmitted = async (next, checkin) => {
    setUpdate({ previous: twin, current: next, checkin })
    setTwin(next)
    setTimeline((old) => old ? { ...old, current_week: next.current_week, status: next.status, weeks: old.weeks.map((w) => w.week === checkin.week ? { ...w, checkin } : w) } : old)
    setFlowVersion((value) => value + 1)
    try { await refresh() } catch (err) { setError(err.message) }
  }
  const advanceWeek = async () => {
    setAdvancing(true)
    setError('')
    try {
      const next = await api.advanceWeek(PATIENT_ID)
      setTwin(next)
      setTimeline((old) => old ? { ...old, current_week: next.current_week } : old)
      setUpdate(null)
      await refresh()
      setTab('Overview')
    } catch (err) { setError(err.message) }
    finally { setAdvancing(false) }
  }
  const currentWeek = twin?.current_week || 1
  const reports = timeline?.weeks?.filter((week) => week.checkin).map((week) => week.checkin) || []
  const latest = reports.at(-1)
  const previous = reports.at(-2)
  const currentReport = timeline?.weeks?.find((week) => week.week === currentWeek)?.checkin
  const nextMilestone = timeline?.weeks?.find((week) => week.week > currentWeek && week.visit)?.visit?.title || 'Final demo week'
  const changes = comparisonFields.map(([name, key]) => ({ name, from: update?.previous?.[key] ?? previous?.[key], to: twin?.[key] })).filter((item) => item.to != null && item.from != null && item.from !== item.to)
  const value = (number) => typeof number === 'number' ? `${number}/10` : number

  // Twin views share one engine/visualization; each is mounted only while visible (one SVG twin in the DOM at a time).
  const twinProps = { patientId: PATIENT_ID, twin, timeline, refreshKey: twin?.updated_at }
  const researchSections = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'twin', label: 'Patient Twin', kicker: 'PARTICIPANT DIGITAL TWIN', title: 'Patient', em: 'Twin.', description: 'Current state, changing signals and the projected four-week trajectory for this participant.', content: loading ? null : <TwinExplorer {...twinProps} audience="researcher" /> },
    { id: 'studio', label: 'What-If Studio', kicker: 'COUNTERFACTUAL SIMULATION', title: 'What-If', em: 'Studio.', description: "Explore how changes to treatment variables alter this patient's simulated trajectory.", content: loading ? null : <WhatIfStudio {...twinProps} patientName="Maya" audience="researcher" /> },
  ]
  if (platform === 'researcher') return <ResearcherDashboard patientId={PATIENT_ID} onExit={() => setPlatform(null)} sections={researchSections} section={researchSection} onSection={setResearchSection} />
  if (!platform) return <PortalLogin onEnter={setPlatform} />
  return <div className="site-shell">
    <div className="hero-wrap">
      <nav className="topbar page-width" aria-label="Main navigation"><button className="wordmark brand-button" onClick={() => setTab('Overview')}><span className="brand-mark">✳</span> TwinLabs<span className="wordmark-dot">.</span></button><div className="topbar-right"><button className="patient-signout" onClick={() => setPlatform(null)}>Sign out</button><span className="avatar" aria-label="Demo patient Maya">M</span></div></nav>
      <><nav className="app-tabs patient-tabs page-width" aria-label="Patient sections">{tabs.map((name) => <button key={name} aria-current={tab === name ? 'page' : undefined} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}>{name}</button>)}</nav>{tab === 'Overview' && <header className="hero page-width" id="top"><div className="hero-copy"><p className="eyebrow">YOUR STUDY, IN FOCUS <span className="eyebrow-line" /></p><h1>Good morning,<br /><em>Maya.</em></h1><p className="hero-subtitle">Week {currentWeek} of your study</p><p className="hero-description">Your twin is keeping track of how you are changing between visits.</p><button className="hero-link" onClick={() => setTab('Journey')}>Explore your journey <span aria-hidden="true">↗</span></button></div><TwinFlow key={`${currentWeek}-${flowVersion}`} active={flowVersion > 0} week={currentWeek}/><div className="hero-bottom"><span>ONE WEEK AT A TIME</span><span>{String(currentWeek).padStart(2, '0')} / 04</span></div></header>}</>
    </div>
    <div className="patient-mode"><main>
      {tab === 'Overview' && <section className="overview-content page-width tab-enter"><div className="overview-summary"><div><span>CURRENT WEEK</span><strong>{String(currentWeek).padStart(2, '0')} <small>/ 04</small></strong></div><div><span>TWIN STATUS</span><strong><i className={`status-dot ${twin?.status || 'stable'}`} />{labels[twin?.status] || 'Loading'}</strong></div><div><span>NEXT MILESTONE</span><strong>{nextMilestone}</strong></div></div><div className="overview-grid"><div className="overview-story"><p className="eyebrow eyebrow-dark">YOUR DIGITAL TWIN</p><h2>Small changes.<br /><em>A clearer picture.</em></h2><p>{latest ? `Your latest simulated check-in was recorded in Week ${latest.week}. Explore how your twin has changed.` : 'Your first check-in will give your twin a clearer view of how you feel.'}</p><button onClick={() => setTab('My Twin')}>Meet your twin <span>↗</span></button></div><div className="overview-changes"><span className="eyebrow eyebrow-dark">LATEST CHANGES · SIMULATED REPORTS</span>{changes.length ? changes.slice(0,4).map((item) => <div key={item.name}><span>{item.name}</span><strong>{value(item.from)} → {value(item.to)}</strong></div>) : <p>{latest ? 'No tracked differences from the previous report yet.' : 'Your changes will appear after your first check-in.'}</p>}<button onClick={() => setTab('Check-In')}>{currentReport ? 'View check-in' : 'Start check-in'} ↗</button></div></div><div className="overview-trust"><span>REAL PUBLIC TRIAL · {timeline?.trial?.short_name || 'TAILORx'} · {timeline?.trial?.nct_id || 'NCT00310180'}</span><span>SYNTHETIC PATIENT · SIMULATED WEEKLY JOURNEY</span></div></section>}
      {error && <div className="error-banner page-width" role="alert">{error} <button onClick={() => window.location.reload()}>Try again</button></div>}
      {loading ? <div className="loading-state page-width" role="status"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-panel" /></div> : <>
        <div hidden={tab !== 'My Trials'} className="tab-stage tab-enter"><PatientTrialPortfolio timeline={timeline}/></div>
        <div hidden={tab !== 'My Twin'} className="tab-stage tab-enter">{tab === 'My Twin' && <TwinExplorer {...twinProps} audience="patient" />}<TwinSnapshot twin={twin} checkin={currentReport} update={update}/><PatientBaseline baseline={twin?.synthetic_baseline}/></div>
        {tab === 'What-If Studio' && <div className="tab-stage tab-enter"><WhatIfStudio {...twinProps} patientName="Maya" audience="patient" /></div>}
        <div hidden={tab !== 'Check-In'} className="tab-stage tab-enter"><section className="care-section" id="check-in"><div className="page-width care-grid"><div className="care-intro"><p className="eyebrow">A MOMENT TO CHECK IN</p><h2>Every detail<br /><em>matters.</em></h2><p>Your weekly check-in helps your twin reflect how you feel between visits.</p><div className="care-decoration" aria-hidden="true">✳</div></div><CheckInForm key={currentWeek} patientId={PATIENT_ID} currentWeek={currentWeek} existingCheckin={currentReport} onSubmitted={onSubmitted} update={update} onAdvance={advanceWeek} advancing={advancing}/></div></section></div>
        <div hidden={tab !== 'Journey'} className="tab-stage tab-enter"><JourneyTimeline key={currentWeek} timeline={timeline} baseline={twin?.synthetic_baseline} onRefresh={refresh}/></div>
        <div hidden={tab !== 'Trial Assistant'} className="tab-stage tab-enter"><TrialAssistant patientId={PATIENT_ID} currentWeek={currentWeek}/></div>
      </>}
    </main></div>
    <footer className="footer page-width"><span className="wordmark">✳ TwinLabs.</span><p>Demo patient data is synthetic. Check-ins are simulated. Trial facts come from the public TAILORx record. Weekly visits are simulated. Predictions are mock outputs, not clinical guidance.</p><span>DESIGNED FOR THE PATIENT JOURNEY</span></footer>
  </div>
}
