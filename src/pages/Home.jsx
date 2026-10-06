import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'

function Logo() {
  return (
    <div className="card relative overflow-hidden !p-5">
      <div className="faixa pointer-events-none absolute inset-y-0 right-0 w-2/5 opacity-70" aria-hidden="true" />
      <div className="relative flex items-center gap-4">
        <div className="recorte flex size-14 shrink-0 items-center justify-center bg-gradient-to-br from-[#ffea66] to-[#eed12b] text-black shadow-[0_0_28px_rgba(246,225,75,0.35)]">
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

function CardTorneio({ torneio }) {
  const meta = [torneio.plataforma, torneio.jogo].filter(Boolean).join(' • ')

  return (
    <Link
      to={`/torneio/${torneio.id}`}
      className="card block transition active:scale-[0.98] hover:border-arena-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold leading-tight truncate">{torneio.nome}</h3>
          <p className="mt-1 text-sm text-arena-muted truncate">
            {meta}
            {torneio.mes ? ` • ${torneio.mes}/${torneio.ano}` : ''}
          </p>
        </div>
        <StatusBadge status={torneio.status} />
      </div>
    </Link>
  )
}

export default function Home() {
  const [torneios, setTorneios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const buscarTorneios = useCallback(async () => {
    return supabase
      .from('torneios')
      .select('*')
      .order('criado_em', { ascending: false })
  }, [])

  useEffect(() => {
    let ativo = true

    buscarTorneios().then(({ data, error }) => {
      if (!ativo) return
      if (error) {
        setErro('Não foi possível carregar os campeonatos. Verifique sua conexão e tente novamente.')
      } else {
        setTorneios(data ?? [])
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
    const { data, error } = await buscarTorneios()
    if (error) {
      setErro('Não foi possível carregar os campeonatos. Verifique sua conexão e tente novamente.')
    } else {
      setTorneios(data ?? [])
    }
    setCarregando(false)
  }

  return (
    <div className="py-6">
      <Logo />

      <div className="mt-8 space-y-3">
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
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/5">
              <svg viewBox="0 0 24 24" className="size-7 text-arena-muted" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0V4zM6 6H4a2 2 0 0 0 0 4h2M18 6h2a2 2 0 0 1 0 4h-2" />
              </svg>
            </div>
            <p className="mt-4 font-display text-lg font-bold">Nenhum campeonato ainda</p>
            <p className="mt-1 text-sm text-arena-muted">
              Quando o administrador criar um campeonato, ele aparecerá aqui.
            </p>
          </div>
        )}

        {!carregando && !erro && torneios.length > 0 && (
          <div className="mt-4 space-y-3">
            {torneios.map((t) => (
              <CardTorneio key={t.id} torneio={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
