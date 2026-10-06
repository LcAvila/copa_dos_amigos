// Geração da tabela de jogos (round-robin "circle method") por grupo.
// Funções puras, sem dependências — testáveis com node.

function turnosRoundRobin(jogadores, idaEVolta) {
  const lista = [...jogadores]
  if (lista.length % 2 === 1) lista.push(null) // grupo ímpar: alguém descansa

  const n = lista.length
  const turnos = []
  for (let r = 0; r < n - 1; r += 1) {
    const pares = []
    for (let i = 0; i < n / 2; i += 1) {
      const a = lista[i]
      const b = lista[n - 1 - i]
      if (a !== null && b !== null) pares.push([a, b])
    }
    turnos.push(pares)
    lista.splice(1, 0, lista.pop()) // fixa o primeiro e rotaciona o restante
  }

  const rodadas = turnos.map((pares, i) => ({ rodada: i + 1, pares }))
  if (!idaEVolta) return rodadas

  return [
    ...rodadas,
    ...turnos.map((pares, i) => ({
      rodada: turnos.length + i + 1,
      pares: pares.map(([a, b]) => [b, a]),
    })),
  ]
}

export function gerarJogos(participantes, { idaEVolta = false } = {}) {
  const porGrupo = new Map()
  for (const participante of participantes) {
    const grupo = participante.grupo?.trim() || 'Geral'
    if (!porGrupo.has(grupo)) porGrupo.set(grupo, [])
    porGrupo.get(grupo).push(participante.id)
  }

  const jogos = []
  for (const grupo of [...porGrupo.keys()].sort()) {
    const ids = porGrupo.get(grupo)
    if (ids.length < 2) continue
    for (const rodada of turnosRoundRobin(ids, idaEVolta)) {
      for (const [casa, fora] of rodada.pares) {
        jogos.push({ fase: 'grupos', grupo, rodada: rodada.rodada, casa_id: casa, fora_id: fora })
      }
    }
  }
  return jogos
}
