(()=>{"use strict";
const SECURE_BRIDGE="http://127.0.0.1:47621";
const QUANTIC_ID_ACCESS_ENABLED=false;
const APPS=[
["Sillage","index.html"],["Pulse","pulse.html"],["Mail","https://quanticmail.onrender.com"],["News","news.html"],["Vision","solutions.html#providence"],["Glide","solutions.html#browser"],["OS","solutions.html#quanticos"]
];
function el(tag,attrs={},html=""){const n=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==="class")n.className=v;else if(k.startsWith("data-"))n.setAttribute(k,v);else n[k]=v});if(html)n.innerHTML=html;return n}
function ensureEnterButtons(){
 const buttons=[...document.querySelectorAll("[data-quantic-enter]")];
 if(!buttons.length){
   const btn=el("button",{class:"qs-global-enter",type:"button","data-quantic-enter":"true",textContent:"Entrer"});
   const header=document.querySelector(".qs-header-inner");
   const pulse=document.querySelector(".pulse-top-actions");
   if(header){const contact=header.querySelector(".qs-contact");header.insertBefore(btn,contact||header.querySelector(".qs-menu")||null)}
   else if(pulse){pulse.insertBefore(btn,pulse.firstChild)}
   else{btn.style.position="fixed";btn.style.right="22px";btn.style.top="18px";btn.style.zIndex="9000";document.body.appendChild(btn)}
   buttons.push(btn);
 }
 return buttons
}
function createOverlay(){
 if(document.querySelector(".qs-id-overlay"))return document.querySelector(".qs-id-overlay");
 const o=el("div",{class:"qs-id-overlay",hidden:true});
 o.innerHTML='<section class="qs-id-card" role="dialog" aria-modal="true" aria-labelledby="qs-id-title"><button class="qs-id-close" aria-label="Fermer">×</button><span class="qs-id-kicker">Quantic ID</span><h2 id="qs-id-title">Entrer.</h2><p>Activez votre identité Quantic sur cet appareil. Aucun identifiant ni mot de passe n’est demandé.</p><div class="qs-id-state" data-state="idle"><i class="qs-id-dot"></i><div><strong>Identité inactive</strong><span>Activez Quantic Secure ou insérez votre Quantic Key.</span></div></div><div class="qs-id-actions"><button class="qs-id-action primary" data-id-detect>Détecter mon identité</button><a class="qs-id-action" href="identity.html">Découvrir Quantic ID</a></div><p class="qs-id-foot">Votre clé privée reste sur l’appareil. Sillage ne reçoit qu’une preuve cryptographique.</p></section>';
 document.body.appendChild(o);
 const close=()=>{o.hidden=true;document.body.style.overflow=""};
 o.querySelector(".qs-id-close").addEventListener("click",close);
 o.addEventListener("click",e=>{if(e.target===o)close()});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!o.hidden)close()});
 o.querySelector("[data-id-detect]").addEventListener("click",detectIdentity);
 return o
}
function setState(mode,title,detail){const box=document.querySelector(".qs-id-state");if(!box)return;box.dataset.state=mode;box.querySelector("strong").textContent=title;box.querySelector("span").textContent=detail}
async function detectIdentity(){
 setState("checking","Recherche en cours…","Vérification de Quantic Secure et des capacités cryptographiques de l’appareil.");
 let bridge=null;
 try{const c=new AbortController();const timer=setTimeout(()=>c.abort(),900);const r=await fetch(SECURE_BRIDGE+"/v1/status",{signal:c.signal,cache:"no-store"});clearTimeout(timer);if(r.ok)bridge=await r.json()}catch{}
 if(bridge&&bridge.identityAvailable){
   setState("ready","Identité prête",bridge.label||"Quantic Secure a détecté une identité active.");
   document.querySelectorAll("[data-quantic-enter]").forEach(b=>b.dataset.ready="true");
   return
 }
 const webauthn=!!(window.PublicKeyCredential&&navigator.credentials&&window.isSecureContext);
 if(webauthn)setState("idle","Quantic Secure non détecté","Cet appareil est compatible. Activez Quantic Secure ou insérez votre Quantic Key.");
 else setState("idle","Identité indisponible","Utilisez un contexte sécurisé et activez Quantic Secure.")
}
function appSwitcher(){
 if(document.querySelector(".qs-app-switcher"))return;
 const box=el("div",{class:"qs-app-switcher"});
 const b=el("button",{type:"button","aria-label":"Applications Quantic","aria-expanded":"false"});
 b.innerHTML='<span class="qs-app-grid-icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
 const m=el("div",{class:"qs-app-menu",hidden:true});
 APPS.forEach(([name,href])=>{const a=el("a",{href});a.innerHTML="<span>"+name+"</span><small>↗</small>";m.appendChild(a)});
 const close=()=>{m.hidden=true;b.setAttribute("aria-expanded","false")};
 b.addEventListener("click",e=>{e.stopPropagation();m.hidden=!m.hidden;b.setAttribute("aria-expanded",String(!m.hidden))});
 document.addEventListener("click",e=>{if(!box.contains(e.target))close()});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
 box.append(b,m);document.body.appendChild(box)
}
function boot(){
 if(!QUANTIC_ID_ACCESS_ENABLED){
   document.querySelectorAll("[data-quantic-enter]").forEach((button)=>{
     button.hidden=true;
     button.setAttribute("aria-hidden","true");
     button.disabled=true;
   });
   document.documentElement.dataset.quanticIdentityGate="suspended";
   appSwitcher();
   return;
 }
 const buttons=ensureEnterButtons(),o=createOverlay();
 buttons.forEach(b=>b.addEventListener("click",()=>{o.hidden=false;document.body.style.overflow="hidden";detectIdentity()}));
 appSwitcher()
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",boot):boot();
})();