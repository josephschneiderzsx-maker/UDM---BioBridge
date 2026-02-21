# BioBridge UDM Mobile App - PRD

## Original Problem Statement
Transform an existing React Native (Expo) mobile app for BioBridge door control system into a premium Apple-style designed mobile app.

## Project Overview
BioBridge UDM is a multi-tenant door control system mobile application that allows enterprise users to securely control smart doors with biometric authentication.

## Architecture
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation (Stack Navigator)
- **State**: Local state with AsyncStorage persistence
- **Authentication**: JWT tokens + Biometric (FaceID/Fingerprint)
- **Backend**: External BioBridge server (VB.NET + MySQL)

## User Personas
1. **Building Manager**: Oversees all door access for organization
2. **Security Personnel**: Quick door unlock/lock access
3. **Enterprise Employee**: Access to assigned doors only

## Core Requirements
- [x] Server URL configuration
- [x] Multi-tenant authentication
- [x] Door listing with pull-to-refresh
- [x] Door control with biometric auth
- [x] Premium Apple-style UI design

## What's Been Implemented (Jan 2026)
- Complete UI redesign with Apple design language
- Premium dark theme with proper contrast
- Smooth animations and transitions
- Custom components: PrimaryButton, Input, DoorCard, StatusBadge
- Splash screen with fade animation
- iOS-style modal transitions for door control
- Haptic feedback on all interactions
- Animated lock icon showing door state
- Pulse animations for status indicators

## Design System
- **Colors**: Apple Dark Mode palette (pure black, elevated surfaces)
- **Typography**: SF Pro inspired scale (largeTitle to caption2)
- **Spacing**: 8-point grid system
- **Border Radius**: Consistent 6-28px scale
- **Animations**: Spring physics, 400-600ms durations

## P0/P1/P2 Features Remaining
### P0 (Critical)
- None

### P1 (High Priority)
- [ ] Biometric login option (auto-login after first auth)
- [ ] Push notifications for door events
- [ ] Offline mode with cached door list

### P2 (Nice to Have)
- [ ] Dark/Light theme toggle
- [ ] Door access history/logs
- [ ] Multi-language support
- [ ] Widget for quick unlock

## Next Tasks
1. Test on physical iOS/Android devices
2. Add error boundary for crash recovery
3. Implement loading skeletons
4. Add door search/filter functionality
