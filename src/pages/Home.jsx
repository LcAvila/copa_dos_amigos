import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { calcularArtilheiros } from '../lib/classificacao'
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
          <span className="font-display text-2xl font-extrabold leading-none">CDA</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-extrabold leading-none tracking-wide">
            COPA DOS <span className="text-arena-primary">AMIGOS</span>
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

function Inicial({ nome, className = 'size-9 text-sm' }) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-arena-surface2 border border-white/10 font-display font-bold text-arena-primary uppercase ${className}`}>
      {nome?.trim()?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
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

function LinhaDestaque({ titulo, subtitulo, icone, participante, gols }) {
  const nome = participante?.perfil?.nome
  const avatar = participante?.perfil?.avatar_url
  const escudo = participante?.time?.escudo_url
  const timeNome = participante?.time?.nome

  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">
        <div className={`grid size-9 place-items-center rounded-full border ${icone.classeBorda} ${icone.classeFundo}`}>
          <span className={icone.classeTexto}>{icone.emoji}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="etiqueta !text-[10px]">{titulo}</p>
        <div className="mt-0.5 flex items-center gap-1.5 min-w-0">
          {avatar ? (
            <img
              src={avatar}
              alt={nome}
              className="size-5 shrink-0 rounded-full object-cover border border-white/10"
            />
          ) : (
            <Inicial nome={nome} className="size-5 text-[10px]" />
          )}
          <span className="truncate text-sm font-bold text-white">{nome ?? '—'}</span>
          {escudo && (
            <img
              src={escudo}
              alt={timeNome}
              className="size-4 shrink-0"
            />
          )}
        </div>
        {subtitulo && <p className="truncate text-[10px] text-arena-muted">{subtitulo}</p>}
      </div>
      {typeof gols === 'number' && (
        <div className="shrink-0 text-right">
          <p className="font-display text-lg font-extrabold text-arena-primary leading-none">{gols}</p>
          <p className="text-[9px] uppercase tracking-wider text-arena-muted">
            {gols === 1 ? 'gol' : 'gols'}
          </p>
        </div>
      )}
    </div>
  )
}

function CardHistorico({
  torneio,
  participantesTorneio,
  campeaoParticipante,
  artilheiro,
}) {
  const formato = FORMATO_TEXTO[torneio.formato] ?? torneio.formato
  const dataTexto = torneio.mes ? `${torneio.mes}/${torneio.ano}` : torneio.ano

  const campeaoIcone = {
    emoji: '🏆',
    classeBorda: 'border-arena-primary/40',
    classeFundo: 'bg-arena-primary/15',
    classeTexto: 'text-arena-primary',
  }
  const artilheiroIcone = {
    emoji: '⚽',
    classeBorda: 'border-arena-secondary/40',
    classeFundo: 'bg-arena-secondary/15',
    classeTexto: 'text-arena-secondary',
  }

  return (
    <Link
      to={`/torneio/${torneio.id}`}
      className="card group relative block overflow-hidden !p-0 transition active:scale-[0.98] hover:border-arena-primary/40"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-arena-surface2 via-arena-surface to-arena-bg p-4">
        <CoroaLiga className="pointer-events-none absolute -right-2 -top-2 size-16 opacity-10 rotate-12" />
        <span className="pointer-events-none absolute -left-10 -bottom-10 size-36 rounded-full bg-arena-primary/5 blur-2xl" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-extrabold leading-tight truncate">
              {torneio.nome}
            </h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-arena-muted">
                {dataTexto}
              </span>
              <span className="rounded-full bg-arena-secondary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-arena-secondary">
                {formato}
              </span>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-arena-muted border border-white/10">
                {participantesTorneio.length}{' '}
                {participantesTorneio.length === 1 ? 'jogador' : 'jogadores'}
              </span>
            </div>
          </div>
          <StatusBadge status={torneio.status} />
        </div>

        <div className="relative mt-4 space-y-3">
          <LinhaDestaque
            titulo="Campeão"
            subtitulo={campeaoParticipante?.time?.nome ?? 'Título definido'}
            icone={campeaoIcone}
            participante={campeaoParticipante}
          />
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <LinhaDestaque
            titulo="Artilheiro"
            subtitulo={artilheiro?.participante?.time?.nome ?? 'Sem gols registrados'}
            icone={artilheiroIcone}
            participante={artilheiro?.participante}
            gols={artilheiro?.gols}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 bg-arena-bg/40 px-4 py-2.5">
        <p className="text-[11px] text-arena-muted">Confira a classificação completa e os jogos</p>
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

function inicialParticipante(p) {
  return {
    id: p.id,
    perfil: p.perfil
      ? {
          id: p.perfil.id,
          nome: p.perfil.nome,
          avatar_url: p.perfil.avatar_url,
        }
      : null,
    time: p.time
      ? {
          id: p.time.id,
          nome: p.time.nome,
          escudo_url: p.time.escudo_url,
        }
      : null,
  }
}

export default function Home() {
  const [torneios, setTorneios] = useState([])
  const [particip, setParticip] = useState({})
  const [qtdTimes, setQtdTimes] = useState({})
  const [participantesPorTorneio, setParticipantesPorTorneio] = useState({})
  const [partidasPorTorneio, setPartidasPorTorneio] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [recarga, setRecarga] = useState(0)

  const buscarTorneios = useCallback(async () => {
    const [rTorneios, rParticipantes, rTimes, rPartidas] = await Promise.all([
      supabase.from('torneios').select('*').order('criado_em', { ascending: false }),
      supabase
        .from('participantes')
        .select('id, torneio_id, perfil:perfis(id, nome, avatar_url), time:times(id, nome, escudo_url)'),
      supabase.from('torneio_times').select('torneio_id').eq('disponivel', true),
      supabase.from('partidas').select('torneio_id, casa_id, fora_id, gols_casa, gols_fora, finalizada'),
    ])

    const porParticipante = {}
    const porTime = {}
    for (const linha of rParticipantes.data ?? []) {
      porParticipante[linha.torneio_id] = (porParticipante[linha.torneio_id] ?? 0) + 1
    }
    for (const linha of rTimes.data ?? []) {
      porTime[linha.torneio_id] = (porTime[linha.torneio_id] ?? 0) + 1
    }

    const participantesMap = {}
    for (const linha of rParticipantes.data ?? []) {
      if (!participantesMap[linha.torneio_id]) participantesMap[linha.torneio_id] = []
      participantesMap[linha.torneio_id].push(inicialParticipante(linha))
    }

    const partidasMap = {}
    for (const linha of rPartidas.data ?? []) {
      if (!partidasMap[linha.torneio_id]) partidasMap[linha.torneio_id] = []
      partidasMap[linha.torneio_id].push(linha)
    }

    return {
      torneios: rTorneios.data ?? [],
      porParticipante,
      porTime,
      participantesMap,
      partidasMap,
      error: rTorneios.error,
    }
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
        setParticipantesPorTorneio(resultado.participantesMap)
        setPartidasPorTorneio(resultado.partidasMap)
      }
      setCarregando(false)
    })

    return () => {
      ativo = false
    }
  }, [buscarTorneios, recarga])

  useEffect(() => {
    const atualizar = () => setRecarga((r) => r + 1)
    const canal = supabase
      .channel('home:campeonatos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneios' }, atualizar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participantes' }, atualizar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneio_times' }, atualizar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidas' }, atualizar)
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  const { torneiosAtivos, torneiosFinalizados } = useMemo(() => {
    const ativos = []
    const finalizados = []
    for (const t of torneios) {
      if (t.status === 'finalizado') finalizados.push(t)
      else if (t.status !== 'cancelado') ativos.push(t)
    }
    return { torneiosAtivos: ativos, torneiosFinalizados: finalizados }
  }, [torneios])

  const historico = useMemo(() => {
    return torneiosFinalizados.map((t) => {
      const participantesTorneio = participantesPorTorneio[t.id] ?? []

      const campeaoId = t.config?.campeao?.participante_id
      const campeaoParticipante = campeaoId
        ? participantesTorneio.find((p) => p.id === campeaoId) ?? null
        : null

      const partidasTorneio = partidasPorTorneio[t.id] ?? []
      const artilharia = calcularArtilheiros(participantesTorneio, partidasTorneio)
      const liderArtilharia = artilharia[0]
        && artilharia[0].gols > 0
        ? {
            ...artilharia[0],
            participante: participantesTorneio.find((p) => p.id === artilharia[0].participante_id) ?? null,
          }
        : null

      return {
        torneio: t,
        participantesTorneio,
        campeaoParticipante,
        artilheiro: liderArtilharia,
      }
    })
  }, [torneiosFinalizados, participantesPorTorneio, partidasPorTorneio])

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
      setParticipantesPorTorneio(resultado.participantesMap)
      setPartidasPorTorneio(resultado.partidasMap)
    }
    setCarregando(false)
  }

  const temConteudo = torneiosAtivos.length > 0 || historico.length > 0

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

      <div className="mt-10 space-y-10">
        {carregando && <Loading texto="Carregando campeonatos..." />}

        {!carregando && erro && (
          <div className="card border-arena-danger/40 text-center">
            <p className="text-sm text-arena-danger">{erro}</p>
            <button type="button" onClick={tentarNovamente} className="btn-ghost mt-4 text-sm">
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && !temConteudo && (
          <div className="card text-center">
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

        {!carregando && !erro && (
          <>
            {torneiosAtivos.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-arena-muted">
                  <Bola className="size-5 text-arena-primary animate-[girarBola_3s_linear_infinite]" />
                  Em andamento
                </h2>
                <div className="entrar mt-4 space-y-3">
                  {torneiosAtivos.map((t) => (
                    <CardTorneio
                      key={t.id}
                      torneio={t}
                      participantes={particip[t.id] ?? 0}
                      times={qtdTimes[t.id] ?? 0}
                    />
                  ))}
                </div>
              </div>
            )}

            {historico.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-arena-muted">
                  <Trofeu className="size-5 text-arena-secondary animate-[boiar_3s_ease-in-out_infinite]" />
                  Histórico
                </h2>
                <div className="entrar mt-4 space-y-3">
                  {historico.map((h) => (
                    <CardHistorico
                      key={h.torneio.id}
                      torneio={h.torneio}
                      participantesTorneio={h.participantesTorneio}
                      campeaoParticipante={h.campeaoParticipante}
                      artilheiro={h.artilheiro}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
