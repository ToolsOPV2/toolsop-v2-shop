import { json } from './_products.js'

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'vttobj@gmail.com'

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })

  if (event.httpMethod !== 'POST') {
    return json(405, {
      ok: false,
      error: 'Méthode non autorisée',
    })
  }

  try {
    const body = JSON.parse(event.body || '{}')

    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim()
    const message = String(body.message || '').trim()

    if (!name) {
      return json(400, {
        ok: false,
        error: 'Nom manquant',
      })
    }

    if (!isValidEmail(email)) {
      return json(400, {
        ok: false,
        error: 'Email invalide',
      })
    }

    if (!message || message.length < 2) {
      return json(400, {
        ok: false,
        error: 'Message trop court',
      })
    }

    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return json(500, {
        ok: false,
        error: 'RESEND_API_KEY manquant',
      })
    }

    const from = process.env.EMAIL_FROM || 'ToolsOp V2 <onboarding@resend.dev>'

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f4f4f5;padding:24px;color:#111;">
        <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:18px;padding:24px;border:1px solid #e5e5e5;">
          <h1 style="margin:0 0 12px;">Nouveau message ToolsOp V2</h1>

          <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
          <p><strong>Email :</strong> ${escapeHtml(email)}</p>

          <div style="margin-top:18px;padding:16px;border-radius:14px;background:#f7f7f8;">
            <strong>Message :</strong>
            <p style="white-space:pre-wrap;line-height:1.6;">${escapeHtml(message)}</p>
          </div>
        </div>
      </div>
    `

    const text = `
Nouveau message ToolsOp V2

Nom : ${name}
Email : ${email}

Message :
${message}
    `.trim()

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: SUPPORT_EMAIL,
        reply_to: email,
        subject: `Nouveau message ToolsOp V2 - ${name}`,
        html,
        text,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Erreur Resend')
    }

    return json(200, {
      ok: true,
      message: 'Message envoyé.',
      emailId: data.id || null,
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}