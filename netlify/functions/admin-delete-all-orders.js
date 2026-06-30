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
    const confirmation = String(body.confirmation || '').trim()

    if (confirmation !== 'SUPPRIMER') {
      return json(400, {
        ok: false,
        error: 'Confirmation invalide',
      })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('orders')
      .delete()
      .not('id', 'is', null)
      .select('*')

    if (error) {
      throw new Error(error.message)
    }

    return json(200, {
      ok: true,
      deletedCount: data?.length || 0,
      message: `${data?.length || 0} commande(s) supprimée(s).`,
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}