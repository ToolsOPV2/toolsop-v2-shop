import { createDiscordSessionCookie } from './_discord-auth.js'
import { createAdminSessionCookie } from './_admin-auth.js'

function getSiteUrl(event) {
  return (process.env.SITE_URL || `https://${event.headers.host}`).replace(/\/$/, '')
}

function redirect(location, cookies = []) {
  return {
    statusCode: 302,
    headers: {
      Location: location,
      'Set-Cookie': cookies,
    },
    body: '',
  }
}

function errorRedirect(event, message) {
  const siteUrl = getSiteUrl(event)
  return redirect(`${siteUrl}/admin?error=${encodeURIComponent(message)}`)
}

async function discordRequest(url, options = {}) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error_description || data.message || data.error || 'Erreur Discord')
  }

  return data
}

export async function handler(event) {
  try {
    const siteUrl = getSiteUrl(event)
    const params = event.queryStringParameters || {}
    const code = params.code

    if (!code) {
      return errorRedirect(event, 'Code Discord manquant')
    }

    const clientId = process.env.DISCORD_CLIENT_ID
    const clientSecret = process.env.DISCORD_CLIENT_SECRET
    const botToken = process.env.DISCORD_BOT_TOKEN
    const guildId = process.env.DISCORD_GUILD_ID
    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID

    if (!clientId || !clientSecret || !botToken || !guildId || !adminRoleId) {
      return errorRedirect(event, 'Variables Discord manquantes sur Render')
    }

    const redirectUri = `${siteUrl}/.netlify/functions/discord-callback`

    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    const tokenData = await discordRequest('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    })

    const user = await discordRequest('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const member = await discordRequest(
      `https://discord.com/api/guilds/${guildId}/members/${user.id}`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
      }
    )

    const roles = member.roles || []
    const isAdmin = roles.includes(adminRoleId)

    if (!isAdmin) {
      return errorRedirect(event, 'Tu n’as pas le rôle admin Discord')
    }

    const session = {
      id: user.id,
      username: user.username,
      globalName: user.global_name || user.username,
      avatar: user.avatar || null,
      roles,
      admin: true,
      isAdmin: true,
      source: 'discord',
    }

    const discordCookie = createDiscordSessionCookie(session, event)
    const adminCookie = createAdminSessionCookie(session, event)

    return redirect(`${siteUrl}/admin`, [discordCookie, adminCookie])
  } catch (error) {
    return errorRedirect(event, error.message)
  }
}