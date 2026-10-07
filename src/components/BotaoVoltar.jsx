import { useLocation, useNavigate } from 'react-router-dom'

export default function BotaoVoltar({ rotulo = 'Voltar', para = -1, className = '' }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <button
      type="button"
      onClick={() => {
        if (para === -1 && location.key === 'default') {
          navigate('/')
        } else {
          navigate(para)
        }
      }}
      className={`group inline-flex items-center gap-2 self-start rounded-xl border border-arena-primary/50 bg-arena-surface/80 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-black/40 backdrop-blur transition active:scale-95 active:border-arena-primary ${className}`}
    >
      <span className="grid size-6 place-items-center rounded-lg bg-arena-primary text-arena-bg transition group-active:bg-arena-primary/80">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
      {rotulo}
    </button>
  )
}