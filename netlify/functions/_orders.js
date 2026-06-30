import { getSupabase } from './_supabase.js'

function normalizeOrder(order) {
  if (!order) return null

  return {
    id: order.id,
    paypalOrderId: order.paypal_order_id,
    paypalCaptureId: order.paypal_capture_id,
    productId: order.product_id,
    productName: order.product_name,
    customerEmail: order.customer_email,
    amount: Number(order.amount).toFixed(2),
    currency: order.currency,
    status: order.status,
    emailSent: Boolean(order.email_sent),
    emailId: order.email_id,
    emailError: order.email_error,
    paidAt: order.paid_at,
    savedAt: order.saved_at,
  }
}

export async function saveServerOrder(order) {
  const supabase = getSupabase()

  const { data, error } = await supabase.rpc('complete_paid_order', {
    p_paypal_order_id: order.paypalOrderId,
    p_paypal_capture_id: order.paypalCaptureId,
    p_product_id: order.productId,
    p_customer_email: order.customerEmail,
    p_amount: Number(order.amount),
    p_currency: order.currency,
    p_email_sent: Boolean(order.emailSent),
    p_email_id: order.emailId || null,
    p_email_error: order.emailError || null,
  })

  if (error) throw new Error(error.message)

  return normalizeOrder(data)
}

export async function readServerOrders() {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('paid_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message)

  return data.map(normalizeOrder)
}