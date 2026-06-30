import { getProduct, isInStock, json } from './_products.js'
import { paypalRequest } from './_paypal.js'

function getSiteUrl(event) {
  return (process.env.SITE_URL || event.headers.origin || 'http://localhost:8888').replace(/\/$/, '')
}

function isValidEmail(email = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })

  if (event.httpMethod !== 'POST') {
    return json(405, {
      ok: false,
      error: 'Méthode non autorisée',
    })
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const productId = body.productId
    const customerEmail = String(body.customerEmail || '').trim()

    if (!productId) {
      return json(400, {
        ok: false,
        error: 'productId manquant',
      })
    }

    if (!isValidEmail(customerEmail)) {
      return json(400, {
        ok: false,
        error: 'Email client invalide',
      })
    }

    const product = await getProduct(productId)

    if (!product) {
      return json(404, {
        ok: false,
        error: 'Produit introuvable côté serveur',
      })
    }

    if (!isInStock(product)) {
      return json(409, {
        ok: false,
        error: 'Ce produit est actuellement en rupture de stock.',
      })
    }

    const siteUrl = getSiteUrl(event)

    const paypalOrder = await paypalRequest('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        intent: 'CAPTURE',

        purchase_units: [
          {
            reference_id: product.id,
            custom_id: product.id,
            description: product.name,

            amount: {
              currency_code: product.currency,
              value: product.priceString,
              breakdown: {
                item_total: {
                  currency_code: product.currency,
                  value: product.priceString,
                },
              },
            },

            items: [
              {
                name: product.name,
                quantity: '1',
                category: 'DIGITAL_GOODS',
                unit_amount: {
                  currency_code: product.currency,
                  value: product.priceString,
                },
              },
            ],
          },
        ],

        application_context: {
          brand_name: 'ToolsOp V2',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: `${siteUrl}/checkout/success?productId=${encodeURIComponent(
            product.id
          )}&email=${encodeURIComponent(customerEmail)}`,
          cancel_url: `${siteUrl}/checkout/cancel?productId=${encodeURIComponent(product.id)}`,
        },
      }),
    })

    const approvalLink = paypalOrder.links?.find((link) => link.rel === 'approve')

    if (!approvalLink?.href) {
      return json(500, {
        ok: false,
        error: 'Lien de paiement PayPal introuvable',
      })
    }

    return json(200, {
      ok: true,
      orderID: paypalOrder.id,
      approvalUrl: approvalLink.href,
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}