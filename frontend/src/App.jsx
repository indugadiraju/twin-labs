import { useEffect, useState } from 'react'
import { api } from './api'
import CheckInForm from './components/CheckInForm'
import JourneyTimeline from './components/JourneyTimeline'
import PatientBaseline from './components/PatientBaseline'
import ResearcherDashboard from './components/ResearcherDashboard'
import TrialAssistant from './components/TrialAssistant'
import TwinSnapshot from './components/TwinSnapshot'
import './App.css'

const PATIENT_ID = 'pt_demo_patient'
const labels = { stable: 'Stable', watch: 'Watch', needs_attention: 'Needs attention' }

export default function App() {
  const [view, setView] = useState('patient')
  const [twin, setTwin] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [update, setUpdate] = useState(null)
  const refresh = async () => setTimeline(await api.getTimeline(PATIENT_ID))

  useEffect(() => {
    async function start() {
      try {
        let patient
        try { patient = await api.getTwin(PATIENT_ID) }
        catch { patient = await api.createTwin(PATIENT_ID) }
        setTwin(patient)
        await refresh()
      } catch (err) { setError(err.message) }
      finally { setLoading(false) }
    }
    start()
  }, [])
  const onSubmitted = async (next, checkin) => {
    setUpdate({ previous: twin, current: next, checkin })
    setTwin(next)
    try { await refresh() } catch (err) { setError(err.message) }
  }
  const latest = timeline?.weeks?.filter((w) => w.checkin).at(-1)?.checkin
  const currentWeek = twin?.current_week || 1
  if (view === 'researcher') return <ResearcherDashboard patientId={PATIENT_ID} onPatientView={() => setView('patient')} />
  return <div className="site-shell">
    <div className="hero-wrap">
      <nav className="topbar page-width" aria-label="Main navigation"><a className="wordmark" href="#top"><span className="brand-mark">✳</span> twinlab<span className="wordmark-dot">.</span></a><div className="topbar-right"><div className="experience-switch" aria-label="Experience switcher"><button type="button" className="selected" aria-current="page">Patient</button><button type="button" onClick={() => setView('researcher')}>Researcher</button></div><span className="avatar" aria-label="Demo patient Maya">M</span></div></nav>
      <header className="hero page-width" id="top"><div className="hero-copy"><p className="eyebrow">YOUR STUDY, IN FOCUS <span className="eyebrow-line" /></p><h1>Good morning,<br /><em>Maya.</em></h1><p className="hero-subtitle">Week {currentWeek} of your study</p><p className="hero-description">Your twin is keeping track of how you are changing between visits.</p><a className="hero-link" href="#journey">Explore your journey <span aria-hidden="true">↗</span></a></div><div className="hero-orbit" aria-hidden="true"><div className="orbit-core"><span>YOUR<br />DIGITAL<br />TWIN</span></div><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" /></div><div className="hero-bottom"><span>ONE WEEK AT A TIME</span><span>01 / 04</span></div></header>
    </div>
    <main><div className="summary-strip page-width" aria-label="Patient summary"><div><span className="summary-label">CURRENT WEEK</span><strong>{String(currentWeek).padStart(2, '0')} <small>/ 04</small></strong></div><div><span className="summary-label">TWIN STATUS</span><strong><span className={`status-dot ${twin?.status || 'stable'}`} />{labels[twin?.status] || 'Loading'}</strong></div><div><span className="summary-label">LAST CHECK-IN</span><strong>{latest ? new Date(latest.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Not yet'}</strong></div><div><span className="summary-label">NEXT MILESTONE</span><strong>{timeline?.weeks?.find((w) => w.week >= currentWeek && w.visit)?.visit?.title || 'View journey'}</strong></div></div>
      {error && <div className="error-banner page-width" role="alert">We could not load your twin. {error} <button onClick={() => window.location.reload()}>Try again</button></div>}
      {loading ? <div className="loading-state page-width" role="status"><div className="skeleton skeleton-title" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-panel" /></div> : <><JourneyTimeline timeline={timeline} onRefresh={refresh} /><PatientBaseline baseline={twin?.synthetic_baseline} /><section className="care-section" id="check-in"><div className="page-width care-grid"><div className="care-intro"><p className="eyebrow">A MOMENT TO CHECK IN</p><h2>Every detail<br /><em>matters.</em></h2><p>Your weekly check-in helps your twin reflect how you feel between visits.</p><div className="care-decoration" aria-hidden="true">✳</div></div><CheckInForm patientId={PATIENT_ID} currentWeek={currentWeek} onSubmitted={onSubmitted} update={update} /></div></section><TwinSnapshot twin={twin} checkin={latest} /><TrialAssistant patientId={PATIENT_ID} /></>}
    </main><footer className="footer page-width"><span className="wordmark">✳ twinlab.</span><p>Demo patient data is synthetic. Check-ins are simulated for this hackathon. Trial facts come from the public TAILORx record. Weekly visits are simulated. Predictions are mock outputs, not clinical guidance.</p><span>DESIGNED FOR THE PATIENT JOURNEY</span></footer>
  </div>
}
