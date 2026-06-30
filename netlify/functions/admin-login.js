import { json } from './_products.js'
import { createPasswordSession, makePasswordCookie } from './_admin-auth.js'

function getSiteUrl(event) {
  return (process.env.SITE_URL || event.headers.origin || 'http://localhost:8888').replace(/\/$/, '')
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true })
  }

  if (event.httpMethod !== 'POST') {
    return json(405, {
      ok: false,
      error: 'Méthode non autorisée',
    })
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const password = String(body.password || '')
    const expectedPassword = process.env.ADMIN_PASSWORD

    if (!expectedPassword) {
      return json(500, {
        ok: false,
        error: 'ADMIN_PASSWORD manquant dans le fichier .env',
      })
    }

    if (password !== expectedPassword) {
      return json(401, {
        ok: false,
        error: 'Mot de passe incorrect',
      })
    }

    const siteUrl = getSiteUrl(event)
    const secure = siteUrl.startsWith('https://')
    const session = createPasswordSession()

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': makePasswordCookie(session, secure),
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        ok: true,
        message: 'Connexion admin réussie',
      }),
    }
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}