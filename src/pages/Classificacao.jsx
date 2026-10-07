import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import CabecalhoAdmin from '../components/CabecalhoAdmin'
import Loading from '../components/Loading'
import StatusBadge from '../components/StatusBadge'
import { Medalha } from '../components/Artes'
import { calcularClassificacao } from '../lib/classificacao'

const ROTULO_CRITERIO = {
  saldo_gols: 'Saldo de gols',
  gols_pro: 'Gols marcados',
  gols_contra: 'Menos gols sofridos',
  vitorias: 'Vitórias',
  confronto_direto: 'Confronto direto',
}

const COLUNAS = ['PTS', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG']

function Avatar({ url, nome }) {
  if (url) {
    return <img src={url} alt="" className="size-7 shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-[10px] font-bold text-arena-muted">
      {(nome ?? '?').slice(0, 2).toUpperCase()}
    </span>
  )
}

function TabelaLinha({ linha, posicao, classificados, medalha }) {
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
        <Avatar url={participante?.perfil?.avatar_url} nome={participante?.perfil?.nome} />
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
          <span key={COLUNAS[i + 1]} className="w-7 shrink-0 text-center text-[11px] tabular-nums text-arena-muted">
            {valor}
          </span>
        ),
      )}
    </div>
  )
}

export default function Classificacao() {
  const { id } = useParams()

  const [carregando, setCarregando] = useState(true)
  const [recarga, setRecarga] = useState(0)
  const [torneio, setTorneio] = useState(null)
  const [participantes, setParticipantes] = useState([])
  const [partidas, setPartidas] = useState([])
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!id) return undefined

    let ativo = true
    Promise.all([
      supabase.from('torneios').select('*').eq('id', id).single(),
      supabase
        .from('participantes')
        .select('*, perfil:perfis(id, nome, avatar_url), times(id, nome, sigla, escudo_url)')
        .eq('torneio_id', id)
        .order('nome', { ascending: true }),
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
      .channel(`classificacao:${id}`)
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
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [id])

  if (carregando) return <Loading texto="Carregando classificação..." />

  if (!torneio) {
    return (
      <div>
        <CabecalhoAdmin titulo="Classificação" />
        <p className="mt-6 text-sm text-arena-danger">{erro || 'Torneio não encontrado.'}</p>
      </div>
    )
  }

  const criterios = torneio.config?.desempate ?? ['saldo_gols', 'gols_pro']
  const classificadosPorGrupo = torneio.config?.grupos?.classificadosPorGrupo ?? 2
  const finalizadas = partidas.filter((p) => p.fase === 'grupos' && p.finalizada).length
  const grupos = [...new Set(participantes.map((p) => p.grupo?.trim()).filter(Boolean))].sort()

  return (
    <div>
      <CabecalhoAdmin
        titulo="Classificação"
        subtitulo={`${torneio.nome} • fase de grupos`}
        acao={<StatusBadge status={torneio.status} />}
      />

      <div className="entrar mt-6 space-y-4">
        {erro && <div className="card border-arena-danger/40 text-sm text-arena-danger">{erro}</div>}

        {participantes.length === 0 && (
          <div className="card text-center">
            <p className="font-display text-lg font-bold">Nenhum participante</p>
            <p className="mt-1 text-sm text-arena-muted">
              Inscreva os jogadores e faça o sorteio para começar.
            </p>
            <Link to={`/torneio/${id}/sorteio`} className="btn-ghost mt-4 inline-block">
              Ir para o sorteio
            </Link>
          </div>
        )}

        {participantes.length > 0 && finalizadas === 0 && (
          <div className="card text-center">
            <p className="font-display text-lg font-bold">Nenhum resultado ainda</p>
            <p className="mt-1 text-sm text-arena-muted">
              A classificação aparece depois de lançados os placares na tabela de jogos.
            </p>
            <Link to={`/torneio/${id}/tabela`} className="btn-ghost mt-4 inline-block">
              Ver tabela de jogos
            </Link>
          </div>
        )}

        {finalizadas > 0 && (
          <div className="card overflow-hidden !p-0">
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <span className="flex min-w-0 flex-1 items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
                Jogador
              </span>
              <span className="w-7 shrink-0 text-center text-[10px] font-bold text-arena-muted">PTS</span>
              {COLUNAS.slice(1).map((coluna) => (
                <span key={coluna} className="w-7 shrink-0 text-center text-[10px] font-bold text-arena-muted">
                  {coluna}
                </span>
              ))}
            </div>

            {grupos.map((grupo) => {
              const doGrupo = participantes.filter((p) => p.grupo?.trim() === grupo)
              const linhas = calcularClassificacao(doGrupo, partidas, criterios).map((linha) => ({
                ...linha,
                participante: doGrupo.find((p) => p.id === linha.id),
              }))
              const temJogos = linhas.some((l) => l.jogos > 0)

              return (
                <div key={grupo} className="border-t border-white/5">
                  <p className="px-3 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-arena-secondary">
                    Grupo {grupo}
                  </p>
                  {temJogos ? (
                    <div className="divide-y divide-white/5">
                      {linhas.map((linha, i) => (
                        <TabelaLinha
                          key={linha.id}
                          linha={linha}
                          posicao={i + 1}
                          classificados={classificadosPorGrupo}
                          medalha={i === 0 ? 'ouro' : i === 1 ? 'prata' : i === 2 ? 'bronze' : null}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="px-3 py-2 text-xs text-arena-muted">
                      Este grupo ainda não tem jogos finalizados.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {finalizadas > 0 && (
          <p className="text-[11px] text-arena-muted">
            Critérios de desempate:{' '}
            {criterios
              .map((criterio) => ROTULO_CRITERIO[criterio] ?? criterio)
              .join(' • ') || 'nenhum'}
          </p>
        )}
      </div>
    </div>
  )
}