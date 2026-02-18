# Widget Configuration for URZIS PASS

## Overview
This directory contains configuration and services for iOS/Android home screen widgets.

## iOS Widget (expo-widget - requires SDK 55+)
To enable iOS widgets, upgrade to Expo SDK 55 and install:
```bash
npx expo install expo-widget
bunx create Target widget
```

## Android Widget (Native Implementation)
Android widgets require native code in the `android/` folder after prebuild.

## Current Implementation
- `WidgetService.js` - Data sharing service between app and widgets
- `QuickUnlockWidget/` - Widget configuration files

## Features
- **Ultra-compact widget** - Single button for primary door
- **Biometric authentication** - Required before unlock
- **Sizes available**: Small (2x2), Medium (4x2)

## Usage
1. Set a primary door in the app (Account > Primary Door)
2. Add widget from home screen
3. Tap widget to authenticate & unlock
