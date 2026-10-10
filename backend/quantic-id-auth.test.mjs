import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync,sign } from 'node:crypto';
import { identityFingerprint,newQuanticChallenge,validQuanticChallenge,
  verifyQuanticProof,normalizeQuanticAssertion,QUANTIC_SESSION_MS } from './quantic-id-auth.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const jwk=publicKey.export({format:'jwk'});
test('Quantic ID challenge is unpredictable, tightly scoped and expires quickly',()=>{
 const a=newQuanticChallenge(),b=newQuanticChallenge();
 assert.notEqual(a,b);
 assert.ok(validQuanticChallenge(a));
 assert.ok(validQuanticChallenge(b));
 assert.equal(validQuanticChallenge('quantic-social:v1:short'),false);
 assert.equal(validQuanticChallenge('quantic-mail:v1:'+a.split(':').at(-1)),false);
 assert.equal(QUANTIC_SESSION_MS,12000);
});
test('Ed25519 proof authenticates only possession of the matching secret key',()=>{
 const challenge=newQuanticChallenge();
 const sig=sign(null,Buffer.from(challenge),privateKey).toString('base64url');
 assert.ok(identityFingerprint(jwk));
 assert.equal(verifyQuanticProof(challenge,sig,jwk),true);
 assert.equal(verifyQuanticProof(newQuanticChallenge(),sig,jwk),false);
 assert.equal(verifyQuanticProof(challenge,'bad!',jwk),false);
 const other=generateKeyPairSync('ed25519').publicKey.export({format:'jwk'});
 assert.equal(verifyQuanticProof(challenge,sig,other),false);
 assert.equal(identityFingerprint({kty:'EC',crv:'P-256',x:jwk.x}), '');
});
test('Quantic assertion never accepts an algorithm downgrade',()=>{
 assert.equal(normalizeQuanticAssertion({keyId:'qid_abc1',signature:'x',algorithm:'none'}),null);
 assert.ok(normalizeQuanticAssertion({keyId:'qid_abc1',signature:'x',algorithm:'Ed25519',publicKey:jwk}));
});
