import { getSupabase } from './_supabase.js'
import { json } from './_products.js'

export async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, {
      ok: false,
      error: 'Méthode non autorisée',
    })
  }

  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return json(200, {
      ok: true,
      reviews: data || [],
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}