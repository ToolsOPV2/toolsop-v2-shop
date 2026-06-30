import Link from '../components/Link.jsx'

export default function NotFound() {
  return (
    <section className="section page-section">
      <div className="container narrow">
        <div className="glass-card result-card">
          <span className="result-icon">404</span>
          <h1>Page introuvable</h1>
          <p>Cette page n’existe pas ou le produit demandé est introuvable.</p>
          <Link href="/shop" className="btn btn-primary">Retour boutique</Link>
        </div>
      </div>
    </section>
  )
}
