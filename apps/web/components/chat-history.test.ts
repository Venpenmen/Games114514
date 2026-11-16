import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chatAppend } from './chat-history.ts'

test('chat snapshot comparison counts genuine appends and detects rebuilt histories', () => {
  const first = {author:'a',text:'first',at:1}
  const second = {author:'b',text:'second',at:2}
  const third = {author:'a',text:'third',at:3}
  assert.deepEqual(chatAppend([first],[{...first}]),[])
  assert.deepEqual(chatAppend([first],[{...first},second,third]),[second,third])
  assert.deepEqual(chatAppend([first,second,third],[first,second,third]),[])
  assert.equal(chatAppend([first],[second]),null)
  assert.equal(chatAppend([first,second],[]),null)
  assert.equal(chatAppend([first,second],[first,third,second]),null)
  for (const change of [{text:'edited'},{at:5},{author:'b'}]) {
    assert.equal(chatAppend([first],[{...first,...change}]),null)
  }
})
