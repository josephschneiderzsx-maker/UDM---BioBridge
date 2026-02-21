# Guide de Mise à Jour - Expo SDK

Ce guide explique comment mettre à jour l'application mobile vers une nouvelle version du SDK Expo.

## Mise à jour vers SDK 54 (Actuel)

### 1. Mettre à jour Expo CLI globalement

```bash
npm install -g expo-cli@latest
```

### 2. Mettre à jour les dépendances

```bash
cd mobile-app
npx expo install --fix
```

Cette commande met automatiquement à jour toutes les dépendances vers les versions compatibles avec le SDK actuel.

### 3. Vérifier les changements

Après la mise à jour, vérifier :
- Que l'app démarre : `npm start`
- Que toutes les fonctionnalités fonctionnent (authentification, liste des portes, ouverture/fermeture)
- Tester sur un appareil physique avec Expo Go SDK 54

## Mise à jour vers SDK 55 (Futur)

### Étapes générales

1. **Vérifier la documentation Expo**
   - Consulter [Expo Changelog](https://expo.dev/changelog/)
   - Lire les breaking changes pour SDK 55

2. **Mettre à jour le SDK**
   ```bash
   npx expo install expo@latest
   ```

3. **Mettre à jour toutes les dépendances**
   ```bash
   npx expo install --fix
   ```

4. **Vérifier les dépendances spécifiques**
   - `expo-local-authentication` : Vérifier les changements d'API
   - `@react-navigation/*` : Vérifier la compatibilité
   - `react-native` : Vérifier la version requise

5. **Tester l'application**
   - Tester toutes les fonctionnalités
   - Vérifier l'authentification biométrique
   - Tester la communication avec le serveur

### Checklist de mise à jour

- [ ] SDK Expo mis à jour
- [ ] Toutes les dépendances mises à jour avec `expo install --fix`
- [ ] `package.json` vérifié
- [ ] `app.json` vérifié (pas de changements nécessaires généralement)
- [ ] Tests fonctionnels passés
- [ ] Tests sur appareil physique (Android et iOS si possible)
- [ ] Documentation mise à jour

## Gestion des Breaking Changes

### SDK 51 → SDK 54

**Changements notables :**
- React Native 0.76.5 (au lieu de 0.74.0)
- React 18.3.1 (au lieu de 18.2.0)
- `expo-local-authentication` ~15.0.0 (au lieu de ~14.0.0)
- `@react-native-async-storage/async-storage` 2.1.0 (au lieu de 1.21.0)

**Aucun breaking change majeur** dans notre code actuel.

### SDK 54 → SDK 55 (À venir)

**À vérifier lors de la sortie :**
- Changements dans `expo-local-authentication`
- Changements dans React Navigation
- Nouveaux requirements pour Android/iOS
- Changements dans les permissions

## Commandes utiles

### Vérifier la version actuelle
```bash
npx expo --version
```

### Vérifier les versions des dépendances
```bash
npx expo-doctor
```

### Mettre à jour vers une version spécifique
```bash
npx expo install expo@~55.0.0
```

### Nettoyer et réinstaller
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

## Dépannage après mise à jour

### Problème : "Module not found"

**Solution :**
```bash
npx expo install --fix
rm -rf node_modules
npm install
```

### Problème : Erreurs de build

**Solution :**
```bash
npx expo start -c
```

### Problème : Incompatibilité avec Expo Go

**Solution :**
1. Mettre à jour Expo Go sur l'appareil
2. Ou utiliser un build de développement : `eas build --profile development`

## Stratégie de mise à jour recommandée

1. **Tester en local d'abord**
   - Mettre à jour dans une branche séparée
   - Tester toutes les fonctionnalités
   - Vérifier les performances

2. **Mettre à jour progressivement**
   - Ne pas sauter plusieurs versions majeures
   - SDK 51 → SDK 54 → SDK 55 (pas SDK 51 → SDK 55 directement)

3. **Documenter les changements**
   - Noter les breaking changes rencontrés
   - Documenter les solutions trouvées
   - Mettre à jour ce guide

## Ressources

- [Expo Changelog](https://expo.dev/changelog/)
- [Expo Upgrade Guide](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/)
- [React Native Upgrade Helper](https://react-native-community.github.io/upgrade-helper/)
