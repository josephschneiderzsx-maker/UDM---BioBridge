# Guide d'Installation - UDM BioBridge Door Control

Guide complet d'installation du système UDM pour le contrôle de portes BioBridge.

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Installation du serveur central](#installation-du-serveur-central)
4. [Installation de l'agent local](#installation-de-lagent-local)
5. [Configuration de la base de données](#configuration-de-la-base-de-données)
6. [Installation de l'application mobile](#installation-de-lapplication-mobile)
7. [Configuration réseau](#configuration-réseau)
8. [Tests de validation](#tests-de-validation)
9. [Dépannage](#dépannage)

---

## Vue d'ensemble

Le système UDM se compose de trois composants principaux :

1. **Serveur Central (UDM)** : Service Windows qui gère l'API REST, l'authentification, et la file de commandes
2. **Agent Local (UDM-Agent)** : Service Windows installé sur chaque site client pour contrôler les portes BioBridge
3. **Application Mobile** : Application React Native pour Android/iOS permettant de contrôler les portes

---

## Prérequis

### Serveur Central

- **OS** : Windows Server 2016+ ou Windows 10/11 Pro
- **.NET Framework** : 4.8 ou supérieur
- **MySQL** : 8.0 ou supérieur
- **Ports** : 8080 (HTTP API) - doit être ouvert dans le pare-feu
- **Permissions** : Droits administrateur pour installer le service Windows

### Agent Local

- **OS** : Windows 10/11 (32-bit ou 64-bit)
- **.NET Framework** : 4.8 ou supérieur
- **Réseau** : Accès au serveur central (HTTP/HTTPS)
- **BioBridge SDK** : DLL fournie avec l'agent
- **Permissions** : Droits administrateur pour installer le service Windows

### Application Mobile

- **Android** : 6.0 (API 23) ou supérieur
- **iOS** : 12.0 ou supérieur
- **Expo Go** : Application installée depuis Play Store / App Store (pour développement)
- **Réseau** : Accès au serveur central

---

## Installation du Serveur Central

### Étape 1 : Préparer l'environnement

1. Installer **.NET Framework 4.8** si non présent :
   - Télécharger depuis : https://dotnet.microsoft.com/download/dotnet-framework/net48
   - Redémarrer après installation

2. Installer **MySQL Server 8.0+** :
   - Télécharger depuis : https://dev.mysql.com/downloads/mysql/
   - Noter le mot de passe root configuré

### Étape 2 : Créer la base de données

1. Ouvrir **MySQL Workbench** ou **phpMyAdmin**

2. Exécuter le script SQL fourni (`shema.sql`) :
   ```sql
   -- Le script crée automatiquement :
   -- - La base de données udm_multitenant
   -- - Toutes les tables nécessaires
   -- - Les données de test (entreprise-1, utilisateur admin)
   ```

3. Vérifier la création :
   ```sql
   SHOW DATABASES;
   USE udm_multitenant;
   SHOW TABLES;
   ```

### Étape 3 : Configurer le service UDM

1. Copier le dossier **UDM/SERVER** sur le serveur

2. Éditer le fichier `UDM.exe.config` (ou `app.config` avant compilation) :
   ```xml
   <appSettings>
     <add key="MYSQL_HOST" value="localhost" />
     <add key="MYSQL_DATABASE" value="udm_multitenant" />
     <add key="MYSQL_USER" value="udm" />
     <add key="MYSQL_PASSWORD" value="VOTRE_MOT_DE_PASSE" />
     <add key="JWT_SECRET" value="CHANGER_CE_SECRET_EN_PRODUCTION" />
     <add key="JWT_EXPIRATION_HOURS" value="24" />
   </appSettings>
   ```

3. **Important** : Changer `JWT_SECRET` par une chaîne aléatoire sécurisée (minimum 32 caractères)

### Étape 4 : Installer le service Windows

1. Ouvrir **PowerShell en tant qu'administrateur**

2. Naviguer vers le dossier d'installation :
   ```powershell
   cd C:\UDM\SERVER
   ```

3. Installer le service :
   ```powershell
   C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe UDM.exe
   ```

4. Vérifier l'installation :
   ```powershell
   Get-Service -Name "UDM"
   ```

5. Démarrer le service :
   ```powershell
   Start-Service -Name "UDM"
   ```

### Étape 5 : Configurer le pare-feu

1. Ouvrir **Pare-feu Windows Defender avec fonctions avancées de sécurité**

2. Créer une règle entrante :
   - **Port** : 8080
   - **Protocole** : TCP
   - **Action** : Autoriser la connexion
   - **Profil** : Privé, Domaine

3. Ou via PowerShell :
   ```powershell
   New-NetFirewallRule -DisplayName "UDM HTTP API" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
   ```

### Étape 6 : Vérifier le démarrage

1. Vérifier les logs :
   ```powershell
   Get-EventLog -LogName Application -Source "UDM" -Newest 10
   ```

2. Tester l'API :
   ```powershell
   curl http://localhost:8080/entreprise-1/auth/login -Method POST -Body '{"email":"admin@example.com","password":"admin123"}' -ContentType "application/json"
   ```

---

## Installation de l'Agent Local

### Étape 1 : Préparer l'environnement

1. Installer **.NET Framework 4.8** si non présent

2. Vérifier l'accès réseau au serveur central :
   ```powershell
   Test-NetConnection -ComputerName SERVEUR_IP -Port 8080
   ```

### Étape 2 : Configurer l'agent

1. Copier le dossier **UDM/AGENT** sur la machine cliente

2. Éditer le fichier `UDM-Agent.exe.config` :
   ```xml
   <appSettings>
     <add key="ServerUrl" value="http://SERVEUR_IP:8080" />
     <add key="AgentKey" value="CLE_AGENT_UNIQUE" />
     <add key="EnterpriseId" value="1" />
     <add key="PollingInterval" value="3000" />
     <add key="HeartbeatInterval" value="30000" />
     <add key="CommandTimeout" value="5" />
   </appSettings>
   ```

3. **Important** :
   - `ServerUrl` : URL complète du serveur central
   - `AgentKey` : Clé unique pour cet agent (à générer et noter)
   - `EnterpriseId` : ID de l'entreprise dans la base de données

### Étape 3 : Enregistrer l'agent dans la base de données

1. Se connecter à MySQL

2. Insérer l'agent :
   ```sql
   USE udm_multitenant;
   INSERT INTO agents (enterprise_id, agent_key, name, is_active) 
   VALUES (1, 'CLE_AGENT_UNIQUE', 'Agent Site 1', 1);
   ```

3. Noter l'`agent_id` généré

### Étape 4 : Configurer les portes

1. Insérer les portes dans la base de données :
   ```sql
   INSERT INTO doors (enterprise_id, agent_id, name, terminal_ip, terminal_port, default_delay) 
   VALUES 
   (1, 1, 'Porte Principale', '192.168.40.10', 4370, 3000),
   (1, 1, 'Porte Secondaire', '192.168.40.9', 4370, 3000);
   ```

### Étape 5 : Installer le service Windows

1. Ouvrir **PowerShell en tant qu'administrateur**

2. Naviguer vers le dossier d'installation :
   ```powershell
   cd C:\UDM\AGENT
   ```

3. Installer le service (32-bit ou 64-bit selon la version) :
   ```powershell
   # Pour 32-bit
   C:\Windows\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe UDM-Agent.exe
   
   # Pour 64-bit
   C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe UDM-Agent.exe
   ```

4. Démarrer le service :
   ```powershell
   Start-Service -Name "UDM-Agent"
   ```

### Étape 6 : Vérifier le fonctionnement

1. Vérifier les logs :
   ```powershell
   Get-EventLog -LogName Application -Source "UDM-Agent" -Newest 10
   ```

2. Vérifier que l'agent est enregistré :
   - Les logs doivent afficher : "Agent registered with ID: X"
   - Vérifier en base : `SELECT * FROM agents WHERE agent_key = 'CLE_AGENT_UNIQUE';`

---

## Configuration de la Base de Données

### Structure de base

Le système utilise les tables suivantes :

- **enterprises** : Entreprises/clients
- **agents** : Agents locaux installés
- **doors** : Portes à contrôler
- **users** : Utilisateurs du système
- **user_door_permissions** : Permissions par utilisateur/porte
- **command_queue** : File d'attente des commandes
- **door_events** : Historique des événements

### Création d'une nouvelle entreprise

```sql
INSERT INTO enterprises (name, slug) VALUES ('Client ABC', 'client-abc');

-- Récupérer l'ID généré
SET @enterprise_id = LAST_INSERT_ID();

-- Créer un utilisateur admin
INSERT INTO users (enterprise_id, email, password_hash, is_admin) 
VALUES (@enterprise_id, 'admin@client-abc.com', SHA2('motdepasse123', 256), 1);
```

### Création d'un utilisateur

```sql
-- Pour un admin
INSERT INTO users (enterprise_id, email, password_hash, is_admin) 
VALUES (1, 'user@example.com', SHA2('password123', 256), 1);

-- Pour un utilisateur normal
INSERT INTO users (enterprise_id, email, password_hash, is_admin) 
VALUES (1, 'user@example.com', SHA2('password123', 256), 0);

-- Donner accès à une porte
INSERT INTO user_door_permissions (user_id, door_id, can_open, can_close, can_view_status) 
VALUES (2, 1, 1, 1, 1);
```

---

## Installation de l'Application Mobile

### Option 1 : Développement avec Expo Go

1. Installer **Node.js** (16+) sur une machine de développement

2. Installer **Expo CLI** :
   ```bash
   npm install -g expo-cli
   ```

3. Installer les dépendances :
   ```bash
   cd MOBILE_APP
   npm install
   ```

4. Lancer l'application :
   ```bash
   npm start
   ```

5. Scanner le QR code avec **Expo Go** sur le téléphone

### Option 2 : Build de production

#### Android

1. Installer **Android Studio** et configurer l'environnement

2. Créer un build :
   ```bash
   cd MOBILE_APP
   eas build --platform android
   ```

3. Télécharger l'APK depuis Expo

4. Installer sur les appareils Android

#### iOS

1. Installer **Xcode** sur macOS

2. Créer un build :
   ```bash
   cd MOBILE_APP
   eas build --platform ios
   ```

3. Soumettre à l'App Store ou distribuer via TestFlight

---

## Configuration Réseau

### Serveur Central

- **Port 8080** : Doit être accessible depuis :
  - Les agents locaux (via Internet ou VPN)
  - Les appareils mobiles (via Internet ou réseau local)

### Agent Local

- **Accès sortant** : Doit pouvoir se connecter au serveur central (port 8080)
- **Réseau local** : Doit être sur le même réseau que les terminaux BioBridge (port 4370)

### Appareils Mobiles

- **Accès au serveur** : Doit pouvoir se connecter au serveur central (port 8080)
- **Configuration** : L'URL du serveur est configurée lors du premier lancement de l'app

---

## Tests de Validation

### Test 1 : Serveur Central

```powershell
# Test de connexion
curl http://localhost:8080/entreprise-1/auth/login -Method POST -Body '{"email":"admin@example.com","password":"admin123"}' -ContentType "application/json"

# Doit retourner un token JWT
```

### Test 2 : Agent Local

```powershell
# Vérifier les logs
Get-EventLog -LogName Application -Source "UDM-Agent" -Newest 5

# Doit afficher : "Agent registered with ID: X"
```

### Test 3 : Application Mobile

1. Lancer l'app
2. Configurer l'URL du serveur
3. Se connecter avec un compte utilisateur
4. Tester l'ouverture d'une porte

---

## Dépannage

### Le service UDM ne démarre pas

1. Vérifier les logs :
   ```powershell
   Get-EventLog -LogName Application -Source "UDM" -Newest 20
   ```

2. Vérifier la configuration MySQL dans `UDM.exe.config`

3. Vérifier que MySQL est démarré :
   ```powershell
   Get-Service -Name "MySQL*"
   ```

### L'agent ne s'enregistre pas

1. Vérifier les logs :
   ```powershell
   Get-EventLog -LogName Application -Source "UDM-Agent" -Newest 10
   ```

2. Vérifier la connectivité réseau :
   ```powershell
   Test-NetConnection -ComputerName SERVEUR_IP -Port 8080
   ```

3. Vérifier que l'`agent_key` correspond en base de données

### L'app mobile ne se connecte pas

1. Vérifier l'URL du serveur (doit être accessible depuis le téléphone)
2. Vérifier que le serveur est démarré
3. Vérifier les logs du serveur pour voir les tentatives de connexion

---

## Support

Pour toute assistance :
- Consulter les logs Windows Event Viewer
- Vérifier la documentation dans les dossiers de livraison
- Contacter le support technique
