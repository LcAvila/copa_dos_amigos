import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAdmin } from '../hooks/useAdmin'
import CabecalhoAdmin from '../components/CabecalhoAdmin'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import Confete from '../components/Confete'
import { Bola, Medalha } from '../components/Artes'
import { gerarJogos } from '../lib/tabela'
import { distribuirGrupos } from '../lib/grupos'
import { calcularClassificacao } from '../lib/classificacao'
import {
  classificadosParaMataMata,
  montarChaveMataMata,
  montarChaveDireta,
  montarProximaFase,
  vencedorDeJogo,
} from '../lib/mataMata'

const ORDEM_FASES = ['grupos', 'oitavas', 'quartas', 'semi', 'terceiro', 'final']
const FASES_MATA_MATA = ['oitavas', 'quartas', 'semi', 'final', 'terceiro']

const ROTULOS_FASE = {
  grupos: 'Fase de grupos',
  oitavas: 'Oitavas de final',
  quartas: 'Quartas de final',
  semi: 'Semifinal',
  terceiro: 'Disputa de 3º lugar',
  final: 'Final',
}

function mensagemErro(error, padrao) {
  if (error?.code === '42501') return 'Acesso restrito ao administrador. Entre com o login do admin.'
  return padrao
}

function nomeDe(participante) {
  return participante?.perfil?.nome ?? participante?.apelido ?? 'A definir'
}

const COLUNAS_CLASSIFICACAO = ['PTS', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG']

const ROTULO_CRITERIO = {
  saldo_gols: 'Saldo de gols',
  gols_pro: 'Gols marcados',
  gols_contra: 'Menos gols sofridos',
  vitorias: 'Vitórias',
  confronto_direto: 'Confronto direto',
}

function AvatarMini({ url, nome }) {
  if (url) {
    return <img src={url} alt="" className="size-7 shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-[10px] font-bold text-arena-muted">
      {(nome ?? '?').slice(0, 2).toUpperCase()}
    </span>
  )
}

function LinhaClassificacao({ linha, posicao, classificados, medalha }) {
  const participante = linha.participante
  const destaque = posicao <= classificados

  return (
    <div
      className={`flex items-center gap-2 border-l-2 px-3 py-2 transition ${
        destaque ? 'border-l-arena-primary bg-arena-primary/5' : 'border-l-transparent'
      }`}
    >
      {medalha ? (
        <Medalha cor={medalha} className="size-6 shrink-0" />
      ) : (
        <span
          className={`w-5 shrink-0 text-center font-display text-sm font-bold ${
            destaque ? 'text-arena-primary' : 'text-arena-muted'
          }`}
        >
          {posicao}
        </span>
      )}
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <AvatarMini url={participante?.perfil?.avatar_url} nome={participante?.perfil?.nome} />
        <span className="truncate text-sm font-medium">
          {participante?.perfil?.nome ?? participante?.apelido ?? 'Participante'}
        </span>
        {participante?.times?.escudo_url && (
          <img
            src={participante.times.escudo_url}
            alt={participante.times.nome}
            className="size-4 shrink-0 object-contain"
          />
        )}
      </span>
      <span className="w-7 shrink-0 text-center font-display text-sm font-bold text-white">
        {linha.pontos}
      </span>
      {[linha.jogos, linha.vitorias, linha.empates, linha.derrotas, linha.golsPro, linha.golsContra, linha.saldo].map(
        (valor, i) => (
          <span key={COLUNAS_CLASSIFICACAO[i + 1]} className="w-7 shrink-0 text-center text-[11px] tabular-nums text-arena-muted">
            {valor}
          </span>
        ),
      )}
    </div>
  )
}

function agruparPorRodada(jogos) {
  const blocos = []
  for (const partida of jogos) {
    const ultimo = blocos[blocos.length - 1]
    if (ultimo && ultimo.rodada === partida.rodada) {
      ultimo.jogos.push(partida)
    } else {
      blocos.push({ rodada: partida.rodada, jogos: [partida] })
    }
  }
  return blocos
}

function proximaFaseEmAberto(porFase) {
  for (let i = 0; i < FASES_MATA_MATA.length - 1; i += 1) {
    const fasePai = FASES_MATA_MATA[i]
    const jogos = porFase[fasePai] ?? []
    if (jogos.length === 0) continue
    if (!jogos.every((j) => j.finalizada)) return null

    if (fasePai === 'semi') {
      const criar = []
      if ((porFase.final ?? []).length === 0) criar.push('final')
      if ((porFase.terceiro ?? []).length === 0) criar.push('terceiro')
      return criar.length > 0 ? { fasePai, criar } : null
    }

    const proxima = FASES_MATA_MATA[i + 1]
    if ((porFase[proxima] ?? []).length === 0) return { fasePai, criar: [proxima] }
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

function CardJogo({ partida, casa, fora, ehAdmin, aberto, onSelecionar, children }) {
  const nomeCasa = nomeDe(casa)
  const nomeFora = nomeDe(fora)
  const Tag = ehAdmin ? 'button' : 'div'
  const props = ehAdmin ? { type: 'button', onClick: () => onSelecionar(partida) } : {}

  return (
    <div>
      <Tag
        {...props}
        className={`card flex w-full items-center gap-2 !p-3 text-left transition active:scale-[0.98] ${
          aberto ? 'border-arena-primary/60' : ''
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-sm font-medium">{nomeCasa}</span>
          {casa?.times?.escudo_url && (
            <img src={casa.times.escudo_url} alt="" className="size-6 shrink-0 object-contain" />
          )}
          <Avatar url={casa?.perfil?.avatar_url} nome={nomeCasa} />
        </div>

        <div className="shrink-0 text-center">
          {partida.finalizada ? (
            <span className="font-display text-lg font-bold text-arena-primary">
              {partida.gols_casa} - {partida.gols_fora}
            </span>
          ) : (
            <span className="font-display text-xs font-bold text-arena-muted">VS</span>
          )}
          {partida.finalizada && partida.penaltis_casa != null && (
            <span className="block text-[10px] leading-tight text-arena-muted">
              {partida.penaltis_casa} - {partida.penaltis_fora} pên.
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
      </Tag>
      {children}
    </div>
  )
}

export default function Tabela() {
  const { id } = useParams()
  const { ehAdmin } = useAdmin()

  const [carregando, setCarregando] = useState(true)
  const [recarga, setRecarga] = useState(0)
  const [torneio, setTorneio] = useState(null)
  const [participantes, setParticipantes] = useState([])
  const [partidas, setPartidas] = useState([])
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [gerando, setGerando] = useState(false)
  const [confirmandoGerar, setConfirmandoGerar] = useState(false)
  const [gerandoMataMata, setGerandoMataMata] = useState(false)
  const [grupoFiltro, setGrupoFiltro] = useState('*')
  const [editando, setEditando] = useState(null)
  const [formPlacar, setFormPlacar] = useState(null)
  const [erroForm, setErroForm] = useState('')
  const [salvando, setSalvando] = useState(false)

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
      .channel(`tabela:${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partidas', filter: `torneio_id=eq.${id}` },
        () => setRecarga((r) => r + 1),
      )
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

  function recarregar() {
    setRecarga((r) => r + 1)
  }

  async function gerarTabela() {
    if (gerando) return
    if (partidas.length > 0 && !confirmandoGerar) {
      setConfirmandoGerar(true)
      return
    }
    if (participantes.length < 2) {
      setErro('Inscreva ao menos 2 participantes antes de gerar os jogos (faça o sorteio primeiro).')
      return
    }

    setGerando(true)
    setErro('')
    setConfirmandoGerar(false)

    const agora = new Date().toISOString()

    // Mata-mata direto: monta a chave eliminatória com todos os inscritos.
    if (torneio.formato === 'mata_mata') {
      const chave = montarChaveDireta(participantes)
      if (!chave) {
        setGerando(false)
        setErro('O mata-mata direto precisa de exatamente 4, 8 ou 16 participantes inscritos.')
        return
      }

      const { error: erroApagar } = await supabase.from('partidas').delete().eq('torneio_id', id)
      if (erroApagar) {
        setGerando(false)
        setErro(mensagemErro(erroApagar, 'Não foi possível limpar a chave antiga.'))
        return
      }

      const { error } = await supabase
        .from('partidas')
        .insert(chave.map((j) => ({ ...j, torneio_id: id })))
      if (error) {
        setGerando(false)
        setErro(mensagemErro(error, 'Não foi possível gerar a chave do mata-mata.'))
        return
      }

      const config = {
        ...(torneio.config ?? {}),
        tabela: { geradoEm: agora, total: chave.length },
        mataMata: { ...(torneio.config?.mataMata ?? {}), geradoEm: agora, presente: true },
      }
      const statusNovo = ['configuracao', 'inscricoes', 'sorteio'].includes(torneio.status)
        ? 'mata_mata'
        : torneio.status
      const { error: erroStatus } = await supabase
        .from('torneios')
        .update({ config, status: statusNovo })
        .eq('id', id)

      setGerando(false)
      if (erroStatus) {
        setErro(mensagemErro(erroStatus, 'A chave foi gerada, mas o status não foi atualizado.'))
      } else {
        setAviso(`Chave gerada: ${chave.length} confrontos.`)
      }
      recarregar()
      return
    }

    // Grupos + mata-mata: distribui os inscritos nos grupos automaticamente.
    let participantesParaJogos = participantes
    if (torneio.formato === 'grupos_mata_mata') {
      const quantidade = torneio.config?.grupos?.quantidade ?? 4
      const distribuicao = distribuirGrupos(participantes, quantidade)
      const porId = new Map(distribuicao.map((d) => [d.id, d.grupo]))
      participantesParaJogos = participantes.map((p) => ({ ...p, grupo: porId.get(p.id) ?? p.grupo }))

      const resultados = await Promise.all(
        distribuicao.map((d) =>
          supabase.from('participantes').update({ grupo: d.grupo }).eq('id', d.id),
        ),
      )
      const erroGrupo = resultados.find((r) => r.error)?.error
      if (erroGrupo) {
        setGerando(false)
        setErro(mensagemErro(erroGrupo, 'Não foi possível distribuir os grupos.'))
        return
      }
    } else {
      // Todos contra todos: sem grupos, todos entram no grupo "Geral".
      participantesParaJogos = participantes.map((p) => ({ ...p, grupo: null }))
      if (participantes.some((p) => p.grupo)) {
        await supabase.from('participantes').update({ grupo: null }).eq('torneio_id', id)
      }
    }

    const idaEVolta = Boolean(torneio.config?.grupos?.idaEVolta)
    const jogos = gerarJogos(participantesParaJogos, { idaEVolta }).map((j) => ({
      ...j,
      torneio_id: id,
    }))
    if (jogos.length === 0) {
      setGerando(false)
      setErro('Cada grupo precisa de ao menos 2 participantes para gerar jogos.')
      return
    }

    const { error: erroApagar } = await supabase
      .from('partidas')
      .delete()
      .eq('torneio_id', id)
      .eq('fase', 'grupos')
    if (erroApagar) {
      setGerando(false)
      setErro(mensagemErro(erroApagar, 'Não foi possível limpar a tabela antiga.'))
      return
    }

    const { error } = await supabase.from('partidas').insert(jogos)
    if (error) {
      setGerando(false)
      setErro(mensagemErro(error, 'Não foi possível gerar a tabela de jogos.'))
      return
    }

    const config = {
      ...(torneio.config ?? {}),
      tabela: { geradoEm: agora, total: jogos.length, idaEVolta },
    }
    const statusNovo = ['configuracao', 'inscricoes', 'sorteio'].includes(torneio.status)
      ? 'grupos'
      : torneio.status
    const { error: erroStatus } = await supabase
      .from('torneios')
      .update({ config, status: statusNovo })
      .eq('id', id)

    setGerando(false)
    if (erroStatus) {
      setErro(mensagemErro(erroStatus, 'A tabela foi gerada, mas o status do torneio não foi atualizado.'))
    } else {
      setAviso(`Tabela gerada: ${jogos.length} jogos.`)
    }
    recarregar()
  }

  async function garantirCampeao() {
    const [torneioAtual, partidasAtuais] = await Promise.all([
      supabase.from('torneios').select('*').eq('id', id).single(),
      supabase.from('partidas').select('*').eq('torneio_id', id),
    ])
    await registrarCampeao(torneioAtual.data, partidasAtuais.data ?? [])
  }

  async function registrarCampeao(torneioAtual, partidasAtuais) {
    try {
      if (!torneioAtual || torneioAtual.status === 'finalizado' || torneioAtual.config?.campeao) {
        return
      }

      let vencedor
      if (torneioAtual.formato === 'todos_contra_todos') {
        // Sem mata-mata: o campeão é o líder da classificação geral.
        const jogos = (partidasAtuais ?? []).filter((p) => p.fase === 'grupos')
        if (jogos.length === 0 || !jogos.every((p) => p.finalizada)) return
        const linhas = calcularClassificacao(
          participantes,
          partidasAtuais ?? [],
          torneioAtual.config?.desempate ?? ['saldo_gols', 'gols_pro'],
        )
        vencedor = linhas[0]?.id
      } else {
        const finais = (partidasAtuais ?? []).filter((p) => p.fase === 'final' && p.finalizada)
        if (finais.length !== 1) return
        vencedor = vencedorDeJogo(finais[0])
      }

      if (vencedor === undefined || vencedor === null) return

      const config = {
        ...(torneioAtual.config ?? {}),
        campeao: { participante_id: vencedor, geradoEm: new Date().toISOString() },
      }
      const { error } = await supabase
        .from('torneios')
        .update({ config, status: 'finalizado' })
        .eq('id', id)
      if (!error) {
        setAviso('Campeonato finalizado! Campeão definido.')
        setRecarga((r) => r + 1)
      }
    } catch {
      // segue a vida: o próximo carregamento tenta de novo
    }
  }

  async function gerarMataMata() {
    if (gerandoMataMata) return
    const cfg = torneio.config ?? {}
    const classificados = classificadosParaMataMata(participantes, partidas, {
      classificadosPorGrupo: cfg.grupos?.classificadosPorGrupo ?? 2,
      melhoresTerceiros: cfg.grupos?.melhoresTerceiros ?? 0,
      desempate: cfg.desempate ?? ['saldo_gols', 'gols_pro'],
    })
    const chave = montarChaveMataMata(classificados)
    if (!chave) {
      setErro(
        'O mata-mata precisa de 4, 8 ou 16 classificados. Ajuste a quantidade de grupos/classificados na configuração.',
      )
      return
    }

    setGerandoMataMata(true)
    setErro('')
    const { error } = await supabase
      .from('partidas')
      .insert(chave.map((j) => ({ ...j, torneio_id: id })))
    if (error) {
      setGerandoMataMata(false)
      setErro(mensagemErro(error, 'Não foi possível gerar o mata-mata.'))
      return
    }

    const config = {
      ...cfg,
      mataMata: { ...(cfg.mataMata ?? {}), geradoEm: new Date().toISOString(), presente: true },
    }
    const statusNovo = ['configuracao', 'inscricoes', 'sorteio', 'grupos'].includes(torneio.status)
      ? 'mata_mata'
      : torneio.status
    const { error: erroStatus } = await supabase
      .from('torneios')
      .update({ config, status: statusNovo })
      .eq('id', id)

    setGerandoMataMata(false)
    if (erroStatus) {
      setErro(mensagemErro(erroStatus, 'O mata-mata foi gerado, mas o status não foi atualizado.'))
    } else {
      setAviso(`Mata-mata gerado: ${chave.length} confrontos.`)
    }
    recarregar()
  }

  async function avancarFase() {
    if (gerandoMataMata) return
    const porFase = Object.fromEntries(
      FASES_MATA_MATA.map((fase) => [fase, partidas.filter((p) => p.fase === fase)]),
    )
    const alvo = proximaFaseEmAberto(porFase)
    if (!alvo || alvo.criar.length === 0) return

    const resultado = montarProximaFase(porFase[alvo.fasePai])
    if (!resultado) {
      setErro('Não foi possível montar a próxima fase. Verifique os placares e pênaltis das partidas.')
      return
    }

    const linhas = [...resultado.jogos]
    if (
      resultado.terceiro &&
      alvo.criar.includes('terceiro') &&
      (porFase.terceiro ?? []).length === 0
    ) {
      linhas.push(resultado.terceiro)
    }

    setGerandoMataMata(true)
    setErro('')
    const { error } = await supabase.from('partidas').insert(linhas.map((l) => ({ ...l, torneio_id: id })))
    setGerandoMataMata(false)
    if (error) {
      setErro(mensagemErro(error, 'Não foi possível gerar a próxima fase.'))
      return
    }
    setAviso(`Próxima fase gerada.`)
    recarregar()
  }

  function selecionar(partida) {
    if (editando === partida.id) {
      setEditando(null)
      setFormPlacar(null)
      return
    }
    setFormPlacar({
      golsCasa: partida.gols_casa ?? '',
      golsFora: partida.gols_fora ?? '',
      usaPenaltis: partida.penaltis_casa != null,
      penCasa: partida.penaltis_casa ?? '',
      penFora: partida.penaltis_fora ?? '',
    })
    setErroForm('')
    setEditando(partida.id)
  }

  async function salvarPlacar(e) {
    e.preventDefault()
    const vazio = formPlacar.golsCasa === '' || formPlacar.golsFora === ''
    const golsCasa = Number(formPlacar.golsCasa)
    const golsFora = Number(formPlacar.golsFora)
    if (vazio || golsCasa < 0 || golsFora < 0) {
      setErroForm('Informe o placar dos dois lados.')
      return
    }

    let penaltis = { penaltis_casa: null, penaltis_fora: null }
    if (formPlacar.usaPenaltis) {
      if (golsCasa !== golsFora) {
        setErroForm('Pênaltis só acontecem em caso de empate.')
        return
      }
      const vazioPen = formPlacar.penCasa === '' || formPlacar.penFora === ''
      const penCasa = Number(formPlacar.penCasa)
      const penFora = Number(formPlacar.penFora)
      if (vazioPen || penCasa === penFora) {
        setErroForm('Os pênaltis precisam de um vencedor.')
        return
      }
      penaltis = { penaltis_casa: penCasa, penaltis_fora: penFora }
    }

    setSalvando(true)
    setErroForm('')
    const { error } = await supabase
      .from('partidas')
      .update({ gols_casa: golsCasa, gols_fora: golsFora, ...penaltis, finalizada: true })
      .eq('id', editando)
    setSalvando(false)

    if (error) {
      setErroForm(mensagemErro(error, 'Não foi possível salvar o resultado.'))
      return
    }
    setEditando(null)
    setFormPlacar(null)
    setAviso('Resultado salvo!')
    garantirCampeao()
  }

  async function limparResultado() {
    setSalvando(true)
    setErroForm('')
    const { error } = await supabase
      .from('partidas')
      .update({
        gols_casa: null,
        gols_fora: null,
        penaltis_casa: null,
        penaltis_fora: null,
        finalizada: false,
      })
      .eq('id', editando)
    setSalvando(false)

    if (error) {
      setErroForm(mensagemErro(error, 'Não foi possível limpar o resultado.'))
      return
    }
    setEditando(null)
    setFormPlacar(null)
    setAviso('Resultado limpo.')
    garantirCampeao()
  }

  if (carregando) return <Loading texto="Carregando tabela..." />

  if (!torneio) {
    return (
      <div>
        <CabecalhoAdmin titulo="Tabela de jogos" />
        <p className="mt-6 text-sm text-arena-danger">{erro || 'Torneio não encontrado.'}</p>
      </div>
    )
  }

  const mapa = Object.fromEntries(participantes.map((p) => [p.id, p]))
  const total = partidas.length
  const finalizadas = partidas.filter((p) => p.finalizada).length
  const faseGrupos = partidas.filter((p) => p.fase === 'grupos')
  const mataMata = partidas.filter((p) => p.fase !== 'grupos')
  const grupos = [...new Set(faseGrupos.map((p) => p.grupo ?? 'Geral'))].sort()
  const cfgGrupos = torneio.config?.grupos
  const formato = torneio.formato
  const ehMataDireto = formato === 'mata_mata'
  const ehTodosContraTodos = formato === 'todos_contra_todos'
  const gruposTodosFinalizados =
    faseGrupos.length > 0 && faseGrupos.every((p) => p.finalizada)

  const porFaseMM = Object.fromEntries(
    FASES_MATA_MATA.map((fase) => [fase, mataMata.filter((p) => p.fase === fase)]),
  )
  const podeAvancar = proximaFaseEmAberto(porFaseMM)

  const grupoAtivo = grupos.includes(grupoFiltro) ? grupoFiltro : '*'
  const filtradas = faseGrupos
    .filter((p) => grupoAtivo === '*' || (p.grupo ?? 'Geral') === grupoAtivo)
    .sort((a, b) => (a.rodada ?? 0) - (b.rodada ?? 0))

  const rodadas = agruparPorRodada(filtradas)

  const porFase = ORDEM_FASES.filter(
    (fase) => fase !== 'grupos' && mataMata.some((p) => p.fase === fase),
  ).map((fase) => ({ fase, confrontos: agruparPorRodada(mataMata.filter((p) => p.fase === fase)) }))

  const classificacaoGeral = torneio.formato === 'todos_contra_todos'
  const criterios = torneio.config?.desempate ?? ['saldo_gols', 'gols_pro']
  const classificadosPorGrupo = cfgGrupos?.classificadosPorGrupo ?? 2
  const gruposParticipantes = [
    ...new Set(participantes.map((p) => p.grupo?.trim()).filter(Boolean)),
  ].sort()

  function linhasClassificacao(lista) {
    return calcularClassificacao(lista, partidas, criterios).map((linha) => ({
      ...linha,
      participante: lista.find((p) => p.id === linha.id),
    }))
  }

  const blocosClassificacao =
    participantes.length === 0 || faseGrupos.length === 0
      ? []
      : classificacaoGeral
        ? [{ titulo: null, linhas: linhasClassificacao(participantes), classificados: 1 }]
        : gruposParticipantes.map((grupo) => ({
            titulo: `Grupo ${grupo}`,
            linhas: linhasClassificacao(participantes.filter((p) => p.grupo?.trim() === grupo)),
            classificados: classificadosPorGrupo,
          }))

  function botaoPartida(partida) {
    return (
      <CardJogo
        key={partida.id}
        partida={partida}
        casa={mapa[partida.casa_id]}
        fora={mapa[partida.fora_id]}
        ehAdmin={ehAdmin}
        aberto={editando === partida.id}
        onSelecionar={selecionar}
      >
        {ehAdmin && editando === partida.id && formPlacar && (
          <form onSubmit={salvarPlacar} className="card mt-2 space-y-3 border-arena-primary/50 !p-4">
            <p className="etiqueta">• Lançar placar</p>

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div className="min-w-0">
                <p className="truncate text-right text-xs text-arena-muted">{nomeDe(mapa[partida.casa_id])}</p>
                <input
                  className="input mt-1.5 text-center font-display text-xl"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={formPlacar.golsCasa}
                  onChange={(e) => setFormPlacar((f) => ({ ...f, golsCasa: e.target.value }))}
                  autoFocus
                />
              </div>
              <span className="pb-3 font-display text-xs font-bold text-arena-muted">VS</span>
              <div className="min-w-0">
                <p className="truncate text-xs text-arena-muted">{nomeDe(mapa[partida.fora_id])}</p>
                <input
                  className="input mt-1.5 text-center font-display text-xl"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  value={formPlacar.golsFora}
                  onChange={(e) => setFormPlacar((f) => ({ ...f, golsFora: e.target.value }))}
                />
              </div>
            </div>

            {partida.fase !== 'grupos' && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-arena-primary"
                  checked={formPlacar.usaPenaltis}
                  onChange={(e) => setFormPlacar((f) => ({ ...f, usaPenaltis: e.target.checked }))}
                />
                Decisão por pênaltis
              </label>
            )}

            {formPlacar.usaPenaltis && partida.fase !== 'grupos' && (
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <input
                  className="input text-center font-display text-lg"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  placeholder="Pên."
                  value={formPlacar.penCasa}
                  onChange={(e) => setFormPlacar((f) => ({ ...f, penCasa: e.target.value }))}
                />
                <span className="pb-3 font-display text-xs font-bold text-arena-muted">PÊN</span>
                <input
                  className="input text-center font-display text-lg"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  placeholder="Pên."
                  value={formPlacar.penFora}
                  onChange={(e) => setFormPlacar((f) => ({ ...f, penFora: e.target.value }))}
                />
              </div>
            )}

            {erroForm && <p className="text-sm text-arena-danger">{erroForm}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditando(null)
                  setFormPlacar(null)
                }}
                className="btn-ghost flex-1"
                disabled={salvando}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary flex-1 disabled:opacity-60" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Finalizar'}
              </button>
            </div>

            {partida.finalizada && (
              <button
                type="button"
                onClick={limparResultado}
                className="w-full text-center text-xs text-arena-danger active:opacity-70"
                disabled={salvando}
              >
                Limpar resultado
              </button>
            )}
          </form>
        )}
      </CardJogo>
    )
  }

  return (
    <div>
      <CabecalhoAdmin
        titulo="Tabela de jogos"
        subtitulo={`${torneio.nome} • ${total} ${total === 1 ? 'jogo' : 'jogos'}`}
        acao={<StatusBadge status={torneio.status} />}
      />

      <div className="entrar mt-6 space-y-3">
        <div className="flex items-center justify-end gap-3">
          <Link
            to={`/torneio/${id}/resumo`}
            className="text-[11px] font-bold uppercase tracking-wider text-arena-secondary active:opacity-70"
          >
            Resumo do torneio →
          </Link>
        </div>

        {aviso && <div className="card border-arena-primary/40 text-sm text-arena-primary">{aviso}</div>}
        {erro && <div className="card border-arena-danger/40 text-sm text-arena-danger">{erro}</div>}

        {blocosClassificacao.length > 0 && (
          <section className="card overflow-hidden !p-0">
            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
              <p className="flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-primary">
                <Bola className="size-3.5" />
                {classificacaoGeral ? 'Classificação geral' : 'Classificação por grupos'}
              </p>
              <span className="text-[10px] font-bold uppercase tracking-wider text-arena-muted">
                {finalizadas}/{total} jogos
              </span>
            </div>

            <div className="flex items-center gap-2 px-3 pb-1.5">
              <span className="flex min-w-0 flex-1 items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
                Jogador
              </span>
              <span className="w-7 shrink-0 text-center text-[10px] font-bold text-arena-muted">PTS</span>
              {COLUNAS_CLASSIFICACAO.slice(1).map((coluna) => (
                <span key={coluna} className="w-7 shrink-0 text-center text-[10px] font-bold text-arena-muted">
                  {coluna}
                </span>
              ))}
            </div>

            {blocosClassificacao.map((bloco) => (
              <div key={bloco.titulo ?? '*'} className="border-t border-white/5">
                {bloco.titulo && (
                  <p className="px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-secondary">
                    {bloco.titulo}
                  </p>
                )}
                <div className="divide-y divide-white/5">
                  {bloco.linhas.map((linha, i) => (
                    <LinhaClassificacao
                      key={linha.id}
                      linha={linha}
                      posicao={i + 1}
                      classificados={bloco.classificados}
                      medalha={i === 0 ? 'ouro' : i === 1 ? 'prata' : i === 2 ? 'bronze' : null}
                    />
                  ))}
                </div>
              </div>
            ))}

            <p className="border-t border-white/5 px-3 py-2 text-[11px] text-arena-muted">
              Critérios de desempate:{' '}
              {criterios.map((criterio) => ROTULO_CRITERIO[criterio] ?? criterio).join(' • ') || 'nenhum'}
            </p>
          </section>
        )}

        {total === 0 && ehAdmin && (
          <section className="card space-y-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-arena-primary">
                Gerar jogos
              </p>
              <h2 className="font-display text-lg font-bold leading-tight">
                {ehMataDireto ? 'Gerar chave do mata-mata' : 'Gerar tabela de jogos'}
              </h2>
              <p className="mt-0.5 text-xs text-arena-muted">
                {ehMataDireto
                  ? 'Chave eliminatória direta com 4, 8 ou 16 participantes, semeados pela ordem do sorteio.'
                  : ehTodosContraTodos
                    ? `Todos se enfrentam em ${torneio.config?.grupos?.idaEVolta ? 'ida e volta' : 'turno único'}.`
                    : cfgGrupos
                      ? `${cfgGrupos.quantidade} ${cfgGrupos.quantidade === 1 ? 'grupo' : 'grupos'} de ${
                          cfgGrupos.jogadoresPorGrupo
                        } • ${cfgGrupos.idaEVolta ? 'ida e volta' : 'turno único'}`
                      : 'Round-robin dentro de cada grupo.'}
              </p>
            </div>

            <button
              type="button"
              className="btn-primary w-full disabled:opacity-60"
              onClick={gerarTabela}
              disabled={gerando}
            >
              {gerando ? 'Gerando...' : ehMataDireto ? 'Gerar chave' : 'Gerar tabela de jogos'}
            </button>
          </section>
        )}

        {participantes.length === 0 && (
          <div className="card text-center">
            <p className="font-display text-lg font-bold">Nenhum participante</p>
            <p className="mt-1 text-sm text-arena-muted">
              Inscreva os jogadores e faça o sorteio antes de gerar os jogos.
            </p>
            <Link to={`/torneio/${id}/sorteio`} className="btn-ghost mt-4 inline-block">
              Ir para o sorteio
            </Link>
          </div>
        )}

        {participantes.length > 0 && total === 0 && !ehAdmin && (
          <div className="card text-center">
            <p className="font-display text-lg font-bold">Tabela ainda não gerada</p>
            <p className="mt-1 text-sm text-arena-muted">
              Aguarde o administrador gerar os jogos. Esta tela atualiza sozinha em tempo real.
            </p>
          </div>
        )}

        {total > 0 && (
          <section className="card space-y-3">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-arena-primary">
                <Bola className="size-3.5 animate-[girarBola_4s_linear_infinite]" />
                Jogos
              </p>
              <h2 className="font-display text-lg font-bold leading-tight">Resultados</h2>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-arena-muted">Progresso</span>
                <span className="font-display font-bold">
                  {finalizadas}/{total} jogos finalizados
                </span>
              </div>
              <div className="flex gap-0.5">
                {partidas.map((partida) => (
                  <span
                    key={partida.id}
                    className={`h-1.5 flex-1 transition-colors duration-300 ${partida.finalizada ? 'bg-arena-primary' : 'bg-white/10'}`}
                  />
                ))}
              </div>
            </div>

            {grupos.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {['*', ...grupos].map((grupo) => (
                  <button
                    key={grupo}
                    type="button"
                    onClick={() => setGrupoFiltro(grupo)}
                    className={`recorte px-3 py-1.5 font-display text-xs font-bold uppercase tracking-wider transition ${
                      grupoAtivo === grupo
                        ? 'bg-arena-primary text-black'
                        : 'bg-white/5 text-arena-muted'
                    }`}
                  >
                    {grupo === '*' ? 'Todos' : grupo === 'Geral' ? 'Geral' : `Grupo ${grupo}`}
                  </button>
                ))}
              </div>
            )}

            {rodadas.map((bloco) => (
              <div key={bloco.rodada} className="space-y-2">
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
                  {ROTULOS_FASE.grupos} • Rodada {bloco.rodada}
                </p>
                {bloco.jogos.map(botaoPartida)}
              </div>
            ))}

            {faseGrupos.length > 0 && filtradas.length === 0 && (
              <p className="text-sm text-arena-muted">Nenhum jogo neste grupo.</p>
            )}

            {porFase.map((bloco) => (
              <div key={bloco.fase} className="space-y-2">
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-secondary">
                  {ROTULOS_FASE[bloco.fase]}
                </p>
                {bloco.confrontos.map((confronto) => (
                  <div key={`${bloco.fase}-${confronto.rodada}`} className="space-y-2">
                    {bloco.fase === 'grupos' ? null : (
                      <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
                        Confronto {confronto.rodada}
                      </p>
                    )}
                    {confronto.jogos.map(botaoPartida)}
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}

        {!ehTodosContraTodos && (
          <section className="card relative space-y-3 overflow-hidden">
            {torneio.status === 'finalizado' && <Confete />}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-arena-primary">
                Mata-mata
              </p>
              <h2 className="font-display text-lg font-bold leading-tight">Chaveamento</h2>
              <p className="mt-0.5 text-xs text-arena-muted">
                {mataMata.length > 0
                  ? `${mataMata.length} ${mataMata.length === 1 ? 'partida' : 'partidas'} • jogos únicos • o vencedor avança`
                  : ehMataDireto
                    ? 'A chave é gerada a partir dos participantes inscritos.'
                    : 'Gerado automaticamente a partir dos classificados da fase de grupos.'}
              </p>
            </div>

            {ehAdmin ? (
              <div className="flex flex-col gap-2">
                {mataMata.length === 0 ? (
                  ehMataDireto ? (
                    <p className="text-xs text-arena-muted">
                      Use "Gerar chave" acima para criar os primeiros confrontos.
                    </p>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-primary w-full disabled:opacity-60"
                        onClick={gerarMataMata}
                        disabled={gerandoMataMata || !gruposTodosFinalizados}
                      >
                        {gerandoMataMata ? 'Gerando...' : 'Gerar mata-mata'}
                      </button>
                      {!gruposTodosFinalizados && (
                        <p className="text-xs text-arena-muted">
                          Finalize todos os jogos da fase de grupos para liberar o mata-mata.
                        </p>
                      )}
                    </>
                  )
                ) : podeAvancar ? (
                  <button
                    type="button"
                    className="btn-primary w-full disabled:opacity-60"
                    onClick={avancarFase}
                    disabled={gerandoMataMata}
                  >
                    {gerandoMataMata
                      ? 'Gerando...'
                      : `Gerar próxima fase (${podeAvancar.criar
                          .map((f) => ROTULOS_FASE[f])
                          .join(' + ')})`}
                  </button>
                ) : (
                  <p className="text-xs text-arena-muted">
                    Aguardando os placares das fases anteriores para avançar.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-arena-muted">
                O administrador controla o mata-mata. Esta tela atualiza em tempo real.
              </p>
            )}
          </section>
        )}

        {total > 0 && ehAdmin && (
          <div className="mt-4">
            {confirmandoGerar ? (
              <div className="card space-y-2 border-arena-danger/40 text-center">
                <p className="text-xs text-arena-danger">
                  Regenerar a tabela apaga todos os placares lançados.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost flex-1"
                    onClick={() => setConfirmandoGerar(false)}
                    disabled={gerando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary flex-1 disabled:opacity-60"
                    onClick={gerarTabela}
                    disabled={gerando}
                  >
                    {gerando ? 'Gerando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmandoGerar(true)}
                className="block w-full text-center text-[11px] font-bold uppercase tracking-wider text-arena-muted active:opacity-70"
              >
                Regenerar tabela de jogos
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
