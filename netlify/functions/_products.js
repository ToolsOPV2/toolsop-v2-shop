import { getSupabase } from './_supabase.js'

export function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}

function normalizeFeatures(features) {
  if (Array.isArray(features)) return features

  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

function normalizePrice(price) {
  const numericPrice = Number(price || 0)

  if (!Number.isFinite(numericPrice)) {
    return 0
  }

  return numericPrice
}

function normalizeProduct(product) {
  const price = normalizePrice(product.price)
  const currency = product.currency || 'EUR'

  return {
    id: product.id,
    slug: product.slug || product.id,
    name: product.name || 'Produit',
    price,
    priceString: price.toFixed(2),
    currency,
    stock: Number(product.stock || 0),
    category: product.category || 'Service',
    icon: product.icon || '⚡',
    description: product.description || '',
    features: normalizeFeatures(product.features),
    delivery_title: product.delivery_title || '',
    delivery_message: product.delivery_message || '',
    image_url: product.image_url || '',
    created_at: product.created_at,
    updated_at: product.updated_at,
  }
}

export async function listProducts() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []).map(normalizeProduct)
}

export async function getProduct(productIdOrSlug) {
  if (!productIdOrSlug) return null

  const supabase = getSupabase()
  const cleanValue = decodeURIComponent(String(productIdOrSlug))

  const byId = await supabase
    .from('products')
    .select('*')
    .eq('id', cleanValue)
    .maybeSingle()

  if (byId.error) {
    throw new Error(byId.error.message)
  }

  if (byId.data) {
    return normalizeProduct(byId.data)
  }

  const bySlug = await supabase
    .from('products')
    .select('*')
    .eq('slug', cleanValue)
    .maybeSingle()

  if (bySlug.error) {
    throw new Error(bySlug.error.message)
  }

  if (bySlug.data) {
    return normalizeProduct(bySlug.data)
  }

  return null
}

export function isInStock(product) {
  return Number(product?.stock || 0) > 0
}