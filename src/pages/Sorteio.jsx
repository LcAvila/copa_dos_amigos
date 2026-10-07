import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdmin } from '../hooks/useAdmin'
import CabecalhoAdmin from '../components/CabecalhoAdmin'
import Loading from '../components/Loading'
import SorteioApresentacao from '../components/SorteioApresentacao'
import { Bola } from '../components/Artes'
import { embaralhar, montarEtapas, sortearTime } from '../lib/sorteio'

const TEMPOS_INDIVIDUAL = ['5', '10', '15', '20', '30']

function mensagemErro(error, padrao) {
  if (error?.code === '42501') return 'Acesso restrito ao administrador. Entre com o login do admin.'
  return padrao
}

function paraInputLocal(data) {
  const ajustado = new Date(data.getTime() - data.getTimezoneOffset() * 60000)
  return ajustado.toISOString().slice(0, 16)
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

  // Configuração do sorteio (apenas admin, antes de iniciar)
  const [configModo, setConfigModo] = useState('individual')
  const [configTempo, setConfigTempo] = useState('5')
  const [configInicio, setConfigInicio] = useState(() =>
    paraInputLocal(new Date(Date.now() + 5 * 60000)),
  )

  useEffect(() => {
    if (!aviso) return undefined
    const timeout = setTimeout(() => setAviso(''), 5000)
    return () => clearTimeout(timeout)
  }, [aviso])

  const info = torneio?.config?.sorteio
  const statusConfig = info?.status ?? 'configuracao'
  const emCena = Boolean(torneio) && statusConfig === 'agendado'

  useEffect(() => {
    if (!torneio) return undefined
    setConfigModo(info?.modo ?? 'individual')
    setConfigTempo(String(info?.tempoPorPerfil ?? 5))
    if (info?.inicio) setConfigInicio(paraInputLocal(new Date(info.inicio)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torneio?.id, statusConfig])

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

  // Motor do sorteio: roda no cliente do administrador. A ordem e o horário
  // já foram definidos antes de iniciar, então o restante é temporizado.
  const motorRef = useRef({ participantes: [], pool: [], torneio: null, info: null, ehAdmin: false })
  motorRef.current = {
    participantes,
    pool,
    torneio,
    info,
    ehAdmin,
    repetir: Boolean(torneio?.config?.regras?.timesRepetidos),
  }

  const sincronizarSelecionados = useCallback(
    async (timeIds) => {
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
    },
    [id],
  )

  const salvarResultado = useCallback(
    (config, status) => {
      const registro = {}
      if (config !== undefined) registro.config = config
      if (status !== undefined) registro.status = status
      return supabase.from('torneios').update(registro).eq('id', id)
    },
    [id],
  )

  useEffect(() => {
    const timer = setInterval(() => {
      const {
        participantes: pl,
        pool: pk,
        torneio: tk,
        info: ik,
        ehAdmin,
        repetir,
      } = motorRef.current
      if (!ehAdmin || !tk || !ik || ik.status === 'concluido') return

      const agoraMs = Date.now()
      const inicio = ik.inicioEfetivo ? Date.parse(ik.inicioEfetivo) : 0
      if (!inicio || agoraMs < inicio) return

      if (ik.modo === 'lote') {
        if (pl.some((p) => p.time_id)) return
        const baralhado = embaralhar(pk)
        const linhas = pl.map((participante, indice) => ({
          id: participante.id,
          torneio_id: id,
          perfil_id: participante.perfil_id,
          time_id: baralhado[indice % baralhado.length].time_id,
          ordem_sorteio: indice + 1,
        }))
        supabase
          .from('participantes')
          .upsert(linhas, { onConflict: 'id' })
          .then(async ({ error }) => {
            if (error) return
            await sincronizarSelecionados(linhas.map((l) => l.time_id))
            await salvarResultado(
              { ...tk.config, sorteio: { ...ik, status: 'concluido', realizadoEm: new Date().toISOString() } },
              undefined,
            )
            setRecarga((r) => r + 1)
          })
        return
      }

      const etapas = montarEtapas(pl, ik.ordem ?? [], ik.inicioEfetivo, ik.tempoPorPerfil, ik.intervalo)
      for (const etapa of etapas) {
        const part = etapa.participante
        if (!part || part.time_id || agoraMs < etapa.escolhaEm) continue
        const usados = pl.filter((o) => o.id !== part.id && o.time_id).map((o) => o.time_id)
        const escolhido = sortearTime(pk, usados, repetir)
        supabase
          .from('participantes')
          .update({ time_id: escolhido.time_id, ordem_sorteio: etapa.indice + 1 })
          .eq('id', part.id)
          .is('time_id', null)
          .then(({ error }) => {
            if (!error) setRecarga((r) => r + 1)
          })
      }

      const todosTem = pl.length > 0 && pl.every((p) => p.time_id)
      if (todosTem) {
        const fimTotal = etapas.length ? etapas[etapas.length - 1].fim : 0
        if (agoraMs >= fimTotal) {
          salvarResultado(
            { ...tk.config, sorteio: { ...ik, status: 'concluido', realizadoEm: new Date().toISOString() } },
            undefined,
          ).then(() => setRecarga((r) => r + 1))
        }
      }
    }, 700)

    return () => clearInterval(timer)
  }, [id, salvarResultado, sincronizarSelecionados])

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

  async function inscreverTodos() {
    if (disponiveis.length === 0) return
    setAdicionando(true)
    setErro('')

    const { error } = await supabase
      .from('participantes')
      .insert(disponiveis.map((perfil) => ({ torneio_id: id, perfil_id: perfil.id })))

    setAdicionando(false)
    if (error) {
      setErro(
        error.code === '23505'
          ? 'Alguns perfis já estavam inscritos neste torneio.'
          : mensagemErro(error, 'Não foi possível inscrever todos.'),
      )
      return
    }

    const qtd = disponiveis.length
    setNovoPerfilId('')
    setAviso(`${qtd} ${qtd === 1 ? 'perfil inscrito' : 'perfis inscritos'}!`)
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

  function validarPrerequisitos() {
    if (participantes.length === 0) {
      setErro('Inscreva ao menos um participante antes de sortear.')
      return false
    }
    if (pool.length === 0) {
      setErro('Nenhum time habilitado. Habilite ligas e times na edição do torneio.')
      return false
    }
    const repetir = Boolean(torneio.config?.regras?.timesRepetidos)
    if (!repetir && participantes.length > pool.length) {
      setErro(
        `Times insuficientes: ${participantes.length} participantes e apenas ${pool.length} times. Habilite mais times ou ative "Permitir times repetidos".`,
      )
      return false
    }
    return true
  }

  async function salvarConfiguracao() {
    if (!ehAdmin || statusConfig !== 'configuracao') return
    setEmAndamento(true)
    setErro('')
    const novo = {
      modo: configModo,
      tempoPorPerfil: configModo === 'individual' ? Number(configTempo) : 5,
      intervalo: 15,
      status: 'configuracao',
    }
    await salvarResultado(
      { ...torneio.config, sorteio: novo },
      'inscricoes',
    )
    setEmAndamento(false)
    setAviso('Configuração do sorteio salva.')
    recarregar()
  }

  async function iniciarSorteio(horario) {
    if (!validarPrerequisitos()) return
    setEmAndamento(true)
    setErro('')
    setAviso('')

    const ordem = embaralhar(participantes).map((p) => p.id)
    const novo = {
      modo: configModo,
      tempoPorPerfil: configModo === 'individual' ? Number(configTempo) : 5,
      intervalo: 15,
      inicio: horario.toISOString(),
      inicioEfetivo: horario.toISOString(),
      ordem,
      status: 'agendado',
    }
    const { error } = await supabase
      .from('torneios')
      .update({ config: { ...torneio.config, sorteio: novo }, status: 'sorteio' })
      .eq('id', id)

    setEmAndamento(false)
    if (error) {
      setErro(mensagemErro(error, 'Não foi possível iniciar o sorteio.'))
      return
    }
    setAviso(
      novo.modo === 'lote'
        ? 'Sorteio em lote agendado. Todos recebem um time quando o sorteio começar.'
        : 'Sorteio agendado. Os perfis podem acompanhar ao vivo.',
    )
    recarregar()
  }

  async function cancelarAgendamento() {
    if (!ehAdmin) return
    setErro('')
    const limpo = {
      modo: info?.modo ?? 'individual',
      tempoPorPerfil: Number(configTempo),
      intervalo: 15,
      status: 'configuracao',
    }
    const registro = { config: { ...torneio.config, sorteio: limpo } }
    if (participantes.every((p) => !p.time_id)) registro.status = 'inscricoes'
    const { error } = await supabase.from('torneios').update(registro).eq('id', id)
    if (error) {
      setErro(mensagemErro(error, 'Não foi possível cancelar o agendamento.'))
      return
    }
    setAviso('Agendamento cancelado. O sorteio volta para a configuração.')
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
    const escolhido = candidatos[Math.floor(Math.random() * candidatos.length)]
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

  async function reiniciarSorteio() {
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
      setErro(mensagemErro(error, 'Não foi possível reiniciar o sorteio.'))
      return
    }

    await sincronizarSelecionados([])
    await salvarResultado(
      {
        ...torneio.config,
        sorteio: {
          modo: info?.modo ?? 'individual',
          tempoPorPerfil: info?.tempoPorPerfil ?? 5,
          intervalo: 15,
          status: 'configuracao',
        },
      },
      'inscricoes',
    )

    setEmAndamento(false)
    setAviso('Sorteio reiniciado. Os participantes voltaram para a fila.')
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

  if (emCena) {
    return (
      <SorteioApresentacao
        torneio={torneio}
        participantes={participantes}
        pool={pool}
        info={info}
        ehAdmin={ehAdmin}
        onCancelarAgendamento={cancelarAgendamento}
      />
    )
  }

  const jaSorteado = participantes.some((participante) => participante.time_id)
  const repetir = Boolean(torneio.config?.regras?.timesRepetidos)
  const agendado = statusConfig === 'agendado'

  return (
    <div>
      <CabecalhoAdmin
        titulo="Sorteio de times"
        subtitulo={`${torneio.nome} • ${participantes.length} ${
          participantes.length === 1 ? 'participante' : 'participantes'
        } • ${pool.length} ${pool.length === 1 ? 'time' : 'times'} disponíveis`}
      />

      <div className="entrar mt-6 space-y-3">
        {aviso && <div className="card border-arena-primary/40 text-sm text-arena-primary">{aviso}</div>}
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
            <div className="space-y-2">
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
              <button
                type="button"
                className="btn-primary w-full disabled:opacity-60"
                onClick={inscreverTodos}
                disabled={adicionando || disponiveis.length === 0}
              >
                {disponiveis.length === 0
                  ? 'Todos já inscritos'
                  : `Inscrever todos (${disponiveis.length})`}
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
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-arena-primary">
              <Bola className="size-3.5 animate-[girarBola_4s_linear_infinite]" />
              2. Sorteio
            </p>
            <h2 className="font-display text-lg font-bold leading-tight">
              {statusConfig === 'concluido' ? 'Times sorteados' : 'Configuração do sorteio'}
            </h2>
            <p className="mt-0.5 text-xs text-arena-muted">
              {repetir
                ? 'Times podem se repetir entre participantes.'
                : 'Cada time é sorteado uma única vez.'}
              {info?.realizadoEm &&
                ` Último sorteio: ${new Date(info.realizadoEm).toLocaleString('pt-BR')}.`}
            </p>
          </div>

          {ehAdmin && statusConfig === 'configuracao' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
                    Modo do sorteio
                  </span>
                  <select
                    className="input mt-1.5"
                    value={configModo}
                    onChange={(e) => setConfigModo(e.target.value)}
                  >
                    <option value="individual" className="bg-arena-surface2">
                      Individual (ao vivo)
                    </option>
                    <option value="lote" className="bg-arena-surface2">
                      Em lote (todos de uma vez)
                    </option>
                  </select>
                </label>

                {configModo === 'individual' && (
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
                      Tempo por perfil
                    </span>
                    <select
                      className="input mt-1.5"
                      value={configTempo}
                      onChange={(e) => setConfigTempo(e.target.value)}
                    >
                      {TEMPOS_INDIVIDUAL.map((t) => (
                        <option key={t} value={t} className="bg-arena-surface2">
                          {t} segundos
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
                  Horário de início
                </span>
                <input
                  type="datetime-local"
                  className="input mt-1.5"
                  min={paraInputLocal(new Date())}
                  value={configInicio}
                  onChange={(e) => setConfigInicio(e.target.value)}
                />
              </label>

              <button
                type="button"
                className="btn-ghost w-full"
                disabled={emAndamento}
                onClick={salvarConfiguracao}
              >
                {emAndamento ? 'Salvando...' : 'Salvar configuração'}
              </button>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="btn-primary w-full disabled:opacity-60"
                  disabled={emAndamento}
                  onClick={() => iniciarSorteio(new Date())}
                >
                  {emAndamento ? 'Iniciando...' : 'Iniciar sorteio agora'}
                </button>
                <button
                  type="button"
                  className="btn-ghost w-full disabled:opacity-60"
                  disabled={emAndamento || !configInicio}
                  onClick={() => iniciarSorteio(new Date(configInicio))}
                >
                  Agendar início
                </button>
              </div>
            </div>
          )}

          {ehAdmin && agendado && (
            <button
              type="button"
              className="w-full rounded-xl border border-arena-danger/40 bg-arena-danger/10 px-4 py-3 text-sm text-arena-danger transition active:scale-[0.98]"
              onClick={cancelarAgendamento}
            >
              Cancelar agendamento
            </button>
          )}

          {!ehAdmin && (
            <p className="text-xs text-arena-muted">
              {agendado
                ? 'O sorteio já está agendado e começa automaticamente no horário.'
                : statusConfig === 'concluido'
                  ? 'Sorteio concluído. Os times aparecem abaixo.'
                  : 'O administrador está configurando o sorteio. Quando começar, a tela abre ao vivo para todos.'}
            </p>
          )}

          {statusConfig === 'concluido' && jaSorteado && (
            <button
              type="button"
              className={`w-full rounded-xl border px-4 py-3 text-sm transition active:scale-[0.98] ${
                confirmandoLimpar
                  ? 'border-arena-danger bg-arena-danger/15 text-arena-danger'
                  : 'border-white/10 bg-white/5 text-arena-muted'
              }`}
              onClick={reiniciarSorteio}
              disabled={emAndamento}
            >
              {confirmandoLimpar ? 'Confirmar? Isso apaga os times' : 'Reiniciar sorteio'}
            </button>
          )}
        </section>

        <section className="entrar space-y-2">
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

              {ehAdmin && statusConfig === 'concluido' && (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    title="Trocar time"
                    onClick={() => resortear(participante)}
                    disabled={emAndamento}
                    className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-arena-secondary transition active:scale-[0.98] disabled:opacity-60"
                  >
                    ↻
                  </button>
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