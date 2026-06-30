import { requireAdmin } from './_admin-auth.js'
import { getSupabase } from './_supabase.js'
import { json } from './_products.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })

  if (event.httpMethod !== 'POST') {
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

    const body = JSON.parse(event.body || '{}')
    const orderId = String(body.orderId || '').trim()
    const paypalOrderId = String(body.paypalOrderId || '').trim()

    if (!orderId && !paypalOrderId) {
      return json(400, {
        ok: false,
        error: 'orderId manquant',
      })
    }

    const supabase = getSupabase()

    let deleteQuery = supabase.from('orders').delete().select('*')

    if (orderId) {
      deleteQuery = deleteQuery.eq('id', orderId)
    } else {
      deleteQuery = deleteQuery.eq('paypal_order_id', paypalOrderId)
    }

    const { data, error } = await deleteQuery

    if (error) {
      throw new Error(error.message)
    }

    if (!data || data.length === 0) {
      return json(404, {
        ok: false,
        error: 'Commande introuvable',
      })
    }

    return json(200, {
      ok: true,
      deleted: data[0],
      message: 'Commande supprimée.',
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}