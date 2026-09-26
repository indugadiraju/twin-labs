import { useState } from 'react'
import { api } from '../api'

const COMMON_SYMPTOMS = ['Fatigue', 'Nausea', 'Pain', 'Fever', 'Shortness of breath']

export default function CheckInForm({ patientId, currentWeek, onSubmitted }) {
  const [week, setWeek] = useState(currentWeek || 1)
  const [wellbeing, setWellbeing] = useState(7)
  const [symptomSeverity, setSymptomSeverity] = useState({})
  const [freeText, setFreeText] = useState('')
  const [status, setStatus] = useState(null) // 'saving' | 'saved' | 'error'
  const [error, setError] = useState('')

  const toggleSymptom = (name, checked) => {
    setSymptomSeverity((prev) => {
      const next = { ...prev }
      if (checked) next[name] = next[name] ?? 3
      else delete next[name]
      return next
    })
  }

  const setSeverity = (name, value) => {
    setSymptomSeverity((prev) => ({ ...prev, [name]: Number(value) }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setStatus('saving')
    setError('')
    try {
      const symptoms = Object.entries(symptomSeverity).map(([name, severity]) => ({
        name,
        severity,
      }))
      const result = await api.submitCheckin(patientId, {
        week: Number(week),
        overall_wellbeing: Number(wellbeing),
        symptoms,
        free_text: freeText || null,
      })
      setStatus('saved')
      onSubmitted?.(result.twin)
    } catch (err) {
      setStatus('error')
      setError(err.message)
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Weekly Check-In</h2>

      <label>
        Week
        <input
          type="number"
          min="1"
          max="4"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
        />
      </label>

      <label>
        Overall wellbeing today (0 = worst, 10 = best): <strong>{wellbeing}</strong>
        <input
          type="range"
          min="0"
          max="10"
          value={wellbeing}
          onChange={(e) => setWellbeing(e.target.value)}
        />
      </label>

      <fieldset>
        <legend>Symptoms to report</legend>
        {COMMON_SYMPTOMS.map((name) => (
          <div key={name} className="symptom-row">
            <label>
              <input
                type="checkbox"
                checked={name in symptomSeverity}
                onChange={(e) => toggleSymptom(name, e.target.checked)}
              />
              {name}
            </label>
            {name in symptomSeverity && (
              <input
                type="range"
                min="0"
                max="10"
                value={symptomSeverity[name]}
                onChange={(e) => setSeverity(name, e.target.value)}
              />
            )}
            {name in symptomSeverity && <span>{symptomSeverity[name]}/10</span>}
          </div>
        ))}
      </fieldset>

      <label>
        Anything else you'd like to share?
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={3}
          placeholder="Optional"
        />
      </label>

      <button type="submit" disabled={status === 'saving'}>
        {status === 'saving' ? 'Submitting...' : 'Submit check-in'}
      </button>

      {status === 'saved' && <p className="ok">Check-in submitted — your twin has been updated.</p>}
      {status === 'error' && <p className="err">{error}</p>}
    </form>
  )
}
