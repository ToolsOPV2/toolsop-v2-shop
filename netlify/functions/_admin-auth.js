import crypto from 'node:crypto'
import { getDiscordSession } from './_discord-auth.js'

const ADMIN_COOKIE = 'toolsop_admin_session'
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function getSecret() {
  return process.env.ADMIN_AUTH_SECRET || process.env.DISCORD_AUTH_SECRET || 'toolsop_admin_secret_change_me'
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

export function createAdminSessionCookie(session = {}, event = {}) {
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

  return `${ADMIN_COOKIE}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ADMIN_COOKIE_MAX_AGE}${secure}`
}

export function clearAdminSessionCookie(event = {}) {
  const secure = shouldUseSecureCookie(event) ? '; Secure' : ''

  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

export async function getAdminSession(event = {}) {
  try {
    const cookies = parseCookies(event)
    const value = cookies[ADMIN_COOKIE]

    if (value && value.includes('.')) {
      const [payload, signature] = value.split('.')
      const expectedSignature = sign(payload)

      if (signature === expectedSignature) {
        const session = JSON.parse(base64UrlDecode(payload))

        if (session?.admin || session?.isAdmin) {
          return {
            ...session,
            admin: true,
            isAdmin: true,
            source: session.source || 'password',
          }
        }
      }
    }

    const discordSession = await getDiscordSession(event)

    if (discordSession?.isAdmin || discordSession?.admin) {
      return {
        ...discordSession,
        admin: true,
        isAdmin: true,
        source: 'discord',
      }
    }

    return null
  } catch {
    return null
  }
}

export async function requireAdmin(event = {}) {
  const session = await getAdminSession(event)

  if (!session) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: false,
        error: 'Accès refusé. Connexion admin requise.',
      }),
    }
  }

  return {
    ok: true,
    admin: true,
    session,
  }
}