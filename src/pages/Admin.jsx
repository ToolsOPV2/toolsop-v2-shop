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

function getStars(rating) {
  const value = Math.max(1, Math.min(5, Number(rating || 5)))
  return `${'★'.repeat(value)}${'☆'.repeat(5 - value)}`
}

function isValidCustomerEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

function getOrderReplyUrl(order) {
  const email = String(order.customer_email || '').trim()

  if (!isValidCustomerEmail(email)) {
    return ''
  }

  const productName = order.product_name || 'votre commande'
  const orderId = order.paypal_order_id || order.id || 'ID inconnu'
  const amount = formatPrice(order.amount, order.currency || 'EUR')

  const subject = 'Réponse à votre commande ToolsOp V2'

  const body = `
Bonjour,

Je vous contacte concernant votre commande ToolsOp V2.

Article : ${productName}
Montant : ${amount}
ID commande : ${orderId}

Votre message ici...

Cordialement,
ToolsOp V2
  `.trim()

  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: email,
    su: subject,
    body,
  })

  return `https://mail.google.com/mail/?${params.toString()}`
}

export default function Admin() {
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [reviews, setReviews] = useState([])

  const [stockValues, setStockValues] = useState({})
  const [loadingData, setLoadingData] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [savingStock, setSavingStock] = useState('')
  const [completingOrder, setCompletingOrder] = useState('')
  const [deletingOrder, setDeletingOrder] = useState('')
  const [deletingAllOrders, setDeletingAllOrders] = useState(false)

  const [reviewForm, setReviewForm] = useState({
    name: '',
    rating: 5,
    message: '',
    position: 0,
    is_active: true,
  })

  const [savingReview, setSavingReview] = useState(false)
  const [deletingReview, setDeletingReview] = useState('')

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

      const [productsResponse, ordersResponse, reviewsResponse] = await Promise.all([
        fetch('/.netlify/functions/products'),
        fetch('/.netlify/functions/admin-orders', {
          credentials: 'include',
        }),
        fetch('/.netlify/functions/admin-reviews', {
          credentials: 'include',
        }),
      ])

      const productsData = await productsResponse.json()
      const ordersData = await ordersResponse.json()
      const reviewsData = await reviewsResponse.json()

      if (!productsResponse.ok) {
        throw new Error(productsData.error || 'Impossible de charger les produits')
      }

      if (!ordersResponse.ok) {
        throw new Error(ordersData.error || 'Impossible de charger les commandes')
      }

      if (!reviewsResponse.ok) {
        throw new Error(reviewsData.error || 'Impossible de charger les évaluations')
      }

      const loadedProducts = productsData.products || []
      const loadedOrders = ordersData.orders || []
      const loadedReviews = reviewsData.reviews || []

      setProducts(loadedProducts)
      setOrders(loadedOrders)
      setReviews(loadedReviews)

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

  const pendingOrders = useMemo(() => {
    return orders.filter((order) => order.status === 'PENDING_MANUAL')
  }, [orders])

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, order) => {
      if (order.status === 'PENDING_MANUAL') return sum
      return sum + Number(order.amount || 0)
    }, 0)

    const pendingOrdersCount = orders.filter((order) => order.status === 'PENDING_MANUAL').length
    const completedOrders = orders.filter((order) => order.status !== 'PENDING_MANUAL').length
    const totalStock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0)

    return {
      totalRevenue,
      pendingOrdersCount,
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
      `Confirmer cette commande ?\n\nArticle : ${order.product_name}\nEmail : ${order.customer_email}\nMontant : ${formatPrice(
        order.amount,
        order.currency || 'EUR'
      )}\n\nCela va envoyer l’email automatiquement.`
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

  async function deleteOrder(order) {
    const confirmed = window.confirm(
      `Supprimer cette commande ?\n\nArticle : ${order.product_name}\nEmail : ${order.customer_email}\nMontant : ${formatPrice(
        order.amount,
        order.currency || 'EUR'
      )}\n\nCette action ne peut pas être annulée.`
    )

    if (!confirmed) return

    try {
      setDeletingOrder(order.id || order.paypal_order_id)
      setError('')
      setSuccess('')

      const response = await fetch('/.netlify/functions/admin-delete-order', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          paypalOrderId: order.paypal_order_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de supprimer la commande')
      }

      setSuccess(`Commande supprimée : ${order.product_name || 'commande'}`)
      await loadData()
    } catch (error) {
      setError(error.message)
    } finally {
      setDeletingOrder('')
    }
  }

  async function deleteAllOrders() {
    const confirmation = window.prompt(
      'Tu es sûr de vouloir supprimer TOUTES les commandes ?\n\nÉcris SUPPRIMER pour confirmer.'
    )

    if (confirmation !== 'SUPPRIMER') {
      setError('Suppression annulée : confirmation incorrecte.')
      return
    }

    try {
      setDeletingAllOrders(true)
      setError('')
      setSuccess('')

      const response = await fetch('/.netlify/functions/admin-delete-all-orders', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: 'SUPPRIMER',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de supprimer toutes les commandes')
      }

      setSuccess(`${data.deletedCount || 0} commande(s) supprimée(s).`)
      await loadData()
    } catch (error) {
      setError(error.message)
    } finally {
      setDeletingAllOrders(false)
    }
  }

  async function createReview(event) {
    event.preventDefault()

    try {
      setSavingReview(true)
      setError('')
      setSuccess('')

      const response = await fetch('/.netlify/functions/admin-reviews', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Impossible d’ajouter l’évaluation')
      }

      setReviewForm({
        name: '',
        rating: 5,
        message: '',
        position: 0,
        is_active: true,
      })

      setSuccess('Évaluation ajoutée.')
      await loadData()
    } catch (error) {
      setError(error.message)
    } finally {
      setSavingReview(false)
    }
  }

  async function toggleReview(review) {
    try {
      setError('')
      setSuccess('')

      const response = await fetch('/.netlify/functions/admin-reviews', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: review.id,
          is_active: !review.is_active,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de modifier l’évaluation')
      }

      setSuccess('Évaluation modifiée.')
      await loadData()
    } catch (error) {
      setError(error.message)
    }
  }

  async function deleteReview(review) {
    const confirmed = window.confirm(
      `Supprimer cette évaluation ?\n\n${review.name} - ${review.rating}/5\n${review.message}`
    )

    if (!confirmed) return

    try {
      setDeletingReview(review.id)
      setError('')
      setSuccess('')

      const response = await fetch('/.netlify/functions/admin-reviews', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: review.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de supprimer l’évaluation')
      }

      setSuccess('Évaluation supprimée.')
      await loadData()
    } catch (error) {
      setError(error.message)
    } finally {
      setDeletingReview('')
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
              Vérifie les commandes, gère le stock et réponds aux clients directement par email.
            </p>
          </div>

          <button className="btn btn-ghost" type="button" onClick={logout}>
            Déconnexion
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}
        {loadingData && <p className="empty-state">Chargement des données...</p>}

        <div className="admin-actions-bar">
          <button
            className="btn btn-ghost danger-btn"
            type="button"
            disabled={orders.length === 0 || deletingAllOrders}
            onClick={deleteAllOrders}
          >
            {deletingAllOrders ? 'Suppression...' : 'Tout supprimer les commandes'}
          </button>

          <button className="btn btn-ghost" type="button" onClick={loadData}>
            Rafraîchir
          </button>
        </div>

        <div className="admin-stats">
          <div className="glass-card stat-card">
            <span>Revenus validés</span>
            <strong>{formatPrice(stats.totalRevenue)}</strong>
          </div>

          <div className="glass-card stat-card">
            <span>En attente</span>
            <strong>{stats.pendingOrdersCount}</strong>
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
            <h2>Commandes en attente à vérifier</h2>

            <div className="manual-orders-list">
              {pendingOrders.length === 0 && (
                <p className="empty-state">Aucune commande en attente.</p>
              )}

              {pendingOrders.map((order) => (
                <div className="manual-order-card" key={order.id || order.paypal_order_id}>
                  <div className="manual-order-header">
                    <span className={`order-status-pill ${getStatusClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>

                    <strong>{formatPrice(order.amount, order.currency || 'EUR')}</strong>
                  </div>

                  <div className="manual-order-info">
                    <div>
                      <span>Article</span>
                      <strong>{order.product_name || 'Article inconnu'}</strong>
                    </div>

                    <div>
                      <span>Email client</span>
                      <strong>{order.customer_email || 'Email inconnu'}</strong>
                    </div>

                    <div>
                      <span>Date</span>
                      <strong>{formatDate(order.saved_at || order.paid_at || order.created_at)}</strong>
                    </div>

                    <div>
                      <span>ID commande</span>
                      <strong>{order.paypal_order_id || order.id}</strong>
                    </div>
                  </div>

                  <div className="manual-order-actions">
                    <button
                      className="btn btn-primary full"
                      type="button"
                      disabled={completingOrder === order.id || deletingOrder === order.id}
                      onClick={() => completeManualOrder(order)}
                    >
                      {completingOrder === order.id
                        ? 'Validation + envoi email...'
                        : 'Marquer effectué + envoyer email'}
                    </button>

                    {isValidCustomerEmail(order.customer_email) ? (
                      <a
                        className="btn btn-ghost full"
                        href={getOrderReplyUrl(order)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Répondre à l&apos;email
                      </a>
                    ) : (
                      <button className="btn btn-ghost full" type="button" disabled>
                        Email indisponible
                      </button>
                    )}

                    <button
                      className="btn btn-ghost danger-btn full"
                      type="button"
                      disabled={deletingOrder === order.id || completingOrder === order.id}
                      onClick={() => deleteOrder(order)}
                    >
                      {deletingOrder === order.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card admin-panel full-admin-panel">
            <h2>Historique complet</h2>

            <div className="manual-orders-list">
              {orders.length === 0 && <p className="empty-state">Aucune commande enregistrée.</p>}

              {orders.map((order) => (
                <div className="manual-order-card history-card" key={order.id || order.paypal_order_id}>
                  <div className="manual-order-header">
                    <span className={`order-status-pill ${getStatusClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>

                    <strong>{formatPrice(order.amount, order.currency || 'EUR')}</strong>
                  </div>

                  <div className="manual-order-info">
                    <div>
                      <span>Article</span>
                      <strong>{order.product_name || 'Article inconnu'}</strong>
                    </div>

                    <div>
                      <span>Email client</span>
                      <strong>{order.customer_email || 'Email inconnu'}</strong>
                    </div>

                    <div>
                      <span>Date</span>
                      <strong>{formatDate(order.saved_at || order.paid_at || order.created_at)}</strong>
                    </div>

                    <div>
                      <span>Email automatique</span>
                      <strong>
                        {order.email_sent
                          ? 'Envoyé ✅'
                          : order.email_error
                            ? `Non envoyé : ${order.email_error}`
                            : 'Non envoyé'}
                      </strong>
                    </div>

                    <div>
                      <span>ID commande</span>
                      <strong>{order.paypal_order_id || order.id}</strong>
                    </div>
                  </div>

                  <div className="manual-order-actions history-actions">
                    {isValidCustomerEmail(order.customer_email) ? (
                      <a
                        className="btn btn-ghost full"
                        href={getOrderReplyUrl(order)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Répondre à l&apos;email
                      </a>
                    ) : (
                      <button className="btn btn-ghost full" type="button" disabled>
                        Email indisponible
                      </button>
                    )}

                    <button
                      className="btn btn-ghost danger-btn full"
                      type="button"
                      disabled={deletingOrder === order.id}
                      onClick={() => deleteOrder(order)}
                    >
                      {deletingOrder === order.id ? 'Suppression...' : 'Supprimer cette commande'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card admin-panel full-admin-panel">
            <h2>Évaluations du site</h2>

            <form className="review-admin-form" onSubmit={createReview}>
              <div className="review-admin-grid">
                <input
                  type="text"
                  placeholder="Nom affiché, ex: Lucas"
                  value={reviewForm.name}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />

                <select
                  value={reviewForm.rating}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      rating: Number(event.target.value),
                    }))
                  }
                >
                  <option value="5">5 étoiles</option>
                  <option value="4">4 étoiles</option>
                  <option value="3">3 étoiles</option>
                  <option value="2">2 étoiles</option>
                  <option value="1">1 étoile</option>
                </select>

                <input
                  type="number"
                  placeholder="Position"
                  value={reviewForm.position}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      position: Number(event.target.value),
                    }))
                  }
                />
              </div>

              <textarea
                placeholder="Message de l’évaluation"
                value={reviewForm.message}
                onChange={(event) =>
                  setReviewForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
              />

              <label className="review-checkbox">
                <input
                  type="checkbox"
                  checked={reviewForm.is_active}
                  onChange={(event) =>
                    setReviewForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                />
                Afficher sur le site
              </label>

              <button className="btn btn-primary full" type="submit" disabled={savingReview}>
                {savingReview ? 'Ajout...' : 'Ajouter l’évaluation'}
              </button>
            </form>

            <div className="review-admin-list">
              {reviews.length === 0 && <p className="empty-state">Aucune évaluation.</p>}

              {reviews.map((review) => (
                <div className="review-admin-card" key={review.id}>
                  <div>
                    <strong>{review.name || 'Client'}</strong>
                    <span>{getStars(review.rating)}</span>
                  </div>

                  <p>{review.message}</p>

                  <small>
                    Position : {review.position || 0} —{' '}
                    {review.is_active ? 'Visible sur le site' : 'Masquée'}
                  </small>

                  <div className="review-admin-actions">
                    <button className="btn btn-ghost" type="button" onClick={() => toggleReview(review)}>
                      {review.is_active ? 'Masquer' : 'Afficher'}
                    </button>

                    <button
                      className="btn btn-ghost danger-btn"
                      type="button"
                      disabled={deletingReview === review.id}
                      onClick={() => deleteReview(review)}
                    >
                      {deletingReview === review.id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
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