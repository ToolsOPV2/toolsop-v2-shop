import { useEffect, useMemo, useState } from 'react'
import Link from '../components/Link.jsx'
import { formatPrice } from '../data/products.js'

function getProductImage(product) {
  return product.image_url || product.imageUrl || ''
}

export default function Shop() {
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Tous')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(() => {
    return ['Tous', ...new Set(products.map((product) => product.category).filter(Boolean))]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const productName = product.name || ''
      const productDescription = product.description || ''

      const matchCategory = category === 'Tous' || product.category === category
      const matchSearch =
        productName.toLowerCase().includes(search.toLowerCase()) ||
        productDescription.toLowerCase().includes(search.toLowerCase())

      return matchCategory && matchSearch
    })
  }, [products, search, category])

  return (
    <section className="section page-section">
      <div className="container">
        <div className="section-title">
          <span className="eyebrow">Boutique</span>

          <h1>
            Services <span>premium</span>
          </h1>

          <p className="page-lead">
            Le stock est synchronisé avec Supabase. Les produits peuvent maintenant afficher une image.
          </p>
        </div>

        <div className="glass-card shop-toolbar">
          <input
            type="text"
            placeholder="Rechercher un service..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="category-pills">
            {categories.map((item) => (
              <button
                key={item}
                className={item === category ? 'active' : ''}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="empty-state">Chargement des produits...</p>}
        {error && <div className="error-box">{error}</div>}

        <div className="products-grid shop-grid">
          {filteredProducts.map((product) => {
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
                    <Link href={`/product/${product.slug}`} className="btn btn-primary full">
                      Acheter
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        {!loading && !error && filteredProducts.length === 0 && (
          <p className="empty-state">Aucun produit trouvé.</p>
        )}
      </div>
    </section>
  )
}