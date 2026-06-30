import { getProduct, json } from './_products.js'
import { paypalRequest } from './_paypal.js'
import { sendDeliveryEmail } from './_email.js'
import { saveServerOrder } from './_orders.js'

function normalizeAmount(value) {
  return Number.parseFloat(value || '0').toFixed(2)
}

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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
    const orderID = body.orderID
    const productId = body.productId
    const customerEmail = String(body.customerEmail || '').trim()

    if (!orderID || !productId) {
      return json(400, {
        ok: false,
        error: 'orderID ou productId manquant',
      })
    }

    if (!isValidEmail(customerEmail)) {
      return json(400, {
        ok: false,
        error: 'Email client invalide',
      })
    }

    const product = await getProduct(productId)

    if (!product) {
      return json(404, {
        ok: false,
        error: 'Produit introuvable côté serveur',
      })
    }

    const capture = await paypalRequest(`/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const unit = capture.purchase_units?.[0]
    const payment = unit?.payments?.captures?.[0]

    const statusOk = capture.status === 'COMPLETED' && payment?.status === 'COMPLETED'
    const amountOk = normalizeAmount(payment?.amount?.value) === normalizeAmount(product.priceString)
    const currencyOk = payment?.amount?.currency_code === product.currency
    const productOk = unit?.reference_id === product.id || unit?.custom_id === product.id

    if (!statusOk || !amountOk || !currencyOk || !productOk) {
      return json(400, {
        ok: false,
        error: 'Paiement refusé : statut, montant, devise ou produit incorrect',
        checks: {
          statusOk,
          amountOk,
          currencyOk,
          productOk,
        },
      })
    }

    let order = {
      paypalOrderId: orderID,
      paypalCaptureId: payment.id,
      productId: product.id,
      productName: product.name,
      amount: product.priceString,
      currency: product.currency,
      customerEmail,
      status: 'PAID',
      paidAt: new Date().toISOString(),
    }

    const email = await sendDeliveryEmail({
      to: customerEmail,
      product,
      order,
    })

    order = {
      ...order,
      emailSent: Boolean(email.sent),
      emailId: email.id || null,
      emailError: email.reason || null,
    }

    const savedOrder = await saveServerOrder(order)

    return json(200, {
      ok: true,
      message: email.sent
        ? 'Paiement vérifié. Commande payée et email envoyé.'
        : 'Paiement vérifié. Commande payée, mais email non envoyé.',
      order: savedOrder,
      email,
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}