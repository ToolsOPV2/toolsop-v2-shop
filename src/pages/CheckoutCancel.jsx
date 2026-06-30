import Link from '../components/Link.jsx'

export default function CheckoutCancel() {
  return (
    <section className="section page-section">
      <div className="container narrow">
        <div className="glass-card result-card">
          <span className="result-icon">↩️</span>
          <h1>Paiement annulé</h1>
          <p>La commande n’a pas été payée. Tu peux retourner à la boutique et réessayer.</p>
          <div className="result-actions">
            <Link href="/shop" className="btn btn-primary">Retour boutique</Link>
            <Link href="/" className="btn btn-ghost">Accueil</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
