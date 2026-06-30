import { requireAdmin } from './_admin-auth.js'
import { getSupabase } from './_supabase.js'
import { json } from './_products.js'

function normalizeOrder(order) {
  return {
    id: order.id,
    paypal_order_id: order.paypal_order_id || order.id,
    paypal_capture_id: order.paypal_capture_id || null,

    product_id: order.product_id || '',
    product_name:
      order.product_name ||
      order.productName ||
      order.products?.name ||
      'Article inconnu',

    customer_email:
      order.customer_email ||
      order.customerEmail ||
      order.email ||
      'Email inconnu',

    amount: Number(order.amount || order.price || 0),
    currency: order.currency || 'EUR',
    status: order.status || 'PENDING_MANUAL',

    email_sent: Boolean(order.email_sent || order.emailSent),
    email_id: order.email_id || order.emailId || null,
    email_error: order.email_error || order.emailError || null,

    paid_at: order.paid_at || order.paidAt || order.created_at || order.saved_at || null,
    saved_at: order.saved_at || order.savedAt || order.created_at || order.paid_at || null,
    created_at: order.created_at || order.saved_at || order.paid_at || null,
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })

  if (event.httpMethod !== 'GET') {
    return json(405, {
      ok: false,
      error: 'Méthode non autorisée',
    })
  }

  try {
    const adminResult = await requireAdmin(event)

    if (adminResult?.statusCode) {
      return adminResult
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        products (
          id,
          name,
          slug
        )
      `)
      .order('saved_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return json(200, {
      ok: true,
      orders: (data || []).map(normalizeOrder),
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}