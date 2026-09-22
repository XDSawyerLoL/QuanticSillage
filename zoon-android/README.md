# ZOON Android

Application Android officielle de **ZOON**, le réseau social de l'écosystème Quantic Sillage.

## Architecture

L'application Android reste un client léger du service ZOON afin de conserver une seule base fonctionnelle côté réseau social.

- Package Android : `com.quanticsillage.zoon`
- minSdk : 26
- targetSdk / compileSdk : 36
- Java : 17
- Android Gradle Plugin : 9.4.0
- Gradle CI : 9.6.0
- URL principale : `/zoon.html`
- Compatibilité temporaire : repli automatique sur `/pulse.html`
- API existante conservée : `/api/pulse/*`

## Fonctions Android

- session ZOON conservée dans le stockage local du WebView ;
- navigation interne dans ZOON ;
- liens externes ouverts hors de l'application ;
- sélection de fichiers prête pour les médias ;
- trafic HTTP non chiffré bloqué ;
- sauvegarde Android désactivée pour ne pas exporter la session ;
- écran hors ligne avec bouton Réessayer ;
- identité visuelle ZOON bleu nuit / jaune ;
- remplacement visuel automatique des anciens libellés Pulse durant la migration.

## Compilation locale

Ouvrir le dossier `zoon-android` dans Android Studio avec JDK 17 puis lancer :

```bash
gradle :app:assembleDebug
```

APK :

`app/build/outputs/apk/debug/app-debug.apk`

## Google Play

La build cible Android 16 / API 36. Pour une publication Play Store, la build release devra être signée avec une clé d'envoi privée avant création de l'AAB. Ne jamais commiter le keystore ni les mots de passe dans Git.
