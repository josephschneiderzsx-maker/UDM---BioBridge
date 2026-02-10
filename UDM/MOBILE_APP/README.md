# Application Mobile - UDM Door Control

## Fichiers inclus

- Code source React Native / Expo
- `package.json` : Dépendances
- `app.json` : Configuration Expo
- `App.js` : Point d'entrée de l'application

## Installation pour développement

### 1. Prérequis

- Node.js 16+
- npm ou yarn
- Expo Go installé sur le téléphone (Play Store / App Store)

### 2. Installation

```bash
npm install
```

### 3. Lancement

```bash
npm start
```

Scanner le QR code avec Expo Go.

## Build de production

### Android

```bash
eas build --platform android
```

### iOS

```bash
eas build --platform ios
```

## Configuration

L'URL du serveur est configurée lors du premier lancement de l'application.

## Support

Voir `../INSTALLATION_GUIDE.md` pour plus de détails.
