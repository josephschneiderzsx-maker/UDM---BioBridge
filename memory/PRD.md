# URZIS PASS Mobile App - Premium Upgrade PRD

## Project Overview
Application mobile React Native Expo pour le contrôle d'accès aux portes (URZIS PASS), améliorée vers une version premium avec design responsive et animations modernes.

## Original Problem Statement
Améliorer l'application mobile React Native Expo pour un design premium et responsive qui s'adapte à tous les types de téléphones. Ne pas toucher au backend, uniquement le frontend.

## User Personas
1. **Utilisateurs standards** - Accès aux portes, visualisation de l'historique
2. **Administrateurs** - Gestion des portes, utilisateurs et permissions
3. **Utilisateurs multi-appareils** - Petits téléphones (Motorola G), grands écrans, tablettes

## Core Requirements (Static)
- ✅ Style moderne avec micro-animations et effets premium
- ✅ Responsivité sur tous les types d'écrans (très petits, petits, normaux, grands, tablettes)
- ✅ Animations fluides et feedback haptique **uniquement pour actions importantes (unlock door)**
- ✅ Accessibilité (tailles de police adaptatives)
- ✅ Conserver le bleu URZIS #00AAFF
- ✅ Mode sombre/clair avec persistance
- ✅ Skeleton loaders premium pendant le chargement
- ✅ Pull-to-refresh natif
- ✅ Tab bar responsive qui respecte les gestures de navigation système

## What's Been Implemented

### Session 4 - Jan 2026: Premium UI Improvements
**Problèmes résolus:**
1. Vibrations inutiles désactivées (conservées uniquement pour unlock door)
2. Tab bar responsive qui ne chevauche pas la navigation système
3. Composants avec micro-animations subtiles
4. Tous les écrans principaux responsive

**Changements:**
- **App.js**: Tab bar calcule dynamiquement sa hauteur selon safe area insets et type d'appareil
- **DoorCard.js**: Animation scale subtile au press, tailles responsive
- **Input.js**: Animation de bordure au focus, tailles responsive
- **PrimaryButton.js**: Animation scale subtile au press, tailles responsive
- **StatusBadge.js**: Tailles de police responsive
- **SkeletonLoader.js**: Dimensions responsive
- **LoginScreen.js**: Animation d'entrée fade + slide, tailles responsive
- **DoorListScreen.js**: Espacements et tailles responsive, tab bar padding
- **DoorControlScreen.js**: Bouton unlock responsive, marges bottom safe area
- **AccountScreen.js**: Tous les éléments responsive avec tab bar padding
- **ActivityLogScreen.js**: Vibration supprimée du modal close

## Files Modified

### Session 4 Updates:
```
/app/mobile-app/
├── App.js (UPDATED - responsive tab bar with safe area)
├── components/
│   ├── DoorCard.js (UPDATED - scale animation, responsive)
│   ├── Input.js (UPDATED - border animation, responsive)
│   ├── PrimaryButton.js (UPDATED - scale animation, responsive)
│   ├── StatusBadge.js (UPDATED - responsive)
│   └── SkeletonLoader.js (UPDATED - responsive)
├── screens/
│   ├── LoginScreen.js (UPDATED - entrance animation, responsive)
│   ├── DoorListScreen.js (UPDATED - responsive)
│   ├── DoorControlScreen.js (UPDATED - responsive unlock button)
│   ├── AccountScreen.js (UPDATED - responsive)
│   └── ActivityLogScreen.js (UPDATED - removed vibration)
```

## Tech Stack
- React Native 0.81.5
- Expo SDK 54
- expo-blur, expo-haptics, expo-linear-gradient, expo-local-authentication
- lucide-react-native
- react-native-safe-area-context

## Device Support Matrix
| Device Type | Screen Width | Tab Bar Height | Base Font Scale |
|-------------|-------------|----------------|-----------------|
| Very Small  | < 320px     | 50px + insets  | 0.85            |
| Small (Moto G) | 320-360px | 54px + insets | 0.9             |
| Phone       | 360-414px   | 58px + insets  | 1.0             |
| Large Phone | 414-768px   | 58px + insets  | 1.0             |
| Tablet      | 768px+      | 72px + insets  | 1.1             |

## Navigation System Support
- Android gesture navigation: Uses `useSafeAreaInsets()` for bottom padding
- Android 3-button navigation: Uses minimum 8px padding
- iOS home indicator: Uses safe area insets automatically

## Prioritized Backlog

### P0 - Completed ✅
- Responsive hook avec détection device type
- Tab bar responsive avec safe area
- Vibrations désactivées (sauf unlock door)
- Micro-animations subtiles sur tous les composants interactifs

### P1 - À faire
- [ ] Test sur appareils physiques (Motorola G 2021, tablettes)
- [ ] Mode automatique thème (détection système)

### P2 - Nice to Have
- [ ] Widget Quick Unlock iOS/Android
- [ ] Animations Lottie pour splash
- [ ] Mode offline avec sync

## Testing Status
- ✅ Tous les composants compilent sans erreur
- ⚠️ Test physique requis sur différents appareils
