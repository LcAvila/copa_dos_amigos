// Motor do sorteio da Copa dos Amigos — funções puras (testáveis com node).
// Não depende de Supabase. As escritas no banco ficam nas páginas/admin.

export function embaralhar(itens) {
  const copia = [...itens]
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

// Monta a linha do tempo do sorteio individual.
// Cada participante tem um slot de (tempoPorPerfil + intervalo) segundos.
// No fim do tempoPorPerfil acontece a escolha do time (roleta).
export function montarEtapas(
  participantes,
  ordem, // ordem de ids de participantes (já embaralhada)
  inicioEfetivo, // ISO
  tempoPorPerfil = 5, // segundos
  intervalo = 15, // segundos entre perfis
) {
  const porId = new Map(participantes.map((p) => [p.id, p]))
  const base = new Date(inicioEfetivo).getTime()
  if (Number.isNaN(base)) return []

  const cicloMs = (tempoPorPerfil + intervalo) * 1000

  return ordem.map((participanteId, indice) => {
    const inicio = base + indice * cicloMs
    return {
      indice,
      participanteId,
      participante: porId.get(participanteId),
      inicio,
      escolhaEm: inicio + tempoPorPerfil * 1000,
      fim: inicio + cicloMs,
    }
  })
}

// Retorna o índice da etapa ativa no momento (ou -1 se passou de todas).
export function indiceEtapaAtual(etapas, agora) {
  for (let i = 0; i < etapas.length; i += 1) {
    if (agora < etapas[i].fim) return i
  }
  return -1
}

export function segundosRestantes(emMs, agora) {
  const resto = emMs - agora
  return Math.max(0, Math.ceil(resto / 1000))
}

// Escolhe um time aleatório do pool, evitando repetir os já usados
// (a menos que repetir esteja liberado nas regras).
export function sortearTime(pool, usados, repetir) {
  let candidatos = repetir
    ? pool
    : pool.filter((time) => !usados.includes(time.time_id))
  if (candidatos.length === 0) candidatos = pool
  return candidatos[Math.floor(Math.random() * candidatos.length)]
}