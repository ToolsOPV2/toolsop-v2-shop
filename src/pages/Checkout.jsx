import { useState } from 'react'
import Link from '../components/Link.jsx'
import { findProductBySlug, formatPrice } from '../data/products.js'
import NotFound from './NotFound.jsx'

export default function Checkout({ slug }) {
  const product = findProductBySlug(slug)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!product) return <NotFound />

  async function startPayPalPayment(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/.netlify/functions/paypal-create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, customerEmail: email }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Impossible de créer la commande PayPal')
      if (!data.approvalUrl) throw new Error('Lien PayPal introuvable')

      window.location.href = data.approvalUrl
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="section page-section">
      <div className="container checkout-grid">
        <div>
          <span className="eyebrow">Checkout</span>
          <h1>Finaliser la commande</h1>
          <p className="page-lead">
            Le paiement est créé côté serveur avec le vrai prix du produit. Après PayPal, le serveur capture et vérifie la commande.
          </p>

          <form className="glass-card checkout-form" onSubmit={startPayPalPayment}>
            <label>
              Email de livraison
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ton-email@example.com"
              />
            </label>

            {error && <div className="error-box">{error}</div>}

            <button className="btn btn-primary full" type="submit" disabled={loading}>
              {loading ? 'Création de la commande...' : 'Payer avec PayPal'}
            </button>

            <p className="form-note">
              En local, utilise <code>netlify dev</code> pour que les fonctions PayPal fonctionnent.
            </p>
          </form>
        </div>

        <aside className="glass-card order-summary">
          <span className="product-badge">Résumé</span>
          <div className="product-icon">{product.icon}</div>
          <h2>{product.name}</h2>
          <p>{product.short}</p>
          <div className="summary-line">
            <span>Produit</span>
            <strong>{formatPrice(product.price)}</strong>
          </div>
          <div className="summary-line">
            <span>Frais</span>
            <strong>0,00 €</strong>
          </div>
          <div className="summary-line total">
            <span>Total</span>
            <strong>{formatPrice(product.price)}</strong>
          </div>
          <Link href={`/product/${product.slug}`} className="text-link">
            Revoir la fiche produit
          </Link>
        </aside>
      </div>
    </section>
  )
}
