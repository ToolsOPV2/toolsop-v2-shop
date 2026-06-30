import { getProduct, isInStock, json } from './_products.js'
import { getSupabase } from './_supabase.js'

const CURRENCY = 'EUR'

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function createManualOrderId() {
  const random = Math.random().toString(36).slice(2, 10)
  return `manual_${Date.now()}_${random}`
}

function getEmailFrom() {
  return process.env.EMAIL_FROM || 'ToolsOp V2 <onboarding@resend.dev>'
}

function getAdminNotifyEmail() {
  return process.env.ADMIN_NOTIFY_EMAIL || process.env.SUPPORT_EMAIL || 'vttobj@gmail.com'
}

function formatPrice(amount, currency = 'EUR') {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency,
  }).format(Number(amount || 0))
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat('fr-BE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

async function sendAdminNewOrderEmail({ order }) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY manquant')
  }

  const adminEmail = getAdminNotifyEmail()
  const subject = `Nouvelle commande en attente - ${order.product_name}`

  const html = `
    <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#111;">
      <div style="max-width:640px;margin:0 auto;padding:28px;">
        <div style="background:#08080a;color:#fff;border-radius:22px;padding:26px;border:1px solid #2a2a2f;">
          <h1 style="margin:0 0 10px;font-size:26px;">ToolsOp V2</h1>
          <p style="margin:0;color:#b8b8c0;">Nouvelle commande PayPal.Me créée.</p>
        </div>

        <div style="background:#fff;border-radius:22px;padding:26px;margin-top:18px;border:1px solid #e5e5e5;">
          <h2 style="margin:0 0 16px;font-size:22px;">Commande en attente</h2>

          <p style="line-height:1.7;margin:0 0 16px;">
            Un client vient de cliquer sur le bouton PayPal.Me. Vérifie le paiement PayPal avant de marquer la commande comme effectuée.
          </p>

          <div style="background:#f7f7f8;border-radius:16px;padding:16px;margin:18px 0;">
            <p style="margin:0 0 10px;"><strong>Article :</strong> ${order.product_name}</p>
            <p style="margin:0 0 10px;"><strong>Email client :</strong> ${order.customer_email}</p>
            <p style="margin:0 0 10px;"><strong>Montant :</strong> ${formatPrice(order.amount, order.currency)}</p>
            <p style="margin:0 0 10px;"><strong>Statut :</strong> ${order.status}</p>
            <p style="margin:0 0 10px;"><strong>Date :</strong> ${formatDate(order.saved_at || order.paid_at)}</p>
            <p style="margin:0;"><strong>ID commande :</strong> ${order.paypal_order_id}</p>
          </div>

          <p style="line-height:1.7;margin:0;">
            Va dans ton panel admin pour valider ou supprimer la commande.
          </p>
        </div>

        <p style="text-align:center;color:#777;margin-top:18px;font-size:13px;">
          Notification automatique ToolsOp V2.
        </p>
      </div>
    </div>
  `

  const text = `
Nouvelle commande ToolsOp V2

Article : ${order.product_name}
Email client : ${order.customer_email}
Montant : ${formatPrice(order.amount, order.currency)}
Statut : ${order.status}
Date : ${formatDate(order.saved_at || order.paid_at)}
ID commande : ${order.paypal_order_id}

Vérifie le paiement PayPal.Me avant de marquer la commande comme effectuée.
  `.trim()

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: adminEmail,
      subject,
      html,
      text,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Erreur envoi email admin')
  }

  return data
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

    const productId = String(body.productId || '').trim()
    const productSlug = String(body.productSlug || '').trim()
    const customerEmail = String(body.customerEmail || '').trim()

    if (!productId && !productSlug) {
      return json(400, {
        ok: false,
        error: 'productId ou productSlug manquant',
      })
    }

    if (!isValidEmail(customerEmail)) {
      return json(400, {
        ok: false,
        error: 'Email client invalide',
      })
    }

    let product = null

    if (productId) {
      product = await getProduct(productId)
    }

    if (!product && productSlug) {
      product = await getProduct(productSlug)
    }

    if (!product) {
      return json(404, {
        ok: false,
        error: `Produit introuvable côté serveur: ${productId || productSlug}`,
      })
    }

    if (!isInStock(product)) {
      return json(409, {
        ok: false,
        error: 'Ce produit est actuellement en rupture de stock.',
      })
    }

    const price = Number(product.price || 0)

    if (!Number.isFinite(price) || price <= 0) {
      return json(400, {
        ok: false,
        error: 'Prix produit invalide',
      })
    }

    const supabase = getSupabase()
    const manualOrderId = createManualOrderId()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('orders')
      .insert({
        paypal_order_id: manualOrderId,
        paypal_capture_id: null,
        product_id: product.id,
        product_name: product.name,
        customer_email: customerEmail,
        amount: price,
        currency: product.currency || CURRENCY,
        status: 'PENDING_MANUAL',
        email_sent: false,
        email_id: null,
        email_error: 'En attente de vérification PayPal.Me',
        paid_at: now,
        saved_at: now,
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    let adminNotification = {
      sent: false,
      id: null,
      error: null,
    }

    try {
      const emailResult = await sendAdminNewOrderEmail({
        order: data,
      })

      adminNotification = {
        sent: true,
        id: emailResult.id || null,
        error: null,
      }
    } catch (emailError) {
      adminNotification = {
        sent: false,
        id: null,
        error: emailError.message,
      }
    }

    return json(200, {
      ok: true,
      order: data,
      manualOrderId,
      adminNotification,
      message: adminNotification.sent
        ? 'Commande ajoutée dans l’historique et notification admin envoyée.'
        : 'Commande ajoutée dans l’historique, mais notification admin non envoyée.',
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}