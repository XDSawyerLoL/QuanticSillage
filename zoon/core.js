const configured=Array.isArray(window.ZOON_API_BASES)?window.ZOON_API_BASES:[window.ZOON_API_BASE];
export const API_BASES=configured.map(value=>String(value||'').replace(/\/$/,'')).filter(Boolean);
export const API_BASE=API_BASES[0]||'';
export const TOKEN_KEY='zoon_token';
export const FEED_CACHE_KEY='zoon_feed_cache_v2';
export const state={
  token:localStorage.getItem(TOKEN_KEY)||'',
  user:null,
  feed:'following',
  view:'home',
  replyTo:null,
  authMode:'login',
  online:navigator.onLine!==false
};

export const dom={
  feed:document.getElementById('pulse-feed'),
  textarea:document.getElementById('pulse-text'),
  publish:document.getElementById('pulse-publish'),
  count:document.getElementById('pulse-count'),
  composer:document.getElementById('composer'),
  feedTabs:document.getElementById('feed-tabs'),
  viewTitle:document.getElementById('view-title'),
  authModal:document.getElementById('auth-modal'),
  authForm:document.getElementById('auth-form'),
  authError:document.getElementById('auth-error'),
  welcome:document.getElementById('pulse-welcome'),
  followingLabel:document.getElementById('feed-following-label'),
  followingHelp:document.getElementById('feed-following-help'),
  networkBanner:document.getElementById('network-banner'),
  networkMessage:document.getElementById('network-message')
};

export function esc(v){
  return String(v??'').replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
  });
}

export function icon(name,extra=''){
  return '<svg class="pi '+extra+'" aria-hidden="true"><use href="#'+name+'"></use></svg>';
}

export function initials(user){
  const value=(user?.displayName||user?.handle||'?').trim().split(/\s+/).slice(0,2).map(function(x){return x[0]||''}).join('');
  return value.toUpperCase()||'?';
}

export function timeAgo(iso){
  const t=Date.parse(iso);
  if(!Number.isFinite(t))return'';
  const d=Math.max(0,Date.now()-t),m=Math.floor(d/60000);
  if(m<1)return'maintenant';
  if(m<60)return m+' min';
  const h=Math.floor(m/60);
  if(h<24)return h+' h';
  const days=Math.floor(h/24);
  if(days<7)return days+' j';
  return new Date(t).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});
}

export function setStatus(title,text,actionLabel=''){
  dom.feed.innerHTML='<div class="pulse-status"><strong>'+esc(title)+'</strong><span>'+esc(text||'')+'</span>'+
    (actionLabel?'<button class="zoon-inline-retry" data-retry-home>'+esc(actionLabel)+'</button>':'')+'</div>';
}

export function setNetworkState(online,message=''){
  state.online=!!online;
  if(!dom.networkBanner)return;
  if(online){
    dom.networkBanner.hidden=true;
    return;
  }
  dom.networkMessage.textContent=message||'Connexion temporairement indisponible';
  dom.networkBanner.hidden=false;
}

export function errorText(e){
  const map={
    unauthorized:'Connexion requise.',
    invalid_credentials:'Identifiant ou mot de passe incorrect.',
    handle_taken:'Cet identifiant est déjà pris.',
    invalid_handle:'Utilise 3 à 24 caractères : lettres minuscules, chiffres ou _.',
    invalid_display_name:'Le nom affiché doit contenir au moins 2 caractères.',
    weak_password:'Le mot de passe doit contenir au moins 10 caractères.',
    rate_limited:'Trop de demandes. Réessaie dans quelques minutes.',
    not_found:'Élément introuvable.',
    blocked:'Cette conversation est bloquée.',
    pulse_storage_unavailable:'Le service se reconnecte. Réessaie dans un instant.',
    network_error:'Connexion momentanément indisponible.',
    timeout:'Le service met trop de temps à répondre.',
    request_failed:'La demande n’a pas abouti.'
  };
  return map[e?.message]||e?.message||'Une erreur est survenue.';
}

function timeoutSignal(ms,externalSignal){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(new DOMException('Timeout','AbortError')),ms);
  if(externalSignal){
    if(externalSignal.aborted)controller.abort(externalSignal.reason);
    else externalSignal.addEventListener('abort',()=>controller.abort(externalSignal.reason),{once:true});
  }
  return{signal:controller.signal,clear:()=>clearTimeout(timer)};
}

function isSafeMethod(method){return method==='GET'||method==='HEAD'}

async function requestOnce(base,path,options,timeoutMs){
  const method=String(options.method||'GET').toUpperCase();
  const headers={'content-type':'application/json',accept:'application/json',...(options.headers||{})};
  if(state.token)headers.authorization='Bearer '+state.token;
  const timeout=timeoutSignal(timeoutMs,options.signal);
  try{
    const response=await fetch(base+path,{...options,method,headers,signal:timeout.signal,cache:'no-store'});
    const data=await response.json().catch(function(){return{}});
    if(!response.ok){
      const err=new Error(data.error||'request_failed');
      err.status=response.status;
      err.data=data;
      throw err;
    }
    setNetworkState(true);
    return data;
  }catch(cause){
    if(cause?.name==='AbortError'){
      const err=new Error('timeout');
      err.cause=cause;
      throw err;
    }
    if(cause?.status)throw cause;
    const err=new Error('network_error');
    err.cause=cause;
    throw err;
  }finally{
    timeout.clear();
  }
}

export async function api(path,options={}){
  const method=String(options.method||'GET').toUpperCase();
  const safe=isSafeMethod(method);
  const attempts=safe?2:1;
  let lastError;
  for(let attempt=0;attempt<attempts;attempt++){
    try{
      return await requestOnce(API_BASE,path,options,safe?22000:18000);
    }catch(error){
      lastError=error;
      if(!safe||(!['network_error','timeout','pulse_storage_unavailable'].includes(error.message)&&![502,503,504].includes(error.status)))break;
      if(attempt+1<attempts)await new Promise(resolve=>setTimeout(resolve,900));
    }
  }
  if(lastError?.message==='network_error'||lastError?.message==='timeout'||[502,503,504].includes(lastError?.status)){
    setNetworkState(false,'Connexion à ZOON en cours…');
  }
  throw lastError||new Error('request_failed');
}

export function readFeedCache(mode='following'){
  try{
    const all=JSON.parse(localStorage.getItem(FEED_CACHE_KEY)||'{}');
    const item=all[mode];
    if(!item||!Array.isArray(item.posts))return null;
    return item;
  }catch{return null}
}

export function writeFeedCache(mode,posts){
  try{
    const all=JSON.parse(localStorage.getItem(FEED_CACHE_KEY)||'{}');
    all[mode]={posts:Array.isArray(posts)?posts:[],savedAt:new Date().toISOString()};
    localStorage.setItem(FEED_CACHE_KEY,JSON.stringify(all));
  }catch{}
}
