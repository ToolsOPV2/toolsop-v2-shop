import { useState } from 'react'
import SectionTitle from '../components/SectionTitle.jsx'

export default function Contact() {
  const [sent, setSent] = useState(false)

  return (
    <section className="section page-section">
      <div className="container contact-grid">
        <div>
          <SectionTitle eyebrow="Contact" title="Besoin d’aide ?">
            Ajoute ton email, ton Discord ou tes liens de support ici pour que les clients puissent te contacter.
          </SectionTitle>
          <div className="contact-cards">
            <div className="glass-card contact-card">
              <span>💬</span>
              <strong>Discord</strong>
              <p>Ajoute ton lien d’invitation Discord dans ce bloc.</p>
            </div>
            <div className="glass-card contact-card">
              <span>📧</span>
              <strong>Email</strong>
              <p>support@toolsop-v2.example</p>
            </div>
          </div>
        </div>

        <form
          className="glass-card contact-form"
          onSubmit={(event) => {
            event.preventDefault()
            setSent(true)
          }}
        >
          <label>
            Nom
            <input required placeholder="Ton nom" />
          </label>
          <label>
            Email
            <input type="email" required placeholder="email@example.com" />
          </label>
          <label>
            Message
            <textarea required rows="6" placeholder="Explique ta demande..." />
          </label>
          {sent && <div className="success-box">Message simulé comme envoyé. Branche une vraie fonction email si besoin.</div>}
          <button className="btn btn-primary full">Envoyer</button>
        </form>
      </div>
    </section>
  )
}
