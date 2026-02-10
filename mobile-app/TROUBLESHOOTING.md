# Dépannage - Application Mobile

## Problème : Expo écoute sur 127.0.0.1 au lieu de l'IP locale

### Solution 1 : Forcer le mode LAN

Arrêter Expo (Ctrl+C) puis relancer avec :

```bash
expo start --lan
```

Ou utiliser directement :
```bash
npx expo start --lan
```

### Solution 2 : Utiliser le mode tunnel

Si le mode LAN ne fonctionne pas :

```bash
expo start --tunnel
```

Le mode tunnel fonctionne même si le téléphone et le PC sont sur des réseaux différents, mais peut être plus lent.

### Solution 3 : Vérifier le pare-feu Windows

1. Ouvrir "Pare-feu Windows Defender"
2. Cliquer sur "Paramètres avancés"
3. Vérifier que les règles entrantes autorisent Node.js sur le port 8081
4. Si nécessaire, créer une règle pour autoriser le port 8081 (TCP)

### Solution 4 : Vérifier la connexion réseau

1. Vérifier que le téléphone et le PC sont sur le même réseau Wi-Fi
2. Tester la connectivité : depuis le téléphone, essayer d'accéder à `http://192.168.40.20:8080` dans un navigateur
3. Vérifier l'IP du PC : `ipconfig` dans PowerShell

### Solution 5 : Entrer l'URL manuellement dans Expo Go

1. Ouvrir Expo Go sur Android
2. Appuyer sur "Enter URL manually"
3. Entrer : `exp://192.168.40.20:8081`
4. Remplacer `192.168.40.20` par l'IP réelle de votre PC

### Solution 6 : Vérifier les versions de packages

Les avertissements de versions peuvent causer des problèmes. Mettre à jour :

```bash
npm install react-native@0.74.5
npm install @react-native-async-storage/async-storage@1.23.1
npm install react-native-safe-area-context@4.10.5
npm install react-native-screens@3.31.1
```

## Problème : "Unable to connect to Metro"

### Solutions :

1. Vider le cache :
   ```bash
   expo start -c
   ```

2. Vérifier qu'aucun autre processus n'utilise le port 8081 :
   ```bash
   netstat -ano | findstr :8081
   ```

3. Redémarrer Expo complètement

## Problème : L'app se charge mais ne peut pas se connecter au serveur

### Solutions :

1. Vérifier que le serveur UDM est démarré et accessible
2. Vérifier l'URL du serveur dans l'app (doit être l'IP locale, pas localhost)
3. Vérifier que le pare-feu autorise le port 8080
4. Tester l'API depuis le navigateur : `http://192.168.40.20:8080/entreprise-1/auth/login`

## Problème : QR code ne fonctionne pas

### Solutions :

1. Utiliser "Enter URL manually" dans Expo Go
2. Vérifier que le téléphone et le PC sont sur le même réseau
3. Essayer le mode tunnel : `expo start --tunnel`
