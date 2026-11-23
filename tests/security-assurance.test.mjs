import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateAssurance, signedStatement, publicationBoundary } from '../scripts/check-security-assurance.mjs';

const manifest = JSON.parse(readFileSync(fileURLToPath(
  new URL('../security/four-pillars-assurance.json', import.meta.url)), 'utf8'));
const copy = () => structuredClone(manifest);
function fakeReviewed() {
  const doc = copy();
  doc.state = 'CERTIFIED';
  for (const k of Object.keys(doc.productionPermissions)) doc.productionPermissions[k] = true;
  for (const p of doc.pillars) {
    p.state = 'REVIEWED';
    p.evidence = p.criteria.map((criterion, n) => ({
      criterion, sha256: (n % 2 ? 'b' : 'a').repeat(64),
      url: 'https://example.invalid/external-review/' + p.id + '/' + criterion,
    }));
  }
  return doc;
}
function signAs(document, keys) {
  for (const pillar of document.pillars) {
    const statement = Buffer.from(signedStatement(document, pillar), 'utf8');
    pillar.attestations = keys.map((k) => ({
      keyId: k.id,
      signature: sign(null, statement, k.privateKey).toString('base64'),
    }));
  }
}
function auditors() {
  return ['auditor-alpha', 'auditor-beta'].map(id => {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    return { id, privateKey, pem: publicKey.export({ type: 'spki', format: 'pem' }) };
  });
}
test('all four production claims and live permissions start blocked', () => {
  const result = evaluateAssurance(manifest);
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ['scattering', 'identity', 'messaging', 'payments']);
  assert.ok(Object.values(manifest.productionPermissions).every(v => v === false));
});
test('status strings and fabricated hashes alone never authorize release', () => {
  const result = evaluateAssurance(fakeReviewed());
  assert.equal(result.ready, false);
  assert.ok(result.results.every(p => p.covered && p.verifiedAuditorCount === 0));
});
test('one valid independent auditor signature is insufficient', () => {
  const doc = fakeReviewed();
  const keys = auditors();
  signAs(doc, keys.slice(0, 1));
  const roots = Object.fromEntries(keys.map(k => [k.id, k.pem]));
  assert.equal(evaluateAssurance(doc, roots).ready, false);
});
test('two externally pinned Ed25519 auditors can authorize a synthetic checklist', () => {
  const doc = fakeReviewed();
  const keys = auditors();
  signAs(doc, keys);
  const roots = Object.fromEntries(keys.map(k => [k.id, k.pem]));
  const result = evaluateAssurance(doc, roots);
  assert.equal(result.ready, true);
  assert.ok(result.results.every(p => p.verifiedAuditorCount === 2));
  // This only proves the approval gate's signature logic, NOT the evidence itself.
  doc.pillars[0].evidence[0].sha256 = 'f'.repeat(64);
  assert.equal(evaluateAssurance(doc, roots).ready, false);
});
test('unknown trust keys, signature substitutions and removed criteria fail closed', () => {
  const doc = fakeReviewed();
  const keys = auditors();
  signAs(doc, keys);
  const wrong = auditors();
  const wrongRoots = Object.fromEntries(wrong.map(k => [k.id, k.pem]));
  assert.equal(evaluateAssurance(doc, wrongRoots).ready, false);
  doc.pillars[1].evidence.pop();
  assert.equal(evaluateAssurance(doc).ready, false);
});
test('invalid schema, duplicate criteria, missing pillar or extraneous fields are rejected', () => {
  const doc = copy();
  doc.pillars.pop();
  assert.throws(() => evaluateAssurance(doc), /Four pillars/);
  const extra = copy();
  extra.productionPermissions.extra = false;
  assert.throws(() => evaluateAssurance(extra), /Unexpected/);
  const dup = copy();
  dup.pillars[0].criteria.push(dup.pillars[0].criteria[0]);
  assert.throws(() => evaluateAssurance(dup), /Invalid criteria/);
});

test('informational publishing stays allowed only while security claims stay disabled', () => {
  const doc = copy();
  assert.equal(publicationBoundary(doc, evaluateAssurance(doc), 'informational'), true);
  assert.equal(publicationBoundary(doc, evaluateAssurance(doc), 'sensitive'), false);
  doc.productionPermissions.enableRealPayments = true;
  assert.equal(publicationBoundary(doc, evaluateAssurance(doc), 'informational'), false);
  doc.productionPermissions.enableRealPayments = false;
  doc.state = 'CERTIFIED';
  assert.equal(publicationBoundary(doc, evaluateAssurance(doc), 'informational'), false);
});
test('a fully signed synthetic approval is handled separately from informational boundary', () => {
  const doc = fakeReviewed();
  const keys = auditors();
  signAs(doc, keys);
  const roots = Object.fromEntries(keys.map(k => [k.id,k.pem]));
  assert.equal(publicationBoundary(doc, evaluateAssurance(doc, roots), 'sensitive'), true);
  assert.equal(publicationBoundary(doc, evaluateAssurance(doc, roots), 'informational'), true);
  assert.throws(() => publicationBoundary(doc, evaluateAssurance(doc), 'something-else'), /Unknown/);
});
