import { useNavigate } from 'react-router-dom'

export default function CabecalhoAdmin({ titulo, subtitulo, acao }) {
  const navigate = useNavigate()

  return (
    <div className="pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold leading-tight">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-arena-muted">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {acao}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm text-arena-muted active:text-white"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Voltar
          </button>
        </div>
      </div>
      <div className="mt-4 h-1.5 w-full bg-gradient-to-r from-arena-primary via-arena-secondary to-transparent recorte" />
    </div>
  )
}
