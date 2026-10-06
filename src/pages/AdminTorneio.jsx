import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdmin } from '../hooks/useAdmin'
import CabecalhoAdmin from '../components/CabecalhoAdmin'
import Loading from '../components/Loading'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const PLATAFORMAS = [
  'PlayStation 2', 'PlayStation 4', 'PlayStation 5',
  'Xbox One', 'Xbox Series', 'PC', 'Nintendo Switch', 'Mobile', 'Outra',
]

const JOGOS = [
  'EA FC 26', 'EA FC 25', 'EA FC 24',
  'FIFA 23', 'FIFA 22', 'FIFA 20', 'FIFA 18', 'FIFA 14',
  'eFootball', 'Bomba Patch', 'Winning Eleven', 'Outro',
]

const FORMATOS = [
  { valor: 'grupos_mata_mata', texto: 'Grupos + Mata-mata' },
  { valor: 'todos_contra_todos', texto: 'Todos contra todos' },
  { valor: 'mata_mata', texto: 'Mata-mata direto' },
]

const CRITERIOS = [
  { valor: 'saldo_gols', texto: 'Saldo de gols' },
  { valor: 'gols_pro', texto: 'Gols marcados' },
  { valor: 'vitorias', texto: 'Maior número de vitórias' },
  { valor: 'confronto_direto', texto: 'Confronto direto' },
  { valor: 'gols_contra', texto: 'Menos gols sofridos' },
]

const STATUS = [
  { valor: 'configuracao', texto: 'Em configuração' },
  { valor: 'inscricoes', texto: 'Inscrições abertas' },
  { valor: 'sorteio', texto: 'Sorteio' },
  { valor: 'grupos', texto: 'Fase de grupos' },
  { valor: 'mata_mata', texto: 'Mata-mata' },
  { valor: 'finalizado', texto: 'Finalizado' },
  { valor: 'cancelado', texto: 'Cancelado' },
]

const agora = new Date()

function formInicial(torneio, configOriginal) {
  if (!torneio) {
    return {
      nome: '',
      mes: MESES[agora.getMonth()],
      ano: agora.getFullYear(),
      plataforma: 'PlayStation 5',
      jogo: 'EA FC 26',
      jogoCustom: '',
      formato: 'grupos_mata_mata',
      status: 'configuracao',
      gruposQtd: 4,
      jogadoresPorGrupo: 4,
      classificadosPorGrupo: 2,
      melhoresTerceiros: 0,
      gruposIdaVolta: false,
      mmIdaVolta: false,
      prorrogacao: true,
      penaltis: true,
      desempate: ['saldo_gols', 'gols_pro'],
      timesRepetidos: false,
      selecoes: false,
    }
  }

  const cfg = configOriginal ?? {}
  const jogoConhecido = JOGOS.includes(torneio.jogo)

  return {
    nome: torneio.nome,
    mes: torneio.mes,
    ano: torneio.ano,
    plataforma: torneio.plataforma,
    jogo: jogoConhecido ? torneio.jogo : 'Outro',
    jogoCustom: jogoConhecido ? '' : torneio.jogo,
    formato: torneio.formato,
    status: torneio.status,
    gruposQtd: cfg.grupos?.quantidade ?? 4,
    jogadoresPorGrupo: cfg.grupos?.jogadoresPorGrupo ?? 4,
    classificadosPorGrupo: cfg.grupos?.classificadosPorGrupo ?? 2,
    melhoresTerceiros: cfg.grupos?.melhoresTerceiros ?? 0,
    gruposIdaVolta: cfg.grupos?.idaEVolta ?? false,
    mmIdaVolta: cfg.mataMata?.idaEVolta ?? false,
    prorrogacao: cfg.mataMata?.prorrogacao ?? true,
    penaltis: cfg.mataMata?.penaltis ?? true,
    desempate: cfg.desempate ?? ['saldo_gols', 'gols_pro'],
    timesRepetidos: cfg.regras?.timesRepetidos ?? false,
    selecoes: cfg.regras?.selecoes ?? false,
  }
}

function Secao({ numero, titulo, descricao, children }) {
  return (
    <section className="card space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-arena-primary">{numero}</p>
        <h2 className="font-display text-lg font-bold leading-tight">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-xs text-arena-muted">{descricao}</p>}
      </div>
      {children}
    </section>
  )
}

function Campo({ rotulo, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-widest text-arena-muted">
        {rotulo}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  )
}

function Numero({ valor, onChange, min = 0, max = 99 }) {
  return (
    <input
      className="input text-center font-display text-lg"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={valor}
      onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
    />
  )
}

function Alternar({ rotulo, descricao, valor, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={valor}
      onClick={() => onChange(!valor)}
      className="flex w-full items-center justify-between gap-3 py-1 text-left"
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{rotulo}</span>
        {descricao && <span className="block text-xs text-arena-muted">{descricao}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${valor ? 'bg-arena-primary' : 'bg-white/10'}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${valor ? 'left-6' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}

export default function AdminTorneio() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAdmin()

  const [carregando, setCarregando] = useState(Boolean(id))
  const [configOriginal, setConfigOriginal] = useState({})
  const [form, setForm] = useState(() => formInicial(null, null))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [ligas, setLigas] = useState([])
  const [ligasHabilitadas, setLigasHabilitadas] = useState({})
  const [habilitados, setHabilitados] = useState({})
  const [timeLiga, setTimeLiga] = useState({})
  const [expandida, setExpandida] = useState(null)
  const [timesVisiveis, setTimesVisiveis] = useState([])
  const [carregandoTimes, setCarregandoTimes] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [avisoLigas, setAvisoLigas] = useState('')
  const [novaLiga, setNovaLiga] = useState('')
  const [novoTime, setNovoTime] = useState('')

  useEffect(() => {
    if (!id) return undefined

    let ativo = true
    supabase
      .from('torneios')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!ativo) return
        if (error || !data) {
          setErro('Torneio não encontrado.')
        } else {
          setConfigOriginal(data.config ?? {})
          setForm(formInicial(data, data.config ?? {}))
        }
        setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [id])

  useEffect(() => {
    if (!id) return undefined

    let ativo = true
    Promise.all([
      supabase
        .from('ligas')
        .select('*')
        .eq('ativa', true)
        .order('pais', { ascending: true })
        .order('nome', { ascending: true }),
      supabase.from('torneio_ligas').select('liga_id').eq('torneio_id', id),
      supabase
        .from('torneio_times')
        .select('time_id, disponivel, times(id, liga_id)')
        .eq('torneio_id', id),
    ]).then(([resLigas, resTL, resTT]) => {
      if (!ativo) return
      if (!resLigas.error) setLigas(resLigas.data ?? [])
      if (!resTL.error) {
        const mapa = {}
        for (const linha of resTL.data ?? []) mapa[linha.liga_id] = true
        setLigasHabilitadas(mapa)
      }
      if (!resTT.error) {
        const disponiveis = {}
        const porLiga = {}
        for (const linha of resTT.data ?? []) {
          disponiveis[linha.time_id] = linha.disponivel
          if (linha.times?.liga_id) porLiga[linha.time_id] = linha.times.liga_id
        }
        setHabilitados(disponiveis)
        setTimeLiga(porLiga)
      }
    })

    return () => {
      ativo = false
    }
  }, [id])

  const atualizar = useCallback((campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }))
  }, [])

  async function alternarLiga(liga) {
    if (!id) return
    const habilitada = Boolean(ligasHabilitadas[liga.id])
    setAvisoLigas('')

    if (habilitada) {
      const { error } = await supabase
        .from('torneio_ligas')
        .delete()
        .eq('torneio_id', id)
        .eq('liga_id', liga.id)
      if (error) {
        setAvisoLigas('Não foi possível remover a liga do torneio.')
        return
      }
      setLigasHabilitadas((m) => {
        const novo = { ...m }
        delete novo[liga.id]
        return novo
      })
      return
    }

    const { error } = await supabase.from('torneio_ligas').upsert({
      torneio_id: id,
      liga_id: liga.id,
    })
    if (error) {
      setAvisoLigas('Não foi possível habilitar a liga.')
      return
    }
    setLigasHabilitadas((m) => ({ ...m, [liga.id]: true }))
  }

  function expandirLiga(liga) {
    if (expandida === liga.id) {
      setExpandida(null)
      setTimesVisiveis([])
      setNovoTime('')
      return
    }
    setExpandida(liga.id)
    setTimesVisiveis([])
    setNovoTime('')
    setCarregandoTimes(true)
    setAvisoLigas('')
    supabase
      .from('times')
      .select('*')
      .eq('liga_id', liga.id)
      .eq('ativo', true)
      .order('nome', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setAvisoLigas('Não foi possível carregar os times desta liga.')
        } else {
          setTimesVisiveis(data ?? [])
        }
        setCarregandoTimes(false)
      })
  }

  async function alternarTime(time, liga) {
    if (!id) return
    const marcado = Boolean(habilitados[time.id])
    setAvisoLigas('')

    if (marcado) {
      const { error } = await supabase
        .from('torneio_times')
        .delete()
        .eq('torneio_id', id)
        .eq('time_id', time.id)
      if (error) {
        setAvisoLigas('Não foi possível remover o time.')
        return
      }
      setHabilitados((m) => {
        const novo = { ...m }
        delete novo[time.id]
        return novo
      })
      setTimeLiga((m) => {
        const novo = { ...m }
        delete novo[time.id]
        return novo
      })
      return
    }

    const { error } = await supabase.from('torneio_times').upsert({
      torneio_id: id,
      time_id: time.id,
      disponivel: true,
      selecionado: false,
    })
    if (error) {
      setAvisoLigas('Não foi possível habilitar o time.')
      return
    }
    setHabilitados((m) => ({ ...m, [time.id]: true }))
    setTimeLiga((m) => ({ ...m, [time.id]: liga.id }))
  }

  async function sincronizarLigas() {
    setSincronizando(true)
    setAvisoLigas('')
    try {
      const { data, error } = await supabase.functions.invoke('consultar-ligas', {
        body: { acao: 'ligas' },
      })
      if (error) throw error
      if (!data?.ok) {
        setAvisoLigas(data?.erro ?? 'Não foi possível sincronizar as ligas.')
        return
      }
      setLigas(data.ligas ?? [])
      setAvisoLigas(`Catálogo atualizado: ${(data.ligas ?? []).length} ligas disponíveis.`)
    } catch {
      setAvisoLigas('Não foi possível falar com o servidor de ligas. Tente novamente.')
    } finally {
      setSincronizando(false)
    }
  }

  async function criarLigaManual() {
    const nome = novaLiga.trim()
    if (!nome) return
    setAvisoLigas('')
    const { data, error } = await supabase
      .from('ligas')
      .insert({ nome, tipo: 'outra', fonte: 'manual', ativa: true })
      .select('*')
      .single()
    if (error) {
      setAvisoLigas('Não foi possível criar a liga.')
      return
    }
    setLigas((lista) =>
      [...lista, data].sort(
        (a, b) => (a.pais ?? '').localeCompare(b.pais ?? '') || a.nome.localeCompare(b.nome),
      ),
    )
    setNovaLiga('')
  }

  async function criarTimeManual(liga) {
    const nome = novoTime.trim()
    if (!nome) return
    setAvisoLigas('')
    const { data, error } = await supabase
      .from('times')
      .insert({ nome, liga_id: liga.id, liga_nome: liga.nome, tipo: 'custom', ativo: true })
      .select('*')
      .single()
    if (error) {
      setAvisoLigas('Não foi possível criar o time.')
      return
    }

    const { error: erroHabilitar } = await supabase.from('torneio_times').upsert({
      torneio_id: id,
      time_id: data.id,
      disponivel: true,
      selecionado: false,
    })
    if (erroHabilitar) {
      setAvisoLigas('Time criado, mas não foi possível habilitá-lo para o sorteio.')
    } else {
      setHabilitados((m) => ({ ...m, [data.id]: true }))
      setTimeLiga((m) => ({ ...m, [data.id]: liga.id }))
    }
    setTimesVisiveis((lista) => [...lista, data].sort((a, b) => a.nome.localeCompare(b.nome)))
    setNovoTime('')
  }

  async function salvar(e) {
    e.preventDefault()
    setSalvando(true)
    setErro('')

    const nome = form.nome.trim()
    if (!nome) {
      setErro('Informe o nome do torneio.')
      setSalvando(false)
      return
    }

    const jogoFinal = form.jogo === 'Outro' ? form.jogoCustom.trim() || 'Outro' : form.jogo

    const config = {
      ...configOriginal,
      grupos: {
        quantidade: Number(form.gruposQtd),
        jogadoresPorGrupo: Number(form.jogadoresPorGrupo),
        classificadosPorGrupo: Number(form.classificadosPorGrupo),
        melhoresTerceiros: Number(form.melhoresTerceiros),
        idaEVolta: form.gruposIdaVolta,
      },
      mataMata: {
        idaEVolta: form.mmIdaVolta,
        prorrogacao: form.prorrogacao,
        penaltis: form.penaltis,
      },
      desempate: CRITERIOS.filter((c) => form.desempate.includes(c.valor)).map((c) => c.valor),
      regras: {
        timesRepetidos: form.timesRepetidos,
        selecoes: form.selecoes,
      },
    }

    const registro = {
      nome,
      mes: form.mes,
      ano: Number(form.ano),
      plataforma: form.plataforma,
      jogo: jogoFinal,
      formato: form.formato,
      status: form.status,
      config,
    }

    let resultado
    if (id) {
      resultado = await supabase.from('torneios').update(registro).eq('id', id).select('id').single()
    } else {
      resultado = await supabase
        .from('torneios')
        .insert({ ...registro, organizador_id: usuario?.id ?? null })
        .select('id')
        .single()
    }

    setSalvando(false)

    if (resultado.error) {
      if (resultado.error.code === '23505') {
        setErro('Já existe um torneio com esse nome.')
      } else {
        setErro('Não foi possível salvar o torneio. Tente novamente.')
      }
      return
    }

    navigate('/admin', { state: { aviso: id ? 'Torneio atualizado!' : 'Torneio criado!' } })
  }

  const totalHabilitados = Object.values(habilitados).filter(Boolean).length
  const totalLigasHabilitadas = Object.keys(ligasHabilitadas).length

  if (carregando) return <Loading texto="Carregando torneio..." />

  return (
    <div>
      <CabecalhoAdmin
        titulo={id ? 'Editar torneio' : 'Criar torneio'}
        subtitulo="Configure o campeonato como em um jogo de futebol."
      />

      <form onSubmit={salvar} className="mt-6 space-y-4">
        <Secao numero="1" titulo="Identificação" descricao="Dados básicos do campeonato.">
          <Campo rotulo="Nome do torneio">
            <input
              className="input"
              placeholder="Ex.: Copa dos Amigos"
              value={form.nome}
              onChange={(e) => atualizar('nome', e.target.value)}
              required
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Mês">
              <select className="input" value={form.mes} onChange={(e) => atualizar('mes', e.target.value)}>
                {MESES.map((m) => (
                  <option key={m} value={m} className="bg-arena-surface2">{m}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Ano">
              <input
                className="input text-center"
                type="number"
                inputMode="numeric"
                min={2024}
                max={2100}
                value={form.ano}
                onChange={(e) => atualizar('ano', e.target.value)}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Plataforma">
              <select
                className="input"
                value={form.plataforma}
                onChange={(e) => atualizar('plataforma', e.target.value)}
              >
                {PLATAFORMAS.map((p) => (
                  <option key={p} value={p} className="bg-arena-surface2">{p}</option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Jogo">
              <select className="input" value={form.jogo} onChange={(e) => atualizar('jogo', e.target.value)}>
                {JOGOS.map((j) => (
                  <option key={j} value={j} className="bg-arena-surface2">{j}</option>
                ))}
              </select>
            </Campo>
          </div>

          {form.jogo === 'Outro' && (
            <Campo rotulo="Nome do jogo">
              <input
                className="input"
                placeholder="Ex.: FIFA Street"
                value={form.jogoCustom}
                onChange={(e) => atualizar('jogoCustom', e.target.value)}
              />
            </Campo>
          )}

          <Campo rotulo="Formato">
            <select className="input" value={form.formato} onChange={(e) => atualizar('formato', e.target.value)}>
              {FORMATOS.map((f) => (
                <option key={f.valor} value={f.valor} className="bg-arena-surface2">
                  {f.texto}
                </option>
              ))}
            </select>
          </Campo>
        </Secao>

        <Secao numero="2" titulo="Fase de grupos" descricao="Como os grupos serão formados.">
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Grupos">
              <Numero valor={form.gruposQtd} onChange={(v) => atualizar('gruposQtd', v)} min={1} max={16} />
            </Campo>
            <Campo rotulo="Jogadores por grupo">
              <Numero
                valor={form.jogadoresPorGrupo}
                onChange={(v) => atualizar('jogadoresPorGrupo', v)}
                min={2}
                max={16}
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Classificados por grupo">
              <Numero
                valor={form.classificadosPorGrupo}
                onChange={(v) => atualizar('classificadosPorGrupo', v)}
                min={1}
                max={8}
              />
            </Campo>
            <Campo rotulo="Melhores terceiros">
              <Numero
                valor={form.melhoresTerceiros}
                onChange={(v) => atualizar('melhoresTerceiros', v)}
                min={0}
                max={4}
              />
            </Campo>
          </div>

          <Alternar
            rotulo="Ida e volta na fase de grupos"
            descricao="Cada time joga dois jogos contra cada adversário."
            valor={form.gruposIdaVolta}
            onChange={(v) => atualizar('gruposIdaVolta', v)}
          />
        </Secao>

        <Secao numero="3" titulo="Mata-mata" descricao="Regras das fases eliminatórias.">
          <Alternar
            rotulo="Ida e volta no mata-mata"
            descricao="Confrontos com jogo de ida e volta."
            valor={form.mmIdaVolta}
            onChange={(v) => atualizar('mmIdaVolta', v)}
          />
          <Alternar
            rotulo="Prorrogação"
            descricao="120 minutos em caso de empate."
            valor={form.prorrogacao}
            onChange={(v) => atualizar('prorrogacao', v)}
          />
          <Alternar
            rotulo="Disputa de pênaltis"
            descricao="Decide a série em caso de empate."
            valor={form.penaltis}
            onChange={(v) => atualizar('penaltis', v)}
          />
        </Secao>

        <Secao numero="4" titulo="Critérios de desempate" descricao="Ordem aplicada na tabela.">
          <div className="space-y-2">
            {CRITERIOS.map((c) => {
              const marcado = form.desempate.includes(c.valor)
              return (
                <button
                  key={c.valor}
                  type="button"
                  onClick={() =>
                    atualizar(
                      'desempate',
                      marcado
                        ? form.desempate.filter((v) => v !== c.valor)
                        : [...form.desempate, c.valor]
                    )
                  }
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    marcado
                      ? 'border-arena-primary/50 bg-arena-primary/10 text-arena-primary'
                      : 'border-white/10 bg-arena-surface2 text-arena-muted'
                  }`}
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                      marcado ? 'border-arena-primary bg-arena-primary text-black' : 'border-white/20'
                    }`}
                  >
                    {marcado && (
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {c.texto}
                </button>
              )
            })}
          </div>
        </Secao>

        <Secao numero="5" titulo="Regras e status">
          <Alternar
            rotulo="Permitir times repetidos"
            descricao="Dois jogadores podem escolher o mesmo time."
            valor={form.timesRepetidos}
            onChange={(v) => atualizar('timesRepetidos', v)}
          />
          <Alternar
            rotulo="Permitir seleções"
            descricao="Disponibiliza seleções nacionais no sorteio."
            valor={form.selecoes}
            onChange={(v) => atualizar('selecoes', v)}
          />

          <Campo rotulo="Status do torneio">
            <select className="input" value={form.status} onChange={(e) => atualizar('status', e.target.value)}>
              {STATUS.map((s) => (
                <option key={s.valor} value={s.valor} className="bg-arena-surface2">
                  {s.texto}
                </option>
              ))}
            </select>
          </Campo>
        </Secao>

        <Secao
          numero="6"
          titulo="Ligas e times"
          descricao="Ligas habilitadas e times disponíveis para o sorteio."
        >
          {!id ? (
            <p className="text-xs text-arena-muted">
              Salve o torneio antes de escolher ligas e times.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-arena-surface2 px-3 py-2.5">
                <span className="min-w-0 text-sm">
                  <span className="font-display font-bold text-arena-primary">
                    {totalHabilitados}
                  </span>{' '}
                  times habilitados
                  <span className="block text-xs text-arena-muted">
                    {totalLigasHabilitadas}{' '}
                    {totalLigasHabilitadas === 1 ? 'liga selecionada' : 'ligas selecionadas'}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
                  onClick={sincronizarLigas}
                  disabled={sincronizando}
                >
                  {sincronizando ? 'Sincronizando...' : 'Sincronizar API'}
                </button>
              </div>

              {avisoLigas && <p className="text-xs text-arena-danger">{avisoLigas}</p>}

              <div className="flex gap-2">
                <input
                  className="input min-w-0 flex-1"
                  placeholder="Cadastrar liga manual..."
                  value={novaLiga}
                  onChange={(e) => setNovaLiga(e.target.value)}
                />
                <button type="button" className="btn-ghost shrink-0 px-4" onClick={criarLigaManual}>
                  Criar
                </button>
              </div>

              {ligas.length === 0 && (
                <p className="text-xs text-arena-muted">
                  Nenhuma liga cadastrada ainda. Sincronize a API ou cadastre manualmente.
                </p>
              )}

              <div className="space-y-2">
                {ligas.map((liga) => {
                  const habilitada = Boolean(ligasHabilitadas[liga.id])
                  const aberta = expandida === liga.id
                  const qtdHabilitados = Object.keys(habilitados).filter(
                    (timeId) => habilitados[timeId] && timeLiga[timeId] === liga.id,
                  ).length
                  return (
                    <div
                      key={liga.id}
                      className="rounded-xl border border-white/10 bg-arena-surface2"
                    >
                      <div className="flex items-center gap-2 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => alternarLiga(liga)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          {liga.emblema_url ? (
                            <img
                              src={liga.emblema_url}
                              alt=""
                              loading="lazy"
                              className="size-7 shrink-0 rounded bg-white/10 object-contain p-0.5"
                            />
                          ) : (
                            <span className="flex size-7 shrink-0 items-center justify-center rounded bg-white/10 text-[10px] font-bold text-arena-muted">
                              {(liga.pais ?? '?').slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {liga.nome}
                            </span>
                            <span className="block truncate text-xs text-arena-muted">
                              {liga.pais ?? 'País não informado'}
                              {qtdHabilitados > 0 &&
                                ` · ${qtdHabilitados} ${
                                  qtdHabilitados === 1 ? 'time habilitado' : 'times habilitados'
                                }`}
                            </span>
                          </span>
                        </button>
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded border ${
                            habilitada
                              ? 'border-arena-primary bg-arena-primary text-black'
                              : 'border-white/20'
                          }`}
                        >
                          {habilitada && (
                            <svg
                              viewBox="0 0 24 24"
                              className="size-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <button
                          type="button"
                          className="btn-ghost shrink-0 px-2.5 py-1 text-[11px]"
                          onClick={() => expandirLiga(liga)}
                        >
                          {aberta ? 'Fechar' : 'Times'}
                        </button>
                      </div>

                      {aberta && (
                        <div className="space-y-2 border-t border-white/10 px-3 py-3">
                          {carregandoTimes ? (
                            <p className="text-xs text-arena-muted">Carregando times...</p>
                          ) : timesVisiveis.length === 0 ? (
                            <p className="text-xs text-arena-muted">
                              Nenhum time cadastrado nesta liga ainda.
                            </p>
                          ) : (
                            timesVisiveis.map((time) => (
                              <Alternar
                                key={time.id}
                                rotulo={time.nome}
                                descricao={time.sigla ?? (habilitados[time.id] ? 'Habilitado' : 'Desabilitado')}
                                valor={Boolean(habilitados[time.id])}
                                onChange={() => alternarTime(time, liga)}
                              />
                            ))
                          )}

                          <div className="flex gap-2">
                            <input
                              className="input min-w-0 flex-1"
                              placeholder="Novo time manual..."
                              value={novoTime}
                              onChange={(e) => setNovoTime(e.target.value)}
                            />
                            <button
                              type="button"
                              className="btn-ghost shrink-0 px-4"
                              onClick={() => criarTimeManual(liga)}
                            >
                              Criar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Secao>

        {erro && <p className="text-sm text-arena-danger">{erro}</p>}

        <div className="flex gap-3 pb-6">
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="btn-ghost flex-1 text-center"
            disabled={salvando}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex-1 disabled:opacity-60" disabled={salvando}>
            {salvando ? 'Salvando...' : id ? 'Salvar alterações' : 'Criar torneio'}
          </button>
        </div>
      </form>
    </div>
  )
}
