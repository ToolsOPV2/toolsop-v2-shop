import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import { products } from './data/products.js'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Shop from './pages/Shop.jsx'
import ProductPage from './pages/ProductPage.jsx'
import Checkout from './pages/Checkout.jsx'
import CheckoutSuccess from './pages/CheckoutSuccess.jsx'
import CheckoutCancel from './pages/CheckoutCancel.jsx'
import FAQ from './pages/FAQ.jsx'
import Contact from './pages/Contact.jsx'
import Admin from './pages/Admin.jsx'
import Legal from './pages/Legal.jsx'
import NotFound from './pages/NotFound.jsx'
import ReviewsTop from './components/ReviewsTop.jsx'

function getRoute() {
  const { pathname } = window.location
  if (pathname === '/') return { name: 'home' }
  if (pathname === '/shop') return { name: 'shop' }
  if (pathname.startsWith('/product/')) return { name: 'product', slug: pathname.split('/').pop() }
  if (pathname.startsWith('/checkout/success')) return { name: 'success' }
  if (pathname.startsWith('/checkout/cancel')) return { name: 'cancel' }
  if (pathname.startsWith('/checkout/')) return { name: 'checkout', slug: pathname.split('/').pop() }
  if (pathname === '/faq') return { name: 'faq' }
  if (pathname === '/contact') return { name: 'contact' }
  if (pathname === '/admin') return { name: 'admin' }
  if (pathname === '/legal') return { name: 'legal' }
  return { name: 'not-found' }
}

function App() {
  const [route, setRoute] = useState(getRoute())

  useEffect(() => {
    const onRoute = () => setRoute(getRoute())
    window.addEventListener('popstate', onRoute)
    return () => window.removeEventListener('popstate', onRoute)
  }, [])

  const content = useMemo(() => {
    switch (route.name) {
      case 'home':
        return <Home />
      case 'shop':
        return <Shop />
      case 'product':
        return <ProductPage slug={route.slug} />
      case 'checkout':
        return <Checkout slug={route.slug} />
      case 'success':
        return <CheckoutSuccess />
      case 'cancel':
        return <CheckoutCancel />
      case 'faq':
        return <FAQ />
      case 'contact':
        return <Contact />
      case 'admin':
        return <Admin />
      case 'legal':
        return <Legal />
      default:
        return <NotFound />
    }
  }, [route])

   return (
    <Layout route={route} totalProducts={products.length}>
      {route.name !== 'admin' && <ReviewsTop />}
      {content}
    </Layout>
  )
}

createRoot(document.getElementById('root')).render(<App />)
