import { useEffect, useState } from 'react'
import Link from '../components/Link.jsx'
import { formatPrice } from '../data/products.js'

const PAYPAL_ME_URL = 'https://www.paypal.me/velopointbe'
const CURRENCY = 'EUR'

function getProductIdFromUrl() {
  const parts = window.location.pathname.split('/').filter(Boolean)
  return parts[parts.length - 1]
}

function getProductImage(product) {
  return product?.image_url || product?.imageUrl || ''
}

function buildPaypalMeUrl(product, customerEmail) {
  const price = Number(product.price || 0).toFixed(2)

  localStorage.setItem(
    'manual_order',
    JSON.stringify({
      productId: product.id,
      productName: product.name,
      price,
      currency: CURRENCY,
      customerEmail,
      paypalLink: PAYPAL_ME_URL,
      createdAt: new Date().toISOString(),
    })
  )

  return `${PAYPAL_ME_URL}/${price}`
}

export default function ProductPage() {
  const productSlug = getProductIdFromUrl()

  const [product, setProduct] = useState(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/.netlify/functions/products?slug=${encodeURIComponent(productSlug)}`)
      .then(async (response) => {
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Produit introuvable')
        }

        return data.product
      })
      .then(setProduct)
      .catch((error) => setError(error.message))
      .finally(() => setPageLoading(false))
  }, [productSlug])

  const isSoldOut = product && Number(product.stock || 0) <= 0
  const productImage = getProductImage(product)

  function startCheckout(event) {
    event.preventDefault()

    if (!product) {
      setError('Produit introuvable.')
      return
    }

    if (isSoldOut) {
      setError('Ce produit est actuellement en rupture de stock.')
      return
    }

    if (!email || !email.includes('@')) {
      setError('Entre une adresse email valide pour recevoir ton service.')
      return
    }

    const price = Number(product.price || 0)

    if (!Number.isFinite(price) || price <= 0) {
      setError('Prix produit invalide.')
      return
    }

    setLoading(true)
    setError('')

    window.location.href = buildPaypalMeUrl(product, email)
  }

  if (pageLoading) {
    return (
      <section className="section page-section">
        <div className="container narrow">
          <div className="glass-card result-card">
            <span className="result-icon">⏳</span>
            <h1>Chargement</h1>
            <p>Chargement du produit...</p>
          </div>
        </div>
      </section>
    )
  }

  if (!product) {
    return (
      <section className="section page-section">
        <div className="container narrow">
          <div className="glass-card result-card error">
            <span className="result-icon">⚠️</span>
            <h1>Produit introuvable</h1>
            <p>{error || 'Ce produit n’existe pas ou n’est plus disponible.'}</p>

            <Link href="/shop" className="btn btn-primary">
              Retour boutique
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section page-section">
      <div className="container product-layout">
        <div className={`glass-card product-visual ${isSoldOut ? 'is-sold-out' : ''}`}>
          {productImage ? (
            <div className="product-detail-image-wrap">
              <img className="product-detail-image" src={productImage} alt={product.name} />
            </div>
          ) : (
            <div className="product-big-icon">{product.icon || '⚡'}</div>
          )}

          <span className="product-category">{product.category}</span>

          <h1>{product.name}</h1>

          <p>{product.description}</p>

          <div className="product-price-large">{formatPrice(product.price)}</div>

          <div className={isSoldOut ? 'stock-pill sold-out-pill' : 'stock-pill'}>
            {isSoldOut ? 'Rupture de stock' : `Stock : ${product.stock}`}
          </div>
        </div>

        <div className="glass-card checkout-card">
          <span className="eyebrow">Paiement manuel</span>

          <h2>{isSoldOut ? 'Article indisponible' : 'Payer avec PayPal.Me'}</h2>

          <p>
            {isSoldOut
              ? 'Ce service est actuellement en rupture. Le paiement est désactivé.'
              : 'Tu vas être redirigé vers PayPal.Me. Après le paiement, garde une preuve de paiement.'}
          </p>

          <div className="features-list">
            {(product.features || []).map((feature) => (
              <div key={feature}>
                <span>✅</span>
                <strong>{feature}</strong>
              </div>
            ))}
          </div>

          <form onSubmit={startCheckout} className="checkout-form">
            <label htmlFor="customer-email">Email de livraison</label>

            <input
              id="customer-email"
              type="email"
              placeholder="tonadresse@gmail.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isSoldOut}
            />

            {error && <div className="error-box">{error}</div>}

            <button className="btn btn-primary full" type="submit" disabled={loading || isSoldOut}>
              {isSoldOut
                ? 'Produit en rupture'
                : loading
                  ? 'Redirection vers PayPal.Me...'
                  : `Payer ${formatPrice(product.price)} avec PayPal.Me`}
            </button>
          </form>

          <small className="secure-note">
            Paiement temporaire manuel. Vérifie le paiement PayPal avant livraison.
          </small>
        </div>
      </div>
    </section>
  )
}