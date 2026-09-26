import { useEffect, useState } from 'react'
import { api } from './api'
import CheckInForm from './components/CheckInForm'
import JourneyTimeline from './components/JourneyTimeline'
import PatientBaseline from './components/PatientBaseline'
import ResearcherShell from './components/ResearcherShell'
import TrialAssistant from './components/TrialAssistant'
import TwinFlow from './components/TwinFlow'
import TwinSnapshot from './components/TwinSnapshot'
import './App.css'

const PATIENT_ID = 'pt_demo_patient'
const labels = { stable: 'Stable', watch: 'Watch', needs_attention: 'Needs attention' }

export default function App() {
  const [twin, setTwin] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [update, setUpdate] = useState(null)
  const [flowVersion, setFlowVersion] = useState(0)
  const [mode, setMode] = useState('patient')
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    async function start() {
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
  }, [])
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
    } catch (err) { setError(err.message) }
    finally { setAdvancing(false) }
  }
  const currentWeek = twin?.current_week || 1
  const latest = timeline?.weeks?.filter((w) => w.checkin).at(-1)?.checkin
  const currentReport = timeline?.weeks?.find((w) => w.week === currentWeek)?.checkin
  const nextMilestone = timeline?.weeks?.find((w) => w.week > currentWeek && w.visit)?.visit?.title || 'Final demo week'
  return <div className="site-shell">
    <div className="hero-wrap">
      <nav className="topbar page-width" aria-label="Main navigation"><a className="wordmark" href="#top"><span className="brand-mark">✳</span> twinlab<span className="wordmark-dot">.</span></a><div className="topbar-right"><div className="mode-switch" role="group" aria-label="View mode"><button className={mode === 'patient' ? 'mode-active' : ''} aria-pressed={mode === 'patient'} onClick={() => setMode('patient')}>Patient View</button><button className={mode === 'researcher' ? 'mode-active' : ''} aria-pressed={mode === 'researcher'} onClick={() => setMode('researcher')}>Researcher View</button></div><span className="avatar" aria-label="Demo patient Maya">M</span></div></nav>
      {mode === 'patient' && <header className="hero page-width" id="top"><div className="hero-copy"><p className="eyebrow">YOUR STUDY, IN FOCUS <span className="eyebrow-line" /></p><h1>Good morning,<br /><em>Maya.</em></h1><p className="hero-subtitle">Week {currentWeek} of your study</p><p className="hero-description">Your twin is keeping track of how you are changing between visits.</p><a className="hero-link" href="#journey">Explore your journey <span aria-hidden="true">↗</span></a></div><TwinFlow key={flowVersion} active={flowVersion > 0} /><div className="hero-bottom"><span>ONE WEEK AT A TIME</span><span>{String(currentWeek).padStart(2, '0')} / 04</span></div></header>}
    </div>
    {mode === 'researcher' ? <ResearcherShell onReturn={() => setMode('patient')} /> : <main>
      <div className="summary-strip page-width" aria-label="Patient summary"><div><span className="summary-label">CURRENT WEEK</span><strong>{String(currentWeek).padStart(2, '0')} <small>/ 04</small></strong></div><div><span className="summary-label">TWIN STATUS</span><strong><span className={`status-dot ${twin?.status || 'stable'}`} />{labels[twin?.status] || 'Loading'}</strong></div><div><span className="summary-label">LAST CHECK-IN</span><strong>{latest ? new Date(latest.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Not yet'}</strong></div><div><span className="summary-label">NEXT MILESTONE</span><strong>{nextMilestone}</strong></div></div>
      {error && <div className="error-banner page-width" role="alert">{error} <button onClick={() => window.location.reload()}>Try again</button></div>}
      {loading ? <div className="loading-state page-width" role="status"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-panel" /></div> : <><JourneyTimeline key={currentWeek} timeline={timeline} baseline={twin?.synthetic_baseline} onRefresh={refresh} /><PatientBaseline baseline={twin?.synthetic_baseline} /><section className="care-section" id="check-in"><div className="page-width care-grid"><div className="care-intro"><p className="eyebrow">A MOMENT TO CHECK IN</p><h2>Every detail<br /><em>matters.</em></h2><p>Your weekly check-in helps your twin reflect how you feel between visits.</p><div className="care-decoration" aria-hidden="true">✳</div></div><CheckInForm key={currentWeek} patientId={PATIENT_ID} currentWeek={currentWeek} existingCheckin={currentReport} onSubmitted={onSubmitted} update={update} onAdvance={advanceWeek} advancing={advancing} /></div></section><TwinSnapshot twin={twin} checkin={currentReport} update={update} /><TrialAssistant patientId={PATIENT_ID} currentWeek={currentWeek} /></>}
    </main>}
    <footer className="footer page-width"><span className="wordmark">✳ twinlab.</span><p>Demo patient data is synthetic. Check-ins are simulated for this hackathon. Trial facts come from the public TAILORx record. Weekly visits are simulated. Predictions are mock outputs, not clinical guidance.</p><span>DESIGNED FOR THE PATIENT JOURNEY</span></footer>
  </div>
}
