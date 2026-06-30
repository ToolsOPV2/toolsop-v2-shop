export default function SectionTitle({ eyebrow, title, children, centered = false }) {
  return (
    <div className={`section-title ${centered ? 'centered' : ''}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  )
}
