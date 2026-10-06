import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdmin } from '../hooks/useAdmin'
import CabecalhoAdmin from '../components/CabecalhoAdmin'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'

const PASSOS = ['configuracao', 'inscricoes', 'sorteio', 'grupos', 'mata_mata', 'finalizado']
const ROTULOS_PASSO = {
  configuracao: 'Configuração',
  inscricoes: 'Inscrições',
  sorteio: 'Sorteio',
  grupos: 'Fase de grupos',
  mata_mata: 'Mata-mata',
  finalizado: 'Finalizado',
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

export default function Torneio() {
  const { id } = useParams()
  const { ehAdmin } = useAdmin()

  const [carregando, setCarregando] = useState(true)
  const [recarga, setRecarga] = useState(0)
  const [torneio, setTorneio] = useState(null)
  const [participantes, setParticipantes] = useState([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!id) return undefined

    let ativo = true
    Promise.all([
      supabase.from('torneios').select('*').eq('id', id).single(),
      supabase
        .from('participantes')
        .select('*, perfis(id, nome, avatar_url), times(id, nome, sigla, escudo_url)')
        .eq('torneio_id', id)
        .order('ordem_sorteio', { ascending: true, nullsFirst: false }),
    ]).then(([rTorneio, rParticipantes]) => {
      if (!ativo) return
      if (rTorneio.error || !rTorneio.data) {
        setErro('Torneio não encontrado.')
        setCarregando(false)
        return
      }
      setTorneio(rTorneio.data)
      setParticipantes(rParticipantes.data ?? [])
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

  return (
    <div>
      <div className="pt-6">
        <p className="etiqueta">• Campeonato</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold leading-tight">{torneio.nome}</h1>
            <p className="mt-1 text-sm text-arena-muted">
              {[torneio.plataforma, torneio.jogo, `${torneio.mes}/${torneio.ano}`]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>
          <StatusBadge status={torneio.status} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-arena-surface p-4 recorte">
        <Roteiro status={torneio.status} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link
          to={`/torneio/${id}/tabela`}
          className="btn-primary block text-center text-base"
        >
          Tabela de jogos
        </Link>
        <Link to={`/torneio/${id}/sorteio`} className="btn-ghost block text-center text-base">
          Sorteio
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

      <div className="mt-8 space-y-4">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
          Participantes
          {infoSorteio?.total && ` • ${infoSorteio.total}`}
        </p>

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
          <div key={grupo} className="space-y-2">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-secondary">
              Grupo {grupo}
            </p>
            {participantes
              .filter((p) => p.grupo?.trim() === grupo)
              .map((participante, indice) => (
                <div key={participante.id} className="card flex items-center gap-3 !p-3">
                  <span className="w-5 shrink-0 text-center font-display text-sm font-bold text-arena-primary">
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
                          {participante.times.sigla ? `${participante.times.sigla} • ` : ''}
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
          <div className="space-y-2">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
              Aguardando sorteio
            </p>
            {semGrupo.map((participante) => (
              <div key={participante.id} className="card flex items-center gap-3 !p-3">
                <Avatar url={participante.perfil?.avatar_url} nome={participante.perfil?.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {participante.perfil?.nome ?? participante.apelido ?? 'Participante'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}