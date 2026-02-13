# Générer l’APK URZIS PASS

Expo Go sert au développement. Pour obtenir un **APK installable** (sans Expo Go), utilisez l’une des méthodes ci‑dessous.

---

## Option 1 : EAS Build (recommandé, build dans le cloud)

1. **Compte Expo**  
   Créez un compte sur [expo.dev](https://expo.dev) si besoin.

2. **Installation d’EAS CLI** (une fois) :
   ```bash
   cd mobile-app
   npm install
   npx expo install eas-cli
   ```

3. **Connexion** :
   ```bash
   npx eas login
   ```

4. **Lancer le build APK** :
   ```bash
   npx eas build --platform android --profile preview
   ```
   Ou pour un build de production :
   ```bash
   npx eas build --platform android --profile production
   ```

5. **Récupérer l’APK**  
   Une fois le build terminé, le lien pour **télécharger l’APK** apparaît dans le terminal et sur [expo.dev](https://expo.dev) → votre projet → Builds.

---

## Option 2 : Build local avec Android Studio

1. **Générer le projet Android** (une fois) :
   ```bash
   cd mobile-app
   npm install
   npx expo prebuild --platform android
   ```

2. **Ouvrir dans Android Studio**  
   Ouvrez le dossier `mobile-app/android` dans Android Studio.

3. **Construire l’APK**  
   - Menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**  
   - Ou en ligne de commande (depuis `mobile-app/android`) :
     ```bash
     .\gradlew assembleRelease
     ```

4. **Emplacement de l’APK**  
   Fichier généré :  
   `mobile-app/android/app/build/outputs/apk/release/app-release.apk`

---

## Résumé rapide (EAS)

```bash
cd mobile-app
npm install
npx expo install eas-cli
npx eas login
npx eas build --platform android --profile preview
```

Puis téléchargez l’APK depuis le lien fourni par EAS.
