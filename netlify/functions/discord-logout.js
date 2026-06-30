const COOKIE_NAME = 'toolsop_discord_admin'

export async function handler(event) {
  const siteUrl = (process.env.SITE_URL || event.headers.origin || 'http://localhost:8888').replace(/\/$/, '')
  const secure = siteUrl.startsWith('https://')

  return {
    statusCode: 302,
    headers: {
      Location: '/admin',
      'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`,
      'Cache-Control': 'no-store',
    },
    body: '',
  }
}