import { test } from 'node:test'
import assert from 'node:assert/strict'
import { distribuirGrupos, ordenarPorSorteio, rotuloGrupo } from '../src/lib/grupos.js'

const p = (id, ordem, nome = id) => ({ id, ordem_sorteio: ordem, perfil: { nome } })

test('rotuloGrupo usa letras e depois G<n>', () => {
  assert.equal(rotuloGrupo(0), 'A')
  assert.equal(rotuloGrupo(25), 'Z')
  assert.equal(rotuloGrupo(26), 'G27')
})

test('ordenarPorSorteio ordena pela ordem do sorteio', () => {
  const lista = [p('p3', 3), p('p1', 1), p('p2', 2)]
  assert.deepEqual(
    ordenarPorSorteio(lista).map((x) => x.id),
    ['p1', 'p2', 'p3'],
  )
})

test('ordenarPorSorteio usa o nome quando falta a ordem', () => {
  const lista = [p('b', null, 'Beto'), p('a', null, 'Ana'), p('c', 1, 'Caio')]
  assert.deepEqual(
    ordenarPorSorteio(lista).map((x) => x.id),
    ['c', 'a', 'b'],
  )
})

test('distribuirGrupos distribui em serpentina e equilibra', () => {
  const lista = Array.from({ length: 8 }, (_, i) => p(`p${i + 1}`, i + 1))
  const distribuicao = distribuirGrupos(lista, 2)

  const porGrupo = {}
  for (const { id, grupo } of distribuicao) {
    porGrupo[grupo] = porGrupo[grupo] ?? []
    porGrupo[grupo].push(id)
  }

  assert.deepEqual(porGrupo.A, ['p1', 'p4', 'p5', 'p8'])
  assert.deepEqual(porGrupo.B, ['p2', 'p3', 'p6', 'p7'])
})

test('distribuirGrupos respeita a ordem do sorteio, não a ordem da lista', () => {
  const lista = [p('p3', 3), p('p1', 1), p('p2', 2), p('p4', 4)]
  const distribuicao = distribuirGrupos(lista, 2)
  assert.deepEqual(
    distribuicao.map((d) => [d.id, d.grupo]),
    [
      ['p1', 'A'],
      ['p2', 'B'],
      ['p3', 'B'],
      ['p4', 'A'],
    ],
  )
})

test('distribuirGrupos com um grupo coloca todos juntos', () => {
  const lista = [p('p1', 1), p('p2', 2), p('p3', 3)]
  assert.deepEqual(
    distribuirGrupos(lista, 1).map((d) => d.grupo),
    ['A', 'A', 'A'],
  )
})

test('distribuirGrupos trata lista vazia e quantidade inválida', () => {
  assert.deepEqual(distribuirGrupos([], 4), [])
  assert.deepEqual(distribuirGrupos([p('p1', 1)], 0).map((d) => d.grupo), ['A'])
})
