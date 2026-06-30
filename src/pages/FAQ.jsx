import SectionTitle from '../components/SectionTitle.jsx'

const faqs = [
  {
    q: 'Comment fonctionne le paiement PayPal ?',
    a: 'Le site envoie seulement l’identifiant du produit. Le serveur récupère le prix officiel, crée la commande PayPal, puis vérifie le paiement après capture.',
  },
  {
    q: 'Est-ce que le prix peut être modifié dans le navigateur ?',
    a: 'Non. Le prix réel utilisé par PayPal est stocké côté serveur dans les Netlify Functions.',
  },
  {
    q: 'Comment modifier les produits ?',
    a: 'Modifie src/data/products.js pour l’affichage et netlify/functions/_products.js pour la vérification PayPal.',
  },
  {
    q: 'Le panel admin est-il sécurisé ?',
    a: 'Le panel inclus sert de base visuelle. Pour une production réelle, connecte-le à une base de données et à une vraie authentification.',
  },
]

export default function FAQ() {
  return (
    <section className="section page-section">
      <div className="container narrow">
        <SectionTitle eyebrow="FAQ" title="Questions fréquentes" centered>
          Les réponses importantes sur le fonctionnement du site et du paiement.
        </SectionTitle>
        <div className="faq-list">
          {faqs.map((item) => (
            <details className="glass-card faq-item" key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
