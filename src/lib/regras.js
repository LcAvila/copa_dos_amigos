// Regras de torneio inspiradas nos regulamentos oficiais de futebol
// (FIFA / CONMEBOL). Funções puras, sem dependências de UI.

// Fases possíveis no mata-mata conforme o número exato de classificados.
const FASES = {
  16: { fase: 'oitavas', rotulo: 'Oitavas de final' },
  8: { fase: 'quartas', rotulo: 'Quartas de final' },
  4: { fase: 'semi', rotulo: 'Semifinal' },
}

// Presets de Copa (FIFA / CONMEBOL) com chave de mata-mata válida.
export const PRESETS_COPA = [
  {
    rotulo: 'Copa América',
    descricao: '4 grupos × 4 • 8 classificados → quartas',
    gruposQtd: 4,
    jogadoresPorGrupo: 4,
    classificadosPorGrupo: 2,
    melhoresTerceiros: 0,
  },
  {
    rotulo: 'Copa do Mundo',
    descricao: '8 grupos × 4 • 16 classificados → oitavas',
    gruposQtd: 8,
    jogadoresPorGrupo: 4,
    classificadosPorGrupo: 2,
    melhoresTerceiros: 0,
  },
  {
    rotulo: 'Chave curta',
    descricao: '2 grupos × 4 • 4 classificados → semi',
    gruposQtd: 2,
    jogadoresPorGrupo: 4,
    classificadosPorGrupo: 2,
    melhoresTerceiros: 0,
  },
]

export function faseParaClassificados(total) {
  return FASES[total] ?? null
}

export function totalClassificados({ gruposQtd, classificadosPorGrupo, melhoresTerceiros }) {
  return gruposQtd * classificadosPorGrupo + melhoresTerceiros
}

// Analisa o formato escolhido e devolve um resumo com confirmações e avisos.
// `timesDisponiveis` (opcional) é a quantidade de times habilitados no sorteio.
export function analisarFormato(form, timesDisponiveis = null) {
  const resumo = {
    totalTimes: 0,
    classificados: 0,
    fase: null,
    faseRotulo: null,
    confirmacoes: [],
    avisos: [],
    padraoCopa: false,
  }

  if (form.formato === 'grupos_mata_mata') {
    const { gruposQtd, jogadoresPorGrupo, classificadosPorGrupo, melhoresTerceiros } = form
    resumo.totalTimes = gruposQtd * jogadoresPorGrupo
    resumo.classificados = totalClassificados(form)

    if (melhoresTerceiros > 0 && jogadoresPorGrupo < 3) {
      resumo.avisos.push(
        'Melhores terceiros exigem grupos com pelo menos 3 jogadores (senão não existe 3º colocado).',
      )
    }

    const encontrada = faseParaClassificados(resumo.classificados)
    if (encontrada) {
      resumo.fase = encontrada.fase
      resumo.faseRotulo = encontrada.rotulo
      resumo.confirmacoes.push(
        `${resumo.classificados} classificados → ${encontrada.rotulo}. Chave válida para o mata-mata.`,
      )
    } else {
      resumo.avisos.push(
        `O mata-mata precisa de 4, 8 ou 16 classificados. Com ${gruposQtd} grupo(s), ${classificadosPorGrupo} classificados por grupo e +${melhoresTerceiros} melhor(es) terceiro(s), você teria ${resumo.classificados}.`,
      )
    }

    if (
      gruposQtd === 8 &&
      jogadoresPorGrupo === 4 &&
      classificadosPorGrupo === 2 &&
      melhoresTerceiros === 0
    ) {
      resumo.padraoCopa = true
      resumo.confirmacoes.push('Formato padrão de Copa do Mundo (grupos de 4, 2 classificados).')
    }

    if (timesDisponiveis !== null && timesDisponiveis > 0) {
      if (!form.timesRepetidos && resumo.totalTimes > timesDisponiveis) {
        resumo.avisos.push(
          `Sem times repetidos, são necessários ${resumo.totalTimes} times distintos para a fase de grupos, mas só há ${timesDisponiveis} habilitado(s). Habilite mais times ou permita repetidos.`,
        )
      } else if (form.timesRepetidos && jogadoresPorGrupo > timesDisponiveis) {
        resumo.avisos.push(
          `Cada grupo precisa de ${jogadoresPorGrupo} times no sorteio, mas só há ${timesDisponiveis} habilitado(s). Habilite mais times.`,
        )
      } else {
        resumo.confirmacoes.push(
          `Times suficientes para a fase de grupos (${timesDisponiveis} habilitado(s)).`,
        )
      }
    } else if (timesDisponiveis === 0) {
      resumo.avisos.push(
        `Nenhum time habilitado ainda. A fase de grupos precisa de ${resumo.totalTimes} jogadores (times) para começar.`,
      )
    }
  } else if (form.formato === 'mata_mata') {
    resumo.avisos.push(
      'Mata-mata direto: quando as inscrições fecharem, o número de jogadores determinará a chave (4, 8 ou 16 classificados).',
    )
    if (timesDisponiveis !== null && timesDisponiveis === 0) {
      resumo.avisos.push('Nenhum time habilitado ainda para o sorteio.')
    }
  } else {
    resumo.confirmacoes.push(
      'Todos contra todos: sem fases eliminatórias — todos se enfrentam e o campeão é o primeiro colocado.',
    )
  }

  return resumo
}