import { getSupabase } from './_supabase.js'

function normalizeProduct(product) {
  if (!product) return null

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: Number(product.price),
    priceString: Number(product.price).toFixed(2),
    stock: Number(product.stock || 0),
    category: product.category,
    icon: product.icon,
    description: product.description,
    features: Array.isArray(product.features) ? product.features : [],
    currency: 'EUR',
    deliveryTitle: product.delivery_title || product.name,
    deliveryMessage:
      product.delivery_message ||
      `Merci pour ta commande. Le service "${product.name}" est validé.`,
  }
}

export async function listProducts() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, slug, name, price, stock, category, icon, description, features, delivery_title, delivery_message'
    )
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return data.map(normalizeProduct)
}

export async function getProduct(productIdOrSlug) {
  const supabase = getSupabase()

  const byId = await supabase
    .from('products')
    .select(
      'id, slug, name, price, stock, category, icon, description, features, delivery_title, delivery_message'
    )
    .eq('id', productIdOrSlug)
    .maybeSingle()

  if (byId.error) throw new Error(byId.error.message)
  if (byId.data) return normalizeProduct(byId.data)

  const bySlug = await supabase
    .from('products')
    .select(
      'id, slug, name, price, stock, category, icon, description, features, delivery_title, delivery_message'
    )
    .eq('slug', productIdOrSlug)
    .maybeSingle()

  if (bySlug.error) throw new Error(bySlug.error.message)

  return normalizeProduct(bySlug.data)
}

export function isInStock(product) {
  return Number(product?.stock || 0) > 0
}

export function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    },
    body: JSON.stringify(body),
  }
}