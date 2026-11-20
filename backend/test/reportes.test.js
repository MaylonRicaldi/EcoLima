import test from 'node:test'
import assert from 'node:assert/strict'
import { equivalentTrees } from '../src/services/calculations.js'
import { toCsv } from '../src/services/reportes.js'

test('equivalentTrees uses the 22 kg factor and rounds up', () => {
  assert.equal(equivalentTrees(22), 1)
  assert.equal(equivalentTrees(44), 2)
  assert.equal(equivalentTrees(50), 3)
  assert.equal(equivalentTrees(100), 5)
  assert.equal(equivalentTrees(220), 10)
  assert.equal(equivalentTrees(500), 23)
})

test('CSV escapes commas, quotes and line breaks', () => {
  const csv = toCsv(['nombre', 'valor'], [
    { nombre: 'Lima, "Este"', valor: 'linea 1\nlinea 2' },
  ])
  assert.match(csv, /"Lima, ""Este"""/)
  assert.match(csv, /"linea 1\nlinea 2"/)
})
