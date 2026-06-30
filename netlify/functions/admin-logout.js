import { clearAdminCookies } from './_admin-auth.js'

export async function handler(event) {
  const siteUrl = (process.env.SITE_URL || event.headers.origin || 'http://localhost:8888').replace(/\/$/, '')
  const secure = siteUrl.startsWith('https://')

  return {
    statusCode: 302,
    headers: {
      Location: '/admin',
      'Set-Cookie': clearAdminCookies(secure),
      'Cache-Control': 'no-store',
    },
    body: '',
  }
}