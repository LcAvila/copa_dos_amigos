import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdmin } from '../hooks/useAdmin'
import CabecalhoAdmin from '../components/CabecalhoAdmin'
import Loading from '../components/Loading'

function embaralhar(itens) {
  const copia = [...itens]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

function escolherAleatorio(lista) {
  return lista[Math.floor(Math.random() * lista.length)]
}

function mensagemErro(error, padrao) {
  if (error?.code === '42501') return 'Acesso restrito ao administrador. Entre com o login do admin.'
  return padrao
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

export default function Sorteio() {
  const { id } = useParams()
  const { ehAdmin } = useAdmin()

  const [carregando, setCarregando] = useState(true)
  const [recarga, setRecarga] = useState(0)
  const [torneio, setTorneio] = useState(null)
  const [participantes, setParticipantes] = useState([])
  const [pool, setPool] = useState([])
  const [disponiveis, setDisponiveis] = useState([])
  const [novoPerfilId, setNovoPerfilId] = useState('')
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')
  const [emAndamento, setEmAndamento] = useState(false)
  const [adicionando, setAdicionando] = useState(false)
  const [confirmandoLimpar, setConfirmandoLimpar] = useState(false)

  useEffect(() => {
    if (!aviso) return undefined
    const timeout = setTimeout(() => setAviso(''), 4000)
    return () => clearTimeout(timeout)
  }, [aviso])

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
      supabase
        .from('torneio_times')
        .select('time_id, times(id, nome, sigla, escudo_url)')
        .eq('torneio_id', id)
        .eq('disponivel', true),
      supabase.from('perfis').select('id, nome, avatar_url').order('nome'),
    ]).then(([rTorneio, rParticipantes, rPool, rPerfis]) => {
      if (!ativo) return

      if (rTorneio.error || !rTorneio.data) {
        setErro('Torneio não encontrado.')
        setCarregando(false)
        return
      }

      const lista = rParticipantes.data ?? []
      const inscritos = new Set(lista.map((p) => p.perfil_id))

      setTorneio(rTorneio.data)
      setParticipantes(lista)
      setPool((rPool.data ?? []).filter((linha) => linha.times))
      setDisponiveis((rPerfis.data ?? []).filter((perfil) => !inscritos.has(perfil.id)))
      setCarregando(false)
    })

    return () => {
      ativo = false
    }
  }, [id, recarga])

  useEffect(() => {
    if (!id) return undefined

    const canal = supabase
      .channel(`sorteio:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participantes', filter: `torneio_id=eq.${id}` },
        () => setRecarga((r) => r + 1),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [id])

  function recarregar() {
    setRecarga((r) => r + 1)
  }

  async function adicionar() {
    if (!novoPerfilId) return
    setAdicionando(true)
    setErro('')

    const { error } = await supabase
      .from('participantes')
      .insert({ torneio_id: id, perfil_id: novoPerfilId })

    setAdicionando(false)
    if (error) {
      setErro(
        error.code === '23505'
          ? 'Este perfil já está inscrito neste torneio.'
          : mensagemErro(error, 'Não foi possível inscrever o perfil.'),
      )
      return
    }

    setNovoPerfilId('')
    recarregar()
  }

  async function remover(participante) {
    setErro('')
    const { error } = await supabase.from('participantes').delete().eq('id', participante.id)
    if (error) {
      setErro(mensagemErro(error, 'Não foi possível remover o participante.'))
      return
    }
    recarregar()
  }

  async function sincronizarSelecionados(timeIds) {
    const conjunto = new Set(timeIds)
    const { data } = await supabase
      .from('torneio_times')
      .select('time_id, selecionado')
      .eq('torneio_id', id)
    const divergentes = (data ?? []).filter(
      (linha) => Boolean(linha.selecionado) !== conjunto.has(linha.time_id),
    )
    await Promise.all(
      divergentes.map((linha) =>
        supabase
          .from('torneio_times')
          .update({ selecionado: conjunto.has(linha.time_id) })
          .eq('torneio_id', id)
          .eq('time_id', linha.time_id),
      ),
    )
  }

  async function salvarResultado(config, status) {
    const registro = {}
    if (config !== undefined) registro.config = config
    if (status !== undefined) registro.status = status
    return supabase.from('torneios').update(registro).eq('id', id)
  }

  async function sortearTudo() {
    if (participantes.length === 0) {
      setErro('Inscreva ao menos um participante antes de sortear.')
      return
    }
    if (pool.length === 0) {
      setErro('Nenhum time habilitado. Ative ligas e times na edição do torneio (seção 6).')
      return
    }

    const repetir = Boolean(torneio.config?.regras?.timesRepetidos)
    if (!repetir && participantes.length > pool.length) {
      setErro(
        `Times insuficientes: ${participantes.length} participantes e apenas ${pool.length} times. Habilite mais times ou ative "Permitir times repetidos" na edição do torneio.`,
      )
      return
    }

    setEmAndamento(true)
    setErro('')
    setAviso('')

    const baralhado = embaralhar(pool)
    const linhas = participantes.map((participante, indice) => ({
      id: participante.id,
      torneio_id: id,
      perfil_id: participante.perfil_id,
      time_id: baralhado[indice % baralhado.length].time_id,
      ordem_sorteio: indice + 1,
    }))

    const { error } = await supabase.from('participantes').upsert(linhas, { onConflict: 'id' })
    if (error) {
      setEmAndamento(false)
      setErro(mensagemErro(error, 'Não foi possível concluir o sorteio.'))
      return
    }

    await sincronizarSelecionados(linhas.map((linha) => linha.time_id))

    const config = {
      ...(torneio.config ?? {}),
      sorteio: {
        realizadoEm: new Date().toISOString(),
        modo: 'aleatorio',
        total: linhas.length,
      },
    }
    const status = ['configuracao', 'inscricoes'].includes(torneio.status)
      ? 'sorteio'
      : torneio.status
    await salvarResultado(config, status)

    setEmAndamento(false)
    setAviso('Sorteio concluído! Todos receberam um time.')
    recarregar()
  }

  async function resortear(participante) {
    const repetir = Boolean(torneio.config?.regras?.timesRepetidos)
    const usados = participantes
      .filter((outro) => outro.id !== participante.id)
      .map((outro) => outro.time_id)
      .filter(Boolean)

    let candidatos = pool.filter((time) => !usados.includes(time.time_id))
    if (candidatos.length === 0) {
      if (!repetir) {
        setErro('Não há outro time livre. Ative "Permitir times repetidos" ou habilite mais times.')
        return
      }
      candidatos = pool
    }

    setErro('')
    const escolhido = escolherAleatorio(candidatos)
    const { error } = await supabase
      .from('participantes')
      .update({ time_id: escolhido.time_id })
      .eq('id', participante.id)
    if (error) {
      setErro(mensagemErro(error, 'Não foi possível trocar o time.'))
      return
    }

    const novosUsados = participantes.map((outro) =>
      outro.id === participante.id ? escolhido.time_id : outro.time_id,
    )
    await sincronizarSelecionados(novosUsados.filter(Boolean))
    recarregar()
  }

  async function limparSorteio() {
    if (!confirmandoLimpar) {
      setConfirmandoLimpar(true)
      return
    }
    setConfirmandoLimpar(false)
    setEmAndamento(true)
    setErro('')

    const { error } = await supabase
      .from('participantes')
      .update({ time_id: null, ordem_sorteio: null })
      .eq('torneio_id', id)
    if (error) {
      setEmAndamento(false)
      setErro(mensagemErro(error, 'Não foi possível limpar o sorteio.'))
      return
    }

    await sincronizarSelecionados([])
    const config = { ...(torneio.config ?? {}) }
    delete config.sorteio
    const status = torneio.status === 'sorteio' ? 'inscricoes' : torneio.status
    await salvarResultado(config, status)

    setEmAndamento(false)
    setAviso('Sorteio limpo. Os participantes voltaram para a fila.')
    recarregar()
  }

  if (carregando) return <Loading texto="Carregando sorteio..." />

  if (!torneio) {
    return (
      <div>
        <CabecalhoAdmin titulo="Sorteio" />
        <p className="mt-6 text-sm text-arena-danger">{erro || 'Torneio não encontrado.'}</p>
      </div>
    )
  }

  const jaSorteado = participantes.some((participante) => participante.time_id)
  const infoSorteio = torneio.config?.sorteio
  const repetir = Boolean(torneio.config?.regras?.timesRepetidos)

  return (
    <div>
      <CabecalhoAdmin
        titulo="Sorteio de times"
        subtitulo={`${torneio.nome} • ${participantes.length} ${
          participantes.length === 1 ? 'participante' : 'participantes'
        } • ${pool.length} ${pool.length === 1 ? 'time' : 'times'} disponíveis`}
      />

      <div className="mt-6 space-y-3">
        {aviso && (
          <div className="card border-arena-primary/40 text-sm text-arena-primary">{aviso}</div>
        )}
        {erro && <div className="card border-arena-danger/40 text-sm text-arena-danger">{erro}</div>}

        <section className="card space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-arena-primary">
              1. Participantes
            </p>
            <h2 className="font-display text-lg font-bold leading-tight">Inscrições</h2>
            <p className="mt-0.5 text-xs text-arena-muted">
              {disponiveis.length} {disponiveis.length === 1 ? 'perfil disponível' : 'perfis disponíveis'}{' '}
              para inscrever.
            </p>
          </div>

          {ehAdmin ? (
            <div className="flex gap-2">
              <select
                className="input min-w-0 flex-1"
                value={novoPerfilId}
                onChange={(e) => setNovoPerfilId(e.target.value)}
                disabled={adicionando || disponiveis.length === 0}
              >
                <option value="" className="bg-arena-surface2">
                  {disponiveis.length === 0 ? 'Todos já inscritos' : 'Escolha um perfil...'}
                </option>
                {disponiveis.map((perfil) => (
                  <option key={perfil.id} value={perfil.id} className="bg-arena-surface2">
                    {perfil.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-ghost shrink-0 px-4"
                onClick={adicionar}
                disabled={adicionando || !novoPerfilId}
              >
                {adicionando ? '...' : 'Inscrever'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-arena-muted">
              Apenas o administrador inscreve participantes.{' '}
              <Link to="/admin/login" className="text-arena-primary underline">
                Entrar como admin
              </Link>
            </p>
          )}

          {ehAdmin && disponiveis.length === 0 && (
            <p className="text-xs text-arena-muted">
              Todos os perfis já estão inscritos.{' '}
              <Link to="/admin/perfis" className="text-arena-primary underline">
                Criar novos perfis
              </Link>
            </p>
          )}
        </section>

        <section className="card space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-arena-primary">
              2. Sorteio
            </p>
            <h2 className="font-display text-lg font-bold leading-tight">
              {jaSorteado ? 'Times sorteados' : 'Pronto para sortear'}
            </h2>
            <p className="mt-0.5 text-xs text-arena-muted">
              {repetir
                ? 'Times podem se repetir entre participantes.'
                : 'Cada time é sorteado uma única vez.'}
              {infoSorteio?.realizadoEm &&
                ` Último sorteio: ${new Date(infoSorteio.realizadoEm).toLocaleString('pt-BR')}.`}
            </p>
          </div>

          {ehAdmin ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn-primary w-full disabled:opacity-60"
                onClick={sortearTudo}
                disabled={emAndamento}
              >
                {emAndamento
                  ? 'Sorteando...'
                  : jaSorteado
                    ? 'Refazer sorteio'
                    : 'Sortear times'}
              </button>
              {jaSorteado && (
                <button
                  type="button"
                  className={`w-full rounded-xl border px-4 py-3 text-sm transition active:scale-[0.98] ${
                    confirmandoLimpar
                      ? 'border-arena-danger bg-arena-danger/15 text-arena-danger'
                      : 'border-white/10 bg-white/5 text-arena-muted'
                  }`}
                  onClick={limparSorteio}
                  disabled={emAndamento}
                >
                  {confirmandoLimpar ? 'Confirmar? Isso apaga os times' : 'Limpar sorteio'}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-arena-muted">
              O administrador controla o sorteio. Esta tela atualiza sozinha em tempo real.
            </p>
          )}
        </section>

        <section className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-arena-muted">
            3. Resultado
          </p>

          {participantes.length === 0 && (
            <div className="card text-center">
              <p className="font-display text-lg font-bold">Nenhum participante ainda</p>
              <p className="mt-1 text-sm text-arena-muted">
                Inscreva perfis na etapa 1 para começar o sorteio.
              </p>
            </div>
          )}

          {participantes.map((participante, indice) => (
            <div key={participante.id} className="card flex items-center gap-3 !p-3">
              <span className="w-5 shrink-0 text-center font-display text-sm font-bold text-arena-muted">
                {participante.ordem_sorteio ?? indice + 1}
              </span>
              <Avatar url={participante.perfil?.avatar_url} nome={participante.perfil?.nome} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {participante.perfil?.nome ?? participante.apelido ?? 'Participante'}
                </p>
                {participante.times ? (
                  <p className="flex items-center gap-1.5 truncate text-xs text-arena-muted">
                    {participante.times.escudo_url && (
                      <img
                        src={participante.times.escudo_url}
                        alt=""
                        className="size-4 shrink-0 object-contain"
                      />
                    )}
                    <span className="truncate">
                      {participante.times.sigla ? `${participante.times.sigla} • ` : ''}
                      {participante.times.nome}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-arena-muted">Aguardando sorteio</p>
                )}
              </div>

              {ehAdmin && (
                <div className="flex shrink-0 gap-1.5">
                  {participante.time_id && (
                    <button
                      type="button"
                      title="Trocar time"
                      onClick={() => resortear(participante)}
                      disabled={emAndamento}
                      className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-arena-secondary transition active:scale-[0.98] disabled:opacity-60"
                    >
                      ↻
                    </button>
                  )}
                  <button
                    type="button"
                    title="Remover participante"
                    onClick={() => remover(participante)}
                    disabled={emAndamento}
                    className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-arena-danger transition active:scale-[0.98] disabled:opacity-60"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
