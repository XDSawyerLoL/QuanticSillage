import { state, dom, api, esc, icon, initials, timeAgo, setStatus, errorText, readFeedCache, writeFeedCache } from './core.js';
import { requireAuth } from './session.js';
import { renderPost, renderPosts, notificationLabel } from './render.js';

export function setView(view,title){
  state.view=view;
  dom.viewTitle.textContent=title||'ZOON';
  document.querySelectorAll('[data-view]').forEach(function(button){
    button.classList.toggle('active',button.dataset.view===view);
  });
  dom.feedTabs.hidden=view!=='home';
  dom.composer.hidden=view!=='home'||!state.user;
  dom.welcome.hidden=view!=='home'||!!state.user;
  window.scrollTo({top:0,behavior:'auto'});
}

function cachedNote(savedAt){
  const when=savedAt?timeAgo(savedAt):'';
  return '<div class="zoon-offline-note">Mode lecture · dernière synchronisation '+esc(when||'récente')+'.</div>';
}

export async function loadHome(){
  setView('home','Accueil');
  const cached=readFeedCache(state.feed);
  if(cached?.posts?.length){
    renderPosts(cached.posts);
  }else{
    dom.feed.innerHTML='<div class="zoon-skeleton"><i></i><div><span></span><span></span><span></span></div></div>';
  }

  try{
    const data=await api('/api/pulse/feed?mode='+encodeURIComponent(state.feed)+'&limit=40');
    const posts=Array.isArray(data.posts)?data.posts:[];
    writeFeedCache(state.feed,posts);
    renderPosts(posts,state.user&&state.feed==='following'?'Ton fil est vide. Explore ZOON et suis quelques comptes.':'Aucune publication pour le moment.');
  }catch(error){
    if(cached?.posts?.length){
      renderPosts(cached.posts);
      dom.feed.insertAdjacentHTML('afterbegin',cachedNote(cached.savedAt));
      return;
    }
    setStatus('Le fil ne charge pas',errorText(error),'Réessayer');
  }
}

function exploreShell(query=''){
  return '<section class="pulse-view">'+
    '<div class="zoon-explore-search"><form id="explore-form">'+
      '<input name="q" type="search" minlength="2" autocomplete="off" placeholder="Personne, sujet, mot-clé…" value="'+esc(query)+'">'+
      '<button aria-label="Rechercher"><svg class="pi"><use href="#pi-search"></use></svg></button>'+
    '</form></div>'+
    '<div id="explore-results"></div>'+
  '</section>';
}

export async function loadExplore(query=''){
  setView('explore','Explorer');
  dom.feed.innerHTML=exploreShell(query);
  const target=document.getElementById('explore-results');
  if(query.trim().length<2){
    target.innerHTML='<div class="pulse-status"><strong>Explore ZOON</strong><span>Recherche un compte, un sujet ou une publication.</span></div>';
    return;
  }

  target.innerHTML='<div class="zoon-skeleton"><i></i><div><span></span><span></span><span></span></div></div>';
  try{
    const data=await api('/api/pulse/search?q='+encodeURIComponent(query.trim()));
    let html='<div class="pulse-card-list">';
    (data.users||[]).forEach(function(user){
      html+='<div class="pulse-card pulse-user-card"><div class="pulse-avatar">'+esc(initials(user))+'</div><div><strong>'+esc(user.displayName)+'</strong><small>@'+esc(user.handle)+' · '+Number(user.followers||0)+' abonnés</small></div><button class="pulse-mini-button" data-profile="'+esc(user.handle)+'">Voir</button></div>';
    });
    html+='</div>';
    if(data.posts?.length)html+=data.posts.map(renderPost).join('');
    if(!data.users?.length&&!data.posts?.length)html+='<div class="pulse-status"><strong>Aucun résultat</strong><span>Essaie une autre recherche.</span></div>';
    target.innerHTML=html;
  }catch(error){
    target.innerHTML='<div class="pulse-status"><strong>Recherche indisponible</strong><span>'+esc(errorText(error))+'</span></div>';
  }
}

export async function loadCircles(){
  setView('circles','Communautés');
  dom.feed.innerHTML='<div class="zoon-skeleton"><i></i><div><span></span><span></span><span></span></div></div>';
  try{
    const data=await api('/api/pulse/circles');
    let html='<section class="pulse-view"><div class="pulse-view-head"><h2>Communautés</h2><p>Des espaces simples autour d’un sujet ou d’un projet.</p></div>';
    if(state.user)html+='<form class="pulse-inline-form two" id="circle-create"><input name="name" minlength="3" maxlength="60" placeholder="Nom" required><input name="description" maxlength="240" placeholder="Description"><button class="pulse-mini-button primary">Créer</button></form>';
    html+='<div class="pulse-card-list">';
    if(!data.circles?.length)html+='<div class="pulse-card"><p>Aucune communauté publique pour le moment.</p></div>';
    (data.circles||[]).forEach(function(circle){
      html+='<div class="pulse-card"><div class="pulse-card-row"><div><h3>'+esc(circle.name)+'</h3><div class="pulse-card-meta">'+Number(circle.memberCount||0)+' membres</div></div><button class="pulse-mini-button '+(circle.joined?'':'primary')+'" data-circle-join="'+esc(circle.id)+'">'+(circle.joined?'Quitter':'Rejoindre')+'</button></div><p>'+esc(circle.description||'')+'</p></div>';
    });
    dom.feed.innerHTML=html+'</div></section>';
  }catch(error){
    setStatus('Communautés indisponibles',errorText(error),'Réessayer');
  }
}

export async function loadNotifications(){
  if(!requireAuth())return;
  setView('notifications','Notifications');
  setStatus('Chargement','');
  try{
    const data=await api('/api/pulse/notifications');
    let html='<section class="pulse-view"><div class="pulse-view-head"><h2>Notifications</h2><p>Seulement ce qui mérite ton attention.</p></div><div class="pulse-card-list">';
    if(!data.notifications?.length)html+='<div class="pulse-card"><p>Aucune notification.</p></div>';
    (data.notifications||[]).forEach(function(notification){
      const actor=notification.actor||{};
      html+='<div class="pulse-card pulse-notification '+(notification.read?'':'unread')+'"><strong>'+esc(actor.displayName||'Quelqu’un')+'</strong> '+esc(notificationLabel(notification.type))+'<div class="pulse-card-meta">'+esc(timeAgo(notification.createdAt))+'</div></div>';
    });
    dom.feed.innerHTML=html+'</div></section>';
    await api('/api/pulse/notifications/read',{method:'POST',body:'{}'});
  }catch(error){
    setStatus('Notifications indisponibles',errorText(error),'Réessayer');
  }
}

export async function loadSaved(){
  if(!requireAuth())return;
  setView('saved','Enregistrés');
  setStatus('Chargement','');
  try{
    const data=await api('/api/pulse/me/bookmarks');
    renderPosts(data.posts,'Tu n’as encore enregistré aucune publication.');
  }catch(error){
    setStatus('Enregistrés indisponibles',errorText(error),'Réessayer');
  }
}

export async function loadProfile(handle){
  if(!handle){
    if(!requireAuth())return;
    handle=state.user.handle;
  }
  setView('profile','Profil');
  setStatus('Chargement du profil','');
  try{
    const data=await api('/api/pulse/users/'+encodeURIComponent(handle));
    const user=data.user;
    const self=state.user&&state.user.id===user.id;
    let actions='';
    if(self){
      actions='<button class="pulse-mini-button primary" data-profile-edit>Modifier</button><button class="pulse-mini-button" data-export>Exporter</button><button class="pulse-mini-button danger" data-logout>Déconnexion</button>';
    }else if(state.user){
      actions='<button class="pulse-mini-button primary" data-follow="'+esc(user.handle)+'">'+(user.isFollowing?'Se désabonner':'Suivre')+'</button><button class="pulse-mini-button danger" data-block="'+esc(user.handle)+'">Bloquer</button>';
    }
    dom.feed.innerHTML='<section class="pulse-profile-hero"><div class="pulse-avatar">'+esc(initials(user))+'</div><h2>'+esc(user.displayName)+'</h2><div class="handle">@'+esc(user.handle)+'</div><p>'+esc(user.bio||'Aucune bio pour le moment.')+'</p><div class="pulse-profile-stats"><span><strong>'+Number(user.followers||0)+'</strong> abonnés</span><span><strong>'+Number(user.following||0)+'</strong> abonnements</span></div><div class="pulse-profile-actions">'+actions+'</div></section>'+((data.posts||[]).map(renderPost).join('')||'<div class="pulse-status"><strong>Aucune publication</strong></div>');
  }catch(error){
    setStatus('Profil indisponible',errorText(error),'Réessayer');
  }
}

/* The backend supports E2EE. This web client intentionally does not expose a
   plaintext fallback. Secure messaging returns when the device session client
   is integrated here. */
export async function loadMessages(){
  if(!requireAuth())return;
  setView('messages','Messages');
  dom.feed.innerHTML='<section class="pulse-view"><div class="pulse-view-head"><h2>Messagerie sécurisée</h2><p>ZOON ne retombera pas en clair si la couche de chiffrement n’est pas prête sur cet appareil.</p></div><div class="pulse-status"><strong>Activation en cours</strong><span>La publication, les profils et les communautés restent disponibles.</span></div></section>';
}

export async function loadConversation(){
  return loadMessages();
}

export async function loadCirclePreview(){
  const target=document.getElementById('circle-preview');
  if(!target)return;
  try{
    const data=await api('/api/pulse/circles');
    target.innerHTML=(data.circles||[]).slice(0,3).map(function(circle){
      return '<button class="circle" data-view="circles"><span class="circle-mark">'+esc(circle.name.slice(0,2).toUpperCase())+'</span><span><strong>'+esc(circle.name)+'</strong><small>'+Number(circle.memberCount||0)+' membres</small></span><span class="circle-chevron">'+icon('pi-chevron')+'</span></button>';
    }).join('')||'<div class="pulse-panel-loading">Aucune communauté publique.</div>';
  }catch{
    target.innerHTML='<div class="pulse-panel-loading">Communautés indisponibles</div>';
  }
}
