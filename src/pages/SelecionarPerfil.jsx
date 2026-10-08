import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useSessaoJogador } from '../hooks/useSessaoJogador'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import CampoIntro from '../components/CampoIntro'
import BotaoVoltar from '../components/BotaoVoltar'
import { Trofeu, Bola } from '../components/Artes'

function Inicial({ nome, className = 'size-14 text-lg' }) {
  return (
    <div className={`flex items-center justify-center rounded-full bg-arena-surface2 border border-white/10 font-display font-bold text-arena-primary uppercase ${className}`}>
      {nome?.trim()?.[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function AvatarPerfil({ perfil, time, className = 'size-14', escudoClassName = 'size-7' }) {
  return (
    <div className="flex items-end gap-1 shrink-0">
      {perfil.avatar_url ? (
        <img
          src={perfil.avatar_url}
          alt={perfil.nome}
          className={`${className} rounded-full object-cover border-2 border-arena-primary/30 shadow-[0_0_20px_rgba(246,225,75,0.15)]`}
        />
      ) : (
        <Inicial nome={perfil.nome} className={className} />
      )}
      {time?.escudo_url && (
        <img
          src={time.escudo_url}
          alt={time.nome}
          title={time.nome}
          className={`${escudoClassName} -ml-2 object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]`}
        />
      )}
    </div>
  )
}

function ItemPerfil({ perfil, tempoEspera = 0, onSelecionar, etiqueta }) {
  return (
    <button
      type="button"
      onClick={() => onSelecionar(perfil)}
      style={{ animationDelay: `${tempoEspera}ms` }}
      className="card group relative block w-full !p-0 overflow-hidden text-left transition active:scale-[0.98] hover:border-arena-primary/40 animate-[fadeIn_300ms_ease-out_both]"
    >
      <div className={`relative flex items-center gap-4 overflow-hidden ${perfil.capa_url ? 'min-h-24 bg-arena-surface2' : 'bg-gradient-to-r from-arena-surface2 to-arena-surface'} p-4`}>
        {perfil.capa_url && (
          <img
            src={perfil.capa_url}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full object-cover"
          />
        )}
        {perfil.capa_url && (
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-arena-bg via-arena-bg/40 to-arena-bg/10" />
        )}
        <span className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-arena-primary/5 transition group-hover:bg-arena-primary/10" />
        {perfil.capa_url && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/5" />
        )}
        <Bola className="pointer-events-none absolute -bottom-5 right-16 size-12 opacity-[0.04] transition animate-[girarBola_12s_linear_infinite] group-hover:opacity-10" />

        {etiqueta && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-arena-primary/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-arena-primary ring-1 ring-arena-primary/30">
            {etiqueta}
          </span>
        )}

        <AvatarPerfil
          perfil={perfil}
          time={perfil.time_coracao}
          className="size-16"
          escudoClassName="size-8"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-extrabold leading-tight truncate">{perfil.nome}</p>
          <p className="mt-0.5 text-xs text-arena-muted truncate">
            {perfil.time_coracao?.nome ?? 'Sem time do coração'}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5">
        {perfil.possui_senha ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-arena-muted">
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9z" />
            </svg>
            Protegido por PIN
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-arena-muted">
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
            Acesso livre
          </span>
        )}
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-arena-secondary transition group-hover:text-arena-primary">
          Entrar
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </div>
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
    <div className="entrar py-6">
      <BotaoVoltar className="mb-4" />

      {etapa === 'perfis' && (
        <>
          <CampoIntro
            frase="A COPA É SUA,"
            palavras={['JOGADOR', 'CAMPEÃO', 'ARTILHEIRO', 'GOAT']}
            rotulo="Jogadores"
            subtitulo="Escolha o seu perfil para entrar."
          />

          {sessao && perfis.some((p) => p.id === sessao.id) && (
            <div className="entrar mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="etiqueta">• Última entrada</p>
                <button
                  type="button"
                  onClick={() => sair()}
                  className="text-xs text-arena-muted active:text-white"
                >
                  Trocar perfil
                </button>
              </div>
              <ItemPerfil
                perfil={perfis.find((p) => p.id === sessao.id)}
                tempoEspera={0}
                onSelecionar={selecionarPerfil}
                etiqueta="Última entrada"
              />
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
              {perfis
                .filter((p) => p.id !== sessao?.id)
                .map((p, i) => (
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
          <div className="animate-[boiar_3s_ease-in-out_infinite] rounded-full bg-arena-primary/10 p-3">
            <AvatarPerfil perfil={perfilSelecionado} time={perfilSelecionado.time_coracao} />
          </div>
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
          <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold">
            <Trofeu className="size-7 shrink-0" />
            Escolha o campeonato
          </h1>
          <p className="mt-1 text-sm text-arena-muted">
            {sessao ? `Bem-vindo(a), ${sessao.nome}!` : 'Você está entrando como visitante.'}
          </p>

          <div className="entrar mt-6 space-y-3">
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
                className="card group relative block w-full !p-0 overflow-hidden text-left transition active:scale-[0.98] hover:border-arena-primary/40"
              >
                <div className="relative overflow-hidden bg-gradient-to-r from-arena-surface2 to-arena-surface p-4">
                  <span className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-arena-primary/5 transition group-hover:bg-arena-primary/10" />
                  <Bola className="pointer-events-none absolute -bottom-5 right-16 size-12 opacity-[0.04] transition animate-[girarBola_12s_linear_infinite] group-hover:opacity-10" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-xl font-extrabold leading-tight truncate">{t.nome}</p>
                      <p className="mt-0.5 text-xs text-arena-muted truncate">
                        {[t.plataforma, t.jogo, `${t.mes}/${t.ano}`].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                </div>
                <div className="flex items-center justify-end border-t border-white/10 px-4 py-2.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-arena-secondary transition group-hover:text-arena-primary">
                    Entrar no campeonato
                    <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
