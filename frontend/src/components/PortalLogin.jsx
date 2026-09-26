import { useState } from 'react'
import TwinFlow from './TwinFlow'
import './PortalLogin.css'

export default function PortalLogin({ onEnter }) {
  const [portal, setPortal] = useState('patient')

  const signIn = (event) => {
    event.preventDefault()
    onEnter(portal)
  }

  return <main className="portal-screen">
    <section className="portal-story">
      <a className="portal-brand" href="#portal-home"><span>✳</span> TwinLabs<span className="portal-brand-dot">.</span></a>
      <div className="portal-story-copy">
        <p className="portal-kicker">A CLEARER VIEW OF EVERY STUDY</p>
        <h1>One study.<br /><em>Two perspectives.</em></h1>
        <p>Personalized support for participants. A longitudinal view for the people advancing research.</p>
      </div>
      <div className="portal-art"><TwinFlow /></div>
      <div className="portal-story-footer"><span>PATIENT-CENTERED</span><span>RESEARCH-READY</span></div>
    </section>

    <section className="portal-auth" id="portal-home" aria-labelledby="portal-title">
      <div className="portal-auth-inner">
        <p className="portal-kicker portal-kicker-dark">WELCOME BACK</p>
        <h2 id="portal-title">Sign in to TwinLabs</h2>
        <p className="portal-auth-intro">Choose the space that fits your role.</p>

        <div className="portal-choice" role="tablist" aria-label="Choose a portal">
          <button type="button" role="tab" aria-selected={portal === 'patient'} className={portal === 'patient' ? 'selected' : ''} onClick={() => setPortal('patient')}><span className="portal-choice-icon">01</span><span><strong>Patient</strong><small>Your study, in focus</small></span></button>
          <button type="button" role="tab" aria-selected={portal === 'researcher'} className={portal === 'researcher' ? 'selected' : ''} onClick={() => setPortal('researcher')}><span className="portal-choice-icon">02</span><span><strong>Researcher</strong><small>Trial intelligence</small></span></button>
        </div>

        <form className="portal-form" onSubmit={signIn}>
          <label htmlFor="portal-email">Work or study email</label>
          <input id="portal-email" name="email" type="email" placeholder="name@example.com" autoComplete="username" required />
          <div className="portal-password-label"><label htmlFor="portal-password">Password</label><button type="button" onClick={() => document.getElementById('portal-password')?.focus()}>Forgot?</button></div>
          <input id="portal-password" name="password" type="password" placeholder="Enter your password" autoComplete="current-password" required />
          <button className="portal-submit" type="submit">Continue to {portal} portal <span aria-hidden="true">↗</span></button>
        </form>

        <div className="portal-divider"><span>OR EXPLORE THE DEMO</span></div>
        <div className="portal-demo-actions"><button type="button" onClick={() => onEnter('patient')}>Patient demo <span aria-hidden="true">↗</span></button><button type="button" onClick={() => onEnter('researcher')}>Researcher demo <span aria-hidden="true">↗</span></button></div>
        <p className="portal-demo-note">Prototype access only. Sign-in is illustrative; no credentials are verified.</p>
      </div>
      <footer className="portal-auth-footer"><span>© TWINLABS · DEMO ENVIRONMENT</span><span>PRIVACY · SUPPORT</span></footer>
    </section>
  </main>
}