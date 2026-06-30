const PAYPAL_BASE_URLS = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
}

function required(name) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`Variable manquante: ${name}`)
  }

  return value
}

function getPaypalBaseUrl() {
  const env = String(process.env.PAYPAL_ENV || 'sandbox').toLowerCase()

  if (env === 'live') {
    return PAYPAL_BASE_URLS.live
  }

  return PAYPAL_BASE_URLS.sandbox
}

export async function getPayPalAccessToken() {
  const clientId = required('PAYPAL_CLIENT_ID')
  const clientSecret = required('PAYPAL_CLIENT_SECRET')
  const baseUrl = getPaypalBaseUrl()

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Connexion PayPal impossible')
  }

  return data.access_token
}

export async function paypalRequest(path, options = {}) {
  const accessToken = await getPayPalAccessToken()
  const baseUrl = getPaypalBaseUrl()

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error_description ||
        data.error ||
        `Erreur PayPal ${response.status}`
    )
  }

  return data
}