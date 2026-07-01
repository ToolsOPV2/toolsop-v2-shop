import { getAdminSession } from './_admin-auth.js'
import { json } from './_products.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })

  if (event.httpMethod !== 'GET') {
    return json(405, {
      ok: false,
      error: 'Méthode non autorisée',
    })
  }

  const session = await getAdminSession(event)

  if (!session) {
    return json(401, {
      ok: false,
      admin: false,
      error: 'Non connecté admin',
    })
  }

  return json(200, {
    ok: true,
    admin: true,
    user: {
      id: session.id || null,
      username: session.username || session.globalName || 'Admin',
      source: session.source || 'admin',
    },
  })
}