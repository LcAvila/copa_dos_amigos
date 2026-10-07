import { Bola } from './Artes'

export default function Loading({ texto = 'Carregando...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative flex flex-col items-center">
        <div className="animate-[girarBola_1.1s_linear_infinite] drop-shadow-[0_0_18px_rgba(46,140,255,0.45)]">
          <Bola className="size-12" />
        </div>
        <div className="mt-2 h-1 w-8 rounded-full bg-white/15" />
      </div>
      <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-arena-muted">
        {texto}
      </p>
      <div className="recorte h-1.5 w-44 overflow-hidden bg-white/10">
        <div className="barra-pulso h-full w-full bg-gradient-to-r from-arena-secondary via-arena-primary to-arena-secondary" />
      </div>
    </div>
  )
}