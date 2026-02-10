# Guide de Test - UDM System

## Prérequis

1. ✅ MySQL installé et démarré
2. ✅ Base de données créée (`shema.sql` exécuté)
3. ✅ Service central UDM compilé et installé
4. ✅ Service central UDM démarré (`net start UDM`)

## Étape 1 : Vérifier la base de données

### 1.1 Vérifier les données de test

```sql
-- Se connecter à MySQL
mysql -u udm -p udm_multitenant

-- Vérifier l'entreprise
SELECT * FROM enterprises;

-- Vérifier les portes
SELECT * FROM doors;

-- Vérifier l'utilisateur admin
SELECT id, email, is_admin FROM users WHERE email = 'admin@example.com';

-- Vérifier le hash du mot de passe (doit faire 64 ou 128 caractères)
SELECT email, LENGTH(password_hash) as hash_length FROM users WHERE email = 'admin@example.com';
```

### 1.2 Mettre à jour le mot de passe si nécessaire

```sql
-- Remplacer 'password123' par votre mot de passe
UPDATE users 
SET password_hash = LOWER(HEX(SHA2('password123', 256)))
WHERE email = 'admin@example.com';

-- Vérifier après
SELECT email, password_hash FROM users WHERE email = 'admin@example.com';
```

## Étape 2 : Tester le serveur central

### 2.1 Vérifier que le service est démarré

```powershell
# Dans PowerShell (en tant qu'admin)
Get-Service UDM

# Si le service n'est pas démarré :
net start UDM
```

### 2.2 Vérifier les logs Event Viewer

1. Ouvrir **Event Viewer** (Observateur d'événements)
2. Aller dans **Windows Logs** → **Application**
3. Filtrer par source **UDM**
4. Vérifier qu'il n'y a pas d'erreurs de connexion MySQL

### 2.3 Test de connexion HTTP basique

```powershell
# Test simple (doit retourner 404 ou une réponse)
curl http://localhost:8080/status
```

## Étape 3 : Tester l'authentification

### 3.1 Test de login

```powershell
# Dans PowerShell
curl -X POST http://localhost:8080/entreprise-1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"password123\"}'
```

**Résultat attendu :**
```json
{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

**Si erreur "Invalid credentials" :**
- Vérifier le hash du mot de passe en base (voir étape 1.2)
- Vérifier que l'email correspond exactement

**Si erreur "Unknown tenant" :**
- Vérifier que l'entreprise avec slug `entreprise-1` existe en base

### 3.2 Sauvegarder le token

Copier le token retourné pour les tests suivants.

## Étape 4 : Tester les endpoints protégés

### 4.1 Test GET /doors (liste des portes)

```powershell
# Remplacer VOTRE_TOKEN par le token obtenu à l'étape 3.1
$token = "VOTRE_TOKEN"

curl http://localhost:8080/entreprise-1/doors `
  -H "Authorization: Bearer $token"
```

**Résultat attendu :**
```json
{
  "doors": [
    {
      "id": 1,
      "name": "Porte principale",
      "terminal_ip": "192.168.40.10",
      "terminal_port": 4370,
      "default_delay": 3000,
      "agent_id": 1
    },
    {
      "id": 2,
      "name": "Porte arrière",
      "terminal_ip": "192.168.40.9",
      "terminal_port": 4370,
      "default_delay": 3000,
      "agent_id": 1
    }
  ]
}
```

**Si erreur 401 "Missing or invalid Authorization header" :**
- Vérifier que le header `Authorization: Bearer TOKEN` est bien présent
- Vérifier que le token n'a pas expiré

**Si erreur 403 "Tenant mismatch" :**
- Vérifier que le token correspond au bon tenant

### 4.2 Test POST /doors/{doorId}/open

```powershell
$token = "VOTRE_TOKEN"

curl -X POST http://localhost:8080/entreprise-1/doors/1/open `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{\"delay\":3000}'
```

**Résultat attendu :**
```json
{
  "success": true,
  "command_id": 1,
  "message": "Command queued"
}
```

**Note :** La commande est mise en file d'attente. Elle sera traitée par l'agent local quand il pollera.

### 4.3 Vérifier la file d'attente

```sql
-- Voir les commandes en attente
SELECT * FROM command_queue WHERE status = 'pending' ORDER BY created_at DESC;

-- Voir toutes les commandes
SELECT id, door_id, command_type, status, created_at, processed_at 
FROM command_queue 
ORDER BY created_at DESC 
LIMIT 10;
```

## Étape 5 : Tester l'agent local

### 5.1 Préparer l'agent

1. **Compiler le projet agent** dans Visual Studio
2. **Configurer `app.config`** de l'agent :
   ```xml
   <add key="ServerUrl" value="http://VOTRE_IP_SERVEUR:8080" />
   <add key="AgentKey" value="CHANGE_ME_AGENT_KEY_1" />
   <add key="EnterpriseId" value="1" />
   ```
3. **Vérifier que l'agent_key en base correspond** :
   ```sql
   SELECT id, name, agent_key FROM agents WHERE enterprise_id = 1;
   ```
   Si nécessaire, mettre à jour :
   ```sql
   UPDATE agents SET agent_key = 'CHANGE_ME_AGENT_KEY_1' WHERE id = 1;
   ```

### 5.2 Installer l'agent

```powershell
# Dans le dossier bin\Debug de l'agent
cd U:\D-biobridgeSDKservice\BioBridgeDoorControl\BioBridgeDoorControlAgent\bin\Debug

# Installer le service (en tant qu'admin)
InstallUtil.exe UDM-Agent.exe

# Démarrer le service
net start UDM-Agent
```

### 5.3 Vérifier l'enregistrement de l'agent

```sql
-- Vérifier que l'agent est en ligne
SELECT id, name, agent_key, is_online, last_heartbeat 
FROM agents 
WHERE id = 1;
```

**Résultat attendu :**
- `is_online` = 1
- `last_heartbeat` = timestamp récent

### 5.4 Vérifier les logs de l'agent

1. Ouvrir **Event Viewer**
2. Filtrer par source **UDM-Agent**
3. Vérifier les messages :
   - "Agent registered with ID: 1"
   - "UDM-Agent service started successfully"

### 5.5 Tester le polling de commandes

1. **Créer une commande via l'API** (étape 4.2)
2. **Attendre quelques secondes** (l'agent poll toutes les 3 secondes)
3. **Vérifier en base** que la commande est passée en "processing" :
   ```sql
   SELECT * FROM command_queue WHERE status = 'processing';
   ```
4. **Vérifier les logs de l'agent** dans Event Viewer :
   - "Processing command: open for door 1"

### 5.6 Vérifier l'exécution

Après quelques secondes, vérifier que la commande est complétée :

```sql
SELECT id, command_type, status, result, error_message, completed_at 
FROM command_queue 
WHERE id = 1;
```

**Résultat attendu :**
- `status` = 'completed' ou 'failed'
- `result` contient le résultat JSON
- `completed_at` est renseigné

## Étape 6 : Tester l'application mobile

### 6.1 Préparer l'environnement

```bash
cd mobile-app
npm install
```

### 6.2 Démarrer Expo

```bash
npm start
```

### 6.3 Tester sur un appareil

1. **Installer Expo Go** sur votre téléphone (Android/iOS)
2. **Scanner le QR code** affiché dans le terminal
3. **Premier lancement** :
   - Entrer l'URL du serveur : `http://VOTRE_IP:8080`
   - Cliquer sur "Continuer"
4. **Écran de login** :
   - Tenant : `entreprise-1`
   - Email : `admin@example.com`
   - Password : `password123`
5. **Liste des portes** :
   - Devrait afficher les 2 portes de test
6. **Ouvrir une porte** :
   - Cliquer sur une porte
   - Cliquer sur "Ouvrir la porte"
   - **Authentification biométrique** : FaceID ou empreinte
   - La commande devrait être envoyée

### 6.4 Vérifier que la commande est traitée

```sql
-- Voir les dernières commandes
SELECT id, door_id, user_id, command_type, status, created_at 
FROM command_queue 
ORDER BY created_at DESC 
LIMIT 5;
```

## Étape 7 : Tests d'intégration complets

### 7.1 Scénario complet : Ouverture de porte depuis mobile

1. ✅ Login depuis l'app mobile
2. ✅ Liste des portes affichée
3. ✅ Sélection d'une porte
4. ✅ Authentification biométrique
5. ✅ Commande envoyée (vérifier en base)
6. ✅ Agent récupère la commande (logs Event Viewer)
7. ✅ Porte ouverte (si terminal BioBridge connecté)
8. ✅ Résultat renvoyé au serveur
9. ✅ Statut mis à jour en base

### 7.2 Vérifier les événements de porte

```sql
-- Voir les événements enregistrés
SELECT * FROM door_events 
ORDER BY created_at DESC 
LIMIT 10;
```

## Dépannage

### Problème : Service ne démarre pas

```powershell
# Vérifier les erreurs
Get-EventLog -LogName Application -Source UDM -Newest 10

# Vérifier la configuration
# Le fichier UDM.exe.config doit être présent dans C:\UDM\
```

### Problème : Erreur de connexion MySQL

1. Vérifier que MySQL est démarré
2. Vérifier les credentials dans `app.config`
3. Vérifier que `UDM.exe.config` est présent et correct
4. Vérifier les logs Event Viewer

### Problème : Agent ne se connecte pas au serveur

1. Vérifier l'URL du serveur dans `app.config` de l'agent
2. Vérifier que le serveur central est accessible depuis l'agent
3. Vérifier le firewall (port 8080)
4. Vérifier que l'`agent_key` correspond en base

### Problème : Commande reste en "pending"

1. Vérifier que l'agent est en ligne (`is_online = 1`)
2. Vérifier les logs de l'agent dans Event Viewer
3. Vérifier que l'agent poll bien les commandes
4. Vérifier la connexion réseau entre agent et serveur

### Problème : App mobile ne se connecte pas

1. Vérifier l'URL du serveur (doit être accessible depuis le téléphone)
2. Si test sur émulateur Android : utiliser `10.0.2.2` au lieu de `localhost`
3. Si test sur appareil physique : utiliser l'IP locale du PC (ex: `192.168.1.100`)
4. Vérifier CORS (déjà géré dans le code)

## Commandes utiles

```powershell
# Redémarrer le service central
net stop UDM
net start UDM

# Redémarrer l'agent
net stop UDM-Agent
net start UDM-Agent

# Voir les services
Get-Service | Where-Object {$_.Name -like "*UDM*"}

# Voir les logs en temps réel (PowerShell)
Get-EventLog -LogName Application -Source UDM -Newest 20 | Format-Table -AutoSize
```

## Checklist de test

- [ ] Base de données créée et peuplée
- [ ] Service central démarré
- [ ] Login fonctionne (retourne un token)
- [ ] GET /doors fonctionne avec token
- [ ] POST /doors/{id}/open met en file d'attente
- [ ] Agent installé et démarré
- [ ] Agent enregistré (is_online = 1)
- [ ] Agent récupère les commandes
- [ ] Commandes exécutées et résultats renvoyés
- [ ] App mobile se connecte au serveur
- [ ] Login depuis l'app fonctionne
- [ ] Liste des portes affichée
- [ ] Ouverture de porte avec biométrie fonctionne
- [ ] Commande traitée de bout en bout
