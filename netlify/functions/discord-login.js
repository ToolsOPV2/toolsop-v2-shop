function getSiteUrl(event) {
  return (process.env.SITE_URL || `https://${event.headers.host}`).replace(/\/$/, '')
}

export async function handler(event) {
  const clientId = process.env.DISCORD_CLIENT_ID

  if (!clientId) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: false,
        error: 'DISCORD_CLIENT_ID manquant',
      }),
    }
  }

  const siteUrl = getSiteUrl(event)
  const redirectUri = `${siteUrl}/.netlify/functions/discord-callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
    prompt: 'consent',
  })

  return {
    statusCode: 302,
    headers: {
      Location: `https://discord.com/oauth2/authorize?${params.toString()}`,
    },
    body: '',
  }
}