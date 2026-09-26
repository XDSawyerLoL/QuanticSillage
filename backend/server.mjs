import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes, createHash, createHmac, createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';
import { handlePulse, pulseInfo } from './pulse.mjs';
import { startAuraHeartbeat, stopAuraHeartbeat } from './aura-bridge.mjs';

const PORT=Number(process.env.PORT||8787);
const PUBLIC_BASE_URL=String(process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'');
const FRONTEND_URL=process.env.FRONTEND_URL||'https://xdsawyerlol.github.io/QuanticMinds/news.html';
const FRONTEND_ORIGIN=process.env.FRONTEND_ORIGIN||new URL(FRONTEND_URL).origin;
const PULSE_FRONTEND_ORIGIN=process.env.PULSE_FRONTEND_ORIGIN||FRONTEND_ORIGIN;
const PULSE_ALLOWED_ORIGINS=new Set([
  FRONTEND_ORIGIN,
  PULSE_FRONTEND_ORIGIN,
  'https://xdsawyerlol.github.io',
  'https://mediumorchid-badger-314305.hostingersite.com',
  ...String(process.env.PULSE_ALLOWED_ORIGINS||'').split(',').map(v=>v.trim()).filter(Boolean)
]);
const LINKEDIN_CLIENT_ID=process.env.LINKEDIN_CLIENT_ID||'';
const LINKEDIN_CLIENT_SECRET=process.env.LINKEDIN_CLIENT_SECRET||'';
const LINKEDIN_REDIRECT_URI=process.env.LINKEDIN_REDIRECT_URI||`${PUBLIC_BASE_URL}/auth/linkedin/callback`;
const LINKEDIN_VERSION=process.env.LINKEDIN_VERSION||'202609';
const STATE_SECRET=process.env.STATE_SECRET||'';
const TOKEN_ENCRYPTION_KEY=process.env.TOKEN_ENCRYPTION_KEY||'';
const CRON_SECRET=process.env.CRON_SECRET||'';
const DATA_DIR=process.env.DATA_DIR||'./data';
const DATA_FILE=join(DATA_DIR,'subscribers.json');
const FEED_URL=process.env.FEED_URL||'https://raw.githubusercontent.com/XDSawyerLoL/LEFILLIBRE/main/feed.json';
const encKey=TOKEN_ENCRYPTION_KEY?createHash('sha256').update(TOKEN_ENCRYPTION_KEY).digest():null;
const LIMITS=new Set([1,2,3,4,6]),GAPS=new Set([60,90,120,180]),TIME_RE=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
let writeQueue=Promise.resolve();

function json(res,status,body,extra={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra});res.end(JSON.stringify(body))}
function redirect(res,location){res.writeHead(302,{location,'cache-control':'no-store','referrer-policy':'no-referrer'});res.end()}
function cors(req){const origin=req.headers.origin;return origin&&PULSE_ALLOWED_ORIGINS.has(origin)?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-headers':'authorization, content-type, x-cron-secret','access-control-allow-methods':'GET,PUT,PATCH,POST,DELETE,OPTIONS'}:{}}
function sha(v){return createHash('sha256').update(String(v)).digest('hex')}
function safeEqual(a,b){const aa=Buffer.from(String(a)),bb=Buffer.from(String(b));return aa.length===bb.length&&timingSafeEqual(aa,bb)}
function missingConfig(){return Object.entries({PUBLIC_BASE_URL,LINKEDIN_CLIENT_ID,LINKEDIN_CLIENT_SECRET,STATE_SECRET,TOKEN_ENCRYPTION_KEY,CRON_SECRET}).filter(([,v])=>!v).map(([k])=>k)}
function signState(payload){const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');const sig=createHmac('sha256',STATE_SECRET).update(encoded).digest('base64url');return `${encoded}.${sig}`}
function verifyState(state){const [encoded,sig]=String(state||'').split('.');if(!encoded||!sig)throw new Error('invalid_state');const expected=createHmac('sha256',STATE_SECRET).update(encoded).digest('base64url');if(!safeEqual(sig,expected))throw new Error('invalid_state');const p=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));if(!p.iat||Date.now()-p.iat>600000)throw new Error('expired_state');return p}
function encryptToken(token){if(!encKey)throw new Error('encryption_not_configured');const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encKey,iv),data=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);return{iv:iv.toString('base64url'),tag:cipher.getAuthTag().toString('base64url'),data:data.toString('base64url')}}
function decryptToken(r){const d=createDecipheriv('aes-256-gcm',encKey,Buffer.from(r.iv,'base64url'));d.setAuthTag(Buffer.from(r.tag,'base64url'));return Buffer.concat([d.update(Buffer.from(r.data,'base64url')),d.final()]).toString('utf8')}
async function ensureStore(){await mkdir(DATA_DIR,{recursive:true});try{await readFile(DATA_FILE,'utf8')}catch{await writeFile(DATA_FILE,JSON.stringify({version:1,subscribers:{}},null,2))}}
async function readStore(){await ensureStore();try{return JSON.parse(await readFile(DATA_FILE,'utf8'))}catch{return{version:1,subscribers:{}}}}
async function mutateStore(fn){let out;writeQueue=writeQueue.then(async()=>{const store=await readStore();out=await fn(store);const tmp=`${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;await writeFile(tmp,JSON.stringify(store,null,2));await rename(tmp,DATA_FILE)});await writeQueue;return out}
async function bodyJson(req,limit=32768){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>limit)throw new Error('body_too_large');chunks.push(chunk)}return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}
function prefs(input={}){return{active:true,categories:['IA & Tech'],mode:input.mode==='auto'?'auto':'review',maxPerDay:LIMITS.has(Number(input.maxPerDay))?Number(input.maxPerDay):3,minIntervalMinutes:GAPS.has(Number(input.minIntervalMinutes))?Number(input.minIntervalMinutes):90,quietStart:TIME_RE.test(input.quietStart||'')?input.quietStart:'22:30',quietEnd:TIME_RE.test(input.quietEnd||'')?input.quietEnd:'07:30'}}
function bearer(req){return String(req.headers.authorization||'').match(/^Bearer\s+(.+)$/i)?.[1]||''}
async function subscriber(req){const token=bearer(req);if(!token)return null;const store=await readStore(),h=sha(token);return Object.values(store.subscribers||{}).find(x=>x.sessionHash===h)||null}
function returnUrl(input){try{const u=new URL(input||FRONTEND_URL,FRONTEND_URL);return u.origin===new URL(FRONTEND_URL).origin?u:new URL(FRONTEND_URL)}catch{return new URL(FRONTEND_URL)}}
async function linkedinToken(code){const form=new URLSearchParams({grant_type:'authorization_code',code,client_id:LINKEDIN_CLIENT_ID,client_secret:LINKEDIN_CLIENT_SECRET,redirect_uri:LINKEDIN_REDIRECT_URI});const r=await fetch('https://www.linkedin.com/oauth/v2/accessToken',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form});const d=await r.json().catch(()=>({}));if(!r.ok||!d.access_token)throw new Error(`token_exchange_failed:${r.status}`);return d}
async function userInfo(token){const r=await fetch('https://api.linkedin.com/v2/userinfo',{headers:{authorization:`Bearer ${token}`}}),d=await r.json().catch(()=>({}));if(!r.ok||!d.sub)throw new Error(`userinfo_failed:${r.status}`);return d}
async function personId(token,fallback){try{const r=await fetch('https://api.linkedin.com/v2/me',{headers:{authorization:`Bearer ${token}`,'X-Restli-Protocol-Version':'2.0.0'}});if(r.ok){const d=await r.json();if(d.id)return d.id}}catch{}return fallback}
function isTech(item){return /\bia\b|intelligence artificielle|openai|chatgpt|anthropic|gemini|mistral|robot|technolog|numéri|cyber|ordinateur|smartphone|puce|logiciel|cloud|data|automatisation|quantique|hardware|software|application|startup|nvidia|apple|google|microsoft|tesla|spacex/i.test(`${item.category||''} ${item.source||''} ${item.title||''} ${item.summary||''}`)}
function paris(date=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date),o=Object.fromEntries(parts.map(p=>[p.type,p.value]));return{date:`${o.year}-${o.month}-${o.day}`,minutes:Number(o.hour)*60+Number(o.minute)}}
function mins(s){const[h,m]=s.split(':').map(Number);return h*60+m}
function quiet(p){const cur=paris().minutes,a=mins(p.quietStart),b=mins(p.quietEnd);return a===b?false:a<b?cur>=a&&cur<b:cur>=a||cur<b}
function quanticStoryUrl(item){const u=new URL(FRONTEND_URL);u.searchParams.set('story',String(item.url||item.articleUrl||item.title||''));return u.href}
function storyKey(item){return String(item.url||item.articleUrl||item.title||'')}
function cleanText(v,max=1200){return String(v||'').replace(/\s+/g,' ').trim().slice(0,max)}
function shortSummary(v,max=430){const s=cleanText(v,900);if(s.length<=max)return s;const cut=s.slice(0,max);const end=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf(' ? '),cut.lastIndexOf(' ! '));return `${(end>180?cut.slice(0,end+1):cut).trim()}…`}
const TOPIC_RULES=[
  {re:/openai|chatgpt|anthropic|gemini|mistral|llm|modèle de langage|agent(?:s)? ia|intelligence artificielle|\bia\b/i,label:'Intelligence artificielle',keywords:['intelligence artificielle','IA générative','agents IA'],hashtags:['#IntelligenceArtificielle','#IA'],question:"Quel impact concret voyez-vous pour les entreprises et les métiers ?"},
  {re:/cyber|sécurit|ransomware|malware|vpn|attaque|faille|pirat/i,label:'Cybersécurité',keywords:['cybersécurité','protection des données','sécurité numérique'],hashtags:['#Cybersecurite','#Tech'],question:"Quelle mesure de sécurité vous paraît prioritaire face à ce type d'évolution ?"},
  {re:/robot|humanoïde|drone|automatis|industrie 4\.0/i,label:'Robotique',keywords:['robotique','automatisation','robots intelligents'],hashtags:['#Robotique','#Automatisation'],question:"À quel moment cette technologie devient-elle réellement utile au quotidien ?"},
  {re:/nvidia|amd|intel|puce|semi-conduct|processeur|gpu|hardware/i,label:'Semi-conducteurs',keywords:['semi-conducteurs','puces IA','puissance de calcul'],hashtags:['#Semiconducteurs','#Hardware'],question:"Selon vous, où se joue désormais l'avantage technologique : logiciel, données ou puissance de calcul ?"},
  {re:/apple|iphone|android|smartphone|samsung|pixel|ordinateur|windows|linux|mac/i,label:'Produits numériques',keywords:['produits numériques','innovation produit','usages numériques'],hashtags:['#Innovation','#Tech'],question:"Est-ce une vraie rupture d'usage ou surtout une évolution de produit ?"},
  {re:/tesla|voiture|véhicule|batterie|mobilité|électrique|autonome/i,label:'Mobilité',keywords:['mobilité électrique','batteries','technologie automobile'],hashtags:['#Mobilite','#Innovation'],question:"Quel changement vous semble le plus décisif pour l'adoption à grande échelle ?"},
  {re:/spacex|espace|satellite|fusée|orbite/i,label:'Spatial',keywords:['industrie spatiale','satellites','technologies spatiales'],hashtags:['#Spatial','#Innovation'],question:"Quelle application terrestre de cette avancée pourrait avoir le plus d'impact ?"},
  {re:/quantique|quantum/i,label:'Quantique',keywords:['informatique quantique','technologies quantiques','calcul quantique'],hashtags:['#Quantique','#DeepTech'],question:"Quel usage du quantique pourrait selon vous arriver en premier dans le monde réel ?"},
  {re:/cloud|data|donnée|datacenter|centre de données/i,label:'Cloud & data',keywords:['cloud','data','infrastructures numériques'],hashtags:['#Cloud','#Data'],question:"Cette évolution change-t-elle surtout les coûts, la performance ou la souveraineté ?"}
];
const ENTITY_RULES=[
  ['OpenAI',/openai|chatgpt/i],['Anthropic',/anthropic|claude/i],['Google',/google|gemini/i],['Microsoft',/microsoft|copilot/i],['Apple',/apple|iphone|mac\b/i],['Nvidia',/nvidia/i],['AMD',/\bamd\b/i],['Intel',/\bintel\b/i],['Tesla',/tesla/i],['SpaceX',/spacex/i],['Mistral AI',/mistral/i],['Meta',/\bmeta\b|llama/i],['Amazon',/amazon|aws/i]
];
function optimizePost(item){
  const title=cleanText(item.title,260)||'Actualité technologique';
  const summary=shortSummary(item.summary||'',430);
  const corpus=`${item.category||''} ${item.source||''} ${title} ${summary}`;
  const matches=TOPIC_RULES.filter(r=>r.re.test(corpus)).slice(0,2);
  const primary=matches[0]||{label:'Technologie',keywords:['technologie','innovation numérique','transformation digitale'],hashtags:['#Tech','#Innovation'],question:"Quel impact concret cette évolution pourrait-elle avoir dans votre secteur ?"};
  const keywords=[];const add=v=>{const x=cleanText(v,80);if(x&&!keywords.some(k=>k.toLowerCase()===x.toLowerCase()))keywords.push(x)};
  ENTITY_RULES.forEach(([name,re])=>{if(re.test(corpus))add(name)});
  matches.forEach(r=>r.keywords.forEach(add));
  if(!matches.length)primary.keywords.forEach(add);
  if(item.category)add(item.category);
  const hashtags=[];const addTag=t=>{if(t&&!hashtags.includes(t)&&hashtags.length<3)hashtags.push(t)};
  matches.forEach(r=>r.hashtags.forEach(addTag));
  if(!matches.length)primary.hashtags.forEach(addTag);
  addTag('#QuanticNews');
  const leadKeywords=keywords.slice(0,2).join(' · ');
  const lead=leadKeywords?`${leadKeywords} — ${title}`:title;
  const insight=summary||`Une évolution à suivre de près dans ${primary.label.toLowerCase()}.`;
  const keywordLine=keywords.length?`À retenir : ${keywords.slice(0,5).join(' · ')}.`:'';
  const url=quanticStoryUrl(item);
  const commentary=[lead,'',insight,'',keywordLine,primary.question,'',`Lire sur Quantic News : ${url}`,'',hashtags.join(' ')].filter((v,i,a)=>v!==''||a[i-1]!=='').join('\n').trim().slice(0,2900);
  return{commentary,keywords:keywords.slice(0,7),hashtags,topic:primary.label,url,title,description:summary||title,question:primary.question};
}
async function loadFeed(){const r=await fetch(`${FEED_URL}?v=${Date.now()}`,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`feed_failed:${r.status}`);const data=await r.json();return Array.isArray(data.items)?data.items:[]}
async function findStory(story){const key=String(story||'');if(!key)return null;const items=await loadFeed();return items.find(i=>storyKey(i)===key)||null}
function postText(item){return optimizePost(item).commentary}
async function createLinkedInPost(token,sub,item,commentary){
  const opt=optimizePost(item);
  const base={author:sub.linkedinUrn,commentary:cleanText(commentary||opt.commentary,3000),visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:'PUBLISHED',isReshareDisabledByAuthor:false};
  const article={...base,content:{article:{source:opt.url,title:opt.title.slice(0,200),description:opt.description.slice(0,256)}}};
  let r=await fetch('https://api.linkedin.com/rest/posts',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json','X-Restli-Protocol-Version':'2.0.0','Linkedin-Version':LINKEDIN_VERSION},body:JSON.stringify(article)});
  let text=await r.text();
  if(!r.ok&&r.status>=400&&r.status<500){r=await fetch('https://api.linkedin.com/rest/posts',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json','X-Restli-Protocol-Version':'2.0.0','Linkedin-Version':LINKEDIN_VERSION},body:JSON.stringify(base)});text=await r.text()}
  if(!r.ok)throw new Error(`linkedin_post_failed:${r.status}:${text.slice(0,180)}`);
  return r.headers.get('x-restli-id')||'published'
}
async function publish(sub,item,commentary=''){const token=decryptToken(sub.accessToken);return createLinkedInPost(token,sub,item,commentary)}
async function runPublisher(){const items=(await loadFeed()).filter(isTech),store=await readStore(),report=[];for(const sub of Object.values(store.subscribers||{})){const p=prefs(sub.prefs||{});if(p.mode!=='auto'){report.push({id:sub.id,status:'skipped_mode'});continue}if(sub.tokenExpiresAt&&Date.now()>=sub.tokenExpiresAt){report.push({id:sub.id,status:'reconnect_required'});continue}if(quiet(p)){report.push({id:sub.id,status:'quiet_hours'});continue}const published=sub.published||[],today=paris().date;if(published.filter(x=>paris(new Date(x.publishedAt)).date===today).length>=p.maxPerDay){report.push({id:sub.id,status:'daily_limit'});continue}const last=published.map(x=>Date.parse(x.publishedAt)).filter(Number.isFinite).sort((a,b)=>b-a)[0];if(last&&Date.now()-last<p.minIntervalMinutes*60000){report.push({id:sub.id,status:'min_gap'});continue}const done=new Set(published.map(x=>x.articleUrl)),item=items.find(x=>!done.has(x.articleUrl||x.url));if(!item){report.push({id:sub.id,status:'no_matching_story'});continue}try{const postId=await publish(sub,item);await mutateStore(s=>{const cur=s.subscribers[sub.id];if(cur)cur.published=[...(cur.published||[]),{articleUrl:item.articleUrl||item.url,publishedAt:new Date().toISOString(),postId,title:item.title}].slice(-500)});report.push({id:sub.id,status:'published',postId,title:item.title})}catch(e){report.push({id:sub.id,status:'error',error:String(e.message||e).slice(0,240)})}}return report}

async function handler(req,res){const c=cors(req);if(req.method==='OPTIONS'){res.writeHead(204,c);return res.end()}const url=new URL(req.url,PUBLIC_BASE_URL||'http://localhost');try{
  if(url.pathname==='/health'&&req.method==='GET')return json(res,200,{ok:true,configured:missingConfig().length===0,missing:missingConfig(),pulse:await pulseInfo()},c);
  if(url.pathname.startsWith('/api/pulse/')){await handlePulse(req,res,url,c);return}
  if(url.pathname==='/auth/linkedin/start'&&req.method==='GET'){const m=missingConfig();if(m.length)return json(res,503,{error:'backend_not_configured',missing:m},c);const rt=returnUrl(url.searchParams.get('returnTo')),state=signState({iat:Date.now(),nonce:randomBytes(16).toString('hex'),returnTo:rt.href}),auth=new URL('https://www.linkedin.com/oauth/v2/authorization');auth.search=new URLSearchParams({response_type:'code',client_id:LINKEDIN_CLIENT_ID,redirect_uri:LINKEDIN_REDIRECT_URI,state,scope:'openid profile email w_member_social'}).toString();return redirect(res,auth.href)}
  if(url.pathname==='/auth/linkedin/callback'&&req.method==='GET'){let state;try{state=verifyState(url.searchParams.get('state'))}catch{const rt=returnUrl(FRONTEND_URL);rt.searchParams.set('linkedin','error');return redirect(res,rt.href)}const rt=returnUrl(state.returnTo);if(url.searchParams.get('error')){rt.searchParams.set('linkedin','error');return redirect(res,rt.href)}const code=url.searchParams.get('code');if(!code){rt.searchParams.set('linkedin','error');return redirect(res,rt.href)}const token=await linkedinToken(code),info=await userInfo(token.access_token),pid=await personId(token.access_token,info.sub),id=sha(`linkedin:${info.sub}`).slice(0,32),sessionToken=randomBytes(32).toString('base64url');await mutateStore(store=>{const prev=store.subscribers[id]||{};store.subscribers[id]={...prev,id,linkedinSub:info.sub,personId:pid,linkedinUrn:`urn:li:person:${pid}`,name:info.name||prev.name||'',email:info.email||prev.email||'',accessToken:encryptToken(token.access_token),tokenExpiresAt:Date.now()+Number(token.expires_in||0)*1000,sessionHash:sha(sessionToken),prefs:prev.prefs||prefs(),published:prev.published||[],updatedAt:new Date().toISOString()}});rt.searchParams.set('linkedin','connected');rt.hash=`qn_session=${encodeURIComponent(sessionToken)}`;return redirect(res,rt.href)}
  if(url.pathname==='/me'&&req.method==='GET'){const sub=await subscriber(req);if(!sub)return json(res,401,{error:'unauthorized'},c);return json(res,200,{linkedinConnected:true,name:sub.name,prefs:prefs(sub.prefs||{}),reconnectRequired:!!(sub.tokenExpiresAt&&Date.now()>=sub.tokenExpiresAt)},c)}
  if(url.pathname==='/me/preferences'&&req.method==='PUT'){const sub=await subscriber(req);if(!sub)return json(res,401,{error:'unauthorized'},c);const p=prefs(await bodyJson(req));await mutateStore(store=>{if(store.subscribers[sub.id])store.subscribers[sub.id].prefs=p});return json(res,200,{ok:true,prefs:p},c)}
  if(url.pathname==='/me/share-preview'&&req.method==='POST'){const sub=await subscriber(req);if(!sub)return json(res,401,{error:'unauthorized'},c);const b=await bodyJson(req),item=await findStory(b.story);if(!item)return json(res,404,{error:'story_not_found'},c);return json(res,200,{ok:true,...optimizePost(item)},c)}
  if(url.pathname==='/me/share'&&req.method==='POST'){const sub=await subscriber(req);if(!sub)return json(res,401,{error:'unauthorized'},c);if(sub.tokenExpiresAt&&Date.now()>=sub.tokenExpiresAt)return json(res,409,{error:'reconnect_required'},c);const b=await bodyJson(req),item=await findStory(b.story);if(!item)return json(res,404,{error:'story_not_found'},c);const commentary=cleanText(b.commentary||'',3000);const postId=await publish(sub,item,commentary);return json(res,200,{ok:true,postId,optimization:optimizePost(item)},c)}
  if(url.pathname==='/jobs/publish'&&req.method==='POST'){if(!CRON_SECRET||!safeEqual(req.headers['x-cron-secret']||'',CRON_SECRET))return json(res,401,{error:'unauthorized'});return json(res,200,{ok:true,report:await runPublisher()})}
  return json(res,404,{error:'not_found'},c)
}catch(e){console.error(e);return json(res,500,{error:'internal_error',message:String(e.message||e).slice(0,220)},c)}}

await ensureStore();
const server=createServer(handler);
server.listen(PORT,'0.0.0.0',()=>{
  console.log(`Quantic News LinkedIn backend listening on :${PORT}`);
  startAuraHeartbeat(PUBLIC_BASE_URL||`http://127.0.0.1:${PORT}`);
});
const shutdown=()=>{
  stopAuraHeartbeat();
  server.close(()=>process.exit(0));
};
process.once('SIGINT',shutdown);
process.once('SIGTERM',shutdown);
