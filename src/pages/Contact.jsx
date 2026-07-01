import { useState } from 'react'

const SUPPORT_EMAIL = 'vttobj@gmail.com'
const DISCORD_INVITE = 'https://discord.gg/P3SE53Druv'

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
  })

  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  async function submitContact(event) {
    event.preventDefault()

    try {
      setSending(true)
      setSuccess('')
      setError('')

      const response = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Impossible d’envoyer le message')
      }

      setSuccess('Message envoyé avec succès. Je te répondrai rapidement.')
      setForm({
        name: '',
        email: '',
        message: '',
      })
    } catch (error) {
      setError(error.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="section page-section">
      <div className="container">
        <div className="section-heading">
          <span className="eyebrow">Contact</span>
          <h1>Besoin d’aide ?</h1>
          <p>
            Contacte le support ToolsOp V2 pour une question, une commande ou une demande d’aide.
          </p>
        </div>

        <div className="contact-grid">
          <div className="glass-card contact-card">
            <span className="contact-icon">💬</span>
            <h2>Discord</h2>
            <p>Rejoins le serveur Discord pour contacter le support plus rapidement.</p>

            <a className="btn btn-primary full" href={DISCORD_INVITE}>
              Rejoindre le Discord
            </a>
          </div>

          <div className="glass-card contact-card">
            <span className="contact-icon">📧</span>
            <h2>Email</h2>
            <p>Tu peux aussi contacter le support par email.</p>

            <a className="contact-email" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>

        <div className="glass-card contact-form-card">
          <h2>Envoyer un message</h2>

          <form className="contact-form" onSubmit={submitContact}>
            <label>
              Nom
              <input
                type="text"
                placeholder="Ton nom"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                placeholder="tonemail@gmail.com"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Message
              <textarea
                placeholder="Écris ton message ici..."
                value={form.message}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                required
              />
            </label>

            {error && <div className="error-box">{error}</div>}
            {success && <div className="success-box">{success}</div>}

            <button className="btn btn-primary full" type="submit" disabled={sending}>
              {sending ? 'Envoi...' : 'Envoyer le message'}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}