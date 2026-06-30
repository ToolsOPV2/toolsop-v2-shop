import { json } from './_products.js'
import { getSupabase } from './_supabase.js'
import { requireAdmin } from './_admin-auth.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })

  if (event.httpMethod !== 'PATCH') {
    return json(405, {
      ok: false,
      error: 'Méthode non autorisée',
    })
  }

  const auth = requireAdmin(event)

  if (!auth.ok) {
    return json(401, {
      ok: false,
      error: 'Accès refusé. Connexion admin requise.',
    })
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const productId = String(body.productId || '')
    const stock = Number(body.stock)

    if (!productId) {
      return json(400, {
        ok: false,
        error: 'productId manquant',
      })
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return json(400, {
        ok: false,
        error: 'Stock invalide',
      })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('products')
      .update({
        stock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .select('id, slug, name, price, stock, category, icon, description, features')
      .single()

    if (error) throw new Error(error.message)

    return json(200, {
      ok: true,
      product: data,
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}