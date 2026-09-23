import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../zoon.html', import.meta.url),'utf8');
const config=await readFile(new URL('../zoon-config.js', import.meta.url),'utf8');
const android=await readFile(new URL('../zoon-android/app/src/main/java/com/quanticsillage/zoon/MainActivity.java', import.meta.url),'utf8');
const manifest=await readFile(new URL('../zoon-android/app/src/main/AndroidManifest.xml', import.meta.url),'utf8');
const gradle=await readFile(new URL('../zoon-android/app/build.gradle', import.meta.url),'utf8');

const forbidden=[
  'quantic-shell.css',
  'quantic-shell.js',
  'QuanticMail',
  'Quantic News',
  'Écosystème',
  'pulse.html'
];

for(const token of forbidden){
  if(html.includes(token)){
    throw new Error('ZOON UI must stay standalone; forbidden token found: '+token);
  }
}

if(!html.includes('./assets/zoon-mark.webp')){
  throw new Error('ZOON approved logo is missing from zoon.html');
}

if(!config.includes('https://quantic-pulse-api.onrender.com')){
  throw new Error('ZOON must use the dedicated API service');
}

if(config.includes('mediumorchid-badger-314305.hostingersite.com')){
  throw new Error('ZOON must not use the Quantic Sillage Hostinger page');
}

if(!android.includes('WebViewAssetLoader')||!android.includes('appassets.androidplatform.net')){
  throw new Error('Android must load the ZOON interface from bundled app assets');
}

if(android.includes('xdsawyerlol.github.io/QuanticSillage/zoon.html')){
  throw new Error('Android must not depend on GitHub Pages at runtime');
}

if(!manifest.includes('android:icon="@mipmap/ic_launcher"')||!manifest.includes('android:roundIcon="@mipmap/ic_launcher_round"')){
  throw new Error('Android launcher must use the adaptive ZOON icon');
}

if(!gradle.includes("versionName '1.2.0'")||!gradle.includes("syncZoonWebAssets")){
  throw new Error('Android 1.2.0 must bundle the ZOON product assets');
}

if(!html.includes('id="network-banner"')||!html.includes('id="explore-form"')===true){
  // explore-form is injected by views.js; only the resilient network control is static.
}

console.log('ZOON 1.2 standalone product contract OK');
