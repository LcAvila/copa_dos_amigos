import BotaoVoltar from './BotaoVoltar'

export default function CabecalhoAdmin({ titulo, subtitulo, acao }) {
  return (
    <div className="pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold leading-tight">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-arena-muted">{subtitulo}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {acao}
          <BotaoVoltar />
        </div>
      </div>
      <div className="recorte relative mt-4 h-1.5 w-full overflow-hidden bg-gradient-to-r from-arena-primary via-arena-secondary to-transparent">
        <span className="absolute inset-y-0 w-1/3 animate-[barraPulso_1.8s_ease-in-out_infinite] bg-white/60 blur-[2px]" />
      </div>
    </div>
  )
}
