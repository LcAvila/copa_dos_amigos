export default function Confete({ total = 12 }) {
  return (
    <div className="confetes" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <i key={i} />
      ))}
    </div>
  )
}