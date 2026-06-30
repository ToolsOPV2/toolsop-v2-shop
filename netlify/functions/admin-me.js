import { json } from './_products.js'
import { getAdminSession } from './_admin-auth.js'

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

  const session = getAdminSession(event)

  if (!session.ok) {
    return json(401, {
      ok: false,
      authenticated: false,
      isAdmin: false,
    })
  }

  return json(200, {
    ok: true,
    authenticated: true,
    isAdmin: true,
    method: session.method,
    user: session.user,
  })
}