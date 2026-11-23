import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

test('Quantic public Pages deployment must check informational assurance before building',()=>{
 const yaml=readFileSync(fileURLToPath(
   new URL('../.github/workflows/deploy-pages.yml',import.meta.url)), 'utf8');
 const gate=yaml.indexOf('node scripts/check-security-assurance.mjs --assert-public-site');
 const build=yaml.indexOf('npm run build');
 const deploy=yaml.indexOf('actions/deploy-pages@');
 assert.ok(gate>0 && build>gate && deploy>build);
});
