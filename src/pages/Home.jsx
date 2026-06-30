import { useEffect, useMemo, useState } from 'react'
import Link from '../components/Link.jsx'
import { formatPrice } from '../data/products.js'

function getProductImage(product) {
  return product.image_url || product.imageUrl || ''
}

function getProductUrl(product) {
  return `/product/${encodeURIComponent(product.slug || product.id)}`
}

export default function Home() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/.netlify/functions/products')
      .then(async (response) => {
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Impossible de charger les produits')
        }

        return data.products || []
      })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  const featuredProducts = useMemo(() => {
    return products.slice(0, 6)
  }, [products])

  const availableCount = useMemo(() => {
    return products.filter((product) => Number(product.stock || 0) > 0).length
  }, [products])

  return (
    <>
      <section className="hero section">
        <div className="container hero-grid">
          <div className="hero-content">
            <span className="eyebrow">ToolsOp V2</span>

            <h1>
              Services digitaux <span>premium</span>
            </h1>

            <p>
              Boutique digitale moderne avec stock synchronisé, images produits,
              historique admin et paiement manuel via PayPal.Me.
            </p>

            <div className="hero-actions">
              <Link href="/shop" className="btn btn-primary">
                Voir la boutique
              </Link>

              <Link href="/contact" className="btn btn-ghost">
                Contacter le support
              </Link>
            </div>

            <div className="hero-stats">
              <div>
                <strong>{products.length || '30+'}</strong>
                <span>Services</span>
              </div>

              <div>
                <strong>{availableCount || '24/7'}</strong>
                <span>Disponibles</span>
              </div>

              <div>
                <strong>PayPal.Me</strong>
                <span>Paiement manuel</span>
              </div>
            </div>
          </div>

          <div className="glass-card hero-panel">
            <div className="hero-logo-ring">
              <img src="/logo.png" alt="ToolsOp V2" />
            </div>

            <div className="payment-preview">
              <span>Paiement manuel</span>
              <h3>PayPal.Me activé</h3>
              <p>
                Le client clique sur payer, la commande est ajoutée à l’historique,
                puis il est redirigé vers PayPal.Me.
              </p>

              <div>
                <strong>Historique admin</strong>
                <span className="status-pill">PENDING_MANUAL</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-split">
        <div className="container">
          <div className="section-title centered">
            <span className="eyebrow">Produits populaires</span>

            <h2>
              Découvre nos <span>services</span>
            </h2>

            <p>
              Les produits ci-dessous viennent directement de Supabase. Les images,
              prix et stocks se mettent à jour depuis ta base de données.
            </p>
          </div>

          {loading && <p className="empty-state">Chargement des produits...</p>}

          <div className="products-grid">
            {featuredProducts.map((product) => {
              const soldOut = Number(product.stock || 0) <= 0
              const productImage = getProductImage(product)

              return (
                <article className={`product-card ${soldOut ? 'sold-out-card' : ''}`} key={product.id}>
                  <div className="product-topline">
                    <span className="product-badge">{product.category}</span>

                    <span className={soldOut ? 'stock-dot stock-out' : 'stock-dot'}>
                      {soldOut ? 'Rupture' : `${product.stock} dispo`}
                    </span>
                  </div>

                  {productImage ? (
                    <div className="product-image-wrap">
                      <img className="product-image" src={productImage} alt={product.name} />
                    </div>
                  ) : (
                    <div className="product-icon">{product.icon || '⚡'}</div>
                  )}

                  <h3>{product.name}</h3>

                  <p>{product.description}</p>

                  <div className="product-meta">
                    <span>Prix</span>
                    <strong>{formatPrice(product.price)}</strong>
                  </div>

                  <div className="product-actions">
                    {soldOut ? (
                      <span className="btn btn-ghost full disabled-btn">Indisponible</span>
                    ) : (
                      <Link href={getProductUrl(product)} className="btn btn-primary full">
                        Acheter avec PayPal.Me
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="center-actions">
            <Link href="/shop" className="btn btn-ghost">
              Voir tous les produits
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split-grid">
          <div>
            <div className="section-title">
              <span className="eyebrow">Fonctionnement</span>

              <h2>
                Simple et <span>rapide</span>
              </h2>

              <p>
                Le paiement PayPal.Me est manuel. L’historique admin garde une trace
                de la demande, puis tu vérifies le paiement avant de livrer.
              </p>
            </div>

            <div className="feature-list">
              <div className="feature-item">
                <span>1</span>
                <div>
                  <h3>Choix du service</h3>
                  <p>Le client choisit un produit dans la boutique.</p>
                </div>
              </div>

              <div className="feature-item">
                <span>2</span>
                <div>
                  <h3>Email de livraison</h3>
                  <p>Son email est sauvegardé dans l’historique admin.</p>
                </div>
              </div>

              <div className="feature-item">
                <span>3</span>
                <div>
                  <h3>Redirection PayPal.Me</h3>
                  <p>Il est redirigé vers ton PayPal.Me avec le montant du produit.</p>
                </div>
              </div>

              <div className="feature-item">
                <span>4</span>
                <div>
                  <h3>Vérification manuelle</h3>
                  <p>Tu vérifies le paiement PayPal avant la livraison.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card process-card">
            <h3>Statut des commandes</h3>

            <ol>
              <li>Commande créée au clic sur PayPal.Me</li>
              <li>Statut ajouté : PENDING_MANUAL</li>
              <li>Article + email visibles dans l’admin</li>
              <li>Paiement à vérifier manuellement</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="glass-card cta-card">
            <div>
              <h2>Prêt à commander ?</h2>
              <p>
                Choisis un produit, entre ton email, puis paie via PayPal.Me.
              </p>
            </div>

            <Link href="/shop" className="btn btn-primary">
              Accéder à la boutique
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}