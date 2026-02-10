# UDM Mobile App

Application React Native pour contrôler les portes BioBridge via le serveur central UDM.

## Installation

```bash
cd mobile-app
npm install
```

## Configuration

1. Configurez l'URL du serveur lors du premier lancement
2. Connectez-vous avec votre email/mot de passe et le tenant (ex: `entreprise-1`)

## Fonctionnalités

- Configuration du serveur (une seule fois)
- Authentification par email/mot de passe
- Liste des portes accessibles
- Ouverture de porte avec authentification biométrique (FaceID/Fingerprint)
- Fermeture de porte
- Vérification du statut de la porte

## Développement

```bash
# Démarrer Expo
npm start

# Lancer sur Android
npm run android

# Lancer sur iOS
npm run ios
```

## Notes

- L'authentification biométrique est requise pour ouvrir une porte
- L'app utilise AsyncStorage pour stocker le token JWT et l'URL du serveur
- Le token expire après 24h (configurable côté serveur)
