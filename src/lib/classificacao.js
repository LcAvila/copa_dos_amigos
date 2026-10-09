// Classificação da fase de grupos — função pura, sem dependências.
// Considera apenas partidas finalizadas e participantes do mesmo grupo.

const PONTOS_VITORIA = 3
const PONTOS_EMPATE = 1

export function calcularClassificacao(participantes, partidas, criterios = ['saldo_gols', 'gols_pro']) {
  const porId = new Map(participantes.map((p) => [p.id, p]))
  const stats = new Map()
  const h2h = new Map()

  for (const participante of participantes) {
    stats.set(participante.id, {
      id: participante.id,
      pontos: 0,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      golsPro: 0,
      golsContra: 0,
      saldo: 0,
    })
    h2h.set(participante.id, new Map())
  }

  const jogosValidos = partidas.filter(
    (j) =>
      j.fase === 'grupos' &&
      j.finalizada &&
      stats.has(j.casa_id) &&
      stats.has(j.fora_id) &&
      j.casa_id !== j.fora_id,
  )

  for (const j of jogosValidos) {
    const casa = stats.get(j.casa_id)
    const fora = stats.get(j.fora_id)
    const gc = j.gols_casa
    const gf = j.gols_fora

    casa.jogos += 1
    fora.jogos += 1
    casa.golsPro += gc
    casa.golsContra += gf
    fora.golsPro += gf
    fora.golsContra += gc

    if (gc > gf) {
      casa.vitorias += 1
      casa.pontos += PONTOS_VITORIA
      fora.derrotas += 1
    } else if (gc < gf) {
      fora.vitorias += 1
      fora.pontos += PONTOS_VITORIA
      casa.derrotas += 1
    } else {
      casa.empates += 1
      fora.empates += 1
      casa.pontos += PONTOS_EMPATE
      fora.pontos += PONTOS_EMPATE
    }

    for (const [a, b] of [
      [j.casa_id, j.fora_id],
      [j.fora_id, j.casa_id],
    ]) {
      if (!h2h.get(a).has(b)) h2h.get(a).set(b, [])
      h2h.get(a).get(b).push(j)
    }
  }

  for (const s of stats.values()) {
    s.saldo = s.golsPro - s.golsContra
  }

  function compararConfronto(a, b) {
    let pontosA = 0
    let pontosB = 0
    for (const j of h2h.get(a)?.get(b) ?? []) {
      const ga = j.casa_id === a ? j.gols_casa : j.gols_fora
      const gb = j.casa_id === a ? j.gols_fora : j.gols_casa
      if (ga > gb) pontosA += PONTOS_VITORIA
      else if (ga < gb) pontosB += PONTOS_VITORIA
      else {
        pontosA += PONTOS_EMPATE
        pontosB += PONTOS_EMPATE
      }
    }
    return pontosA - pontosB
  }

  function comparar(a, b) {
    if (a.pontos !== b.pontos) return b.pontos - a.pontos

    for (const criterio of criterios) {
      let diferenca = 0
      if (criterio === 'saldo_gols') diferenca = b.saldo - a.saldo
      else if (criterio === 'gols_pro') diferenca = b.golsPro - a.golsPro
      else if (criterio === 'gols_contra') diferenca = a.golsContra - b.golsContra
      else if (criterio === 'vitorias') diferenca = b.vitorias - a.vitorias
      else if (criterio === 'confronto_direto') diferenca = compararConfronto(a.id, b.id)
      if (diferenca !== 0) return diferenca
    }

    const nomeA = porId.get(a.id)?.perfil?.nome ?? ''
    const nomeB = porId.get(b.id)?.perfil?.nome ?? ''
    return nomeA.localeCompare(nomeB, 'pt-BR')
  }

  return [...stats.values()].sort(comparar)
}

// Artilharia do campeonato inteiro (todas as fases). Considera apenas
// partidas finalizadas com participantes conhecidos. Retorna lista
// ordenada [{ participante_id, gols }]. O empate é desempatado
// por nome do perfil (A-Z) para ficar determinístico.
export function calcularArtilheiros(participantes, partidas) {
  const porId = new Map(participantes.map((p) => [p.id, p]))
  const gols = new Map()

  for (const p of participantes) {
    gols.set(p.id, 0)
  }

  for (const j of partidas) {
    if (!j.finalizada) continue
    if (j.casa_id && typeof j.gols_casa === 'number' && gols.has(j.casa_id)) {
      gols.set(j.casa_id, gols.get(j.casa_id) + j.gols_casa)
    }
    if (j.fora_id && typeof j.gols_fora === 'number' && gols.has(j.fora_id)) {
      gols.set(j.fora_id, gols.get(j.fora_id) + j.gols_fora)
    }
  }

  const lista = [...gols.entries()].map(([participante_id, golsContador]) => ({
    participante_id,
    gols: golsContador,
  }))

  lista.sort((a, b) => {
    if (b.gols !== a.gols) return b.gols - a.gols
    const nomeA = porId.get(a.participante_id)?.perfil?.nome ?? ''
    const nomeB = porId.get(b.participante_id)?.perfil?.nome ?? ''
    return nomeA.localeCompare(nomeB, 'pt-BR')
  })

  return lista
}