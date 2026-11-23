# Quantic Sillage — programme d'assurance des quatre piliers (23 novembre 2026)

## Principe de sécurité

**Aucune garantie absolue d'inviolabilité, d'anonymat universel, de récupération après toute compromission ou de conformité réglementaire automatique ne peut être revendiquée.**

Le mot « garantie » signifie ici : énoncé précis + hypothèses + preuve ou argument formel indépendant + tests adversariaux reproductibles + examen externe + limites résiduelles. Les affirmations de conformité et les autorisations réelles sont **bloquées** jusqu'à constitution de preuves examinées hors du projet.

Le fichier `security/four-pillars-assurance.json` est le registre de ces conditions. Son état initial est `NOT_CERTIFIED` et interdit les quatre activations/affirmations de production. L'outil `scripts/check-security-assurance.mjs` vérifie la structure et, si configurées par un administrateur indépendant, deux signatures Ed25519 externes distinctes par pilier.

**Ce mécanisme vérifie des validations, pas la vérité scientifique des rapports présentés.** Les clés publiques doivent être épinglées par une chaîne de livraison protégée, indépendante des PR, et jamais acceptées depuis un fichier fourni par un auteur de PR. Protéger la branche principale, rendre le contrôle obligatoire, restreindre les secrets d'environnement et faire examiner les preuves par un organisme qualifié restent des conditions organisationnelles non automatisées ici.

## 1 — Scattering : anonymat mathématiquement délimité

**Jeu d'indistinguabilité à définir :** un adversaire reçoit des traces de transmissions associées à deux expériences, l'une contenant du trafic utile et l'autre une activité équivalente avec trafic de couverture. Il observe explicitement taille, cadence, directions, destinations, retransmissions, pertes et états du réseau. Il prédit laquelle des deux expériences a eu lieu. 

**Cible formelle :** démontrer `Adv_A <= epsilon(lambda, charge, latence, topologie, observateur)` pour une famille d'adversaires et hypothèses explicites. Une borne ne vaut pas pour un adversaire global si le modèle ne le couvre pas. Les tests statistiques ne sont pas une preuve cryptographique. Les performances d'un seul classificateur sont une borne **inférieure** sur l'efficacité du meilleur attaquant, pas une borne supérieure. Il faut une preuve de modèle pour l'indistinguabilité, et des mesures indépendantes pour les hypothèses de déploiement.

- `adversary-model-reviewed` : adversaires passifs, actifs et observateur global ; hypothèses de réseau documentées.
- `formal-bound-independent-review` : preuve mathématique relue, limites, fonctions de charge et disponibilité explicites.
- `physical-two-host-test` : paquets sur deux appareils/réseaux physiques, pertes et dérive d'horloge, capture indépendante.
- `active-network-attack-test` : blocage, retards, injection, réordonnancement, crash, reprise et analyse statistique des retransmissions.

**Risque majeur :** congestion et attaques actives rendent les comportements distinguables même si tous les paquets ont la même taille.

## 2 — Secure Core V2 : identité et récupération

**Garantie visée :** après migration contrôlée, les **nouvelles opérations** privées nécessitent l'autorisation du coffre natif, sans export de racine par la page Web. Les autorisations peuvent être révoquées et l'intégrité de l'historique est testable indépendamment. La compromission de l'ancien navigateur ou d'un hôte déverrouillé ne peut pas être effacée rétroactivement ; une identité P-256 historiquement divulguée ne redevient pas secrète par simple déplacement.

- `legacy-secret-migration-integrity` : comparaison exhaustive archives, préclés, contacts, messages, outbox et files relayées ; journaux transactionnels ; coupures et reprise.
- `native-nonexportable-key-custody` : coffre natif, isolation de la page, permissions, contrôle de signature, protections OS/hardware selon support et essais sur vrais appareils.
- `postquantum-root-continuity` : racine ML-DSA reconnue, continuité avec l'identité existante, protection contre les forks, rollback et downgrade.
- `recovery-revocation-adversarial` : vol d'appareil, ancienne sauvegarde, réintroduction de jetons, révocation, récupération réelle sans effacement prématuré.
- `independent-security-audit` : évaluation du code et du protocole, y compris la chaîne de mise à jour et le périmètre post-compromission.

**Interdit :** une suite de tests synthétiques ne doit jamais autoriser `migrateRealIdentity` automatiquement. Maintenir le retour arrière des données historiques et les anciens accès jusqu'à validation puis révocation consentie.

## 3 — Quantic Mail : confidentialité dans le temps

**Garantie visée :** confidentialité des anciens messages sous hypothèses explicites de suppression des secrets, et récupération de la confidentialité des **nouveaux** messages après la fin d'une compromission temporaire et l'introduction de nouvelle entropie secrète authentifiée. Aucun logiciel ne peut garantir cette récupération si l'attaquant conserve le contrôle de l'appareil.

- `standard-ratchet-design-review` : s'appuyer sur mécanismes post-quantiques largement vérifiés (SPQR/Triple Ratchet, ou équivalent étudié), sans ratchet maison déployé sans revue.
- `formal-forward-and-postcompromise-analysis` : analyse formelle des états, rejeu, rekey, compromission temporaire, rétrocompatibilité et séparation des clés.
- `rekey-and-compromise-e2e-test` : tests de vol d'état, eviction, ratchet renouvelé, messages anciens et futurs, suppression des clés obsolètes.
- `multi-device-loss-recovery-test` : appareils hors ligne, réplications retardées, perte de préclé, rollback, migration et nouvelles inscriptions.
- `independent-security-audit` : revue indépendante du protocole réel et de ses bibliothèques.

**Interdit :** annoncer la sécurité post-compromission comme acquise au seul motif que P-256 + ML-KEM-768 protège une session initiale. Une clé statique n'est pas un ratchet.

## 4 — Quantic Pay : confidentialité et intégrité sans prétendre émettre des euros

**Garantie visée :** autorisation cryptographique et comptabilité des transactions soumises à des règles de fraude, de quorum et de réconciliation. En mode hors ligne, la prévention parfaite de toute double dépense sans matériel de confiance ou limite de risque est généralement impossible : définir précisément les limites, détecter et réconcilier les conflits.

- `offline-double-spend-risk-model` : rejouabilité, plafond de valeur, nombre de dépenses, durée hors ligne, appareil cloné et arbitrage des conflits.
- `durable-quorum-and-reconciliation` : divergence 2-2, partitions, journaux indépendants, réconciliation et impossibilité de faux reçu définitif.
- `privacy-selective-disclosure-proof` : divulgation minimale, audit de linkability/traçabilité et choix ZK respectant les normes du portefeuille ciblé.
- `eudi-or-psp-interop-tests` : spécifications courantes EUDI, interopérabilité avec un prestataire de services de paiement autorisé pour les scénarios pertinents.
- `regulated-approval-and-audit` : avis juridique/réglementaire, accès autorisé aux interfaces, certification et audit indépendants quand applicables.

**Interdit :** `enableRealPayments` avant autorisation réglementaire et tests externes. Les preuves fictives du laboratoire Windows ne valent pas certification, monnaie électronique ou euro numérique.

## Programme d'intégration et garde-fous de version

1. Maintenir PR #48 (migration coffre) distincte des travaux de recherche : aucune activation de vraie identité sans démonstration de restauration et de file complète.
2. PR #49 (Scattering) : comparer traces de simulation avec captures externes, puis définir le jeu de sécurité et une borne de distinction admissible ; ne pas confondre absence de détection avec garantie.
3. Prototype de ratchet post-quantique dans un sandbox de test, avant intégration à Mail ; spécification et audit formel exigés.
4. Maintenir Quantic Pay en simulation ; commencer la conformité et l'intégration technique avec des partenaires habilités, puis reproduire les attaques de partition/double dépense.
5. Établir une chaîne de publication protégée avec contrôle `--assert-release`, signatures d'au moins deux auditeurs indépendants, matrice de couverture des tests et revue humaine.

## Utilisation du vérificateur

```bash
node --test tests/security-assurance.test.mjs
node scripts/check-security-assurance.mjs --check
node scripts/check-security-assurance.mjs --assert-release
```

La dernière commande **doit échouer aujourd'hui**, puisque les garanties ne sont pas démontrées. Les tests synthétiques des signatures Ed25519 montrent seulement que le garde est correct dans ses cas testés. Pour toute autorisation future, `QUANTIC_ASSURANCE_AUDITOR_KEYS` doit être un JSON mapping `keyId -> PEM public Ed25519`, injecté exclusivement dans un environnement de déploiement protégé, avec validation humaine de l'indépendance des auditeurs et des rapports. Les signatures portent sur le statut, les permissions, le modèle d'attaque, les critères et les empreintes des preuves.

**Attention :** l'outil vérifie des références et des signatures, il ne télécharge ni ne réexécute automatiquement les rapports SHA-256. Le contrôle d'intégrité des artefacts et de leur provenance reste à relier au pipeline d'audit. Le fichier de statut n'est pas une autorité réglementaire, les liens de preuve ne doivent jamais exposer de données privées, et le verrouillage de CI/branches n'est pas configuré par cette PR.

## Sources techniques et réglementaires de référence (à vérifier à chaque révision)

- NIST FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), NIST SP 800-227 : https://csrc.nist.gov/Projects/Post-Quantum-Cryptography ; https://csrc.nist.gov/pubs/sp/800/227/final
- Signal Double Ratchet / Triple Ratchet et SPQR : https://signal.org/docs/specifications/doubleratchet/
- Analyse formelle de Double Ratchet publiée en 2026 : https://ora.ox.ac.uk/objects/uuid:2c9031a4-6e9a-4176-b88c-441618d839b4
- EUDI Wallet, cahier de certification et divulgation sélective : https://eudi.dev/latest/main/07-wallet-solution-certification-and-risk-management/ ; https://eur-lex.europa.eu/eli/reg_impl/2026/1731
- BCE euro numérique et pilote : https://www.ecb.europa.eu/euro/digital_euro/pilot/html/index.en.html

**Position au 23 novembre 2026 :** aucune des quatre garanties n'a franchi l'ensemble de ces critères, et les autorisations de production correspondantes restent à `false`.
