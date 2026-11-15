import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registry } from './index.ts'
test('registry routes by id and rejects duplicate ids', () => {
  const first = {id:'first',version:1}
  const second = {id:'second',version:1}
  assert.equal(registry([first,second]).get('second'),second)
  assert.throws(() => registry([first,first]), /重复/)
})
