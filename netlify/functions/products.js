import { getProduct, json, listProducts } from './_products.js'

export async function handler(event) {
  try {
    if (event.httpMethod !== 'GET') {
      return json(405, {
        ok: false,
        error: 'Méthode non autorisée',
      })
    }

    const params = event.queryStringParameters || {}
    const productId = params.id || params.slug || ''

    if (productId) {
      const product = await getProduct(productId)

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