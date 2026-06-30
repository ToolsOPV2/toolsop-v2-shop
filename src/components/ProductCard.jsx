import Link from './Link.jsx'
import { formatPrice } from '../data/products.js'

export default function ProductCard({ product }) {
  return (
    <article className="product-card reveal-card">
      <div className="product-topline">
        <span className="product-badge">{product.badge}</span>
        <span className="stock-dot">Stock {product.stock}</span>
      </div>
      <div className="product-icon">{product.icon}</div>
      <h3>{product.name}</h3>
      <p>{product.short}</p>
      <div className="product-meta">
        <span>{product.category}</span>
        <strong>{formatPrice(product.price)}</strong>
      </div>
      <div className="product-actions">
        <Link href={`/product/${product.slug}`} className="btn btn-ghost btn-small">
          Détails
        </Link>
        <Link href={`/checkout/${product.slug}`} className="btn btn-primary btn-small">
          Acheter
        </Link>
      </div>
    </article>
  )
}
