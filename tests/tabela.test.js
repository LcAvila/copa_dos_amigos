import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gerarJogos } from '../src/lib/tabela.js'

const p = (id) => ({ id })

test('4 jogadores geram 6 jogos, todos os pares uma vez', () => {
  const jogos = gerarJogos([p('a'), p('b'), p('c'), p('d')])

  assert.equal(jogos.length, 6)
  assert.equal(new Set(jogos.map((g) => g.rodada)).size, 3)

  const pares = new Set(jogos.map((g) => `${g.casa_id}x${g.fora_id}`))
  assert.equal(pares.size, 6)
  for (const jogo of jogos) {
    assert.notEqual(jogo.casa_id, jogo.fora_id, 'ninguém joga contra si mesmo')
    assert.equal(jogo.fase, 'grupos')
    assert.equal(jogo.grupo, 'Geral')
  }
})

test('cada par aparece exatamente uma vez (sem repetição)', () => {
  const jogos = gerarJogos([p('a'), p('b'), p('c'), p('d')])
  const normalizados = jogos.map((g) => [g.casa_id, g.fora_id].sort().join('x'))
  assert.equal(new Set(normalizados).size, normalizados.length)
  assert.equal(normalizados.length, 6)
})

test('ida e volta dobra a tabela', () => {
  const ida = gerarJogos([p('a'), p('b'), p('c'), p('d')])
  const completo = gerarJogos([p('a'), p('b'), p('c'), p('d')], { idaEVolta: true })

  assert.equal(completo.length, ida.length * 2)
  assert.equal(new Set(completo.map((g) => g.rodada)).size, 6)

  for (const jogo of ida) {
    const volta = completo.find(
      (g) => g.casa_id === jogo.fora_id && g.fora_id === jogo.casa_id,
    )
    assert.ok(volta, `falta a volta de ${jogo.casa_id}x${jogo.fora_id}`)
    assert.equal(volta.rodada, jogo.rodada + 3)
  }
})

test('grupo ímpar: alguém descança e ninguém joga contra si', () => {
  const jogos = gerarJogos([p('a'), p('b'), p('c')])

  assert.equal(jogos.length, 3)
  assert.equal(new Set(jogos.map((g) => g.rodada)).size, 3)
  for (const jogo of jogos) assert.notEqual(jogo.casa_id, jogo.fora_id)

  const participantes = [...new Set(jogos.flatMap((g) => [g.casa_id, g.fora_id]))].sort()
  assert.deepEqual(participantes, ['a', 'b', 'c'])

  const pares = new Set(jogos.map((g) => [g.casa_id, g.fora_id].sort().join('x')))
  assert.equal(pares.size, 3, 'todos os pares distintos, um para cada rodada')
})

test('grupos separados não se enfrentam', () => {
  const jogos = gerarJogos([
    { id: 'a1', grupo: 'A' },
    { id: 'a2', grupo: 'A' },
    { id: 'a3', grupo: 'A' },
    { id: 'b1', grupo: 'B' },
    { id: 'b2', grupo: 'B' },
  ])

  const doA = jogos.filter((g) => g.grupo === 'A')
  const doB = jogos.filter((g) => g.grupo === 'B')
  assert.equal(doA.length, 3)
  assert.equal(doB.length, 1)
  for (const jogo of doA) {
    assert.ok(jogo.casa_id.startsWith('a') && jogo.fora_id.startsWith('a'))
  }
})

test('grupo com menos de 2 jogadores não gera jogo', () => {
  assert.deepEqual(gerarJogos([p('a')]), [])
  assert.deepEqual(gerarJogos([]), [])
})

test('vazio de ida e volta de grupo ímpar mantém jogos distintos', () => {
  const jogos = gerarJogos([p('a'), p('b'), p('c')], { idaEVolta: true })
  assert.equal(jogos.length, 6)
  const normalizados = jogos.map((g) => [g.casa_id, g.fora_id].sort().join('x'))
  assert.equal(new Set(normalizados).size, 3)
})
