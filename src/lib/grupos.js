// Distribuição de participantes nos grupos — funções puras, sem dependências.
// A ordem usada é a do sorteio (ordem_sorteio), caindo para o nome quando ausente.

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function rotuloGrupo(indice) {
  return indice < LETRAS.length ? LETRAS[indice] : `G${indice + 1}`
}

export function ordenarPorSorteio(participantes) {
  return [...participantes].sort((a, b) => {
    const oa = a.ordem_sorteio ?? Number.MAX_SAFE_INTEGER
    const ob = b.ordem_sorteio ?? Number.MAX_SAFE_INTEGER
    if (oa !== ob) return oa - ob
    const na = a.perfil?.nome ?? a.apelido ?? ''
    const nb = b.perfil?.nome ?? b.apelido ?? ''
    return na.localeCompare(nb, 'pt-BR')
  })
}

// Distribui a lista em `quantidade` grupos em serpentina (snake), seguindo a
// ordem do sorteio, para manter os grupos equilibrados. Devolve [{ id, grupo }].
export function distribuirGrupos(participantes, quantidade) {
  const n = Math.max(1, Math.floor(Number(quantidade)) || 1)
  return ordenarPorSorteio(participantes).map((participante, indice) => {
    const linha = Math.floor(indice / n)
    const posicao = indice % n
    const indiceGrupo = linha % 2 === 0 ? posicao : n - 1 - posicao
    return { id: participante.id, grupo: rotuloGrupo(indiceGrupo) }
  })
}
