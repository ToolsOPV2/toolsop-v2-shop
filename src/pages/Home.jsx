import Link from '../components/Link.jsx'
import ProductCard from '../components/ProductCard.jsx'
import SectionTitle from '../components/SectionTitle.jsx'
import { products, formatPrice } from '../data/products.js'

const featured = products.slice(0, 6)

export default function Home() {
  return (
    <>
      <section className="hero section">
        <div className="container hero-grid">
          <div className="hero-content">
            <span className="eyebrow hero-eyebrow">Paiements PayPal sécurisés</span>
            <h1>
              ToolsOP V2 
            </h1>
            <p>
              paiement vérifié
            </p>
            <div className="hero-actions">
              <Link href="/shop" className="btn btn-primary">
                Voir les produits
              </Link>
              <Link href="/contact" className="btn btn-ghost">
                Nous contacter
              </Link>
            </div>
            <div className="hero-stats">
              <div>
                <strong>{products.length}</strong>
                <span>services</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>boutique</span>
              </div>
              <div>
                <strong>100%</strong>
                <span>responsive</span>
              </div>
            </div>
          </div>

          <div className="hero-panel glass-card">
            <div className="hero-logo-ring">
              <img src="/logo.png" alt="ToolsOp V2" />
            </div>
            <div className="payment-preview">
              <span>Commande sécurisée</span>
              <h3>{featured[0].name}</h3>
              <p>Montant vérifié côté serveur avant validation.</p>
              <div>
                <strong>{formatPrice(featured[0].price)}</strong>
                <span className="status-pill">PayPal Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionTitle eyebrow="Boutique" title="Produits populaires" centered>
            Une sélection de services propres, présentés avec un design premium et des fiches détaillées.
          </SectionTitle>
          <div className="products-grid">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="center-actions">
            <Link href="/shop" className="btn btn-primary">
              Explorer toute la boutique
            </Link>
          </div>
        </div>
      </section>

      <section className="section section-split">
        <div className="container split-grid">
          <div>
            <SectionTitle eyebrow="Pourquoi nous" title="Un parcours propre du choix au paiement">
              L’objectif : un site qui inspire confiance, avec une interface claire et des paiements contrôlés.
            </SectionTitle>
            <div className="feature-list">
              <div className="feature-item">
                <span>01</span>
                <div>
                  <h3>Prix côté serveur</h3>
                  <p>Le prix PayPal ne vient jamais du navigateur, il vient de la liste sécurisée du backend.</p>
                </div>
              </div>
              <div className="feature-item">
                <span>02</span>
                <div>
                  <h3>Vérification complète</h3>
                  <p>Statut, montant, devise et produit sont vérifiés avant de marquer la commande payée.</p>
                </div>
              </div>
              <div className="feature-item">
                <span>03</span>
                <div>
                  <h3>Design premium</h3>
                  <p>Glow rouge, animations, cartes glassmorphism et interface responsive mobile/PC.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="glass-card process-card">
            <h3>Processus de commande</h3>
            <ol>
              <li>Choix du produit</li>
              <li>Page checkout</li>
              <li>Création order PayPal</li>
              <li>Paiement client</li>
              <li>Capture + vérification</li>
              <li>Commande validée</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container testimonials">
          <SectionTitle eyebrow="Avis" title="Un rendu boutique moderne" centered>
            Des blocs prêts à personnaliser pour rendre la page d’accueil plus complète.
          </SectionTitle>
          <div className="testimonial-grid">
            <div className="glass-card quote-card">
              <p>“Interface propre, rapide, avec un vrai style premium noir/rouge.”</p>
              <span>Client boutique</span>
            </div>
            <div className="glass-card quote-card">
              <p>“Les pages produit et checkout sont claires, ça fait beaucoup plus sérieux.”</p>
              <span>Projet digital</span>
            </div>
            <div className="glass-card quote-card">
              <p>“Le panel admin permet déjà de visualiser les ventes et les produits.”</p>
              <span>Admin ToolsOp</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section cta-section">
        <div className="container glass-card cta-card">
          <div>
            <span className="eyebrow">Prêt à vendre</span>
            <h2>Configure PayPal et lance ta boutique.</h2>
            <p>Ajoute tes variables d’environnement sur Netlify, passe PayPal en live quand tout est testé, puis déploie.</p>
          </div>
          <Link href="/shop" className="btn btn-primary">
            Commencer
          </Link>
        </div>
      </section>
    </>
  )
}
