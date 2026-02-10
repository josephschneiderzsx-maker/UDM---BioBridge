# UDM Mobile App - Application de Contrôle de Portes BioBridge

Application React Native (Expo) pour contrôler les portes BioBridge via le serveur central UDM.

## Installation

```bash
npm install
```

## Lancement

### Pour tester sur téléphone physique (recommandé)

```bash
npm start
```

Cela démarre Expo en mode LAN, accessible depuis votre réseau local. Le QR code affichera l'adresse IP locale (ex: `exp://192.168.40.20:8081`).

### Pour tester en local uniquement

```bash
npm run start-local
```

## Configuration

### 1. URL du serveur

Lors du premier lancement, l'app demandera l'URL du serveur :
- **Réseau local** : `http://192.168.40.20:8080` (remplacer par l'IP de votre serveur)
- **Production** : `https://door.monitoring.urzis.com`

**Important** : 
- Utiliser l'IP locale de votre machine, pas `localhost`
- Vérifier que le serveur UDM est démarré et accessible
- Vérifier que le pare-feu autorise les ports 8080 (serveur) et 8081 (Expo)

### 2. Connexion

- **Entreprise (tenant)** : `entreprise-1`
- **Email** : `admin@example.com`
- **Mot de passe** : (configuré en base de données)

## Dépannage

### Problème : Expo écoute sur 127.0.0.1 au lieu de l'IP locale

**Solution** : Utiliser `npm start` (qui inclut `--lan`) au lieu de `npm run start-local`

### Problème : Impossible de scanner le QR code depuis le téléphone

**Solutions** :
1. Vérifier que le téléphone et le PC sont sur le même réseau Wi-Fi
2. Vérifier que le pare-feu Windows autorise les connexions entrantes sur le port 8081
3. Essayer de taper manuellement l'URL dans Expo Go : `exp://192.168.40.20:8081`

### Problème : "Unable to connect to Metro"

**Solutions** :
1. Vérifier que le port 8081 n'est pas utilisé par un autre processus
2. Redémarrer Expo : `Ctrl+C` puis `npm start`
3. Vider le cache : `expo start -c`

## Structure du projet

```
mobile-app/
├── App.js                 # Point d'entrée avec navigation
├── screens/              # Écrans de l'application
│   ├── ServerConfigScreen.js
│   ├── LoginScreen.js
│   ├── DoorListScreen.js
│   └── DoorControlScreen.js
├── services/             # Services API
│   └── api.js           # Service de communication avec le serveur
└── package.json
```

## Tests

Voir `MOBILE_TEST_GUIDE.md` pour un guide de test complet.

## Build pour production

### Android
```bash
expo build:android
```

### iOS
```bash
expo build:ios
```
