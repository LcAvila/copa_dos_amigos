import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  embaralhar,
  montarEtapas,
  indiceEtapaAtual,
  segundosRestantes,
  sortearTime,
} from '../src/lib/sorteio.js'

test('embaralhar mantém os itens e não altera o original', () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8]
  const copia = embaralhar(original)
  assert.notEqual(copia, original)
  assert.deepEqual([...original].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8])
  assert.deepEqual([...copia].sort((a, b) => a - b), original)
})

test('embaralhar com 0 ou 1 item devolve a mesma lista', () => {
  assert.deepEqual(embaralhar([]), [])
  assert.deepEqual(embaralhar(['a']), ['a'])
})

test('montarEtapas monta a linha do tempo na ordem', () => {
  const participantes = [
    { id: 'p1', nome: 'Ana' },
    { id: 'p2', nome: 'Beto' },
  ]
  const inicio = '2026-10-06T20:00:00.000Z'
  const etapas = montarEtapas(participantes, ['p2', 'p1'], inicio, 5, 15)

  assert.equal(etapas.length, 2)
  const base = new Date(inicio).getTime()

  assert.equal(etapas[0].participanteId, 'p2')
  assert.equal(etapas[0].participante.nome, 'Beto')
  assert.equal(etapas[0].inicio, base)
  assert.equal(etapas[0].escolhaEm, base + 5000)
  assert.equal(etapas[0].fim, base + 20000)

  assert.equal(etapas[1].participanteId, 'p1')
  assert.equal(etapas[1].inicio, base + 20000)
  assert.equal(etapas[1].escolhaEm, base + 25000)
  assert.equal(etapas[1].fim, base + 40000)
})

test('montarEtapas devolve [] com data inválida', () => {
  assert.deepEqual(montarEtapas([], ['p1'], 'data-invalida'), [])
})

test('montarEtapas mantém participante desconhecido como undefined', () => {
  const etapas = montarEtapas([], ['fantasma'], '2026-10-06T20:00:00.000Z')
  assert.equal(etapas.length, 1)
  assert.equal(etapas[0].participante, undefined)
})

test('indiceEtapaAtual devolve o índice certo ou -1', () => {
  const base = Date.parse('2026-10-06T20:00:00.000Z')
  const etapas = [
    { inicio: base, fim: base + 20000 },
    { inicio: base + 20000, fim: base + 40000 },
  ]
  assert.equal(indiceEtapaAtual(etapas, base), 0)
  assert.equal(indiceEtapaAtual(etapas, base + 19999), 0)
  assert.equal(indiceEtapaAtual(etapas, base + 20000), 1)
  assert.equal(indiceEtapaAtual(etapas, base + 40000), -1)
  assert.equal(indiceEtapaAtual([], base), -1)
})

test('segundosRestantes arredonda para cima e nunca fica negativo', () => {
  assert.equal(segundosRestantes(5000, 0), 5)
  assert.equal(segundosRestantes(5000, 4400), 1)
  assert.equal(segundosRestantes(5000, 5000), 0)
  assert.equal(segundosRestantes(5000, 9000), 0)
})

test('sortearTime nunca repete time já usado quando há alternativa', () => {
  const pool = [{ time_id: 1 }, { time_id: 2 }, { time_id: 3 }]
  const escolhido = sortearTime(pool, [1, 2], false)
  assert.equal(escolhido.time_id, 3)
})

test('sortearTime cai no pool inteiro quando todos já foram usados', () => {
  const pool = [{ time_id: 1 }, { time_id: 2 }]
  for (let i = 0; i < 20; i += 1) {
    const escolhido = sortearTime(pool, [1, 2], false)
    assert.ok([1, 2].includes(escolhido.time_id))
  }
})

test('sortearTime com repetição liberada usa o pool todo', () => {
  const pool = [{ time_id: 1 }, { time_id: 2 }, { time_id: 3 }]
  for (let i = 0; i < 20; i += 1) {
    const escolhido = sortearTime(pool, [1, 2, 3], true)
    assert.ok([1, 2, 3].includes(escolhido.time_id))
  }
})
