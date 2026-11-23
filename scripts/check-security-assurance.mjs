/**
 * Evidence-accountability gate. It checks structure and trusted auditor signatures;
 * it does NOT prove that the underlying protocol is secure or EU-certified.
 * Trust keys must come from a protected environment, never from the evidence file.
 */
import { createPublicKey, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const IDS = ['scattering', 'identity', 'messaging', 'payments'];
const PERMISSIONS = [
  'claimAnonymity', 'migrateRealIdentity',
  'claimPostCompromiseMessaging', 'enableRealPayments',
];
const HEX256 = /^[0-9a-f]{64}$/;
const KEY_ID = /^[a-zA-Z0-9._-]{3,64}$/;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function requireKeys(o, keys, context) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('Invalid ' + context);
  const actual = Object.keys(o).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...keys].sort())) {
    throw new Error('Unexpected/missing fields in ' + context);
  }
}
function requireString(s, context) {
  if (typeof s !== 'string' || !s.trim() || s.length > 6000) throw new Error('Invalid ' + context);
}
function unique(list) { return new Set(list).size === list.length; }
function verifyAttestation(statement, attestation, roots) {
  const pem = roots[attestation.keyId];
  if (typeof pem !== 'string') return false;
  try {
    const key = createPublicKey(pem);
    if (key.asymmetricKeyType !== 'ed25519') return false;
    const signature = Buffer.from(attestation.signature, 'base64');
    if (signature.length !== 64) return false;
    return verify(null, Buffer.from(statement, 'utf8'), key, signature);
  } catch { return false; }
}
export function signedStatement(document, pillar) {
  return JSON.stringify({
    domain: document.domain,
    schema: document.schema,
    lastReviewed: document.lastReviewed,
    state: document.state,
    productionPermissions: document.productionPermissions,
    pillar: {
      id: pillar.id,
      title: pillar.title,
      model: pillar.model,
      state: pillar.state,
      criteria: pillar.criteria,
      evidence: pillar.evidence,
    },
  });
}
export function evaluateAssurance(document, roots = {}) {
  requireKeys(document, ['schema', 'lastReviewed', 'state', 'domain', 'productionPermissions', 'pillars'], 'document');
  if (document.schema !== 1 || document.domain !== 'quantic-sillage-security-assurance-v1') {
    throw new Error('Unsupported assurance schema/domain');
  }
  if (!/^20\d\d-\d\d-\d\d$/.test(document.lastReviewed)) throw new Error('Invalid date');
  if (!['NOT_CERTIFIED', 'CERTIFIED'].includes(document.state)) throw new Error('Invalid overall state');
  requireKeys(document.productionPermissions, PERMISSIONS, 'production permissions');
  for (const value of Object.values(document.productionPermissions)) {
    if (typeof value !== 'boolean') throw new Error('Invalid permission');
  }
  if (!Array.isArray(document.pillars) || document.pillars.length !== 4 ||
      !document.pillars.every((p, i) => p?.id === IDS[i])) {
    throw new Error('Four pillars are required in canonical order');
  }
  const results = [];
  for (const pillar of document.pillars) {
    requireKeys(pillar, ['id', 'title', 'state', 'model', 'criteria', 'evidence', 'attestations'], 'pillar');
    requireString(pillar.title, 'title');
    requireString(pillar.model, 'threat model');
    if (!['NOT_PROVEN', 'REVIEWED'].includes(pillar.state)) throw new Error('Invalid pillar status');
    if (!Array.isArray(pillar.criteria) || pillar.criteria.length < 4 ||
      !pillar.criteria.every(c => typeof c === 'string' && /^[a-z0-9-]{4,80}$/.test(c)) ||
      !unique(pillar.criteria)) throw new Error('Invalid criteria');
    if (!Array.isArray(pillar.evidence) || pillar.evidence.length > 32) throw new Error('Invalid evidence list');
    for (const e of pillar.evidence) {
      requireKeys(e, ['criterion', 'sha256', 'url'], 'evidence');
      if (!pillar.criteria.includes(e.criterion) || !HEX256.test(e.sha256) ||
          typeof e.url !== 'string' || !/^https:\/\//.test(e.url) || e.url.length > 1200) {
        throw new Error('Invalid evidence reference');
      }
    }
    if (!unique(pillar.evidence.map(e => e.criterion))) throw new Error('Duplicate evidence criterion');
    if (!Array.isArray(pillar.attestations) || pillar.attestations.length > 12) {
      throw new Error('Invalid attestations');
    }
    for (const a of pillar.attestations) {
      requireKeys(a, ['keyId', 'signature'], 'attestation');
      if (!KEY_ID.test(a.keyId) || typeof a.signature !== 'string' ||
          a.signature.length > 256 || !BASE64.test(a.signature)) {
        throw new Error('Invalid attestation');
      }
    }
    if (!unique(pillar.attestations.map(a => a.keyId))) throw new Error('Duplicate attestation key');
    const covered = pillar.criteria.every(c => pillar.evidence.some(e => e.criterion === c));
    const statement = signedStatement(document, pillar);
    const verifiedAuditors = pillar.attestations.filter(a => verifyAttestation(statement, a, roots))
      .map(a => a.keyId);
    results.push({
      id: pillar.id,
      covered,
      verifiedAuditorCount: verifiedAuditors.length,
      approved: pillar.state === 'REVIEWED' && covered && verifiedAuditors.length >= 2,
      missingCriteria: pillar.criteria.filter(c => !pillar.evidence.some(e => e.criterion === c)),
    });
  }
  const permissionsGranted = Object.values(document.productionPermissions).every(Boolean);
  const ready = document.state === 'CERTIFIED' && permissionsGranted && results.every(r => r.approved);
  return {
    ready,
    blockers: results.filter(r => !r.approved).map(r => r.id),
    results,
    warning: 'Signed evidence is a review gate, not proof of cryptographic security. Enforce this check in a protected deployment pipeline.',
  };
}
function cli() {
  const args = process.argv.slice(2);
  if (args.some(a => !['--check', '--assert-release'].includes(a))) {
    throw new Error('Usage: node scripts/check-security-assurance.mjs [--check|--assert-release]');
  }
  const target = resolve(fileURLToPath(new URL('../security/four-pillars-assurance.json', import.meta.url)));
  const document = JSON.parse(readFileSync(target, 'utf8'));
  // No trust roots are bundled with the repository. These MUST be pinned in
  // a protected deployment environment and sourced independently of PR content.
  const roots = JSON.parse(process.env.QUANTIC_ASSURANCE_AUDITOR_KEYS || '{}');
  const result = evaluateAssurance(document, roots);
  console.log(JSON.stringify(result, null, 2));
  if (args.includes('--assert-release') && !result.ready) process.exitCode = 2;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { cli(); } catch (e) { console.error('Assurance gate refused: ' + e.message); process.exitCode = 2; }
}
