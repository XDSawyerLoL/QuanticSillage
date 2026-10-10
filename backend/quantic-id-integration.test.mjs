import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('Quantic ID one-click SOCIAL login validates a signed nonce and reuses its account',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'quantic-id-social-'));
 process.env.DATA_DIR=dir;
 delete process.env.PULSE_DATABASE_URL;
 delete process.env.PULSE_DB_HOST;
 const {handlePulse}=await import('./pulse.mjs?identity='+Date.now());
 const server=createServer((req,res)=>handlePulse(req,res,new URL(req.url,'http://127.0.0.1'),{}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true})});
 const request=async(path,body,token='')=>{
  const res=await fetch(base+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
  return {status:res.status,json:await res.json()};
 };
 const {privateKey,publicKey}=generateKeyPairSync('ed25519');
 const jwk=publicKey.export({format:'jwk'});
 const postChallenge=()=>request('/api/pulse/auth/quantic/challenge',{});
 const complete=(challenge,token='',includePublicKey=true)=>request('/api/pulse/auth/quantic/complete',{
  challenge,signature:sign(null,Buffer.from(challenge),privateKey).toString('base64url'),
  keyId:'qid_test_identity_1',algorithm:'Ed25519',
  ...(includePublicKey?{publicKey:jwk}:{})
 },token);
 const first=await postChallenge();
 assert.equal(first.status,200);
 assert.ok(first.json.challenge.startsWith('quantic-social:v1:'));
 const login=await complete(first.json.challenge);
 assert.equal(login.status,200);
 assert.equal(login.json.expiresInMs,12000);
 assert.equal(login.json.user.handle.startsWith('qid_'),true);
 assert.ok(login.json.token);
 const replay=await complete(first.json.challenge);
 assert.equal(replay.status,409);
 assert.equal(replay.json.error,'expired_or_replayed_challenge');
 const second=await postChallenge();
 const again=await complete(second.json.challenge,'',false);
 assert.equal(again.status,200);
 assert.equal(again.json.user.id,login.json.user.id);
 const tampered=await postChallenge();
 const invalid=await request('/api/pulse/auth/quantic/complete',{
  challenge:tampered.json.challenge,signature:'bad',
  publicKey:jwk,keyId:'qid_test_identity_1',algorithm:'Ed25519'
 });
 assert.equal(invalid.status,400);
 assert.equal(invalid.json.error,'invalid_quantic_signature');
 const current=await fetch(base+'/api/pulse/me',{headers:{authorization:'Bearer '+again.json.token}});
 assert.equal(current.status,200);
});
