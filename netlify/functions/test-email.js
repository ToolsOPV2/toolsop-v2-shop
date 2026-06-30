import { json } from './_products.js'
import { sendDeliveryEmail } from './_email.js'

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

    const secret = body.secret
    const to = body.to

    if (!process.env.EMAIL_TEST_SECRET) {
      return json(500, {
        ok: false,
        error: 'EMAIL_TEST_SECRET manquant dans le fichier .env',
      })
    }

    if (secret !== process.env.EMAIL_TEST_SECRET) {
      return json(401, {
        ok: false,
        error: 'Secret de test incorrect',
      })
    }

    const product = {
      name: 'Test Email ToolsOp V2',
      deliveryTitle: 'Email de test',
      deliveryMessage:
        'Si tu reçois cet email, ton système email fonctionne correctement. On pourra ensuite le brancher sur PayPal.',
    }

    const order = {
      paypalOrderId: 'TEST-' + Date.now(),
      amount: '0.00',
      currency: 'EUR',
    }

    const email = await sendDeliveryEmail({
      to,
      product,
      order,
    })

    return json(200, {
      ok: email.sent,
      email,
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}