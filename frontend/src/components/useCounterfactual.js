import { useEffect, useState } from 'react'
import { api } from '../api'

// Single client-side entry point to the counterfactual engine, shared by the
// twin pages and both What-If Studios. Loads the no-change (100%) trajectory
// on mount and whenever `refreshKey` changes (e.g. after a check-in).
export function useCounterfactual(patientId, refreshKey) {
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    api.runCounterfactual(patientId, { variable: 'dose_pct', value: 100 })
      .then((data) => live && setResult(data))
      .catch((err) => live && setError(err.message))
      .finally(() => live && setBusy(false))
    return () => { live = false }
  }, [patientId, refreshKey])

  const run = async (dose) => {
    setBusy(true)
    setError('')
    try {
      const data = await api.runCounterfactual(patientId, { variable: 'dose_pct', value: dose })
      setResult(data)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  return {
    result,
    busy,
    error,
    run,
    original: result?.original.trajectory || [],
    modified: result?.modified.trajectory || [],
    ranDose: result?.change?.to ?? 100,
  }
}
