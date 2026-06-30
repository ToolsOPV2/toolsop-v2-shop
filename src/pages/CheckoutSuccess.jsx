import { useEffect, useState } from 'react'
import Link from '../components/Link.jsx'
import { saveOrder } from '../utils/storage.js'

export default function CheckoutSuccess() {
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('Vérification du paiement PayPal...')
  const [order, setOrder] = useState(null)
  const [emailInfo, setEmailInfo] = useState(null)

  useEffect(() => {
    async function capturePayment() {
      const params = new URLSearchParams(window.location.search)

      const orderID = params.get('token')
      const productId = params.get('productId')
      const customerEmail = params.get('email') || ''

      if (!orderID || !productId || !customerEmail) {
        setStatus('error')
        setMessage('Informations de paiement manquantes.')
        return
      }

      try {
        const response = await fetch('/.netlify/functions/paypal-capture-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderID,
            productId,
            customerEmail,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Paiement non validé')
        }

        saveOrder(data.order)
        setOrder(data.order)
        setEmailInfo(data.email || null)
        setStatus('success')

        if (data.email?.sent) {
          setMessage('Paiement vérifié. La commande est payée et l’email a été envoyé.')
        } else {
          setMessage(
            data.email?.reason
              ? `Paiement vérifié, mais email non envoyé : ${data.email.reason}`
              : 'Paiement vérifié, mais email non envoyé.'
          )
        }
      } catch (error) {
        setStatus('error')
        setMessage(error.message)
      }
    }

    capturePayment()
  }, [])

  return (
    <section className="section page-section">
      <div className="container narrow">
        <div className={`glass-card result-card ${status}`}>
          <span className="result-icon">
            {status === 'success' ? '✅' : status === 'error' ? '⚠️' : '⏳'}
          </span>

          <h1>
            {status === 'success'
              ? 'Commande confirmée'
              : status === 'error'
                ? 'Vérification impossible'
                : 'Paiement en cours'}
          </h1>

          <p>{message}</p>

          {order && (
            <div className="order-mini">
              <span>{order.productName}</span>

              <strong>
                {order.amount} {order.currency}
              </strong>

              <small>Email : {order.customerEmail}</small>
              <small>ID PayPal : {order.paypalOrderId}</small>
            </div>
          )}

          {emailInfo && (
            <div className="order-mini">
              <span>Email automatique</span>
              <strong>{emailInfo.sent ? 'Envoyé ✅' : 'Non envoyé ⚠️'}</strong>

              {emailInfo.id && <small>ID email : {emailInfo.id}</small>}
              {emailInfo.reason && <small>{emailInfo.reason}</small>}
            </div>
          )}

          <div className="result-actions">
            <Link href="/shop" className="btn btn-primary">
              Retour boutique
            </Link>

            <Link href="/admin" className="btn btn-ghost">
              Voir admin
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}