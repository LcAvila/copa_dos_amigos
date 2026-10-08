import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PRESETS_COPA,
  faseParaClassificados,
  totalClassificados,
  analisarFormato,
} from '../src/lib/regras.js'

test('faseParaClassificados mapeia 4, 8 e 16', () => {
  assert.deepEqual(faseParaClassificados(16), { fase: 'oitavas', rotulo: 'Oitavas de final' })
  assert.deepEqual(faseParaClassificados(8), { fase: 'quartas', rotulo: 'Quartas de final' })
  assert.deepEqual(faseParaClassificados(4), { fase: 'semi', rotulo: 'Semifinal' })
  assert.equal(faseParaClassificados(6), null)
  assert.equal(faseParaClassificados(12), null)
  assert.equal(faseParaClassificados(undefined), null)
})

test('totalClassificados soma classificados por grupo e melhores terceiros', () => {
  assert.equal(
    totalClassificados({ gruposQtd: 4, classificadosPorGrupo: 2, melhoresTerceiros: 0 }),
    8,
  )
  assert.equal(
    totalClassificados({ gruposQtd: 8, classificadosPorGrupo: 2, melhoresTerceiros: 4 }),
    20,
  )
  assert.equal(
    totalClassificados({ gruposQtd: 2, classificadosPorGrupo: 2, melhoresTerceiros: 0 }),
    4,
  )
})

test('presets oficiais geram chave válida', () => {
  assert.equal(PRESETS_COPA.length, 3)
  for (const preset of PRESETS_COPA) {
    const total = totalClassificados(preset)
    assert.ok([4, 8, 16].includes(total), `preset ${preset.rotulo} deve gerar 4, 8 ou 16`)
    assert.equal(faseParaClassificados(total) !== null, true)
  }
})

test('Copa América vira quartas e não é o padrão do mundo', () => {
  const resumo = analisarFormato({ formato: 'grupos_mata_mata', ...PRESETS_COPA[0] })
  assert.equal(resumo.classificados, 8)
  assert.equal(resumo.fase, 'quartas')
  assert.equal(resumo.padraoCopa, false)
  assert.ok(resumo.confirmacoes.some((c) => c.includes('Quartas de final')))
  assert.equal(resumo.avisos.length, 0)
})

test('Copa do Mundo marca o formato padrão', () => {
  const resumo = analisarFormato({ formato: 'grupos_mata_mata', ...PRESETS_COPA[1] })
  assert.equal(resumo.classificados, 16)
  assert.equal(resumo.fase, 'oitavas')
  assert.equal(resumo.padraoCopa, true)
})

test('chave inválida gera aviso com 4, 8 ou 16', () => {
  const resumo = analisarFormato({
    formato: 'grupos_mata_mata',
    gruposQtd: 3,
    jogadoresPorGrupo: 4,
    classificadosPorGrupo: 2,
    melhoresTerceiros: 0,
  })
  assert.equal(resumo.classificados, 6)
  assert.equal(resumo.fase, null)
  assert.ok(resumo.avisos.some((a) => a.includes('4, 8 ou 16')))
})

test('melhores terceiros exigem grupos com pelo menos 3', () => {
  const resumo = analisarFormato({
    formato: 'grupos_mata_mata',
    gruposQtd: 4,
    jogadoresPorGrupo: 2,
    classificadosPorGrupo: 1,
    melhoresTerceiros: 2,
  })
  assert.ok(resumo.avisos.some((a) => a.includes('pelo menos 3 jogadores')))
})

test('sem times repetidos, avisa quando faltam times', () => {
  const resumo = analisarFormato(
    {
      formato: 'grupos_mata_mata',
      gruposQtd: 4,
      jogadoresPorGrupo: 4,
      classificadosPorGrupo: 2,
      melhoresTerceiros: 0,
      timesRepetidos: false,
    },
    12,
  )
  assert.ok(resumo.avisos.some((a) => a.includes('só há 12')))
})

test('com times repetidos, poucos times bastam', () => {
  const resumo = analisarFormato(
    {
      formato: 'grupos_mata_mata',
      gruposQtd: 4,
      jogadoresPorGrupo: 4,
      classificadosPorGrupo: 2,
      melhoresTerceiros: 0,
      timesRepetidos: true,
    },
    4,
  )
  assert.equal(resumo.avisos.length, 0)
  assert.ok(resumo.confirmacoes.some((c) => c.includes('Times suficientes')))
})

test('nenhum time habilitado gera aviso específico', () => {
  const resumo = analisarFormato(
    { formato: 'grupos_mata_mata', ...PRESETS_COPA[0], timesRepetidos: false },
    0,
  )
  assert.ok(resumo.avisos.some((a) => a.includes('Nenhum time habilitado')))
})

test('mata-mata direto e todos contra todos', () => {
  const direto = analisarFormato({ formato: 'mata_mata' })
  assert.ok(direto.avisos.some((a) => a.includes('Mata-mata direto')))

  const todos = analisarFormato({ formato: 'todos_contra_todos' })
  assert.equal(todos.avisos.length, 0)
  assert.ok(todos.confirmacoes.some((c) => c.includes('Todos contra todos')))
})
