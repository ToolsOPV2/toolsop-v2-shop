import crypto from 'node:crypto'

const COOKIE_NAME = 'toolsop_discord_admin'

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((part) => {
        const [key, ...value] = part.trim().split('=')
        return [key, value.join('=')]
      })
      .filter(([key]) => key)
  )
}

function verifySession(token, secret) {
  const [encoded, signature] = String(token || '').split('.')

  if (!encoded || !signature) {
    return null
  }

  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url')

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }

  const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer)

  if (!isValid) {
    return null
  }

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  }
}

export async function handler(event) {
  const secret = process.env.DISCORD_AUTH_SECRET

  if (!secret) {
    return json(500, {
      ok: false,
      error: 'DISCORD_AUTH_SECRET manquant',
    })
  }

  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie || '')
  const token = cookies[COOKIE_NAME]
  const session = verifySession(token, secret)

  if (!session) {
    return json(401, {
      ok: false,
      authenticated: false,
      isAdmin: false,
    })
  }

  return json(200, {
    ok: true,
    authenticated: true,
    isAdmin: Boolean(session.isAdmin),
    user: {
      id: session.sub,
      username: session.username,
      globalName: session.globalName,
      avatar: session.avatar,
    },
  })
}