import { useEffect, useState } from 'react'
import { api } from './api'
import CheckInForm from './components/CheckInForm'
import JourneyTimeline from './components/JourneyTimeline'
import TrialAssistant from './components/TrialAssistant'
import './App.css'

const DEMO_PATIENT_ID = 'pt_demo_patient'

export default function App() {
  const [twin, setTwin] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadTimeline = async () => {
    const t = await api.getTimeline(DEMO_PATIENT_ID)
    setTimeline(t)
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        let t
        try {
          t = await api.getTwin(DEMO_PATIENT_ID)
        } catch {
          t = await api.createTwin(DEMO_PATIENT_ID)
        }
        setTwin(t)
        await loadTimeline()
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [])

  const handleCheckinSubmitted = async (updatedTwin) => {
    setTwin(updatedTwin)
    await loadTimeline()
  }

  if (loading) return <div className="app-shell">Loading your twin...</div>

  return (
    <div className="app-shell">
      <header>
        <h1>TwinLab — Patient View</h1>
        <p className="muted">Demo breast cancer trial · Patient {twin?.patient_id}</p>
      </header>

      <main className="grid">
        <CheckInForm
          patientId={DEMO_PATIENT_ID}
          currentWeek={twin?.current_week}
          onSubmitted={handleCheckinSubmitted}
        />
        <JourneyTimeline timeline={timeline} onRefresh={loadTimeline} />
        <TrialAssistant patientId={DEMO_PATIENT_ID} />
      </main>
    </div>
  )
}
