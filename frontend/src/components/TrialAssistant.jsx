import { useState } from 'react'
import { api } from '../api'

const QUESTIONS = ['What happens at my next visit?', 'Do I need to fast?', 'What symptoms should I report?', 'How long does the study last?']
export default function TrialAssistant({ patientId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async (question) => {
    const value = (question ?? input).trim()
    if (!value || busy) return
    setMessages((old) => [...old, { role: 'user', text: value }])
    setInput('')
    setBusy(true)
    try { const response = await api.askAssistant(patientId, value); setMessages((old) => [...old, { role: 'assistant', text: response.answer }]) }
    catch (err) { setMessages((old) => [...old, { role: 'error', text: `Sorry, something went wrong: ${err.message}` }]) }
    finally { setBusy(false) }
  }
  return <section className="assistant-section" id="assistant"><div className="page-width assistant-layout"><div className="assistant-intro"><p className="eyebrow">HERE WHEN YOU NEED CLARITY</p><h2>Answers for the<br /><em>in-between.</em></h2><p>Ask about visits, study details, and what to report. For treatment decisions, contact your study team.</p><div className="assistant-art" aria-hidden="true">✳</div></div><div className="assistant-panel"><div className="assistant-header"><div className="assistant-symbol">✳</div><div><strong>Ask TwinLab about your study</strong><span>TRIAL INFORMATION ASSISTANT</span></div><i className="online-dot" /></div><div className="chat-log" aria-live="polite">{messages.length === 0 && <div className="chat-welcome"><span>✳</span><h3>What would you like to know?</h3><p>Choose a question below or ask your own.</p></div>}{messages.map((message, index) => <div key={index} className={`chat-message ${message.role}`}><span className="message-label">{message.role === 'user' ? 'YOU' : message.role === 'error' ? 'ERROR' : 'TWINLAB · STUDY INFORMATION'}</span><p>{message.text}</p></div>)}{busy && <div className="chat-message assistant loading-answer"><span className="message-label">TWINLAB</span><div className="typing-dots"><i /><i /><i /></div></div>}</div><div className="suggestions">{QUESTIONS.map((question) => <button type="button" key={question} onClick={() => send(question)} disabled={busy}>{question} <span>↗</span></button>)}</div><form className="assistant-input" onSubmit={(event) => { event.preventDefault(); send() }}><label className="sr-only" htmlFor="question">Ask anything about your trial</label><input id="question" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask anything about your trial…" disabled={busy} /><button type="submit" disabled={busy || !input.trim()} aria-label="Send question">↗</button></form><p className="assistant-disclaimer">Trial facts use the public TAILORx record. Weekly visits are simulated. Treatment decisions belong with your study team.</p></div></div></section>
}
