import { useState } from 'react'
import { answerResearchQuestion } from './researchInsights'

const prompts = ["Summarize Maya's changes since Week 1", 'Which symptoms worsened?', 'What signals need review?', 'Show the biggest longitudinal changes']
export default function ResearchAssistant({ timeline, twin }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const send = (value) => {
    const question = (value ?? input).trim()
    if (!question || busy) return
    setMessages((old) => [...old, { role: 'user', text: question }])
    setInput('')
    setBusy(true)
    window.setTimeout(() => {
      const response = answerResearchQuestion(question, timeline, twin)
      setMessages((old) => [...old, { role: 'assistant', ...response }])
      setBusy(false)
    }, 320)
  }
  return <section className="research-assistant"><div className="research-heading"><p className="eyebrow">STRUCTURED DEMO DATA</p><h2>Ask about the journey.</h2><p>Summaries draw from submitted check-ins and the current twin. No researcher model is connected.</p></div><div className="research-chat"><div className="research-chat-log" aria-live="polite">{messages.length === 0 && <div className="research-chat-empty"><span>✳</span><h3>What would you like to inspect?</h3><p>Choose a question or ask about recorded changes.</p></div>}{messages.map((message, index) => <div className={`research-message ${message.role}`} key={index}><small>{message.role === 'user' ? 'YOU' : 'TWINLABS · RESEARCH DEMO'}</small><p>{message.text}</p>{message.source && <span>{message.source}</span>}</div>)}{busy && <div className="research-message assistant"><small>READING STRUCTURED REPORTS</small><p>•••</p></div>}</div><div className="research-prompts">{prompts.map((prompt) => <button type="button" key={prompt} disabled={busy} onClick={() => send(prompt)}>{prompt} ↗</button>)}</div><form onSubmit={(event) => { event.preventDefault(); send() }}><label className="sr-only" htmlFor="research-question">Ask about demo patient data</label><input id="research-question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about changes, symptoms, or signals…" disabled={busy}/><button type="submit" disabled={busy || !input.trim()} aria-label="Send researcher question">↗</button></form><p className="research-chat-note">Demo-derived summaries only. No treatment recommendations or automated alerts.</p></div></section>
}
