import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdmin } from '../hooks/useAdmin'
import CabecalhoAdmin from '../components/CabecalhoAdmin'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'

export default function Admin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { sair } = useAdmin()

  const [torneios, setTorneios] = useState([])
  const [totalPerfis, setTotalPerfis] = useState(0)
  const [carregando, setCarregando] = useState(true)
  const [aviso, setAviso] = useState(location.state?.aviso ?? '')

  useEffect(() => {
    if (!aviso) return undefined
    const timeout = setTimeout(() => setAviso(''), 4000)
    return () => clearTimeout(timeout)
  }, [aviso])

  const buscarTorneios = useCallback(async () => {
    const [torneiosRes, perfisRes] = await Promise.all([
      supabase.from('torneios').select('*').order('criado_em', { ascending: false }),
      supabase.from('perfis').select('id', { count: 'exact', head: true }),
    ])
    return { torneios: torneiosRes.data ?? [], perfis: perfisRes.count ?? 0 }
  }, [])

  useEffect(() => {
    let ativo = true
    buscarTorneios().then((resultado) => {
      if (!ativo) return
      setTorneios(resultado.torneios)
      setTotalPerfis(resultado.perfis)
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

      <div className="mt-6 space-y-3">
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
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-arena-muted">
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
          <div className="mt-4 space-y-3">
            {torneios.map((t) => (
              <div key={t.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold leading-tight truncate">{t.nome}</p>
                    <p className="mt-0.5 text-xs text-arena-muted truncate">
                      {[t.plataforma, t.jogo, `${t.mes}/${t.ano}`].filter(Boolean).join(' • ')}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to={`/admin/torneio/${t.id}`} className="btn-ghost !px-3 !py-2 text-xs">
                    Editar torneio
                  </Link>
                  <Link to={`/torneio/${t.id}/sorteio`} className="btn-ghost !px-3 !py-2 text-xs">
                    Sorteio
                  </Link>
                  <Link to={`/torneio/${t.id}/tabela`} className="btn-ghost !px-3 !py-2 text-xs">
                    Tabela
                  </Link>
                  <Link to={`/torneio/${t.id}`} className="btn-ghost !px-3 !py-2 text-xs">
                    Ver como jogador
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
