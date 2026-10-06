const AURA_URL=String(process.env.AURA_CLOUD_URL||'https://antiquewhite-dolphin-780448.hostingersite.com').replace(/\/$/,'');
const LEGACY_ALLOWED=['1','true','yes','oui','on'].includes(String(process.env.AURA_ALLOW_LEGACY_PRODUCT_ADMIN_TOKEN||'').trim().toLowerCase());
const LEGACY_TOKEN=LEGACY_ALLOWED?String(process.env.AURA_CLOUD_TOKEN||'').trim():'';
const PRODUCT_TOKENS={
  zoon:String(process.env.AURA_ZOON_TOKEN||process.env.AURA_PRODUCT_TOKEN_ZOON||'').trim(),
  pulse:String(process.env.AURA_PULSE_TOKEN||process.env.AURA_PRODUCT_TOKEN_PULSE||'').trim(),
  'quantic-news':String(process.env.AURA_QUANTIC_NEWS_TOKEN||process.env.AURA_PRODUCT_TOKEN_QUANTIC_NEWS||'').trim(),
};
const tokenFor=(id)=>PRODUCT_TOKENS[id]||LEGACY_TOKEN;
const BRIDGE_VERSION='aura-universal-bridge-v2-scoped';

const PRODUCTS=[
  {
    id:'zoon',
    name:'ZOON',
    objective:'Couche sociale Quantic : publications, interactions, médias et flux.',
    repository:'XDSawyerLoL/QuanticSillage',
    criticality:.82,
    capabilities:['social','feed','publishing','media','community']
  },
  {
    id:'pulse',
    name:'Quantic Pulse',
    objective:'Couche sociale historique/compatibilité et flux conversationnels Quantic.',
    repository:'XDSawyerLoL/QuanticSillage',
    criticality:.70,
    capabilities:['social','feed','secure-session']
  },
  {
    id:'quantic-news',
    name:'Quantic News',
    objective:'Veille informationnelle et production de flux d’actualité Quantic.',
    repository:'XDSawyerLoL/QuanticSillage',
    criticality:.78,
    capabilities:['news','rss','monitoring','publishing','sources']
  }
];

async function post(productId,path,body){
  const token=tokenFor(productId);
  if(!token)return null;
  const r=await fetch(AURA_URL+path,{
    method:'POST',
    headers:{
      'content-type':'application/json',
      accept:'application/json',
      authorization:'Bearer '+token,
      'user-agent':'QuanticSillage/AURA-Bridge-1'
    },
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(8000)
  });
  const text=await r.text();
  if(!r.ok)throw new Error('AURA HTTP '+r.status+': '+text.slice(0,240));
  return text?JSON.parse(text):{};
}

export async function registerQuanticSillageProducts(publicEndpoint=''){
  if(!PRODUCTS.some((product)=>Boolean(tokenFor(product.id))))return false;
  let ok=true;
  for(const product of PRODUCTS){
    try{
      await post(product.id,'/api/aura/products/register',{
        ...product,
        endpoint:publicEndpoint,
        state:'online',
        writable_by_aura:true,
        modification_policy:'branch-test-canary-promote',
        bridge_version:BRIDGE_VERSION,
        runtime:{
          backend:'quantic-sillage-backend',
          content_exposure:'public-or-operational-metadata-only'
        }
      });
    }catch{
      ok=false;
    }
  }
  return ok;
}

export async function observeQuanticSillageProduct(id,state='online',detail='',metadata={}){
  if(!tokenFor(id))return false;
  try{
    await post(id,'/api/aura/products/'+encodeURIComponent(id)+'/observe',{
      state,detail,
      metadata:{
        ...metadata,
        bridge_version:BRIDGE_VERSION,
        private_content_forwarded:false
      }
    });
    return true;
  }catch{
    return false;
  }
}

let timer=null;
export function startAuraHeartbeat(publicEndpoint=''){
  if(!PRODUCTS.some((product)=>Boolean(tokenFor(product.id)))||timer)return;
  void registerQuanticSillageProducts(publicEndpoint);
  timer=setInterval(()=>{
    for(const product of PRODUCTS){
      void observeQuanticSillageProduct(product.id,'online','Backend Quantic Sillage actif.',{public_endpoint:publicEndpoint});
    }
  },120000);
  timer.unref?.();
}

export function stopAuraHeartbeat(){
  if(timer)clearInterval(timer);
  timer=null;
}
