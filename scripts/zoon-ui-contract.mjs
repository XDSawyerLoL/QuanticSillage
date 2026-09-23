import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../zoon.html', import.meta.url),'utf8');
const android=await readFile(new URL('../zoon-android/app/src/main/java/com/quanticsillage/zoon/MainActivity.java', import.meta.url),'utf8');

const forbidden=[
  'quantic-shell.css',
  'quantic-shell.js',
  'QuanticMail',
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

if(!html.includes('data-feed="news"')||!html.includes('Quantic News')){
  throw new Error('ZOON 1.2 must expose the embedded Quantic News feed');
}

if(!android.includes('https://xdsawyerlol.github.io/QuanticSillage/zoon.html')){
  throw new Error('Android must load the standalone ZOON deployment');
}

if(android.includes('mediumorchid-badger-314305.hostingersite.com')){
  throw new Error('Android must not load the Quantic Sillage Hostinger shell');
}

console.log('ZOON standalone contract OK');
