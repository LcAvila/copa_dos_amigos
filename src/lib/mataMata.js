// Chaveamento do mata-mata — funções puras, sem dependências de UI.
// Mata-mata em jogo único: "rodada" identifica a posição do confronto na fase.

import { calcularClassificacao } from './classificacao.js'

export function classificadosParaMataMata(
  participantes,
  partidas,
  { classificadosPorGrupo = 2, melhoresTerceiros = 0, desempate = ['saldo_gols', 'gols_pro'] } = {},
) {
  const grupos = [...new Set(participantes.map((p) => p.grupo?.trim()).filter(Boolean))].sort()

  const classificados = []
  const terceiros = []
  for (const grupo of grupos) {
    const doGrupo = participantes.filter((p) => p.grupo?.trim() === grupo)
    const linhas = calcularClassificacao(doGrupo, partidas, desempate)
    linhas.forEach((linha, i) => {
      const posicao = i + 1
      if (posicao <= classificadosPorGrupo) {
        classificados.push({ id: linha.id, grupo, posicao })
      } else if (posicao === classificadosPorGrupo + 1) {
        terceiros.push(linha.id)
      }
    })
  }

  if (melhoresTerceiros > 0 && terceiros.length > 0) {
    const detalhes = terceiros.map((id) => participantes.find((p) => p.id === id))
    const ordenados = calcularClassificacao(detalhes, partidas, desempate).slice(0, melhoresTerceiros)
    for (const t of ordenados) classificados.push({ id: t.id, grupo: 'T', posicao: 3 })
  }

  classificados.sort((a, b) => a.posicao - b.posicao || a.grupo.localeCompare(b.grupo))
  return classificados
}

export function montarChaveMataMata(classificados) {
  const n = classificados.length
  if (![4, 8, 16].includes(n)) return null
  const fase = n === 16 ? 'oitavas' : n === 8 ? 'quartas' : 'semi'
  const jogos = []
  for (let i = 0; i < n / 2; i += 1) {
    jogos.push({
      fase,
      rodada: i + 1,
      casa_id: classificados[i].id,
      fora_id: classificados[n - 1 - i].id,
    })
  }
  return jogos
}

export function vencedorDeJogo(jogo) {
  if (!jogo?.finalizada) return undefined
  if (jogo.gols_casa === undefined || jogo.gols_fora === undefined) return undefined
  if (jogo.gols_casa > jogo.gols_fora) return jogo.casa_id
  if (jogo.gols_casa < jogo.gols_fora) return jogo.fora_id
  if (
    jogo.penaltis_casa != null &&
    jogo.penaltis_fora != null &&
    jogo.penaltis_casa !== jogo.penaltis_fora
  ) {
    return jogo.penaltis_casa > jogo.penaltis_fora ? jogo.casa_id : jogo.fora_id
  }
  return undefined
}

export function perdedorDeJogo(jogo) {
  const vencedor = vencedorDeJogo(jogo)
  if (vencedor === undefined || !jogo.casa_id || !jogo.fora_id) return undefined
  return vencedor === jogo.casa_id ? jogo.fora_id : jogo.casa_id
}

export function montarProximaFase(jogosDaFase) {
  const ordenados = [...jogosDaFase].sort((a, b) => (a.rodada ?? 0) - (b.rodada ?? 0))
  const fasePai = ordenados[0]?.fase ?? null

  const proxima = fasePai === 'oitavas' ? 'quartas' : fasePai === 'quartas' ? 'semi' : fasePai === 'semi' ? 'final' : null
  if (!proxima || ordenados.length % 2 !== 0) return null

  const jogos = []
  for (let i = 0; i < ordenados.length / 2; i += 1) {
    const v1 = vencedorDeJogo(ordenados[2 * i])
    const v2 = vencedorDeJogo(ordenados[2 * i + 1])
    if (v1 === undefined || v2 === undefined) return undefined
    jogos.push({ fase: proxima, rodada: i + 1, casa_id: v1, fora_id: v2 })
  }

  if (proxima !== 'final') return { jogos, terceiro: null }

  const s1 = perdedorDeJogo(ordenados[0])
  const s2 = perdedorDeJogo(ordenados[1])
  if (s1 === undefined || s2 === undefined) return undefined
  return {
    jogos,
    terceiro: { fase: 'terceiro', rodada: 1, casa_id: s1, fora_id: s2 },
  }
}