import crypto from 'node:crypto'

const API_BASE = 'https://discord.com/api/v10'
const COOKIE_NAME = 'toolsop_discord_admin'
const MAX_AGE = 60 * 60 * 24 * 7

function required(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Variable manquante: ${name}`)
  }

  return value
}

function getSiteUrl(event) {
  return (process.env.SITE_URL || event.headers.origin || 'http://localhost:8888').replace(/\/$/, '')
}

function base64url(input) {
  return Buffer.from(input).toString('base64url')
}

function signSession(payload, secret) {
  const encoded = base64url(JSON.stringify(payload))
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url')

  return `${encoded}.${signature}`
}

function makeCookie(value, secure) {
  return [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

function clearCookie(secure) {
  return [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

async function exchangeCode({ code, clientId, clientSecret, redirectUri }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  })

  const response = await fetch(`${API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Connexion Discord impossible')
  }

  return data
}

async function getDiscordUser(accessToken) {
  const response = await fetch(`${API_BASE}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Impossible de lire le profil Discord')
  }

  return data
}

async function getGuildMember({ guildId, userId, botToken }) {
  const response = await fetch(`${API_BASE}/guilds/${guildId}/members/${userId}`, {
    headers: {
      Authorization: `Bot ${botToken}`,
    },
  })

  if (response.status === 404) {
    return null
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Impossible de vérifier le rôle Discord')
  }

  return data
}

export async function handler(event) {
  const baseUrl = getSiteUrl(event)
  const secure = baseUrl.startsWith('https://')

  try {
    const code = event.queryStringParameters?.code

    if (!code) {
      throw new Error('Code OAuth Discord manquant')
    }

    const clientId = required('DISCORD_CLIENT_ID')
    const clientSecret = required('DISCORD_CLIENT_SECRET')
    const botToken = required('DISCORD_BOT_TOKEN')
    const guildId = required('DISCORD_GUILD_ID')
    const adminRoleId = required('DISCORD_ADMIN_ROLE_ID')
    const authSecret = required('DISCORD_AUTH_SECRET')

    const redirectUri = `${baseUrl}/.netlify/functions/discord-callback`

    const token = await exchangeCode({
      code,
      clientId,
      clientSecret,
      redirectUri,
    })

    const user = await getDiscordUser(token.access_token)

    const member = await getGuildMember({
      guildId,
      userId: user.id,
      botToken,
    })

    const roles = member?.roles || []
    const isAdmin = roles.includes(adminRoleId)

    const session = signSession(
      {
        sub: user.id,
        username: user.username,
        globalName: user.global_name || user.username,
        avatar: user.avatar,
        isAdmin,
        roles,
        exp: Math.floor(Date.now() / 1000) + MAX_AGE,
      },
      authSecret
    )

    return {
      statusCode: 302,
      headers: {
        Location: isAdmin ? '/admin?discord=ok' : '/admin?discord=denied',
        'Set-Cookie': makeCookie(session, secure),
        'Cache-Control': 'no-store',
      },
      body: '',
    }
  } catch (error) {
    return {
      statusCode: 302,
      headers: {
        Location: `/admin?discord=error&message=${encodeURIComponent(error.message)}`,
        'Set-Cookie': clearCookie(secure),
        'Cache-Control': 'no-store',
      },
      body: '',
    }
  }
}