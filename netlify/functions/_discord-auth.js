import crypto from 'node:crypto'

const DISCORD_COOKIE = 'toolsop_discord_session'
const DISCORD_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function getSecret() {
  return process.env.DISCORD_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET || 'toolsop_secret_change_me'
}

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url')
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url')
}

function getCookieHeader(event = {}) {
  return event.headers?.cookie || event.headers?.Cookie || ''
}

function parseCookies(event = {}) {
  const header = getCookieHeader(event)
  const cookies = {}

  for (const part of header.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=')

    if (!rawKey) continue

    cookies[rawKey] = decodeURIComponent(rawValue.join('=') || '')
  }

  return cookies
}

function shouldUseSecureCookie(event = {}) {
  const siteUrl = process.env.SITE_URL || ''
  const origin = event.headers?.origin || event.headers?.Origin || ''
  const host = event.headers?.host || event.headers?.Host || ''

  return siteUrl.startsWith('https://') || origin.startsWith('https://') || host.includes('onrender.com')
}

export function createDiscordSessionCookie(session = {}, event = {}) {
  const payload = base64UrlEncode(
    JSON.stringify({
      ...session,
      admin: true,
      isAdmin: true,
      createdAt: Date.now(),
    })
  )

  const signature = sign(payload)
  const secure = shouldUseSecureCookie(event) ? '; Secure' : ''

  return `${DISCORD_COOKIE}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DISCORD_COOKIE_MAX_AGE}${secure}`
}

export function clearDiscordSessionCookie(event = {}) {
  const secure = shouldUseSecureCookie(event) ? '; Secure' : ''

  return `${DISCORD_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

export function getDiscordSession(event = {}) {
  try {
    const cookies = parseCookies(event)
    const value = cookies[DISCORD_COOKIE]

    if (!value || !value.includes('.')) {
      return null
    }

    const [payload, signature] = value.split('.')
    const expectedSignature = sign(payload)

    if (signature !== expectedSignature) {
      return null
    }

    const session = JSON.parse(base64UrlDecode(payload))

    if (!session?.isAdmin && !session?.admin) {
      return null
    }

    return {
      ...session,
      admin: true,
      isAdmin: true,
      source: 'discord',
    }
  } catch {
    return null
  }
}