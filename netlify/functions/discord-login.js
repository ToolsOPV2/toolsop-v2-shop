const API_BASE = 'https://discord.com/api/v10'

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

export async function handler(event) {
  try {
    const baseUrl = getSiteUrl(event)
    const clientId = required('DISCORD_CLIENT_ID')
    const redirectUri = `${baseUrl}/.netlify/functions/discord-callback`

    const authorizeUrl = new URL(`${API_BASE}/oauth2/authorize`)

    authorizeUrl.searchParams.set('client_id', clientId)
    authorizeUrl.searchParams.set('redirect_uri', redirectUri)
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('scope', 'identify')

    return {
      statusCode: 302,
      headers: {
        Location: authorizeUrl.toString(),
        'Cache-Control': 'no-store',
      },
      body: '',
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        ok: false,
        error: error.message,
      }),
    }
  }
}