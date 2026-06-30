import { useEffect, useMemo, useState } from 'react'
import { formatPrice } from '../data/products.js'

function formatDate(value) {
  if (!value) return 'Date inconnue'

  try {
    return new Intl.DateTimeFormat('fr-BE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function getStatusLabel(status) {
  if (status === 'PENDING_MANUAL') return 'En attente'
  if (status === 'COMPLETED_MANUAL') return 'Effectuée'
  if (status === 'PAID') return 'Payée'
  if (status === 'COMPLETED') return 'Complétée'
  return status || 'Inconnu'
}

function getStatusClass(status) {
  if (status === 'PENDING_MANUAL') return 'status-pending'
  if (status === 'COMPLETED_MANUAL' || status === 'PAID' || status === 'COMPLETED') {
    return 'status-completed'
  }
  return 'status-neutral'
}

export default function Admin() {
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [stockValues, setStockValues] = useState({})
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [savingStock, setSavingStock] = useState('')
  const [completingOrder, setCompletingOrder] = useState('')

  async function checkAdmin() {
    try {
      setAuthLoading(true)

      const response = await fetch('/.netlify/functions/admin-me', {
        credentials: 'include',
      })

      if (!response.ok) {
        setIsAdmin(false)
        return
      }

      const data = await response.json()
      setIsAdmin(Boolean(data.ok || data.admin || data.user))
    } catch {
      setIsAdmin(false)
    } finally {
      setAuthLoading(false)
    }
  }

  async function loadData() {
    try {
      setLoadingData(true)
      setError('')

      const [productsResponse, ordersResponse] = await Promise.all([
        fetch('/.netlify/functions/products'),
        fetch('/.netlify/functions/admin-orders', {
          credentials: 'include',
        }),
      ])

      const productsData = await productsResponse.json()
      const ordersData = await ordersResponse.json()

      if (!productsResponse.ok) {
        throw new Error(productsData.error || 'Impossible de charger les produits')
      }

      if (!ordersResponse.ok) {
        throw new Error(ordersData.error || 'Impossible de charger les commandes')
      }

      const loadedProducts = productsData.products || []
      const loadedOrders = ordersData.orders || []

      setProducts(loadedProducts)
      setOrders(loadedOrders)

      const nextStockValues = {}

      for (const product of loadedProducts) {
        nextStockValues[product.id] = Number(product.stock || 0)
      }

      setStockValues(nextStockValues)
    } catch (error) {
      setError(error.message)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => {
      if (order.status === 'PENDING_MANUAL') return sum
      return sum + Number(order.amount || 0)
    }, 0)

    const pendingOrders = orders.filter((order) => order.status === 'PENDING_MANUAL').length
    const completedOrders = orders.filter((order) => order.status !== 'PENDING_MANUAL').length
    const totalStock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0)

    return {
      totalRevenue,
      pendingOrders,
      completedOrders,
      totalStock,
    }
  }, [orders, products])

  async function loginWithPassword(event) {
    event.preventDefault()

    try {
      setLoginLoading(true)
      setLoginError('')

      const response = await fetch('/.netlify/functions/admin-login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Connexion refusée')
      }

      setPassword('')
      setIsAdmin(true)
    } catch (error) {
      setLoginError(error.message)
    } finally {
      setLoginLoading(false)
    }
  }

  async function logout() {
    await fetch('/.netlify/functions/admin-logout', {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})

    setIsAdmin(false)
  }

  async function saveStock(product) {
    try {
      setSavingStock(product.id)
      setError('')
      setSuccess('')

      const stock = Number(stockValues[product.id] || 0)

      if (!Number.isFinite(stock) || stock < 0) {
        throw new Error('Stock invalide')
      }

      const response = await fetch('/.netlify/functions/admin-update-stock', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          stock,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de modifier le stock')
      }

      setSuccess(`Stock mis à jour pour ${product.name}`)
      await loadData()
    } catch (error) {
      setError(error.message)
    } finally {
      setSavingStock('')
    }
  }

  async function completeManualOrder(order) {
    const confirmed = window.confirm(
      `Marquer la commande "${order.product_name}" comme effectuée et envoyer l’email à ${order.customer_email} ?`
    )

    if (!confirmed) return

    try {
      setCompletingOrder(order.id)
      setError('')
      setSuccess('')

      const response = await fetch('/.netlify/functions/admin-complete-manual-order', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de valider la commande')
      }

      setSuccess(`Commande effectuée. Email envoyé à ${order.customer_email}.`)
      await loadData()
    } catch (error) {
      setError(error.message)
      await loadData()
    } finally {
      setCompletingOrder('')
    }
  }

  if (authLoading) {
    return (
      <section className="section page-section">
        <div className="container narrow">
          <div className="glass-card result-card">
            <span className="result-icon">⏳</span>
            <h1>Chargement admin</h1>
            <p>Vérification de la session...</p>
          </div>
        </div>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="section page-section">
        <div className="container narrow">
          <div className="glass-card admin-login">
            <img src="/logo.png" alt="ToolsOp V2" />

            <h1>Panel admin</h1>

            <p>Connecte-toi avec Discord ou avec le mot de passe admin.</p>

            <a className="btn btn-primary full discord-btn" href="/.netlify/functions/discord-login">
              Connexion Discord
            </a>

            <div className="admin-separator">
              <span>ou</span>
            </div>

            <form className="admin-password-form" onSubmit={loginWithPassword}>
              <label htmlFor="admin-password">Mot de passe admin</label>

              <input
                id="admin-password"
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              {loginError && <div className="error-box">{loginError}</div>}

              <button className="btn btn-primary full" type="submit" disabled={loginLoading}>
                {loginLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
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
            <span className="eyebrow">Administration</span>

            <h1>Panel admin</h1>

            <p>
              Gère le stock, l’historique, les commandes en attente et l’envoi automatique des emails.
            </p>
          </div>

          <button className="btn btn-ghost" type="button" onClick={logout}>
            Déconnexion
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}
        {loadingData && <p className="empty-state">Chargement des données...</p>}

        <div className="admin-stats">
          <div className="glass-card stat-card">
            <span>Revenus validés</span>
            <strong>{formatPrice(stats.totalRevenue)}</strong>
          </div>

          <div className="glass-card stat-card">
            <span>En attente</span>
            <strong>{stats.pendingOrders}</strong>
          </div>

          <div className="glass-card stat-card">
            <span>Effectuées</span>
            <strong>{stats.completedOrders}</strong>
          </div>

          <div className="glass-card stat-card">
            <span>Stock total</span>
            <strong>{stats.totalStock}</strong>
          </div>
        </div>

        <div className="admin-panels">
          <div className="glass-card admin-panel full-admin-panel">
            <h2>Commandes en attente</h2>

            <div className="admin-table order-history-table">
              {orders.filter((order) => order.status === 'PENDING_MANUAL').length === 0 && (
                <p className="empty-state">Aucune commande en attente.</p>
              )}

              {orders
                .filter((order) => order.status === 'PENDING_MANUAL')
                .map((order) => (
                  <div className="admin-row order-row manual-order-row" key={order.id || order.paypal_order_id}>
                    <span className={`order-status-pill ${getStatusClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>

                    <div>
                      <b>{order.product_name}</b>
                      <em>{order.customer_email}</em>
                      <small>{order.paypal_order_id}</small>
                    </div>

                    <strong>{formatPrice(order.amount, order.currency || 'EUR')}</strong>

                    <button
                      className="btn btn-primary btn-small"
                      type="button"
                      disabled={completingOrder === order.id}
                      onClick={() => completeManualOrder(order)}
                    >
                      {completingOrder === order.id ? 'Envoi...' : 'Marquer effectué'}
                    </button>

                    <small>{formatDate(order.saved_at || order.paid_at)}</small>
                  </div>
                ))}
            </div>
          </div>

          <div className="glass-card admin-panel full-admin-panel">
            <h2>Historique complet</h2>

            <div className="admin-table order-history-table">
              {orders.length === 0 && <p className="empty-state">Aucune commande enregistrée.</p>}

              {orders.map((order) => (
                <div className="admin-row order-row" key={order.id || order.paypal_order_id}>
                  <span className={`order-status-pill ${getStatusClass(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>

                  <div>
                    <b>{order.product_name}</b>
                    <em>{order.customer_email}</em>
                    <small>{order.paypal_order_id}</small>
                    {order.email_sent ? (
                      <small>Email envoyé ✅</small>
                    ) : order.email_error ? (
                      <small>Email : {order.email_error}</small>
                    ) : (
                      <small>Email non envoyé</small>
                    )}
                  </div>

                  <strong>{formatPrice(order.amount, order.currency || 'EUR')}</strong>

                  <em>{formatDate(order.saved_at || order.paid_at)}</em>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card admin-panel full-admin-panel">
            <h2>Gestion du stock</h2>

            <div className="admin-table stock-admin-table">
              {products.map((product) => (
                <div className="stock-admin-row" key={product.id}>
                  <div className="stock-product-icon">{product.icon || '⚡'}</div>

                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.id}</small>
                  </div>

                  <b>{formatPrice(product.price)}</b>

                  <input
                    type="number"
                    min="0"
                    value={stockValues[product.id] ?? 0}
                    onChange={(event) =>
                      setStockValues((current) => ({
                        ...current,
                        [product.id]: event.target.value,
                      }))
                    }
                  />

                  <button
                    className="btn btn-primary btn-small"
                    type="button"
                    disabled={savingStock === product.id}
                    onClick={() => saveStock(product)}
                  >
                    {savingStock === product.id ? 'Sauvegarde...' : 'Sauver'}
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