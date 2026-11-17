import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {resolve} from 'node:path'
import {requestOriginAllowed,loopbackHttpOrigin} from './origin.ts'
import {createPlatform} from './service.ts'
import {ghostCandle} from '../../games/ghost-candle/engine.ts'

test('dynamic origin validation admits same-origin HTTPS and local loopback HTTP',()=>{
  for(const host of ['example.sakurafrp.com','example.sakurafrp.com:16543']){
    const origin='https://'+host
    assert.equal(requestOriginAllowed({origin,host},true),true)
    assert.equal(requestOriginAllowed({origin:'https://attacker.invalid',host},true),false)
    assert.equal(requestOriginAllowed({origin:'http://'+host,host},true),false)
  }
  for(const host of ['127.0.0.1:3216','localhost:3216']){
    const origin='http://'+host
    assert.equal(loopbackHttpOrigin({origin,host}),true)
    assert.equal(requestOriginAllowed({origin,host},true),true)
  }
  assert.equal(requestOriginAllowed({origin:'null',host:'example.sakurafrp.com'},true),false)
  assert.equal(requestOriginAllowed({host:'example.sakurafrp.com'},true),false)
  assert.equal(requestOriginAllowed({origin:'https://example.sakurafrp.com',host:'example.sakurafrp.com,attacker.invalid'},true),false)
})

test('account cookies adapt to local HTTP and public HTTPS',async t=>{
  const dir=mkdtempSync(resolve('work/origin-cookie-test-'))
  const app=createPlatform({database:resolve(dir,'test.db'),secure:true,plugins:[ghostCandle]})
  t.after(async()=>{await app.close();rmSync(dir,{recursive:true,force:true})})
  await new Promise<void>(ok=>app.server.listen(0,'127.0.0.1',ok))
  const address=app.server.address()
  assert(address && typeof address!=='string')
  const register=async (host:string,origin:string,username:string)=>{
    const body=JSON.stringify({username,password:'password-for-testing-12345',name:'测试玩家',avatar:0})
    const {request}=await import('node:http')
    return await new Promise<string>((done,reject)=>{
      const req=request({hostname:'127.0.0.1',port:address.port,path:'/api/auth/register',method:'POST',
        headers:{host,origin,'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{
        let result=''
        res.on('data',chunk=>result+=chunk)
        res.on('end',()=>{
          if(res.statusCode!==201) reject(new Error(String(res.statusCode)+' '+result))
          else done((res.headers['set-cookie']??[]).join('; '))
        })
      })
      req.on('error',reject)
      req.end(body)
    })
  }
  assert.doesNotMatch(await register('127.0.0.1:'+address.port,'http://127.0.0.1:'+address.port,'origin_local'),/; Secure(?:;|$)/i)
  assert.match(await register('demo.example.invalid','https://demo.example.invalid','origin_public'),/; Secure(?:;|$)/i)
})
