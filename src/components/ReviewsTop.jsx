import { useEffect, useState } from 'react'

function Stars({ rating }) {
  const value = Math.max(1, Math.min(5, Number(rating || 5)))

  return (
    <span className="review-stars">
      {'★'.repeat(value)}
      {'☆'.repeat(5 - value)}
    </span>
  )
}

export default function ReviewsTop() {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    async function loadReviews() {
      try {
        const response = await fetch('/.netlify/functions/reviews')
        const data = await response.json()

        if (response.ok && data.ok) {
          setReviews(data.reviews || [])
        }
      } catch {
        setReviews([])
      }
    }

    loadReviews()
  }, [])

  if (reviews.length === 0) return null

  return (
    <section className="reviews-top">
      <div className="reviews-track">
        {[...reviews, ...reviews].map((review, index) => (
          <div className="review-pill" key={`${review.id || index}-${index}`}>
            <div className="review-pill-head">
              <strong>{review.name || 'Client'}</strong>
              <Stars rating={review.rating} />
            </div>

            <p>{review.message}</p>
          </div>
        ))}
      </div>
    </section>
  )
}