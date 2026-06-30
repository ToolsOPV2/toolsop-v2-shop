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

function normalizeProduct(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    category: product.category || 'Service',
    icon: product.icon || '⚡',
    description: product.description || '',
    features: Array.isArray(product.features) ? product.features : [],
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

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .or(`id.eq.${productIdOrSlug},slug.eq.${productIdOrSlug}`)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null

  return normalizeProduct(data)
}

export function isInStock(product) {
  return Number(product?.stock || 0) > 0
}