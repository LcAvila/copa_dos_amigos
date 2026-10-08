import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calcularClassificacao } from '../src/lib/classificacao.js'

const p = (id, nome = id) => ({ id, grupo: 'A', perfil: { nome } })
const j = (casa_id, fora_id, gols_casa, gols_fora, extra = {}) => ({
  fase: 'grupos',
  finalizada: true,
  casa_id,
  fora_id,
  gols_casa,
  gols_fora,
  ...extra,
})

test('vence soma 3 pontos e derrota 0', () => {
  const linhas = calcularClassificacao([p('a', 'Ana'), p('b', 'Beto')], [j('a', 'b', 3, 1)])
  assert.equal(linhas[0].id, 'a')
  assert.equal(linhas[0].pontos, 3)
  assert.equal(linhas[0].vitorias, 1)
  assert.equal(linhas[0].saldo, 2)
  assert.equal(linhas[1].id, 'b')
  assert.equal(linhas[1].pontos, 0)
  assert.equal(linhas[1].derrotas, 1)
})

test('empate dá 1 ponto para cada lado', () => {
  const linhas = calcularClassificacao([p('a'), p('b')], [j('a', 'b', 1, 1)])
  assert.equal(linhas[0].pontos, 1)
  assert.equal(linhas[1].pontos, 1)
  assert.equal(linhas[0].empates, 1)
})

test('ignora partidas não finalizadas e fases diferentes de grupos', () => {
  const linhas = calcularClassificacao(
    [p('a'), p('b')],
    [
      j('a', 'b', 5, 0, { finalizada: false }),
      j('a', 'b', 9, 0, { fase: 'mata_mata' }),
      { fase: 'grupos', finalizada: true, casa_id: 'x', fora_id: 'b', gols_casa: 1, gols_fora: 0 },
    ],
  )
  assert.equal(linhas[0].pontos, 0)
  assert.equal(linhas[0].jogos, 0)
  assert.equal(linhas[1].pontos, 0)
})

test('desempata por saldo de gols', () => {
  const linhas = calcularClassificacao(
    [p('a'), p('b'), p('c'), p('d')],
    [j('a', 'b', 1, 0), j('c', 'd', 3, 0)],
  )
  assert.deepEqual(
    linhas.map((l) => l.id),
    ['c', 'a', 'b', 'd'],
  )
})

test('com saldo igual, desempata por gols marcados', () => {
  const linhas = calcularClassificacao(
    [p('a'), p('b'), p('c'), p('d')],
    [j('a', 'b', 2, 1), j('c', 'd', 1, 0)],
  )
  assert.deepEqual(
    linhas.map((l) => l.id),
    ['a', 'c', 'b', 'd'],
  )
  assert.equal(linhas[0].saldo, linhas[1].saldo)
  assert.equal(linhas[0].pontos, linhas[1].pontos)
})

test('critério personalizado: vitórias antes do saldo', () => {
  const linhas = calcularClassificacao(
    [p('a'), p('b')],
    [j('a', 'b', 1, 0), j('b', 'a', 4, 3)],
    ['vitorias', 'saldo_gols'],
  )
  assert.deepEqual(
    linhas.map((l) => l.id),
    ['a', 'b'],
  )
  assert.equal(linhas[0].vitorias, 1)
  assert.equal(linhas[1].vitorias, 1)
})

test('tudo igual cai no nome em ordem alfabética', () => {
  const linhas = calcularClassificacao(
    [p('x', 'Zé'), p('y', 'Ana')],
    [j('x', 'y', 0, 0), j('y', 'x', 0, 0)],
  )
  assert.deepEqual(
    linhas.map((l) => l.id),
    ['y', 'x'],
  )
})

test('só conta partidas de participantes da mesma lista', () => {
  const linhas = calcularClassificacao([p('a'), p('b')], [j('a', 'b', 1, 0)])
  assert.equal(linhas.find((l) => l.id === 'a').golsPro, 1)
  assert.equal(linhas.find((l) => l.id === 'b').golsContra, 1)
})
