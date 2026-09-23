import { state, dom, api, errorText, setNetworkState } from './core.js';
import { openAuth, closeAuth, updateAuthModal, updateAccount, requireAuth, applySession, clearSession, restoreSession } from './session.js';
import { setView, loadHome, loadExplore, loadCircles, loadNotifications, loadSaved, loadProfile, loadMessages, loadCirclePreview } from './views.js';

function toast(message){
  let node=document.getElementById('zoon-toast');
  if(!node){
    node=document.createElement('div');
    node.id='zoon-toast';
    node.className='zoon-toast';
    document.body.appendChild(node);
  }
  node.textContent=message;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>node.classList.remove('show'),2600);
}

function setReply(postId,handle){
  state.replyTo=postId;
  const context=document.getElementById('pulse-context');
  context.hidden=false;
  context.textContent='Réponse à @'+handle;
  document.getElementById('cancel-context').hidden=false;
  dom.textarea.focus();
}

function clearReply(){
  state.replyTo=null;
  document.getElementById('pulse-context').hidden=true;
  document.getElementById('cancel-context').hidden=true;
}

async function publishPost(){
  if(!requireAuth())return;
  const body=dom.textarea.value.trim();
  if(!body)return;
  dom.publish.disabled=true;
  try{
    await api('/api/pulse/posts',{method:'POST',body:JSON.stringify({body,replyToId:state.replyTo})});
    dom.textarea.value='';
    dom.count.textContent='0 / 420';
    clearReply();
    toast('Publié');
    await loadHome();
  }catch(error){
    toast(errorText(error));
    dom.publish.disabled=false;
  }
}

async function toggleAction(postId,action){
  if(!requireAuth())return;
  try{
    await api('/api/pulse/posts/'+encodeURIComponent(postId)+'/'+action,{method:'POST',body:'{}'});
    if(state.view==='home')await loadHome();
  }catch(error){
    toast(errorText(error));
  }
}

async function reportPost(postId){
  if(!requireAuth())return;
  const reason=prompt('Pourquoi signales-tu cette publication ?');
  if(!reason)return;
  try{
    await api('/api/pulse/report',{method:'POST',body:JSON.stringify({targetType:'post',targetId:postId,reason})});
    toast('Signalement transmis');
  }catch(error){
    toast(errorText(error));
  }
}

async function doLogout(){
  try{await api('/api/pulse/auth/logout',{method:'POST',body:'{}'})}catch{}
  clearSession();
  await loadHome();
}

async function exportData(){
  if(!requireAuth())return;
  try{
    const data=await api('/api/pulse/export');
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const anchor=document.createElement('a');
    anchor.href=URL.createObjectURL(blob);
    anchor.download='zoon-export.json';
    anchor.click();
    setTimeout(function(){URL.revokeObjectURL(anchor.href)},1000);
  }catch(error){
    toast(errorText(error));
  }
}

async function editProfile(){
  if(!state.user)return;
  const displayName=prompt('Nom affiché',state.user.displayName);
  if(displayName===null)return;
  const bio=prompt('Bio',state.user.bio||'');
  if(bio===null)return;
  try{
    const data=await api('/api/pulse/me',{method:'PATCH',body:JSON.stringify({displayName,bio})});
    state.user=data.user;
    updateAccount();
    await loadProfile(state.user.handle);
  }catch(error){
    toast(errorText(error));
  }
}

async function retryCurrentView(){
  setNetworkState(true);
  if(state.view==='home')return loadHome();
  if(state.view==='circles')return loadCircles();
  if(state.view==='notifications')return loadNotifications();
  if(state.view==='saved')return loadSaved();
  if(state.view==='profile')return loadProfile();
  return loadHome();
}

function bindStaticEvents(){
  dom.textarea.addEventListener('input',function(){
    dom.count.textContent=dom.textarea.value.length+' / 420';
    dom.publish.disabled=!dom.textarea.value.trim();
  });

  dom.publish.addEventListener('click',publishPost);
  document.getElementById('cancel-context').addEventListener('click',clearReply);
  document.getElementById('network-retry').addEventListener('click',retryCurrentView);

  document.getElementById('compose-focus').addEventListener('click',function(){
    if(requireAuth()){
      setView('home','Accueil');
      dom.textarea.focus();
      window.scrollTo({top:0,behavior:'smooth'});
    }
  });

  document.getElementById('mobile-compose').addEventListener('click',function(){
    if(requireAuth()){
      setView('home','Accueil');
      dom.textarea.focus();
      setTimeout(()=>dom.textarea.scrollIntoView({block:'center',behavior:'smooth'}),30);
    }
  });

  document.getElementById('auth-button').addEventListener('click',function(){
    state.user?loadProfile(state.user.handle):openAuth('login');
  });
  document.getElementById('welcome-register').addEventListener('click',function(){openAuth('register')});
  document.getElementById('welcome-login').addEventListener('click',function(){openAuth('login')});
  document.getElementById('account-button').addEventListener('click',function(){
    state.user?loadProfile(state.user.handle):openAuth('login');
  });
  document.getElementById('auth-close').addEventListener('click',closeAuth);
  document.getElementById('auth-switch').addEventListener('click',function(){
    state.authMode=state.authMode==='login'?'register':'login';
    updateAuthModal();
  });

  dom.authModal.addEventListener('click',function(event){
    if(event.target===dom.authModal)closeAuth();
  });

  dom.authForm.addEventListener('submit',async function(event){
    event.preventDefault();
    dom.authError.textContent='';
    const handle=document.getElementById('auth-handle').value.trim().replace(/^@/,'').toLowerCase();
    const password=document.getElementById('auth-password').value;
    const displayName=document.getElementById('auth-display-name').value.trim();
    const submit=dom.authForm.querySelector('[type="submit"]');
    submit.disabled=true;
    try{
      const path=state.authMode==='register'?'/api/pulse/auth/register':'/api/pulse/auth/login';
      const body=state.authMode==='register'?{handle,password,displayName}:{handle,password};
      const data=await api(path,{method:'POST',body:JSON.stringify(body)});
      applySession(data);
      closeAuth();
      dom.authForm.reset();
      toast(state.authMode==='register'?'Compte créé':'Connecté');
      await loadHome();
      loadCirclePreview();
    }catch(error){
      dom.authError.textContent=errorText(error);
    }finally{
      submit.disabled=false;
    }
  });

  document.querySelectorAll('.pulse-tab').forEach(function(button){
    button.addEventListener('click',function(){
      state.feed=button.dataset.feed;
      document.querySelectorAll('.pulse-tab').forEach(function(candidate){
        candidate.classList.toggle('active',candidate===button);
      });
      loadHome();
    });
  });

  document.querySelectorAll('[data-view]').forEach(function(button){
    button.addEventListener('click',function(){
      const view=button.dataset.view;
      if(view==='home')loadHome();
      else if(view==='explore')loadExplore();
      else if(view==='circles')loadCircles();
      else if(view==='notifications')loadNotifications();
      else if(view==='messages')loadMessages();
      else if(view==='saved')loadSaved();
      else if(view==='profile')loadProfile();
    });
  });

  const search=document.getElementById('pulse-search');
  let searchTimer;
  search?.addEventListener('input',function(event){
    clearTimeout(searchTimer);
    const query=event.target.value;
    searchTimer=setTimeout(function(){
      if(query.trim().length>=2)loadExplore(query);
    },300);
  });
  document.getElementById('desktop-search-form')?.addEventListener('submit',function(event){
    event.preventDefault();
    loadExplore(search.value);
  });

  window.addEventListener('online',async function(){setNetworkState(true);await restoreSession().catch(()=>{});retryCurrentView()});
  window.addEventListener('offline',function(){setNetworkState(false,'Tu es hors ligne · lecture du cache disponible')});
}

function bindDelegatedEvents(){
  document.addEventListener('click',async function(event){
    if(event.target.closest('[data-retry-home]')){retryCurrentView();return}

    const circleView=event.target.closest('.circle[data-view="circles"]');
    if(circleView){loadCircles();return}

    const profile=event.target.closest('[data-profile]');
    if(profile){loadProfile(profile.dataset.profile);return}

    const post=event.target.closest('.pulse-post');
    const action=event.target.closest('[data-action]');
    if(post&&action){
      const postId=post.dataset.id;
      if(['like','repost','bookmark'].includes(action.dataset.action)){
        toggleAction(postId,action.dataset.action);
        return;
      }
      if(action.dataset.action==='reply'){
        const handle=post.querySelector('[data-profile]')?.dataset.profile||'';
        setView('home','Accueil');
        setReply(postId,handle);
        return;
      }
      if(action.dataset.action==='share'){
        const shareUrl=location.origin+location.pathname+'?post='+encodeURIComponent(postId);
        if(navigator.share)navigator.share({title:'ZOON',url:shareUrl}).catch(function(){});
        else navigator.clipboard?.writeText(shareUrl).then(()=>toast('Lien copié'));
        return;
      }
      if(action.dataset.action==='report'){reportPost(postId);return}
    }

    const join=event.target.closest('[data-circle-join]');
    if(join){
      if(!requireAuth())return;
      try{
        await api('/api/pulse/circles/'+encodeURIComponent(join.dataset.circleJoin)+'/join',{method:'POST',body:'{}'});
        await loadCircles();
        loadCirclePreview();
      }catch(error){toast(errorText(error))}
      return;
    }

    const follow=event.target.closest('[data-follow]');
    if(follow){
      try{
        await api('/api/pulse/users/'+encodeURIComponent(follow.dataset.follow)+'/follow',{method:'POST',body:'{}'});
        await loadProfile(follow.dataset.follow);
      }catch(error){toast(errorText(error))}
      return;
    }

    const block=event.target.closest('[data-block]');
    if(block){
      if(!confirm('Bloquer @'+block.dataset.block+' ?'))return;
      try{
        await api('/api/pulse/users/'+encodeURIComponent(block.dataset.block)+'/block',{method:'POST',body:'{}'});
        await loadHome();
      }catch(error){toast(errorText(error))}
      return;
    }

    if(event.target.closest('[data-export]')){exportData();return}
    if(event.target.closest('[data-profile-edit]')){editProfile();return}
    if(event.target.closest('[data-logout]')){doLogout();return}
  });

  document.addEventListener('submit',async function(event){
    if(event.target.id==='explore-form'){
      event.preventDefault();
      const query=new FormData(event.target).get('q')||'';
      loadExplore(String(query));
      return;
    }

    if(event.target.id==='circle-create'){
      event.preventDefault();
      if(!requireAuth())return;
      const form=new FormData(event.target);
      try{
        await api('/api/pulse/circles',{method:'POST',body:JSON.stringify({name:form.get('name'),description:form.get('description')})});
        await loadCircles();
        loadCirclePreview();
      }catch(error){toast(errorText(error))}
    }
  });
}

async function init(){
  bindStaticEvents();
  bindDelegatedEvents();
  updateAccount();
  if(navigator.onLine===false)setNetworkState(false,'Tu es hors ligne · lecture du cache disponible');

  const sessionPromise=restoreSession().catch(()=>{});
  await sessionPromise;
  await loadHome();
  loadCirclePreview();
}

init().catch(function(error){
  console.error('[ZOON] startup',error);
  setNetworkState(false,'ZOON a rencontré un problème de démarrage');
});
