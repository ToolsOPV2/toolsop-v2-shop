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
        paid_at: new Date().toISOString(),
        saved_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return json(200, {
      ok: true,
      order: data,
      manualOrderId,
      message: 'Commande ajoutée dans l’historique en attente.',
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}