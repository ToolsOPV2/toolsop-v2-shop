import { json } from './_products.js'
import { readServerOrders } from './_orders.js'
import { requireAdmin } from './_admin-auth.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true })
  }

  if (event.httpMethod !== 'GET') {
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
    const orders = await readServerOrders()

    return json(200, {
      ok: true,
      orders,
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}