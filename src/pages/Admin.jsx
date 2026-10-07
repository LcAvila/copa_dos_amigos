import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdmin } from '../hooks/useAdmin'
import CabecalhoAdmin from '../components/CabecalhoAdmin'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { Trofeu } from '../components/Artes'

function proximaAcao(t) {
  if (t.status === 'grupos' || t.status === 'mata_mata') {
    return { texto: 'Tabela', to: `/torneio/${t.id}/tabela` }
  }
  if (t.status === 'finalizado') {
    return { texto: 'Classificação', to: `/torneio/${t.id}/classificacao` }
  }
  return { texto: 'Sorteio', to: `/torneio/${t.id}/sorteio` }
}

export default function Admin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sair } = useAdmin()

  const [torneios, setTorneios] = useState([])
  const [particip, setParticip] = useState({})
  const [qtdTimes, setQtdTimes] = useState({})
  const [totalPerfis, setTotalPerfis] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [aviso, setAviso] = useState(location.state?.aviso ?? '')

  useEffect(() => {
    if (!aviso) return undefined
    const timeout = setTimeout(() => setAviso(''), 4000)
    return () => clearTimeout(timeout)
  }, [aviso])

  const buscarTorneios = useCallback(async () => {
    const [torneiosRes, perfisRes, participantesRes, timesRes] = await Promise.all([
      supabase.from('torneios').select('*').order('criado_em', { ascending: false }),
      supabase.from('perfis').select('id', { count: 'exact', head: true }),
      supabase.from('participantes').select('torneio_id'),
      supabase.from('torneio_times').select('torneio_id').eq('disponivel', true),
    ])
    const porParticipante = {}
    const porTime = {}
    for (const linha of participantesRes.data ?? []) {
      porParticipante[linha.torneio_id] = (porParticipante[linha.torneio_id] ?? 0) + 1
    }
    for (const linha of timesRes.data ?? []) {
      porTime[linha.torneio_id] = (porTime[linha.torneio_id] ?? 0) + 1
    }
    return {
      torneios: torneiosRes.data ?? [],
      perfis: perfisRes.count ?? 0,
      porParticipante,
      porTime,
    }
  }, [])

  useEffect(() => {
    let ativo = true
    buscarTorneios().then((resultado) => {
      if (!ativo) return
      setTorneios(resultado.torneios)
      setTotalPerfis(resultado.perfis)
      setParticip(resultado.porParticipante)
      setQtdTimes(resultado.porTime)
      setCarregando(false)
    })
    return () => {
      ativo = false
    }
  }, [buscarTorneios])

  return (
    <div>
      <CabecalhoAdmin
        titulo="Painel do administrador"
        subtitulo="Gerencie campeonatos, perfis e resultados."
        acao={
          <button
            type="button"
            onClick={async () => {
              await sair()
              navigate('/')
            }}
            className="text-sm text-arena-danger active:opacity-70"
          >
            Sair
          </button>
        }
      />

      <div className="entrar mt-6 space-y-3">
        {aviso && (
          <div className="card border-arena-primary/40 text-sm text-arena-primary">{aviso}</div>
        )}

        <Link to="/admin/torneio/novo" className="btn-primary block text-center text-base">
          Criar novo torneio
        </Link>

        <Link
          to="/admin/perfis"
          className="card flex items-center justify-between gap-3 transition active:scale-[0.98] hover:border-arena-primary/40"
        >
          <div>
            <p className="font-display text-lg font-bold">Gerenciar perfis</p>
            <p className="text-xs text-arena-muted">
              {totalPerfis} {totalPerfis === 1 ? 'perfil criado' : 'perfis criados'}
            </p>
          </div>
          <svg viewBox="0 0 24 24" className="size-5 text-arena-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-arena-muted">
          <Trofeu className="size-5 animate-[boiar_3s_ease-in-out_infinite]" />
          Torneios
        </h2>

        {carregando && <Loading texto="Carregando torneios..." />}

        {!carregando && torneios.length === 0 && (
          <div className="card mt-4 text-center">
            <p className="font-display text-lg font-bold">Nenhum torneio criado</p>
            <p className="mt-1 text-sm text-arena-muted">Crie o primeiro campeonato do grupo.</p>
          </div>
        )}

        {!carregando && torneios.length > 0 && (
          <div className="entrar mt-4 space-y-3">
            {torneios.map((t) => {
              const acao = proximaAcao(t)
              const meta = [t.plataforma, t.jogo].filter(Boolean).join(' • ')
              return (
                <div key={t.id} className="card !p-0 overflow-hidden">
                  <div className="relative overflow-hidden bg-gradient-to-r from-arena-surface2 to-arena-surface p-4 pb-3">
                    <span className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-arena-primary/5" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-lg font-bold leading-tight truncate">{t.nome}</p>
                        <p className="mt-0.5 text-xs text-arena-muted truncate">
                          {meta}
                          {t.mes ? ` • ${t.mes}/${t.ano}` : ''}
                        </p>
                        <p className="mt-1.5 text-[11px] text-arena-muted">
                          {particip[t.id] ?? 0}{' '}
                          {particip[t.id] === 1 ? 'jogador' : 'jogadores'} •{' '}
                          {qtdTimes[t.id] ?? 0} {qtdTimes[t.id] === 1 ? 'time' : 'times'} na roleta
                        </p>
                      </div>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 border-t border-white/10 p-3">
                    <Link
                      to={acao.to}
                      className="btn-primary !px-2 text-center text-xs"
                    >
                      {acao.texto}
                    </Link>
                    <Link
                      to={`/admin/torneio/${t.id}`}
                      className="btn-ghost !px-2 text-center text-xs"
                    >
                      Editar
                    </Link>
                    <Link
                      to={`/torneio/${t.id}`}
                      className="btn-ghost !px-2 text-center text-xs"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
