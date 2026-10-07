import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdmin } from '../hooks/useAdmin'
import CabecalhoAdmin from '../components/CabecalhoAdmin'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import Confete from '../components/Confete'
import BotaoVoltar from '../components/BotaoVoltar'
import { Bola, Trofeu, CoroaLiga, Estadio, Medalha } from '../components/Artes'

const PASSOS = ['configuracao', 'inscricoes', 'sorteio', 'grupos', 'mata_mata', 'finalizado']
const ROTULOS_PASSO = {
  configuracao: 'Configuração',
  inscricoes: 'Inscrições',
  sorteio: 'Sorteio',
  grupos: 'Fase de grupos',
  mata_mata: 'Mata-mata',
  finalizado: 'Finalizado',
}

const FORMATO_ROTULO = {
  grupos_mata_mata: 'Grupos + Mata-mata',
  todos_contra_todos: 'Todos contra todos',
  mata_mata: 'Mata-mata',
}

const ORDEM_FASE = { grupos: 0, oitavas: 1, quartas: 2, semi: 3, terceiro: 4, final: 5 }

function nomeDe(participante) {
  return participante?.perfil?.nome ?? participante?.apelido ?? 'A definir'
}

function Roteiro({ status }) {
  const atual = PASSOS.indexOf(status)
  if (atual < 0) return null

  return (
    <div>
      <div className="flex gap-1">
        {PASSOS.map((passo, i) => (
          <span
            key={passo}
            className={`h-1.5 flex-1 transition ${i <= atual ? 'bg-arena-primary' : 'bg-white/10'}`}
          />
        ))}
      </div>
      <p className="mt-2 text-center font-display text-[10px] font-bold uppercase tracking-[0.2em] text-arena-secondary">
        {ROTULOS_PASSO[PASSOS[atual]]}
      </p>
    </div>
  )
}

function Escudo({ time }) {
  if (time?.escudo_url) {
    return <img src={time.escudo_url} alt="" className="size-5 shrink-0 object-contain" />
  }
  if (time?.sigla) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-[9px] font-bold text-arena-muted">
        {time.sigla.slice(0, 2).toUpperCase()}
      </span>
    )
  }
  return null
}

function Avatar({ url, nome }) {
  if (url) {
    return <img src={url} alt="" className="size-9 shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-xs font-bold text-arena-muted">
      {(nome ?? '?').slice(0, 2).toUpperCase()}
    </span>
  )
}

function JogoResumo({ partida, casa, fora }) {
  const nomeCasa = nomeDe(casa)
  const nomeFora = nomeDe(fora)

  return (
    <div className="card flex w-full items-center gap-2 !p-3">
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <span className="truncate text-sm font-medium">{nomeCasa}</span>
        {casa?.times?.escudo_url && (
          <img src={casa.times.escudo_url} alt="" className="size-6 shrink-0 object-contain" />
        )}
        <Avatar url={casa?.perfil?.avatar_url} nome={nomeCasa} />
      </div>

      <div className="shrink-0 rounded-lg bg-arena-primary/10 px-2 py-1 text-center">
        <span className="font-display text-[10px] font-extrabold tracking-widest text-arena-primary">
          VS
        </span>
        {partida.rodada != null && (
          <span className="block text-[9px] font-bold leading-tight text-arena-muted">
            {partida.rodada}ª rod.
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Avatar url={fora?.perfil?.avatar_url} nome={nomeFora} />
        {fora?.times?.escudo_url && (
          <img src={fora.times.escudo_url} alt="" className="size-6 shrink-0 object-contain" />
        )}
        <span className="truncate text-sm font-medium">{nomeFora}</span>
      </div>
    </div>
  )
}

export default function Torneio() {
  const { id } = useParams()
  const { ehAdmin } = useAdmin()

  const [carregando, setCarregando] = useState(true)
  const [recarga, setRecarga] = useState(0)
  const [torneio, setTorneio] = useState(null)
  const [participantes, setParticipantes] = useState([])
  const [partidas, setPartidas] = useState([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!id) return undefined

    let ativo = true
    Promise.all([
      supabase.from('torneios').select('*').eq('id', id).single(),
      supabase
        .from('participantes')
        .select('*, perfil:perfis(id, nome, avatar_url), times(id, nome, sigla, escudo_url)')
        .eq('torneio_id', id)
        .order('ordem_sorteio', { ascending: true, nullsFirst: false }),
      supabase.from('partidas').select('*').eq('torneio_id', id),
    ]).then(([rTorneio, rParticipantes, rPartidas]) => {
      if (!ativo) return
      if (rTorneio.error || !rTorneio.data) {
        setErro('Torneio não encontrado.')
        setCarregando(false)
        return
      }
      setTorneio(rTorneio.data)
      setParticipantes(rParticipantes.data ?? [])
      setPartidas(rPartidas.data ?? [])
      setCarregando(false)
    })

    return () => {
      ativo = false
    }
  }, [id, recarga])

  useEffect(() => {
    if (!id) return undefined

    const canal = supabase
      .channel(`torneio:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes', filter: `torneio_id=eq.${id}` },
        () => setRecarga((r) => r + 1),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'torneios', filter: `id=eq.${id}` },
        () => setRecarga((r) => r + 1),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [id])

  if (carregando) return <Loading texto="Carregando torneio..." />

  if (!torneio) {
    return (
      <div>
        <CabecalhoAdmin titulo="Campeonato" />
        <p className="mt-6 text-sm text-arena-danger">{erro || 'Torneio não encontrado.'}</p>
      </div>
    )
  }

  const grupos = [...new Set(participantes.map((p) => p.grupo?.trim()).filter(Boolean))].sort()
  const semGrupo = participantes.filter((p) => !p.grupo?.trim())
  const infoSorteio = torneio.config?.sorteio
  const campeao = torneio.config?.campeao
  const participanteCampeao = campeao
    ? participantes.find((p) => p.id === campeao.participante_id)
    : null

  const mapa = Object.fromEntries(participantes.map((p) => [p.id, p]))
  const emTorneio = ['grupos', 'mata_mata'].includes(torneio.status)
  const proximas = partidas
    .filter((p) => !p.finalizada && mapa[p.casa_id] && mapa[p.fora_id])
    .sort(
      (a, b) =>
        (ORDEM_FASE[a.fase] ?? 9) - (ORDEM_FASE[b.fase] ?? 9) ||
        (a.rodada ?? 0) - (b.rodada ?? 0),
    )
    .slice(0, 3)

  const formato = FORMATO_ROTULO[torneio.formato] ?? torneio.formato
  const sorteioAgendado = infoSorteio?.status === 'agendado' && infoSorteio?.inicio

  const stats = [
    { rotulo: 'Participantes', valor: participantes.length },
    { rotulo: 'Jogos', valor: partidas.length },
    { rotulo: 'Formato', valor: formato },
  ]

  return (
    <div>
      <div className="pt-6">
        <BotaoVoltar />

        <div className="card relative mt-4 overflow-hidden !p-0 recorte">
          <div className="relative overflow-hidden bg-gradient-to-br from-arena-secondary/25 via-arena-surface to-arena-bg">
            <span className="pointer-events-none absolute -right-14 -top-20 size-56 rounded-full bg-arena-primary/10 blur-3xl" />
            <Estadio className="pointer-events-none absolute -bottom-4 right-4 w-44 opacity-[0.07]" />
            <Bola className="pointer-events-none absolute right-10 top-9 size-9 opacity-10 animate-[girarBola_12s_linear_infinite]" />

            <div className="relative p-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <p className="etiqueta">• Campeonato</p>
                <StatusBadge status={torneio.status} />
              </div>
              <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight">
                {torneio.nome}
              </h1>
              <p className="mt-1 text-sm text-arena-muted truncate">
                {[torneio.plataforma, torneio.jogo, `${torneio.mes}/${torneio.ano}`]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {torneio.formato && (
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-arena-muted">
                    {formato}
                  </span>
                )}
                {torneio.jogo && (
                  <span className="rounded-full bg-arena-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-arena-primary">
                    {torneio.jogo}
                  </span>
                )}
                {torneio.plataforma && (
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-arena-muted">
                    {torneio.plataforma}
                  </span>
                )}
                {torneio.mes && (
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-arena-muted">
                    {torneio.mes}/{torneio.ano}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-arena-bg/60 p-4">
            <Roteiro status={torneio.status} />
          </div>
        </div>
      </div>

      <div className="entrar mt-4 grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.rotulo} className="card !p-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-arena-muted">
              {stat.rotulo}
            </p>
            <p className="mt-1 font-display text-sm font-extrabold leading-tight text-arena-primary">
              {stat.valor}
            </p>
          </div>
        ))}
      </div>

      {torneio.status === 'finalizado' && (
        <div className="card relative mt-4 overflow-hidden border-arena-primary/40 text-center !p-5">
          <Confete />
          <p className="etiqueta relative">• Campeão</p>
          {participanteCampeao ? (
            <div className="relative mt-2 flex flex-col items-center gap-1">
              <div className="relative mb-1">
                <span className="raio absolute inset-0 m-auto size-28 rounded-full border border-dashed border-arena-primary/50" />
                <span className="raio absolute inset-4 m-auto size-16 rounded-full border border-arena-secondary/40" />
                <Trofeu className="relative size-24 drop-shadow-[0_0_22px_rgba(246,225,75,0.5)] animate-[quicar_2.6s_ease-in-out_infinite]" />
              </div>
              {participanteCampeao.perfil?.avatar_url ? (
                <img
                  src={participanteCampeao.perfil.avatar_url}
                  alt=""
                  className="size-16 rounded-full border-2 border-l-arena-primary object-cover"
                />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-full bg-arena-primary/15 font-display text-2xl font-bold text-arena-primary">
                  {(participanteCampeao.perfil?.nome ?? '?').slice(0, 2).toUpperCase()}
                </span>
              )}
              <p className="mt-1 flex items-center justify-center gap-2 font-display text-2xl font-extrabold">
                <CoroaLiga className="size-6 shrink-0" />
                {participanteCampeao.perfil?.nome ?? 'Participante'}
              </p>
              {participanteCampeao.times && (
                <p className="flex items-center gap-1.5 text-sm text-arena-muted">
                  {participanteCampeao.times.escudo_url && (
                    <img
                      src={participanteCampeao.times.escudo_url}
                      alt=""
                      className="size-4 object-contain"
                    />
                  )}
                  {participanteCampeao.times.nome}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-arena-muted">Torneio finalizado.</p>
          )}
        </div>
      )}

      <div className="entrar mt-4 grid grid-cols-3 gap-2">
        <Link to={`/torneio/${id}/classificacao`} className="btn-ghost text-center text-sm">
          <span className="flex items-center justify-center gap-1.5">
            <Bola className="size-4" /> Classificação
          </span>
        </Link>
        <Link to={`/torneio/${id}/tabela`} className="btn-primary text-center text-sm">
          <span className="flex items-center justify-center gap-1.5">
            <Bola className="size-4" /> Tabela
          </span>
        </Link>
        <Link to={`/torneio/${id}/sorteio`} className="btn-ghost text-center text-sm">
          <span className="flex items-center justify-center gap-1.5">
            <Bola className="size-4" /> Sorteio
          </span>
        </Link>
      </div>

      {ehAdmin && (
        <Link
          to={`/admin/torneio/${id}`}
          className="mt-3 block text-center text-xs text-arena-secondary active:opacity-70"
        >
          Editar configurações do torneio
        </Link>
      )}

      {emTorneio && (
        <div className="entrar mt-8">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
              <Medalha className="size-4" />
              Próximos jogos
            </p>
            {partidas.length > 0 && (
              <Link
                to={`/torneio/${id}/tabela`}
                className="text-[11px] font-bold uppercase tracking-wider text-arena-secondary active:opacity-70"
              >
                Tabela completa →
              </Link>
            )}
          </div>

          <div className="entrar mt-3 space-y-2">
            {partidas.length === 0 && (
              <div className="card text-center">
                <p className="font-display text-lg font-bold">A tabela ainda não foi gerada</p>
                <p className="mt-1 text-sm text-arena-muted">
                  O administrador precisa gerar a tabela de jogos.
                </p>
              </div>
            )}
            {partidas.length > 0 && proximas.length === 0 && (
              <div className="card text-center">
                <p className="font-display text-lg font-bold">Todos os jogos foram disputados</p>
                <Link to={`/torneio/${id}/tabela`} className="btn-ghost mt-4 inline-block">
                  Ver resultados
                </Link>
              </div>
            )}
            {proximas.map((partida) => (
              <JogoResumo
                key={partida.id}
                partida={partida}
                casa={mapa[partida.casa_id]}
                fora={mapa[partida.fora_id]}
              />
            ))}
          </div>
        </div>
      )}

      <div className="entrar mt-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
            Participantes
            {participantes.length > 0 && ` • ${participantes.length}`}
          </p>
          {sorteioAgendado && (
            <span className="rounded-full bg-arena-secondary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-arena-secondary ring-1 ring-arena-secondary/30">
              Sorteio: {new Date(infoSorteio.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {participantes.length === 0 && (
          <div className="card text-center">
            <p className="font-display text-lg font-bold">Nenhum participante ainda</p>
            <p className="mt-1 text-sm text-arena-muted">
              O administrador vai abrir as inscrições no sorteio.
            </p>
            <Link to={`/torneio/${id}/sorteio`} className="btn-ghost mt-4 inline-block">
              Ver sorteio
            </Link>
          </div>
        )}

        {grupos.map((grupo) => (
          <div key={grupo} className="entrar space-y-2">
            <p className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-secondary">
              <Bola className="size-3.5" />
              Grupo {grupo}
            </p>
            {participantes
              .filter((p) => p.grupo?.trim() === grupo)
              .map((participante, indice) => (
                <div
                  key={participante.id}
                  className="card flex items-center gap-3 !p-3"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-arena-primary/10 font-display text-xs font-bold text-arena-primary">
                    {participante.ordem_sorteio ?? indice + 1}
                  </span>
                  <Avatar url={participante.perfil?.avatar_url} nome={participante.perfil?.nome} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {participante.perfil?.nome ?? participante.apelido ?? 'Participante'}
                    </p>
                    {participante.times && (
                      <p className="flex items-center gap-1.5 truncate text-xs text-arena-muted">
                        <Escudo time={participante.times} />
                        <span className="truncate">
                          {participante.times.sigla
                            ? `${participante.times.sigla} • `
                            : ''}
                          {participante.times.nome}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ))}

        {semGrupo.length > 0 && (
          <div className="entrar space-y-2">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
              Aguardando sorteio
            </p>
            {semGrupo.map((participante) => (
              <div
                key={participante.id}
                className="card flex items-center gap-3 !p-3"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/5 font-display text-xs font-bold text-arena-muted">
                  ?
                </span>
                <Avatar url={participante.perfil?.avatar_url} nome={participante.perfil?.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {participante.perfil?.nome ?? participante.apelido ?? 'Participante'}
                  </p>
                  {participante.times && (
                    <p className="flex items-center gap-1.5 truncate text-xs text-arena-muted">
                      <Escudo time={participante.times} />
                      <span className="truncate">
                        {participante.times.sigla ? `${participante.times.sigla} • ` : ''}
                        {participante.times.nome}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}