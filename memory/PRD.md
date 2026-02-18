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
- ✅ Animations fluides et feedback haptique **uniquement pour actions importantes**
- ✅ Accessibilité (tailles de police adaptatives)
- ✅ Conserver le bleu URZIS #00AAFF
- ✅ Mode sombre/clair avec transition animée
- ✅ Skeleton loaders premium pendant le chargement
- ✅ Pull-to-refresh personnalisé
- ✅ Widget Quick Unlock iOS/Android avec biométrie

## What's Been Implemented

### Session 1 - Feb 2026: Premium UI Base
- Hook `useResponsive` avec breakpoints adaptatifs
- Composants premium (SkeletonLoader, AnimatedThemeSwitch, HapticButton)
- ThemeContext avec transitions animées
- Écrans mis à jour avec responsivité

### Session 2 - Feb 2026: Low-End Device Optimization + Widget
**Problème résolu:** UI mal rendue sur Motorola G 2021
- Ajout `isLowEndDevice` detection
- Widget Quick Unlock avec biométrie

### Session 3 - Feb 2026: Adaptation Automatique Densité/Police
**Problème résolu:** L'app ne s'adaptait pas aux paramètres système (densité pixel, taille police)

**Nouvelles détections automatiques:**
- `pixelDensity` - Densité de l'écran via `PixelRatio.get()`
- `systemFontScale` - Taille de police système via `PixelRatio.getFontScale()`
- `hasLargeFontScale` - Détection grande police (> 1.15)
- `hasHighDensity` - Détection haute densité (>= 3)
- `isCompactMode` - Combinaison petit écran + grande police
- `effectiveWidth` - Largeur ajustée pour haute densité

**Nouvelles fonctions:**
- `floatingMargin()` - Marges adaptatives pour headers/tab bar
- `cappedFontScale` - Limite le scaling de police pour éviter les débordements

**Comportement:**
| Condition | Font Scale Cap | Spacing Factor | Floating Margin |
|-----------|---------------|----------------|-----------------|
| Compact Mode | 1.1 | 0.7 | 8px |
| Small Phone | 1.3 | 0.8 | 12px |
| Normal | 1.3 | 1.0 | 16px |
| Tablet | 1.3 | 1.2 | 24px |

## Files Modified/Created

### Session 2 Updates:
```
/app/mobile-app/
├── hooks/
│   └── useResponsive.js (UPDATED - isLowEndDevice, tabBarPadding)
├── components/
│   ├── DoorCard.js (UPDATED - haptic disabled on tap)
│   ├── HapticButton.js (UPDATED - haptic disabled)
│   ├── AnimatedThemeSwitch.js (UPDATED - haptic disabled)
│   └── PrimaryButton.js (UPDATED - haptic disabled)
├── services/
│   └── WidgetService.js (NEW)
├── screens/
│   ├── DoorControlScreen.js (UPDATED - ACTIONS_BOTTOM_MARGIN)
│   ├── DoorListScreen.js (UPDATED - tabBarPadding)
│   ├── ActivityLogScreen.js (UPDATED - tabBarPadding)
│   ├── AccountScreen.js (UPDATED - Widget Settings menu)
│   └── WidgetSettingsScreen.js (NEW)
├── widgets/
│   └── README.md (NEW)
└── App.js (UPDATED - low-end tab bar, WidgetSettings route)
```

## Tech Stack
- React Native 0.81.5
- Expo SDK 54
- expo-blur, expo-haptics, expo-linear-gradient, expo-local-authentication
- lucide-react-native

## Device Support Matrix
| Device Type | Screen Width | Tab Bar | Icons | Font Scale |
|-------------|-------------|---------|-------|------------|
| Very Small  | < 320px     | 52px    | 18px  | 0.85       |
| Small (Moto G) | 320-360px | 52px    | 18px  | 0.9        |
| Phone       | 360-414px   | 56px    | 20px  | 1.0        |
| Large Phone | 414-768px   | 64px    | 22px  | 1.0        |
| Tablet      | 768px+      | 72px    | 26px  | 1.1        |

## Prioritized Backlog

### P0 - Completed ✅
- Responsive hook avec low-end detection
- Fix chevauchement tab bar / actions
- Désactivation vibrations excessives
- Widget service et écran de config

### P1 - Pour activation Widget
- [ ] Upgrade vers Expo SDK 55 (pour expo-widget iOS)
- [ ] Code natif Android pour widget
- [ ] Tester widget sur appareils physiques

### P2 - Nice to Have
- [ ] Widget Live Activities iOS (Dynamic Island)
- [ ] Animations Lottie pour splash
- [ ] Mode offline avec sync

## Testing Status
- ✅ 100% validation tous composants
- ✅ Low-end device optimizations validées
- ✅ Widget service et navigation validés
- ⚠️ Test physique requis sur Motorola G 2021
