import { useState } from 'react'
import { api } from '../api'

const EXAMPLE_QUESTIONS = [
  'What happens at my Week 2 visit?',
  'Do I need to fast before my blood test?',
  'How long does the trial last?',
  'What symptoms should I report?',
  'When is my next visit?',
]

export default function TrialAssistant({ patientId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm the Trial Assistant. Ask me about your visits, schedule, or what to report. I can't make treatment decisions — for anything about starting, stopping, or changing treatment, I'll point you to your study team.",
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const send = async (question) => {
    const q = question ?? input
    if (!q.trim()) return
    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setInput('')
    setBusy(true)
    try {
      const result = await api.askAssistant(patientId, q)
      setMessages((prev) => [...prev, { role: 'assistant', text: result.answer }])
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Sorry, something went wrong: ${err.message}` }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      <h2>Trial Assistant</h2>

      <div className="chat-log">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="examples">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button key={q} type="button" className="chip" onClick={() => send(q)} disabled={busy}>
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="chat-input"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your trial..."
          disabled={busy}
        />
        <button type="submit" disabled={busy}>
          Send
        </button>
      </form>
    </div>
  )
}
