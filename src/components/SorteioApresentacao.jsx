import { useEffect, useState } from 'react'
import {
  montarEtapas,
  indiceEtapaAtual,
  segundosRestantes,
} from '../lib/sorteio'
import Confete from './Confete'
import { Bola } from './Artes'

function Avatar({ url, nome, grande = false }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${grande ? 'size-28 rounded-3xl' : 'size-12 rounded-full'} shrink-0 border-2 border-arena-primary object-cover`}
      />
    )
  }
  return (
    <span
      className={`${grande ? 'size-28 rounded-3xl text-3xl' : 'size-12 rounded-full text-xs'} flex shrink-0 items-center justify-center bg-arena-primary/15 font-display font-black text-arena-primary`}
    >
      {(nome ?? '?').slice(0, 2).toUpperCase()}
    </span>
  )
}

function Escudo({ time, grande = false }) {
  if (time?.escudo_url) {
    return (
      <img
        src={time.escudo_url}
        alt=""
        className={`${grande ? 'size-20' : 'size-9'} shrink-0 object-contain drop-shadow`}
      />
    )
  }
  if (time?.sigla) {
    return (
      <span
        className={`${grande ? 'size-20 text-lg' : 'size-9 text-[10px]'} flex shrink-0 items-center justify-center rounded-2xl bg-white/10 font-display font-black text-arena-muted`}
      >
        {time.sigla.slice(0, 3).toUpperCase()}
      </span>
    )
  }
  return null
}

export default function SorteioApresentacao({
  torneio,
  participantes,
  pool,
  info,
  ehAdmin = false,
  onCancelarAgendamento = null,
}) {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setAgora(Date.now()), 500)
    return () => clearInterval(timer)
  }, [])

  const agoraMs = agora
  const tempo = info?.tempoPorPerfil ?? 5
  const intervalo = info?.intervalo ?? 15
  const inicio = info?.inicioEfetivo ? Date.parse(info.inicioEfetivo) : 0

  const etapas = montarEtapas(
    participantes,
    info?.ordem ?? [],
    info?.inicioEfetivo,
    tempo,
    intervalo,
  )

  const todosTemTime = participantes.length > 0 && participantes.every((p) => p.time_id)
  const emEspera = Boolean(inicio) && agoraMs < inicio
  const indice = indiceEtapaAtual(etapas, agoraMs)
  const etapa = indice >= 0 ? etapas[indice] : null
  const participante = etapa?.participante
  const escolhido = participante?.time_id ? participante.times : null
  const rolando = participante && !participante.time_id && agoraMs >= etapa.escolhaEm - 3000
  const spinIx = Math.floor(agoraMs / 90) % Math.max(pool.length, 1)

  if (emEspera) {
    const segs = segundosRestantes(inicio, agoraMs)
    const mm = String(Math.floor(segs / 60)).padStart(2, '0')
    const ss = String(segs % 60).padStart(2, '0')
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 overflow-y-auto bg-arena-bg px-6 py-10 text-center">
        {ehAdmin && onCancelarAgendamento && (
          <button
            type="button"
            onClick={onCancelarAgendamento}
            className="absolute right-4 top-4 rounded-xl border border-white/10 bg-arena-surface px-3 py-2 text-xs font-bold text-arena-danger transition active:scale-95"
          >
            Cancelar agendamento
          </button>
        )}
        <Bola className="size-16 animate-[girarBola_3s_linear_infinite] drop-shadow-[0_0_30px_rgba(246,225,75,0.4)]" />
        <div>
          <p className="etiqueta">• Sorteador ao vivo</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight">
            O sorteio de <span className="text-arena-primary">{torneio.nome}</span>
          </h1>
        </div>

        <div className="rounded-2xl border border-arena-primary/40 bg-arena-primary/10 px-8 py-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-arena-muted">
            O sorteio começa em
          </p>
          <p className="font-display text-6xl font-black tabular-nums text-arena-primary">
            {mm}:{ss}
          </p>
        </div>

        <p className="text-sm text-arena-muted">
          {participantes.length} {participantes.length === 1 ? 'participante' : 'participantes'} •{' '}
          {pool.length} {pool.length === 1 ? 'time disponível' : 'times disponíveis'}
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          {participantes.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-arena-surface px-3 py-1.5"
            >
              <Avatar url={p.perfil?.avatar_url} nome={p.perfil?.nome} />
              <span className="text-xs font-medium">
                {p.perfil?.nome ?? p.apelido ?? 'Participante'}
              </span>
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (!etapa || !participante) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-arena-bg px-6 text-center">
        <Bola className="size-14 animate-[girarBola_3s_linear_infinite]" />
        <p className="text-sm text-arena-muted">Preparando o próximo sorteio...</p>
      </div>
    )
  }

  const num = etapa.indice + 1
  const total = etapas.length

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-y-auto bg-arena-bg px-5 py-10 text-center">
      <div className="flex items-center gap-2">
        <Bola className="size-5 animate-[girarBola_4s_linear_infinite]" />
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-arena-secondary">
          Sorteio {num} de {total} • {torneio.nome}
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Avatar
          url={participante.perfil?.avatar_url}
          nome={participante.perfil?.nome}
          grande
        />
        <p className="font-display text-3xl font-black leading-tight">
          {participante.perfil?.nome ?? participante.apelido ?? 'Participante'}
        </p>
        <p className="text-xs uppercase tracking-widest text-arena-muted">
          {escolhido ? 'Recebeu o time' : 'Sorteando time'}
        </p>
      </div>

      {escolhido ? (
        <div className="relative mt-2 flex flex-col items-center gap-2">
          <Confete />
          <div className="grid size-36 place-items-center rounded-3xl border-2 border-arena-primary bg-arena-surface">
            <Escudo time={escolhido} grande />
          </div>
          <p className="font-display text-2xl font-extrabold text-arena-primary">
            {escolhido.nome}
          </p>
          {intervalo > 0 && (
            <p className="text-xs text-arena-muted">
              Próximo sorteio em{' '}
              <span className="font-semibold tabular-nums text-white">
                {segundosRestantes(etapa.fim, agoraMs)}s
              </span>
            </p>
          )}
        </div>
      ) : (
        <div>
          {rolando ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-arena-surface px-4 py-3">
                <Escudo time={pool[spinIx]?.times} />
                <span className="font-display text-lg font-bold">
                  {pool[spinIx]?.times?.nome ?? '...'}
                </span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-arena-secondary">
                Girando a roleta de times...
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display text-8xl font-black tabular-nums text-arena-primary drop-shadow-[0_0_30px_rgba(246,225,75,0.45)]">
                {segundosRestantes(etapa.escolhaEm, agoraMs)}
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-arena-muted">
                A bola girar em {tempo}s
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex w-full max-w-sm flex-wrap justify-center gap-1.5">
        {etapas.map((e) => (
          <span
            key={e.participanteId}
            className={`h-2 flex-1 min-w-1 rounded-full transition ${
              e.indice < num
                ? 'bg-arena-primary'
                : e.indice === num - 1
                  ? 'bg-arena-secondary animate-pulse'
                  : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {etapas.slice(num, num + 2).map((e) =>
          e.participante ? (
            <span
              key={e.participanteId}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-arena-surface px-2.5 py-1 text-xs text-arena-muted"
            >
              <Avatar url={e.participante.perfil?.avatar_url} nome={e.participante.perfil?.nome} />
              {e.participante.perfil?.nome ?? 'Próximo'}
            </span>
          ) : null,
        )}
        {todosTemTime && (
          <span className="text-xs font-bold uppercase tracking-widest text-arena-primary">
            • Todos sorteados!
          </span>
        )}
      </div>
    </div>
  )
}