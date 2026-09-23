import { TOKEN_KEY, state, dom, initials, api } from './core.js';

export function openAuth(mode='login'){
  state.authMode=mode;
  dom.authModal.hidden=false;
  updateAuthModal();
  setTimeout(function(){document.getElementById('auth-handle').focus()},40);
}

export function closeAuth(){
  dom.authModal.hidden=true;
  dom.authError.textContent='';
}

export function updateAuthModal(){
  const register=state.authMode==='register';
  document.getElementById('auth-title').textContent=register?'Créer ton compte':'Se connecter';
  document.getElementById('auth-copy').textContent=register?'Un identifiant, un mot de passe. Ton nom civil n’est pas requis.':'Retrouve ton profil et ton fil ZOON.';
  document.getElementById('display-name-field').hidden=!register;
  document.getElementById('auth-switch').textContent=register?'J’ai déjà un compte':'Créer un compte';
  document.getElementById('auth-password').autocomplete=register?'new-password':'current-password';
}

export function updateAccount(){
  const user=state.user;
  const name=document.getElementById('account-name');
  const handle=document.getElementById('account-handle');
  const avatar=document.getElementById('account-avatar');
  const composerAvatar=document.getElementById('composer-avatar');
  const button=document.getElementById('auth-button');

  if(user){
    name.textContent=user.displayName;
    handle.textContent='@'+user.handle;
    avatar.textContent=initials(user);
    composerAvatar.textContent=initials(user);
    button.textContent='@'+user.handle;
    dom.textarea.placeholder='Qu’as-tu à dire ?';
    dom.followingLabel.textContent='Abonnements';
    dom.followingHelp.textContent='Ton fil';
  }else{
    name.textContent='Compte ZOON';
    handle.textContent='Se connecter';
    avatar.textContent='?';
    composerAvatar.textContent='?';
    button.textContent='Connexion';
    dom.textarea.placeholder='Qu’as-tu à dire ?';
    dom.followingLabel.textContent='Récent';
    dom.followingHelp.textContent='Le fil public';
  }

  if(state.view==='home'){
    dom.composer.hidden=!user;
    dom.welcome.hidden=!!user;
  }
}

export function requireAuth(){
  if(state.user)return true;
  openAuth('login');
  return false;
}

export function applySession(data){
  state.token=data.token;
  state.user=data.user;
  localStorage.setItem(TOKEN_KEY,data.token);
  updateAccount();
}

export function clearSession(){
  state.token='';
  state.user=null;
  localStorage.removeItem(TOKEN_KEY);
  updateAccount();
}

export async function restoreSession(){
  if(!state.token){
    updateAccount();
    return;
  }

  try{
    const data=await api('/api/pulse/me');
    state.user=data.user;
  }catch(error){
    if(error?.status===401){
      state.token='';
      state.user=null;
      localStorage.removeItem(TOKEN_KEY);
    }
    /* A network outage is not a logout. Keep the local token and let the
       cache-first UI remain usable until the API comes back. */
  }
  updateAccount();
}
