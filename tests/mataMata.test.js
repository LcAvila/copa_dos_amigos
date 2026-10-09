import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  classificadosParaMataMata,
  montarChaveMataMata,
  montarChaveDireta,
  vencedorDeJogo,
  perdedorDeJogo,
  montarProximaFase,
} from '../src/lib/mataMata.js'

const part = (id, grupo) => ({ id, grupo, perfil: { nome: id } })
const jogo = (casa_id, fora_id, gols_casa, gols_fora, extra = {}) => ({
  fase: 'grupos',
  finalizada: true,
  casa_id,
  fora_id,
  gols_casa,
  gols_fora,
  ...extra,
})

test('classificadosParaMataMata leva os 2 primeiros de cada grupo, na ordem', () => {
  const participantes = [
    part('a1', 'A'),
    part('a2', 'A'),
    part('b1', 'B'),
    part('b2', 'B'),
  ]
  const partidas = [jogo('a1', 'a2', 1, 0), jogo('b1', 'b2', 1, 0)]

  const classificados = classificadosParaMataMata(participantes, partidas, {
    classificadosPorGrupo: 2,
  })

  assert.deepEqual(
    classificados.map((c) => c.id),
    ['a1', 'b1', 'a2', 'b2'],
  )
  assert.deepEqual(
    classificados.map((c) => c.posicao),
    [1, 1, 2, 2],
  )
})

test('classificadosParaMataMata desempata saldo do grupo', () => {
  const participantes = [part('a1', 'A'), part('a2', 'A'), part('a3', 'A'), part('a4', 'A')]
  const partidas = [
    jogo('a1', 'a4', 3, 0),
    jogo('a2', 'a3', 1, 0),
    jogo('a3', 'a4', 1, 0),
    jogo('a1', 'a2', 1, 0),
    jogo('a2', 'a4', 1, 0),
    jogo('a1', 'a3', 1, 0),
  ]

  const classificados = classificadosParaMataMata(participantes, partidas, {
    classificadosPorGrupo: 2,
  })
  assert.deepEqual(
    classificados.map((c) => c.id),
    ['a1', 'a2'],
  )
})

test('montarChaveMataMata forma a chave de 4 em 8', () => {
  const classificados = [1, 2, 3, 4].map((n) => ({ id: `p${n}` }))
  const jogos = montarChaveMataMata(classificados)

  assert.equal(jogos.length, 2)
  assert.equal(jogos[0].fase, 'semi')
  assert.deepEqual(
    jogos.map((g) => [g.casa_id, g.fora_id]),
    [
      ['p1', 'p4'],
      ['p2', 'p3'],
    ],
  )
})

test('montarChaveMataMata monta quartas e oitavas', () => {
  const oito = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ id: `p${n}` }))
  const quartas = montarChaveMataMata(oito)
  assert.equal(quartas[0].fase, 'quartas')
  assert.equal(quartas.length, 4)
  assert.equal(quartas[3].casa_id, 'p4')
  assert.equal(quartas[3].fora_id, 'p5')

  const dezesseis = Array.from({ length: 16 }, (_, i) => ({ id: `p${i + 1}` }))
  const oitavas = montarChaveMataMata(dezesseis)
  assert.equal(oitavas[0].fase, 'oitavas')
  assert.equal(oitavas.length, 8)
})

test('montarChaveMataMata recusa tamanhos fora de 4, 8 ou 16', () => {
  for (const n of [0, 1, 3, 5, 6, 7, 9, 12, 15, 17]) {
    const lista = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` }))
    assert.equal(montarChaveMataMata(lista), null, `n=${n} deve ser recusado`)
  }
})

test('montarChaveDireta semeia todos os inscritos pela ordem do sorteio', () => {
  const participantes = [
    { id: 'p3', ordem_sorteio: 3 },
    { id: 'p1', ordem_sorteio: 1 },
    { id: 'p4', ordem_sorteio: 4 },
    { id: 'p2', ordem_sorteio: 2 },
  ]
  const chave = montarChaveDireta(participantes)

  assert.equal(chave.length, 2)
  assert.equal(chave[0].fase, 'semi')
  assert.deepEqual(
    chave.map((g) => [g.casa_id, g.fora_id]),
    [
      ['p1', 'p4'],
      ['p2', 'p3'],
    ],
  )
})

test('montarChaveDireta monta quartas com 8 e recusa outros tamanhos', () => {
  const oito = Array.from({ length: 8 }, (_, i) => ({ id: `p${i + 1}`, ordem_sorteio: i + 1 }))
  assert.equal(montarChaveDireta(oito)[0].fase, 'quartas')
  assert.equal(montarChaveDireta([{ id: 'a' }, { id: 'b' }, { id: 'c' }]), null)
})

test('vencedorDeJogo decide por placar, pênaltis e ignora não finalizado', () => {
  assert.equal(
    vencedorDeJogo({ finalizada: true, casa_id: 'a', fora_id: 'b', gols_casa: 2, gols_fora: 1 }),
    'a',
  )
  assert.equal(
    vencedorDeJogo({ finalizada: true, casa_id: 'a', fora_id: 'b', gols_casa: 1, gols_fora: 4 }),
    'b',
  )
  assert.equal(
    vencedorDeJogo({
      finalizada: true,
      casa_id: 'a',
      fora_id: 'b',
      gols_casa: 1,
      gols_fora: 1,
      penaltis_casa: 5,
      penaltis_fora: 3,
    }),
    'a',
  )
  assert.equal(
    vencedorDeJogo({
      finalizada: true,
      casa_id: 'a',
      fora_id: 'b',
      gols_casa: 1,
      gols_fora: 1,
      penaltis_casa: 3,
      penaltis_fora: 5,
    }),
    'b',
  )
  assert.equal(
    vencedorDeJogo({ finalizada: true, casa_id: 'a', fora_id: 'b', gols_casa: 1, gols_fora: 1 }),
    undefined,
    'empate sem pênaltis não tem vencedor',
  )
  assert.equal(
    vencedorDeJogo({ finalizada: false, casa_id: 'a', fora_id: 'b', gols_casa: 3, gols_fora: 0 }),
    undefined,
  )
  assert.equal(vencedorDeJogo({ finalizada: true, casa_id: 'a', fora_id: 'b' }), undefined)
})

test('perdedorDeJogo devolve o outro lado', () => {
  const base = { finalizada: true, casa_id: 'a', fora_id: 'b', gols_casa: 2, gols_fora: 0 }
  assert.equal(perdedorDeJogo(base), 'b')
  assert.equal(perdedorDeJogo({ ...base, gols_casa: 0, gols_fora: 2 }), 'a')
  assert.equal(perdedorDeJogo({ finalizada: false, casa_id: 'a', fora_id: 'b' }), undefined)
})

test('montarProximaFase: quartas finalizadas viram semi', () => {
  const quartas = [1, 2, 3, 4].map((n) => ({
    fase: 'quartas',
    rodada: n,
    casa_id: `c${n}`,
    fora_id: `f${n}`,
    finalizada: true,
    gols_casa: 1,
    gols_fora: 0,
  }))
  const resultado = montarProximaFase(quartas)

  assert.equal(resultado.jogos.length, 2)
  assert.equal(resultado.jogos[0].fase, 'semi')
  assert.deepEqual(
    resultado.jogos.map((g) => [g.casa_id, g.fora_id]),
    [
      ['c1', 'c2'],
      ['c3', 'c4'],
    ],
  )
  assert.equal(resultado.terceiro, null)
})

test('montarProximaFase: semi finalizada gera final e disputa de 3º', () => {
  const semi = [
    { fase: 'semi', rodada: 1, casa_id: 'a', fora_id: 'd', finalizada: true, gols_casa: 2, gols_fora: 1 },
    { fase: 'semi', rodada: 2, casa_id: 'b', fora_id: 'c', finalizada: true, gols_casa: 0, gols_fora: 1 },
  ]
  const resultado = montarProximaFase(semi)

  assert.equal(resultado.jogos.length, 1)
  assert.equal(resultado.jogos[0].fase, 'final')
  assert.deepEqual(
    [resultado.jogos[0].casa_id, resultado.jogos[0].fora_id],
    ['a', 'c'],
  )
  assert.equal(resultado.terceiro.fase, 'terceiro')
  assert.deepEqual(
    [resultado.terceiro.casa_id, resultado.terceiro.fora_id],
    ['d', 'b'],
  )
})

test('montarProximaFase devolve undefined se ainda tem jogo aberto', () => {
  const quartas = [
    { fase: 'quartas', rodada: 1, casa_id: 'c1', fora_id: 'f1', finalizada: true, gols_casa: 1, gols_fora: 0 },
    { fase: 'quartas', rodada: 2, casa_id: 'c2', fora_id: 'f2', finalizada: false },
    { fase: 'quartas', rodada: 3, casa_id: 'c3', fora_id: 'f3', finalizada: true, gols_casa: 1, gols_fora: 0 },
    { fase: 'quartas', rodada: 4, casa_id: 'c4', fora_id: 'f4', finalizada: true, gols_casa: 1, gols_fora: 0 },
  ]
  assert.equal(montarProximaFase(quartas), undefined)
})

test('montarProximaFase: final não tem próxima fase', () => {
  const final = [
    { fase: 'final', rodada: 1, casa_id: 'a', fora_id: 'b', finalizada: true, gols_casa: 1, gols_fora: 0 },
  ]
  assert.equal(montarProximaFase(final), null)
})

test('montarProximaFase com número ímpar de jogos devolve null', () => {
  const lista = [
    { fase: 'quartas', rodada: 1, casa_id: 'c1', fora_id: 'f1', finalizada: true, gols_casa: 1, gols_fora: 0 },
  ]
  assert.equal(montarProximaFase(lista), null)
})
