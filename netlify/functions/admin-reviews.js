import { requireAdmin } from './_admin-auth.js'
import { getSupabase } from './_supabase.js'
import { json } from './_products.js'

function cleanRating(value) {
  const rating = Number(value)

  if (!Number.isFinite(rating)) return 5
  if (rating < 1) return 1
  if (rating > 5) return 5

  return Math.round(rating)
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })

  try {
    const adminResult = await requireAdmin(event)

    if (adminResult?.statusCode) {
      return adminResult
    }

    const supabase = getSupabase()

    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)

      return json(200, {
        ok: true,
        reviews: data || [],
      })
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')

      const name = String(body.name || '').trim() || 'Client'
      const message = String(body.message || '').trim()
      const rating = cleanRating(body.rating)
      const position = Number(body.position || 0)
      const isActive = body.is_active !== false

      if (!message) {
        return json(400, {
          ok: false,
          error: 'Message manquant',
        })
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          name,
          message,
          rating,
          position: Number.isFinite(position) ? position : 0,
          is_active: isActive,
        })
        .select('*')
        .single()

      if (error) throw new Error(error.message)

      return json(200, {
        ok: true,
        review: data,
        message: 'Évaluation ajoutée.',
      })
    }

    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}')
      const id = String(body.id || '').trim()

      if (!id) {
        return json(400, {
          ok: false,
          error: 'ID évaluation manquant',
        })
      }

      const update = {
        updated_at: new Date().toISOString(),
      }

      if (body.name !== undefined) update.name = String(body.name || '').trim() || 'Client'
      if (body.message !== undefined) update.message = String(body.message || '').trim()
      if (body.rating !== undefined) update.rating = cleanRating(body.rating)
      if (body.position !== undefined) update.position = Number(body.position || 0)
      if (body.is_active !== undefined) update.is_active = Boolean(body.is_active)

      const { data, error } = await supabase
        .from('reviews')
        .update(update)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw new Error(error.message)

      return json(200, {
        ok: true,
        review: data,
        message: 'Évaluation modifiée.',
      })
    }

    if (event.httpMethod === 'DELETE') {
      const body = JSON.parse(event.body || '{}')
      const id = String(body.id || '').trim()

      if (!id) {
        return json(400, {
          ok: false,
          error: 'ID évaluation manquant',
        })
      }

      const { data, error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw new Error(error.message)

      return json(200, {
        ok: true,
        deleted: data,
        message: 'Évaluation supprimée.',
      })
    }

    return json(405, {
      ok: false,
      error: 'Méthode non autorisée',
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}