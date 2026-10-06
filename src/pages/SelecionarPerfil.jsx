import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useSessaoJogador } from '../hooks/useSessaoJogador'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'

function Inicial({ nome, className = 'size-14 text-lg' }) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-arena-surface2 border border-white/10 font-display font-bold text-arena-primary ${className}`}>
      {nome?.trim()?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function AvatarPerfil({ perfil, time }) {
  return (
    <div className="flex items-end gap-1 shrink-0">
      {perfil.avatar_url ? (
        <img
          src={perfil.avatar_url}
          alt={perfil.nome}
          className="size-14 rounded-full object-cover border border-white/10"
        />
      ) : (
        <Inicial nome={perfil.nome} />
      )}
      {time?.escudo_url && (
        <img
          src={time.escudo_url}
          alt={time.nome}
          title={time.nome}
          className="size-7 object-contain"
        />
      )}
    </div>
  )
}

function ItemPerfil({ perfil, tempoEspera = 0, onSelecionar }) {
  return (
    <button
      type="button"
      onClick={() => onSelecionar(perfil)}
      style={{ animationDelay: `${tempoEspera}ms` }}
      className="card w-full flex items-center gap-4 text-left transition active:scale-[0.98] hover:border-arena-primary/40 animate-[fadeIn_300ms_ease-out_both]"
    >
      <AvatarPerfil perfil={perfil} time={perfil.time_coracao} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-bold leading-tight truncate">{perfil.nome}</p>
        {perfil.time_coracao && (
          <p className="text-xs text-arena-muted truncate">{perfil.time_coracao.nome}</p>
        )}
      </div>
      {perfil.possui_senha && (
        <svg viewBox="0 0 24 24" className="size-5 text-arena-muted shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9z" />
        </svg>
      )}
    </button>
  )
}

export default function SelecionarPerfil() {
  const navigate = useNavigate()
  const [busca] = useSearchParams()
  const torneioUrl = busca.get('torneio')
  const { sessao, entrar, sair } = useSessaoJogador()

  const [perfis, setPerfis] = useState([])
  const [torneios, setTorneios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [etapa, setEtapa] = useState('perfis') // 'perfis' | 'pin' | 'torneios'
  const [perfilSelecionado, setPerfilSelecionado] = useState(null)
  const [pin, setPin] = useState('')
  const [erroPin, setErroPin] = useState('')
  const [verificando, setVerificando] = useState(false)

  const buscarPerfis = useCallback(async () => {
    const [perfisRes, timesRes] = await Promise.all([
      supabase.from('perfis').select('*').order('nome'),
      supabase.from('times').select('id, nome, escudo_url'),
    ])

    if (perfisRes.error || timesRes.error) return null

    const timesPorId = Object.fromEntries((timesRes.data ?? []).map((t) => [t.id, t]))
    return (perfisRes.data ?? []).map((p) => ({
      ...p,
      time_coracao: p.time_coracao_id ? timesPorId[p.time_coracao_id] ?? null : null,
    }))
  }, [])

  const buscarTorneios = useCallback(async () => {
    const { data } = await supabase
      .from('torneios')
      .select('*')
      .neq('status', 'cancelado')
      .order('criado_em', { ascending: false })
    return data ?? []
  }, [])

  useEffect(() => {
    let ativo = true

    buscarPerfis().then((lista) => {
      if (!ativo) return
      if (!lista) {
        setErro('Não foi possível carregar os perfis. Verifique sua conexão e tente novamente.')
      } else {
        setPerfis(lista)
      }
      setCarregando(false)
    })

    return () => {
      ativo = false
    }
  }, [buscarPerfis])

  useEffect(() => {
    if (etapa !== 'torneios') return undefined

    let ativo = true
    buscarTorneios().then((lista) => {
      if (ativo) setTorneios(lista)
    })

    return () => {
      ativo = false
    }
  }, [etapa, buscarTorneios])

  async function recarregarPerfis() {
    setCarregando(true)
    setErro('')
    const lista = await buscarPerfis()
    if (!lista) {
      setErro('Não foi possível carregar os perfis. Verifique sua conexão e tente novamente.')
    } else {
      setPerfis(lista)
    }
    setCarregando(false)
  }

  function seguir() {
    if (torneioUrl) {
      navigate(`/torneio/${torneioUrl}`)
    } else {
      setEtapa('torneios')
    }
  }

  function selecionarPerfil(perfil) {
    const sessaoValida = sessao?.id === perfil.id
    if (perfil.possui_senha && !sessaoValida) {
      setPerfilSelecionado(perfil)
      setPin('')
      setErroPin('')
      setEtapa('pin')
      return
    }
    entrar(perfil, sessaoValida ? sessao.pin ?? null : null)
    seguir()
  }

  async function confirmarPin(e) {
    e.preventDefault()
    if (pin.length < 4) {
      setErroPin('Digite os 4 dígitos do PIN.')
      return
    }

    setVerificando(true)
    setErroPin('')

    const { data, error } = await supabase.rpc('verificar_pin', {
      p_perfil_id: perfilSelecionado.id,
      p_pin: pin,
    })

    setVerificando(false)

    if (error) {
      setErroPin('Não foi possível verificar o PIN. Tente novamente.')
      return
    }
    if (!data) {
      setErroPin('PIN incorreto.')
      return
    }

    entrar(perfilSelecionado, pin)
    seguir()
  }

  function continuarVisitante() {
    sair()
    seguir()
  }

  return (
    <div className="py-6">
      {etapa !== 'perfis' && (
        <button
          type="button"
          onClick={() => setEtapa('perfis')}
          className="mb-4 inline-flex items-center gap-1 text-sm text-arena-muted active:text-white"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Voltar
        </button>
      )}

      {etapa === 'perfis' && (
        <>
          <p className="etiqueta">• Jogadores</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Quem é você?</h1>
          <p className="mt-1 text-sm text-arena-muted">Selecione o seu perfil para entrar.</p>

          {sessao && (
            <div className="card mt-6 border-arena-primary/40">
              <p className="text-xs uppercase tracking-widest text-arena-muted">Última entrada</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="font-display text-lg font-bold truncate">{sessao.nome}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <Link to={`/perfil/${sessao.id}`} className="text-sm text-arena-secondary active:opacity-70">
                    Ver perfil
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      sair()
                      setEtapa('perfis')
                    }}
                    className="text-sm text-arena-muted active:opacity-70"
                  >
                    Trocar
                  </button>
                </div>
              </div>
            </div>
          )}

          {carregando && <Loading texto="Carregando perfis..." />}

          {!carregando && erro && (
            <div className="card mt-6 border-arena-danger/40 text-center">
              <p className="text-sm text-arena-danger">{erro}</p>
              <button type="button" onClick={recarregarPerfis} className="btn-ghost mt-4 text-sm">
                Tentar novamente
              </button>
            </div>
          )}

          {!carregando && !erro && perfis.length === 0 && (
            <div className="card mt-6 text-center">
              <p className="font-display text-lg font-bold">Nenhum perfil cadastrado</p>
              <p className="mt-1 text-sm text-arena-muted">
                Peça ao administrador para criar o seu perfil.
              </p>
            </div>
          )}

          {!carregando && !erro && perfis.length > 0 && (
            <div className="mt-6 space-y-3">
              {perfis.map((p, i) => (
                <ItemPerfil key={p.id} perfil={p} tempoEspera={i * 50} onSelecionar={selecionarPerfil} />
              ))}
            </div>
          )}

          <button type="button" onClick={continuarVisitante} className="btn-ghost mt-6 w-full text-center">
            Continuar como visitante
          </button>
        </>
      )}

      {etapa === 'pin' && perfilSelecionado && (
        <div className="flex flex-col items-center pt-6 text-center">
          <AvatarPerfil perfil={perfilSelecionado} time={perfilSelecionado.time_coracao} />
          <h1 className="mt-4 font-display text-2xl font-bold">{perfilSelecionado.nome}</h1>
          <p className="mt-1 text-sm text-arena-muted">Este perfil tem PIN. Digite para continuar.</p>

          <form onSubmit={confirmarPin} className="mt-8 w-full max-w-xs">
            <input
              className="input text-center font-display text-2xl tracking-[0.6em]"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              autoFocus
            />
            {erroPin && <p className="mt-2 text-sm text-arena-danger">{erroPin}</p>}
            <button type="submit" disabled={verificando} className="btn-primary mt-4 w-full disabled:opacity-60">
              {verificando ? 'Verificando...' : 'Confirmar'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setEtapa('perfis')
              setPin('')
              setErroPin('')
            }}
            className="mt-4 text-sm text-arena-muted active:text-white"
          >
            Escolher outro perfil
          </button>
        </div>
      )}

      {etapa === 'torneios' && (
        <>
          <p className="etiqueta">• Campeonatos</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Escolha o campeonato</h1>
          <p className="mt-1 text-sm text-arena-muted">
            {sessao ? `Bem-vindo(a), ${sessao.nome}!` : 'Você está entrando como visitante.'}
          </p>

          <div className="mt-6 space-y-3">
            {torneios.length === 0 && (
              <div className="card text-center">
                <p className="font-display text-lg font-bold">Nenhum campeonato disponível</p>
                <Link to="/" className="btn-ghost mt-4 inline-block text-sm">
                  Voltar para o início
                </Link>
              </div>
            )}
            {torneios.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/torneio/${t.id}`)}
                className="card w-full flex items-center justify-between gap-3 text-left transition active:scale-[0.98] hover:border-arena-primary/40"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold truncate">{t.nome}</p>
                  <p className="text-xs text-arena-muted truncate">
                    {[t.plataforma, t.jogo, `${t.mes}/${t.ano}`].filter(Boolean).join(' • ')}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
