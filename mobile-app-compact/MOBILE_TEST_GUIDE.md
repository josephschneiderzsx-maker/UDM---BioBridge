# Guide de Test - Application Mobile UDM

Ce guide explique comment tester l'application mobile React Native pour contrôler les portes BioBridge.

## Prérequis

1. **Node.js** installé (version 16 ou supérieure)
2. **Expo CLI** installé globalement :
   ```bash
   npm install -g expo-cli
   ```
3. **Expo Go** installé sur votre téléphone :
   - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS](https://apps.apple.com/app/expo-go/id982107779)

## Installation

1. Naviguer dans le dossier `mobile-app` :
   ```bash
   cd mobile-app
   ```

2. Installer les dépendances :
   ```bash
   npm install
   ```

## Configuration

### 1. Configuration du serveur

Lors du premier lancement, l'app demandera l'URL du serveur :
- **Local** : `http://192.168.1.XXX:8080` (remplacer XXX par l'IP de votre machine)
- **Production** : `https://door.monitoring.urzis.com`

**Important** : Pour tester depuis un téléphone physique :
- Le serveur doit être accessible depuis le réseau local
- Utiliser l'IP locale de votre machine, pas `localhost`
- Vérifier que le pare-feu autorise le port 8080

### 2. Connexion

1. **Entreprise (tenant)** : `entreprise-1` (ou le slug de votre entreprise)
2. **Email** : `admin@example.com` (ou un utilisateur valide)
3. **Mot de passe** : Le mot de passe configuré en base de données

## Lancement de l'application

### Option 1 : Expo Go (Recommandé pour les tests)

1. Démarrer le serveur Expo :
   ```bash
   npm start
   ```
   ou
   ```bash
   expo start
   ```

2. Scanner le QR code avec :
   - **Android** : Expo Go app
   - **iOS** : Appareil photo (ouvre Expo Go automatiquement)

### Option 2 : Build natif (Pour production)

#### Android
```bash
npm run android
```

#### iOS
```bash
npm run ios
```

## Tests fonctionnels

### Test 1 : Configuration initiale

1. Lancer l'app
2. Vérifier que l'écran de configuration serveur s'affiche
3. Entrer l'URL du serveur (ex: `http://192.168.1.100:8080`)
4. Cliquer sur "Continuer"
5. ✅ L'écran de connexion doit s'afficher

### Test 2 : Connexion

1. Entrer les informations :
   - Entreprise : `entreprise-1`
   - Email : `admin@example.com`
   - Mot de passe : (votre mot de passe)
2. Cliquer sur "Se connecter"
3. ✅ L'écran de liste des portes doit s'afficher

### Test 3 : Liste des portes

1. Vérifier que la liste des portes s'affiche
2. Vérifier que chaque porte affiche :
   - Nom de la porte
   - Adresse IP et port du terminal
3. Faire un pull-to-refresh
4. ✅ La liste doit se rafraîchir

### Test 4 : Ouverture de porte (avec biométrie)

1. Cliquer sur une porte dans la liste
2. Cliquer sur "Ouvrir la porte"
3. ✅ L'authentification biométrique doit s'afficher :
   - FaceID sur iOS
   - Empreinte digitale sur Android
4. S'authentifier avec FaceID/empreinte
5. ✅ Un message de succès doit s'afficher
6. ✅ La porte doit s'ouvrir physiquement (vérifier sur place)

### Test 5 : Fermeture de porte

1. Sur l'écran de contrôle de porte
2. Cliquer sur "Fermer la porte"
3. ✅ Un message de succès doit s'afficher
4. ✅ La porte doit se fermer physiquement

### Test 6 : Statut de la porte

1. Sur l'écran de contrôle de porte
2. Cliquer sur "Vérifier le statut"
3. ✅ Le statut actuel de la porte doit s'afficher (open/closed)

### Test 7 : Gestion de session

1. Fermer l'app complètement
2. Rouvrir l'app
3. ✅ Si le token est valide, l'écran de liste des portes doit s'afficher directement
4. ✅ Si le token a expiré, l'écran de connexion doit s'afficher

## Dépannage

### Problème : "Server URL not configured"

**Solution** : Vérifier que l'URL du serveur est bien sauvegardée dans AsyncStorage. Réinstaller l'app si nécessaire.

### Problème : "Failed to fetch doors" ou erreur réseau

**Solutions** :
1. Vérifier que le serveur est démarré et accessible
2. Vérifier l'URL du serveur (utiliser l'IP locale, pas localhost)
3. Vérifier que le téléphone et le serveur sont sur le même réseau
4. Vérifier le pare-feu Windows

### Problème : "Session expired"

**Solution** : Se reconnecter avec email/mot de passe. Le token JWT a expiré.

### Problème : "Aucune porte disponible"

**Solutions** :
1. Vérifier que l'utilisateur a des permissions sur au moins une porte
2. Vérifier en base de données la table `user_door_permissions`
3. Vérifier que l'agent est enregistré et actif

### Problème : Authentification biométrique ne fonctionne pas

**Solutions** :
1. Vérifier que le téléphone supporte FaceID/empreinte
2. Vérifier qu'une empreinte/FaceID est configurée sur le téléphone
3. Sur simulateur iOS, utiliser le menu Hardware > Face ID > Enrolled

### Problème : La porte ne s'ouvre pas

**Solutions** :
1. Vérifier les logs de l'agent : `Get-EventLog -LogName Application -Source "UDM-Agent"`
2. Vérifier que l'agent est enregistré et actif
3. Vérifier la connexion réseau entre l'agent et le terminal BioBridge
4. Vérifier en base de données le statut de la commande dans `command_queue`

## Tests de performance

### Test de charge

1. Ouvrir plusieurs portes rapidement
2. ✅ Chaque commande doit être traitée correctement
3. ✅ Aucune commande ne doit être perdue

### Test de stabilité

1. Laisser l'app ouverte pendant 30 minutes
2. Effectuer des actions périodiquement
3. ✅ L'app ne doit pas crasher
4. ✅ Les tokens doivent rester valides

## Notes importantes

- **Sécurité** : L'authentification biométrique est requise uniquement pour l'ouverture de porte, pas pour la fermeture ou le statut
- **Réseau** : Pour tester depuis un téléphone physique, le serveur doit être accessible sur le réseau local
- **Production** : Pour la production, utiliser HTTPS et un certificat SSL valide

## Prochaines améliorations

- [ ] Notifications push pour les événements de porte
- [ ] Historique des actions
- [ ] Mode hors ligne avec synchronisation
- [ ] Support multi-entreprise dans la même app
- [ ] Thème sombre/clair
