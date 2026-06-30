import crypto from 'node:crypto'
import { getDiscordSession } from './_discord-auth.js'

const PASSWORD_COOKIE_NAME = 'toolsop_password_admin'
const DISCORD_COOKIE_NAME = 'toolsop_discord_admin'
const MAX_AGE = 60 * 60 * 24 * 7

function getSecret() {
  return process.env.ADMIN_AUTH_SECRET || process.env.DISCORD_AUTH_SECRET || 'dev-secret-change-me'
}

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

function base64url(input) {
  return Buffer.from(input).toString('base64url')
}

function signPayload(payload, secret) {
  const encoded = base64url(JSON.stringify(payload))
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url')

  return `${encoded}.${signature}`
}

function verifyPayload(token, secret) {
  const [encoded, signature] = String(token || '').split('.')

  if (!encoded || !signature) return null

  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url')

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (signatureBuffer.length !== expectedBuffer.length) return null

  const valid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer)

  if (!valid) return null

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null

  return payload
}

export function createPasswordSession() {
  const payload = {
    type: 'password-admin',
    isAdmin: true,
    username: 'Admin Password',
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  }

  return signPayload(payload, getSecret())
}

export function makePasswordCookie(value, secure = false) {
  return [
    `${PASSWORD_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

export function clearAdminCookies(secure = false) {
  const suffix = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`

  return [
    `${PASSWORD_COOKIE_NAME}=; ${suffix}`,
    `${DISCORD_COOKIE_NAME}=; ${suffix}`,
  ]
}

export function getPasswordSession(event) {
  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie || '')
  const token = cookies[PASSWORD_COOKIE_NAME]

  return verifyPayload(token, getSecret())
}

export function getAdminSession(event) {
  const discordSession = getDiscordSession(event)

  if (discordSession?.isAdmin) {
    return {
      ok: true,
      method: 'discord',
      user: {
        username: discordSession.username,
        globalName: discordSession.globalName,
        id: discordSession.sub,
      },
    }
  }

  const passwordSession = getPasswordSession(event)

  if (passwordSession?.isAdmin) {
    return {
      ok: true,
      method: 'password',
      user: {
        username: 'Admin Password',
        globalName: 'Admin Password',
      },
    }
  }

  return {
    ok: false,
    method: null,
    user: null,
  }
}

export function requireAdmin(event) {
  return getAdminSession(event)
}