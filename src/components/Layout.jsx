import { useEffect, useState } from 'react'
import Link from './Link.jsx'

const navItems = [
  { href: '/', label: 'Accueil' },
  { href: '/shop', label: 'Boutique' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
  { href: '/admin', label: 'Admin' },
]

export default function Layout({ children, totalProducts = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20)
    }

    onScroll()
    window.addEventListener('scroll', onScroll)

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="app-shell">
      <div className="bg-glow bg-glow-one" />
      <div className="bg-glow bg-glow-two" />
      <div className="bg-grid" />

      <div className="particles" aria-hidden="true">
        {Array.from({ length: 42 }).map((_, index) => (
          <span key={index} style={{ '--i': index + 1 }} />
        ))}
      </div>

      <div className="ash-particles" aria-hidden="true">
        {Array.from({ length: 85 }).map((_, index) => (
          <span key={index} style={{ '--i': index + 1 }} />
        ))}
      </div>

      <header className={scrolled ? 'navbar navbar-scrolled' : 'navbar'}>
        <Link href="/" className="brand">
          <img className="brand-logo" src="/logo.png" alt="ToolsOp V2" />

          <span>
            <strong>ToolsOp V2</strong>
            <small>{totalProducts} services premium</small>
          </span>
        </Link>

        <nav className={menuOpen ? 'nav-links nav-open' : 'nav-links'}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.href === '/shop' ? 'nav-cta' : 'nav-link'}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <button
          className="menu-button"
          type="button"
          aria-label="Ouvrir le menu"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <main className="site-main page-enter">{children}</main>

      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <img src="/logo.png" alt="ToolsOp V2" />

            <div>
              <h4>ToolsOp V2</h4>
              <p>
                Boutique digitale premium avec paiement PayPal, livraison email et panel admin.
              </p>
            </div>
          </div>

          <div>
            <h4>Navigation</h4>
            <Link href="/">Accueil</Link>
            <Link href="/shop">Boutique</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
          </div>

          <div>
            <h4>Sécurité</h4>
            <p>Paiement vérifié côté serveur.</p>
            <p>Stock synchronisé avec Supabase.</p>
            <p>Email automatique après commande validée.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}