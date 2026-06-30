import { requireAdmin } from './_admin-auth.js'
import { getSupabase } from './_supabase.js'
import { json } from './_products.js'

function getEmailFrom() {
  return process.env.EMAIL_FROM || 'ToolsOp V2 <onboarding@resend.dev>'
}

function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || 'vttobj@gmail.com'
}

function formatPrice(amount, currency = 'EUR') {
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency,
  }).format(Number(amount || 0))
}

async function sendDeliveryEmail({ order, product }) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    throw new Error('RESEND_API_KEY manquant')
  }

  const deliveryTitle = product.delivery_title || 'Commande validée'
  const deliveryMessage =
    product.delivery_message ||
    'Ta commande a été validée. Le support va te contacter rapidement si une information supplémentaire est nécessaire.'

  const subject = `Commande validée - ${order.product_name}`

  const html = `
    <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#111;">
      <div style="max-width:620px;margin:0 auto;padding:28px;">
        <div style="background:#08080a;color:#fff;border-radius:22px;padding:26px;border:1px solid #2a2a2f;">
          <h1 style="margin:0 0 10px;font-size:26px;">ToolsOp V2</h1>
          <p style="margin:0;color:#b8b8c0;">Ta commande a été validée.</p>
        </div>

        <div style="background:#fff;border-radius:22px;padding:26px;margin-top:18px;border:1px solid #e5e5e5;">
          <h2 style="margin:0 0 16px;font-size:22px;">${deliveryTitle}</h2>

          <p style="line-height:1.7;margin:0 0 16px;">
            Bonjour,
          </p>

          <p style="line-height:1.7;margin:0 0 16px;">
            Ton paiement a été vérifié et ta commande est maintenant marquée comme effectuée.
          </p>

          <div style="background:#f7f7f8;border-radius:16px;padding:16px;margin:18px 0;">
            <p style="margin:0 0 8px;"><strong>Produit :</strong> ${order.product_name}</p>
            <p style="margin:0 0 8px;"><strong>Montant :</strong> ${formatPrice(order.amount, order.currency)}</p>
            <p style="margin:0;"><strong>Email :</strong> ${order.customer_email}</p>
          </div>

          <p style="line-height:1.7;margin:0 0 16px;">
            ${deliveryMessage}
          </p>

          <p style="line-height:1.7;margin:0;">
            Besoin d’aide ? Réponds directement à cet email ou contacte le support :
            <strong>${getSupportEmail()}</strong>
          </p>
        </div>

        <p style="text-align:center;color:#777;margin-top:18px;font-size:13px;">
          Paiement vérifié manuellement via PayPal.Me.
        </p>
      </div>
    </div>
  `

  const text = `
ToolsOp V2 - Commande validée

Produit : ${order.product_name}
Montant : ${formatPrice(order.amount, order.currency)}
Email : ${order.customer_email}

${deliveryMessage}

Support : ${getSupportEmail()}
  `.trim()

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getEmailFrom(),
      to: order.customer_email,
      reply_to: getSupportEmail(),
      subject,
      html,
      text,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Erreur envoi email')
  }

  return data
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
    const adminResult = await requireAdmin(event)

    if (adminResult?.statusCode) {
      return adminResult
    }

    const body = JSON.parse(event.body || '{}')
    const orderId = String(body.orderId || '').trim()
    const paypalOrderId = String(body.paypalOrderId || '').trim()

    if (!orderId && !paypalOrderId) {
      return json(400, {
        ok: false,
        error: 'orderId manquant',
      })
    }

    const supabase = getSupabase()

    let orderQuery = supabase.from('orders').select('*').limit(1)

    if (orderId) {
      orderQuery = orderQuery.eq('id', orderId)
    } else {
      orderQuery = orderQuery.eq('paypal_order_id', paypalOrderId)
    }

    const { data: orderRows, error: orderError } = await orderQuery

    if (orderError) {
      throw new Error(orderError.message)
    }

    const order = orderRows?.[0]

    if (!order) {
      return json(404, {
        ok: false,
        error: 'Commande introuvable',
      })
    }

    if (order.status !== 'PENDING_MANUAL') {
      return json(409, {
        ok: false,
        error: `Cette commande n’est pas en attente. Statut actuel : ${order.status}`,
      })
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', order.product_id)
      .maybeSingle()

    if (productError) {
      throw new Error(productError.message)
    }

    if (!product) {
      return json(404, {
        ok: false,
        error: 'Produit introuvable',
      })
    }

    const currentStock = Number(product.stock || 0)

    if (currentStock <= 0) {
      return json(409, {
        ok: false,
        error: 'Stock insuffisant pour marquer cette commande comme effectuée.',
      })
    }

    const newStock = currentStock - 1

    const { error: stockError } = await supabase
      .from('products')
      .update({
        stock: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', product.id)

    if (stockError) {
      throw new Error(stockError.message)
    }

    const { data: updatedOrder, error: updateOrderError } = await supabase
      .from('orders')
      .update({
        status: 'COMPLETED_MANUAL',
        paid_at: new Date().toISOString(),
        email_error: null,
      })
      .eq('id', order.id)
      .select('*')
      .single()

    if (updateOrderError) {
      throw new Error(updateOrderError.message)
    }

    try {
      const emailResult = await sendDeliveryEmail({
        order: updatedOrder,
        product,
      })

      const { data: finalOrder, error: finalUpdateError } = await supabase
        .from('orders')
        .update({
          email_sent: true,
          email_id: emailResult.id || null,
          email_error: null,
        })
        .eq('id', order.id)
        .select('*')
        .single()

      if (finalUpdateError) {
        throw new Error(finalUpdateError.message)
      }

      return json(200, {
        ok: true,
        order: finalOrder,
        stock: newStock,
        email: {
          sent: true,
          id: emailResult.id || null,
        },
      })
    } catch (emailError) {
      await supabase
        .from('orders')
        .update({
          email_sent: false,
          email_error: emailError.message,
        })
        .eq('id', order.id)

      return json(500, {
        ok: false,
        error: `Commande marquée effectuée, mais email non envoyé : ${emailError.message}`,
      })
    }
  } catch (error) {
    return json(500, {
      ok: false,
      error: error.message,
    })
  }
}