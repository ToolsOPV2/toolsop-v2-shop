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

export function getDiscordSession(event) {
  const secret = process.env.DISCORD_AUTH_SECRET

  if (!secret) {
    return null
  }

  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie || '')
  const token = cookies[COOKIE_NAME]

  return verifySession(token, secret)
}

export function requireDiscordAdmin(event) {
  const session = getDiscordSession(event)

  if (!session || !session.isAdmin) {
    return {
      ok: false,
      session: null,
    }
  }

  return {
    ok: true,
    session,
  }
}