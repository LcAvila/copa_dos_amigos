import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { Bola, Trofeu, CoroaLiga } from '../components/Artes'

function Logo() {
  return (
    <div className="card relative overflow-hidden !p-5">
      <div className="faixa pointer-events-none absolute inset-y-0 right-0 w-2/5 opacity-70" aria-hidden="true" />
      <Bola className="pointer-events-none absolute -right-2 -top-3 size-10 rotate-12 opacity-25" aria-hidden="true" />
      <Bola
        className="pointer-events-none absolute -bottom-2 right-14 size-6 opacity-20 animate-[boiar_3.5s_ease-in-out_infinite]"
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-4">
        <div className="recorte flex size-14 shrink-0 items-center justify-center bg-gradient-to-br from-[#ffea66] to-[#eed12b] text-black animate-[brilhoBorda_3s_ease-in-out_infinite]">
          <span className="font-display text-2xl font-extrabold leading-none">CA</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold leading-none tracking-wide">
            COPA <span className="text-arena-primary">ARENA</span>
          </h1>
          <p className="mt-1.5 font-display text-[11px] font-bold uppercase tracking-[0.22em] text-arena-secondary">
            Campeonatos entre amigos
          </p>
        </div>
      </div>
    </div>
  )
}

const FORMATO_TEXTO = {
  grupos_mata_mata: 'Grupos + Mata-mata',
  todos_contra_todos: 'Todos contra todos',
  mata_mata: 'Mata-mata',
}

function CardTorneio({ torneio, participantes = 0, times = 0 }) {
  const meta = [torneio.plataforma, torneio.jogo].filter(Boolean).join(' • ')
  const formato = FORMATO_TEXTO[torneio.formato] ?? torneio.formato

  return (
    <Link
      to={`/torneio/${torneio.id}`}
      className="card group relative block overflow-hidden !p-0 transition active:scale-[0.98] hover:border-arena-primary/40"
    >
      <div className="relative overflow-hidden bg-gradient-to-r from-arena-surface2 to-arena-surface p-4 pb-3">
        <span className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-arena-primary/5" />
        <Bola className="pointer-events-none absolute -bottom-4 right-8 size-16 opacity-10 transition group-hover:opacity-25 animate-[girarBola_12s_linear_infinite]" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-extrabold leading-tight truncate">
              {torneio.nome}
            </h3>
            <p className="mt-1 text-xs text-arena-muted truncate">{meta}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-arena-muted">
                {torneio.mes ? `${torneio.mes}/${torneio.ano}` : torneio.ano}
              </span>
              <span className="rounded-full bg-arena-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-arena-primary">
                {formato}
              </span>
            </div>
          </div>
          <StatusBadge status={torneio.status} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5">
        <p className="text-[11px] text-arena-muted">
          {participantes > 0 && `${participantes} ${participantes === 1 ? 'jogador' : 'jogadores'}`}
          {participantes > 0 && times > 0 && ' • '}
          {times > 0 && `${times} ${times === 1 ? 'time' : 'times'} na roleta`}
          {participantes === 0 && times === 0 && 'Aguardando configuração...'}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-arena-secondary transition group-hover:text-arena-primary">
          Ver torneio
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </div>
    </Link>
  )
}

export default function Home() {
  const [torneios, setTorneios] = useState([])
  const [particip, setParticip] = useState({})
  const [qtdTimes, setQtdTimes] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const buscarTorneios = useCallback(async () => {
    const [rTorneios, rParticipantes, rTimes] = await Promise.all([
      supabase.from('torneios').select('*').order('criado_em', { ascending: false }),
      supabase.from('participantes').select('torneio_id'),
      supabase.from('torneio_times').select('torneio_id').eq('disponivel', true),
    ])
    const porParticipante = {}
    const porTime = {}
    for (const linha of rParticipantes.data ?? []) {
      porParticipante[linha.torneio_id] = (porParticipante[linha.torneio_id] ?? 0) + 1
    }
    for (const linha of rTimes.data ?? []) {
      porTime[linha.torneio_id] = (porTime[linha.torneio_id] ?? 0) + 1
    }
    return { torneios: rTorneios.data ?? [], porParticipante, porTime, error: rTorneios.error }
  }, [])

  useEffect(() => {
    let ativo = true

    buscarTorneios().then((resultado) => {
      if (!ativo) return
      if (resultado.error) {
        setErro('Não foi possível carregar os campeonatos. Verifique sua conexão e tente novamente.')
      } else {
        setTorneios(resultado.torneios)
        setParticip(resultado.porParticipante)
        setQtdTimes(resultado.porTime)
      }
      setCarregando(false)
    })

    return () => {
      ativo = false
    }
  }, [buscarTorneios])

  const tentarNovamente = async () => {
    setCarregando(true)
    setErro('')
    const resultado = await buscarTorneios()
    if (resultado.error) {
      setErro('Não foi possível carregar os campeonatos. Verifique sua conexão e tente novamente.')
    } else {
      setTorneios(resultado.torneios)
      setParticip(resultado.porParticipante)
      setQtdTimes(resultado.porTime)
    }
    setCarregando(false)
  }

return (
    <div className="entrar py-6">
      <Logo />

      <div className="entrar mt-8 space-y-3">
        <Link to="/perfis" className="btn-primary block text-center text-base">
          Entrar como jogador
        </Link>
        <Link to="/admin/login" className="btn-ghost block text-center text-base">
          Área do administrador
        </Link>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-arena-muted">
          Campeonatos
        </h2>

        {carregando && <Loading texto="Carregando campeonatos..." />}

        {!carregando && erro && (
          <div className="card mt-4 border-arena-danger/40 text-center">
            <p className="text-sm text-arena-danger">{erro}</p>
            <button type="button" onClick={tentarNovamente} className="btn-ghost mt-4 text-sm">
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && torneios.length === 0 && (
          <div className="card mt-4 text-center">
            <div className="relative mx-auto flex size-16 items-center justify-center">
              <span className="absolute inset-0 m-auto size-14 rounded-full bg-arena-secondary/10 animate-[pulsar_2.2s_ease-in-out_infinite]" />
              <Trofeu className="relative size-12 drop-shadow-[0_0_16px_rgba(246,225,75,0.25)] animate-[boiar_3s_ease-in-out_infinite]" />
            </div>
            <p className="mt-4 font-display text-lg font-bold">Nenhum campeonato ainda</p>
            <p className="mt-1 text-sm text-arena-muted">
              Quando o administrador criar um campeonato, ele aparecerá aqui.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3 opacity-60">
              <Bola className="size-5 animate-[girarBola_3s_linear_infinite]" />
              <CoroaLiga className="size-6" />
              <Bola className="size-5 animate-[girarBola_3s_linear_infinite_reverse]" />
            </div>
          </div>
        )}

        {!carregando && !erro && torneios.length > 0 && (
          <div className="entrar mt-4 space-y-3">
            {torneios.map((t) => (
              <CardTorneio
                key={t.id}
                torneio={t}
                participantes={particip[t.id] ?? 0}
                times={qtdTimes[t.id] ?? 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
