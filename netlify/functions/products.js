import { getProduct, listProducts, json } from './_products.js'

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return json(200, { ok: true })

  if (event.httpMethod !== 'GET') {
    return json(405, {
      ok: false,
      error: 'Méthode non autorisée',
    })
  }

  try {
    const slug = event.queryStringParameters?.slug
    const id = event.queryStringParameters?.id

    if (slug || id) {
      const product = await getProduct(slug || id)

      if (!product) {
        return json(404, {
          ok: false,
          error: 'Produit introuvable',
        })
      }

      return json(200, {
        ok: true,
        product,
      })
    }

    const products = await listProducts()

    return json(200, {
      ok: true,
      products,
    })
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}