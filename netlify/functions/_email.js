function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function buildEmailText({ product, order }) {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com'

  return `
Bonjour,

Votre commande a bien été confirmée.

Produit : ${product.name}
Montant : ${order.amount} ${order.currency}
Référence : ${order.paypalOrderId || 'test-email'}

Détails du service :
${product.deliveryMessage || 'Votre commande est validée. Le service sera traité rapidement.'}

Pour toute question, vous pouvez répondre à cet email ou contacter :
${supportEmail}

Merci,
ToolsOp V2
  `.trim()
}

function buildEmailHtml({ product, order }) {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com'
  const orderId = order.paypalOrderId || 'test-email'

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Confirmation de commande</title>
  </head>

  <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111111;">
    <div style="max-width:640px;margin:0 auto;padding:28px 14px;">
      <div style="background:#ffffff;border:1px solid #e5e5e5;border-radius:16px;padding:28px;">
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:#111111;">
          Confirmation de commande
        </h1>

        <p style="margin:0 0 22px;color:#444444;font-size:15px;line-height:1.7;">
          Bonjour, votre commande a bien été confirmée. Vous trouverez les détails ci-dessous.
        </p>

        <div style="border:1px solid #eeeeee;border-radius:12px;padding:18px;margin-bottom:18px;background:#fafafa;">
          <p style="margin:0 0 6px;color:#777777;font-size:13px;">
            Produit
          </p>

          <h2 style="margin:0 0 10px;color:#111111;font-size:20px;">
            ${escapeHtml(product.name)}
          </h2>

          <p style="margin:0;color:#111111;font-size:17px;font-weight:bold;">
            ${escapeHtml(order.amount)} ${escapeHtml(order.currency)}
          </p>
        </div>

        <div style="border:1px solid #eeeeee;border-radius:12px;padding:18px;margin-bottom:18px;">
          <p style="margin:0 0 6px;color:#777777;font-size:13px;">
            Détails du service
          </p>

          <p style="margin:0;color:#333333;font-size:15px;line-height:1.7;">
            ${escapeHtml(product.deliveryMessage || 'Votre commande est validée. Le service sera traité rapidement.')}
          </p>
        </div>

        <div style="border:1px solid #eeeeee;border-radius:12px;padding:16px;margin-bottom:18px;background:#fafafa;">
          <p style="margin:0 0 6px;color:#777777;font-size:13px;">
            Référence
          </p>

          <p style="margin:0;color:#111111;font-size:14px;word-break:break-all;">
            ${escapeHtml(orderId)}
          </p>
        </div>

        <p style="margin:0;color:#555555;font-size:14px;line-height:1.7;">
          Pour toute question, vous pouvez répondre directement à cet email ou contacter :
          <a href="mailto:${escapeHtml(supportEmail)}" style="color:#111111;">
            ${escapeHtml(supportEmail)}
          </a>
        </p>
      </div>

      <p style="text-align:center;color:#888888;font-size:12px;margin:16px 0 0;">
        ToolsOp V2
      </p>
    </div>
  </body>
</html>
  `
}

export async function sendDeliveryEmail({ to, product, order }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM || 'ToolsOp V2 <onboarding@resend.dev>'
  const replyTo = process.env.SUPPORT_EMAIL || undefined

  if (!to || !isValidEmail(to)) {
    return {
      sent: false,
      skipped: true,
      reason: 'Email client invalide ou manquant',
    }
  }

  if (!apiKey || apiKey === 're_ta_cle_api_resend') {
    return {
      sent: false,
      skipped: true,
      reason: 'RESEND_API_KEY manquant ou non configuré',
    }
  }

  const subject = `Confirmation de commande - ${product.name}`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Resend-Idempotency-Key': `toolsop-${order.paypalOrderId || Date.now()}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html: buildEmailHtml({ product, order }),
      text: buildEmailText({ product, order }),
      reply_to: replyTo,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      sent: false,
      skipped: false,
      reason: data.message || data.error || 'Erreur Resend pendant l’envoi email',
      details: data,
    }
  }

  return {
    sent: true,
    skipped: false,
    id: data.id,
  }
}