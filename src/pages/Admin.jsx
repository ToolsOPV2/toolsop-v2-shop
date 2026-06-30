import { useEffect, useMemo, useState } from 'react'
import { formatPrice } from '../data/products.js'

const DISCORD_LOGIN_URL = '/.netlify/functions/discord-login'
const ADMIN_LOGIN_URL = '/.netlify/functions/admin-login'
const ADMIN_LOGOUT_URL = '/.netlify/functions/admin-logout'
const ADMIN_ME_URL = '/.netlify/functions/admin-me'
const ADMIN_ORDERS_URL = '/.netlify/functions/admin-orders'
const PRODUCTS_URL = '/.netlify/functions/products'
const UPDATE_STOCK_URL = '/.netlify/functions/admin-update-stock'

export default function Admin() {
  const [session, setSession] = useState({
    loading: true,
    authenticated: false,
    isAdmin: false,
    method: null,
    user: null,
  })

  const [products, setProducts] = useState([])
  const [stockDrafts, setStockDrafts] = useState({})
  const [savingStockId, setSavingStockId] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function refreshSession() {
    try {
      const response = await fetch(ADMIN_ME_URL, {
        credentials: 'include',
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setSession({
          loading: false,
          authenticated: false,
          isAdmin: false,
          method: null,
          user: null,
        })

        return
      }

      setSession({
        loading: false,
        authenticated: Boolean(data.authenticated),
        isAdmin: Boolean(data.isAdmin),
        method: data.method || null,
        user: data.user || null,
      })
    } catch {
      setSession({
        loading: false,
        authenticated: false,
        isAdmin: false,
        method: null,
        user: null,
      })

      setError('Impossible de vérifier la session admin.')
    }
  }

  async function loadProducts() {
    const response = await fetch(PRODUCTS_URL)
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.error || 'Impossible de charger les produits')
    }

    const list = data.products || []
    setProducts(list)

    const drafts = {}

    for (const product of list) {
      drafts[product.id] = String(product.stock || 0)
    }

    setStockDrafts(drafts)
  }

  async function loadOrders() {
    setOrdersLoading(true)

    try {
      const response = await fetch(ADMIN_ORDERS_URL, {
        credentials: 'include',
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de lire les commandes')
      }

      setOrders(data.orders || [])
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const discordStatus = params.get('discord')
    const message = params.get('message')

    if (discordStatus === 'denied') {
      setError("Connexion réussie, mais ton compte n'a pas le rôle Discord admin demandé.")
    }

    if (discordStatus === 'error') {
      setError(message || 'Erreur pendant la connexion Discord.')
    }

    refreshSession()
  }, [])

  useEffect(() => {
    if (!session.isAdmin) return

    Promise.all([loadProducts(), loadOrders()]).catch((error) => setError(error.message))
  }, [session.isAdmin])

  async function handlePasswordLogin(event) {
    event.preventDefault()

    try {
      setLoginLoading(true)
      setError('')
      setSuccess('')

      const response = await fetch(ADMIN_LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          password,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Connexion impossible')
      }

      setPassword('')
      await refreshSession()
    } catch (error) {
      setError(error.message)
    } finally {
      setLoginLoading(false)
    }
  }

  async function updateStock(product) {
    try {
      setSavingStockId(product.id)
      setError('')
      setSuccess('')

      const stock = Number(stockDrafts[product.id])

      const response = await fetch(UPDATE_STOCK_URL, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          productId: product.id,
          stock,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de modifier le stock')
      }

      await loadProducts()
      setSuccess(`Stock mis à jour pour ${product.name}.`)
    } catch (error) {
      setError(error.message)
    } finally {
      setSavingStockId(null)
    }
  }

  const stats = useMemo(() => {
    const revenue = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0)
    const outOfStock = products.filter((product) => Number(product.stock || 0) <= 0)

    return {
      products: products.length,
      orders: orders.length,
      revenue,
      stock: products.reduce((sum, product) => sum + Number(product.stock || 0), 0),
      outOfStock: outOfStock.length,
    }
  }, [products, orders])

  const outOfStockProducts = products.filter((product) => Number(product.stock || 0) <= 0)

  if (session.loading) {
    return (
      <section className="section page-section">
        <div className="container narrow">
          <div className="glass-card admin-login discord-login-card">
            <img src="/logo.png" alt="ToolsOp V2" />
            <h1>Vérification admin</h1>
            <p>Connexion au serveur en cours...</p>
          </div>
        </div>
      </section>
    )
  }

  if (!session.isAdmin) {
    return (
      <section className="section page-section">
        <div className="container narrow">
          <div className="glass-card admin-login discord-login-card">
            <img src="/logo.png" alt="ToolsOp V2" />

            <span className="eyebrow">Admin Gate</span>

            <h1>Panel Admin</h1>

            <p>
              Connecte-toi avec Discord si tu as le rôle admin, ou utilise le mot de passe de secours.
            </p>

            {error && <div className="error-box">{error}</div>}

            <a className="btn btn-primary full discord-btn" href={DISCORD_LOGIN_URL}>
              Se connecter avec Discord
            </a>

            <div className="admin-separator">
              <span>ou</span>
            </div>

            <form className="admin-password-form" onSubmit={handlePasswordLogin}>
              <label htmlFor="admin-password">Mot de passe admin</label>

              <input
                id="admin-password"
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button className="btn btn-ghost full" type="submit" disabled={loginLoading}>
                {loginLoading ? 'Connexion...' : 'Connexion avec mot de passe'}
              </button>
            </form>

            <p className="admin-helper">
              Lance le projet avec <code>npx netlify-cli dev</code>.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="section page-section">
      <div className="container">
        <div className="admin-heading">
          <div>
            <span className="eyebrow">Admin</span>

            <h1>Tableau de bord</h1>

            <p>
              Accès validé via{' '}
              <strong>{session.method === 'discord' ? 'Discord' : 'mot de passe'}</strong> pour{' '}
              <strong>{session.user?.globalName || session.user?.username || 'Admin'}</strong>.
            </p>
          </div>

          <a className="btn btn-ghost" href={ADMIN_LOGOUT_URL}>
            Déconnexion
          </a>
        </div>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="admin-stats">
          <div className="glass-card stat-card">
            <span>Produits</span>
            <strong>{stats.products}</strong>
          </div>

          <div className="glass-card stat-card">
            <span>Commandes</span>
            <strong>{stats.orders}</strong>
          </div>

          <div className="glass-card stat-card">
            <span>Revenus</span>
            <strong>{formatPrice(stats.revenue)}</strong>
          </div>

          <div className="glass-card stat-card">
            <span>Ruptures</span>
            <strong>{stats.outOfStock}</strong>
          </div>
        </div>

        <div className="admin-panels">
          <div className="glass-card admin-panel">
            <h2>Historique des commandes</h2>

            {ordersLoading ? (
              <p className="empty-state">Chargement des commandes...</p>
            ) : orders.length === 0 ? (
              <p className="empty-state">Aucune commande enregistrée pour le moment.</p>
            ) : (
              <div className="admin-table order-history-table">
                {orders.map((order) => (
                  <div className="admin-row order-row" key={order.paypalOrderId}>
                    <span>{order.emailSent ? '✅' : '⚠️'}</span>

                    <strong>{order.productName}</strong>

                    <em>{order.customerEmail}</em>

                    <b>
                      {order.amount} {order.currency}
                    </b>

                    <small>ID PayPal : {order.paypalOrderId}</small>
                    <small>{new Date(order.paidAt || order.savedAt).toLocaleString('fr-FR')}</small>
                    <small>Email : {order.emailSent ? 'envoyé' : 'non envoyé'}</small>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card admin-panel">
            <h2>Articles en rupture</h2>

            {outOfStockProducts.length === 0 ? (
              <p className="empty-state">Aucun article en rupture.</p>
            ) : (
              <div className="admin-table">
                {outOfStockProducts.map((product) => (
                  <div className="admin-row" key={product.id}>
                    <span>{product.icon}</span>
                    <strong>{product.name}</strong>
                    <em>{product.category}</em>
                    <b>Rupture</b>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card admin-panel full-admin-panel">
            <h2>Gestion du stock</h2>

            <div className="admin-table stock-admin-table">
              {products.map((product) => (
                <div className="stock-admin-row" key={product.id}>
                  <div>
                    <span className="stock-product-icon">{product.icon}</span>
                  </div>

                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.category}</small>
                  </div>

                  <div>
                    <small>Prix</small>
                    <b>{formatPrice(product.price)}</b>
                  </div>

                  <div>
                    <small>Stock</small>

                    <input
                      type="number"
                      min="0"
                      value={stockDrafts[product.id] ?? product.stock}
                      onChange={(event) =>
                        setStockDrafts((current) => ({
                          ...current,
                          [product.id]: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    disabled={savingStockId === product.id}
                    onClick={() => updateStock(product)}
                  >
                    {savingStockId === product.id ? 'Sauvegarde...' : 'Sauver'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}