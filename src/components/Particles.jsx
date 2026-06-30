export default function Particles() {
  return (
    <div className="particles" aria-hidden="true">
      {Array.from({ length: 36 }).map((_, index) => (
        <span key={index} style={{ '--i': index }} />
      ))}
    </div>
  )
}
