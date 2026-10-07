import { Bola } from './Artes'

export default function CampoIntro({
  frase = 'O campo te espera,',
  palavras = ['JOGADOR', 'CAMPEÃO', 'ARTILHEIRO', 'GOAT'],
  rotulo = 'Bem-vindo à arena',
  subtitulo,
}) {
  return (
    <div className="campo-bg recorte relative overflow-hidden text-center">
      <Bola className="absolute -right-4 top-4 size-24 opacity-15 animate-[girarBola_14s_linear_infinite]" />
      <Bola className="absolute -left-3 bottom-2 size-12 opacity-10 animate-[boiar_4s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.07] to-transparent" />

      <div className="relative px-5 py-8">
        <p className="etiqueta">• {rotulo}</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-none">{frase}</h1>

        <div className="entrar mx-auto mt-3 h-12 w-full max-w-xs overflow-hidden border-2 border-arena-primary/25 bg-arena-bg/50 shadow-[0_0_30px_rgba(246,225,75,0.12)]">
          <div className="slot-roda">
            {[...palavras, ...palavras].map((palavra, indice) => (
              <span
                key={`${palavra}-${indice}`}
                className="flex h-12 w-full items-center justify-center whitespace-nowrap font-display text-4xl font-extrabold tracking-wide text-arena-primary drop-shadow-[0_0_18px_rgba(246,225,75,0.35)]"
              >
                {palavra}
              </span>
            ))}
          </div>
        </div>

        {subtitulo && <p className="mt-3 text-sm text-arena-muted">{subtitulo}</p>}
      </div>
    </div>
  )
}