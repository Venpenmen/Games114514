import {test} from 'node:test'
import assert from 'node:assert/strict'
import {commitChoice} from './commit-choice.ts'
test('commit selection resolves only canonical server options',()=>{
 const options=[{value:'pass'},{value:'A',card:'A'},{value:'B',card:'B'},{value:'A,B'}]
 assert.equal(commitChoice(options,['B','A']),'A,B')
 assert.equal(commitChoice(options,['A','B']),'A,B')
 assert.equal(commitChoice(options,['A']),'A')
 assert.equal(commitChoice(options,[]),'')
 assert.equal(commitChoice(options,['C']),'')
 assert.equal(commitChoice(options.slice(0,3),['A','B']),'')
})
