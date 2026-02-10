# Fix: PlatformConstants Error

## Problème
Erreur sur téléphone : `TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could not be found`

## Solution

### 1. Vider le cache Metro et redémarrer

```bash
cd mobile-app
npx expo start -c --lan
```

### 2. Sur le téléphone

1. **Fermer complètement Expo Go** (pas juste mettre en arrière-plan)
2. **Rouvrir Expo Go**
3. **Scanner à nouveau le QR code** ou entrer l'URL manuellement

### 3. Si ça ne fonctionne pas

**Option A : Réinstaller Expo Go**
- Désinstaller Expo Go
- Réinstaller depuis le Play Store
- Relancer l'app

**Option B : Utiliser le mode tunnel**
```bash
npx expo start --tunnel
```

**Option C : Vérifier les versions**
```bash
npx expo-doctor
```

## Cause

Cette erreur survient généralement quand :
- Le cache Metro est corrompu
- Les modules natifs ne sont pas correctement chargés
- Il y a une incompatibilité entre Expo Go et les versions du projet

## Prévention

Toujours vider le cache après une mise à jour majeure :
```bash
npx expo start -c
```
