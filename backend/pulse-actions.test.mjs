import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Test storage is a fresh private directory; never use production Postgres,
// MySQL or the Render persistent disk.
test('SOCIAL writes, replies and private messages persist across two real backend sessions',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'quantic-pulse-acceptance-'));
 const previous={DATA_DIR:process.env.DATA_DIR,PULSE_DATABASE_URL:process.env.PULSE_DATABASE_URL,
  PULSE_DB_HOST:process.env.PULSE_DB_HOST,PULSE_DB_USER:process.env.PULSE_DB_USER};
 try{
  process.env.DATA_DIR=directory;
  process.env.PULSE_DATABASE_URL='';
  process.env.PULSE_DB_HOST='';
  process.env.PULSE_DB_USER='';
  const {handlePulse}=await import('./pulse.mjs?acceptance='+Date.now());
  async function call(path,method='GET',body,token=''){
   const url=new URL(path,'http://localhost');
   const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);
   req.method=method;
   req.headers={...(token?{authorization:'Bearer '+token}:{})};
   req.socket={remoteAddress:'127.0.0.1'};
   let status=0,data='';
   const res={writeHead(code){status=code},end(value){data+=String(value||'')}};
   const handled=await handlePulse(req,res,url);
   assert.equal(handled,true,'backend route handled: '+path);
   assert.ok(status>0,'HTTP response written: '+path);
   return{status,data:JSON.parse(data)};
  }
  const alice=await call('/api/pulse/auth/register','POST',{
   handle:'qa_alice',displayName:'QA Alice',password:'a-test-password-strong-11'
  });
  const bob=await call('/api/pulse/auth/register','POST',{
   handle:'qa_bob',displayName:'QA Bob',password:'a-test-password-strong-22'
  });
  assert.equal(alice.status,201);
  assert.equal(bob.status,201);
  assert.ok(alice.data.token);
  assert.ok(bob.data.token);

  const post=await call('/api/pulse/posts','POST',{body:'Publication test isolée'},alice.data.token);
  assert.equal(post.status,201);
  const reply=await call('/api/pulse/posts','POST',{
   body:'Réponse test isolée',replyToId:post.data.post.id
  },bob.data.token);
  assert.equal(reply.status,201);
  const replies=await call('/api/pulse/posts/'+post.data.post.id+'/replies','GET',undefined,alice.data.token);
  assert.equal(replies.status,200);
  assert.equal(replies.data.posts.length,1);
  assert.equal(replies.data.posts[0].body,'Réponse test isolée');

  const inbox=await call('/api/pulse/messages','POST',{handle:'qa_bob',body:'Message test privé'},alice.data.token);
  assert.equal(inbox.status,201);
  const thread=await call('/api/pulse/messages/qa_alice','GET',undefined,bob.data.token);
  assert.equal(thread.status,200);
  assert.equal(thread.data.user.handle,'qa_alice');
  assert.equal(thread.data.messages.length,1);
  assert.equal(thread.data.messages[0].body,'Message test privé');
  const conversations=await call('/api/pulse/conversations','GET',undefined,bob.data.token);
  assert.equal(conversations.status,200);
  assert.equal(conversations.data.conversations.length,1);

  const timeline=await call('/api/pulse/feed?mode=discover','GET',undefined,bob.data.token);
  assert.equal(timeline.status,200);
  assert.ok(timeline.data.posts.some(p=>p.id===post.data.post.id));
  const persistent=JSON.parse(await readFile(join(directory,'pulse.json'),'utf8'));
  assert.equal(Object.keys(persistent.posts).length,2);
  assert.equal(Object.keys(persistent.messages).length,1);
 }finally{
  for(const [key,value] of Object.entries(previous)){
   if(value===undefined)delete process.env[key];else process.env[key]=value;
  }
  await rm(directory,{recursive:true,force:true});
 }
});
