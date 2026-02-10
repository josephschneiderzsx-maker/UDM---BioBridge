# UDM - URZIS Door Monitoring System

Système multi-tenant de contrôle de portes BioBridge via application mobile, avec architecture distribuée (serveur central + agents locaux).

## Architecture

```
┌─────────────────┐         HTTPS         ┌──────────────────┐
│  Mobile App     │◄───────────────────────►│  Serveur Central │
│  (React Native) │   (JWT Auth)           │  (VB.NET Service)│
└─────────────────┘                         └────────┬─────────┘
                                                      │
                                                      │ MySQL
                                                      ▼
                                              ┌──────────────┐
                                              │   Database   │
                                              │  (Multi-     │
                                              │   tenant)    │
                                              └──────────────┘
                                                      ▲
                                                      │
                                                      │ HTTPS
                                                      │ (Polling)
                                                      │
                                              ┌───────┴────────┐
                                              │  Agent Local   │
                                              │ (VB.NET Service│
                                              │  sur site)     │
                                              └───────┬────────┘
                                                      │
                                                      │ TCP/IP
                                                      │ (Port 4370)
                                                      ▼
                                              ┌──────────────┐
                                              │  Terminal    │
                                              │  BioBridge   │
                                              └──────────────┘
```

## Composants

### 1. Serveur Central (`BioBridgeDoorControlService`)

Service Windows VB.NET qui expose une API REST sur le port 8080.

**Endpoints principaux :**
- `POST /{tenant}/auth/login` - Authentification utilisateur
- `GET /{tenant}/doors` - Liste des portes (avec token JWT)
- `POST /{tenant}/doors/{doorId}/open` - Ouvrir une porte
- `POST /{tenant}/doors/{doorId}/close` - Fermer une porte
- `GET /{tenant}/doors/{doorId}/status` - Statut d'une porte
- `POST /agents/register` - Enregistrement d'un agent
- `GET /agents/{agentId}/commands` - Récupération des commandes (polling)
- `POST /agents/{agentId}/results` - Envoi des résultats d'exécution

**Configuration (`app.config`) :**
```xml
<add key="MYSQL_HOST" value="localhost" />
<add key="MYSQL_DATABASE" value="udm_multitenant" />
<add key="MYSQL_USER" value="udm" />
<add key="MYSQL_PASSWORD" value="udm" />
<add key="JWT_SECRET" value="..." />
<add key="JWT_EXPIRATION_HOURS" value="24" />
```

### 2. Agent Local (`BioBridgeDoorControlAgent`)

Service Windows VB.NET qui s'exécute sur chaque site local et communique avec le serveur central.

**Fonctionnalités :**
- Enregistrement automatique au démarrage
- Polling des commandes depuis le serveur central
- Exécution des commandes via BioBridge SDK
- Envoi des résultats au serveur central
- Heartbeat périodique

**Configuration (`app.config`) :**
```xml
<add key="ServerUrl" value="http://localhost:8080" />
<add key="AgentKey" value="CHANGE_ME_AGENT_KEY_1" />
<add key="EnterpriseId" value="1" />
<add key="PollingInterval" value="3000" />
<add key="HeartbeatInterval" value="30000" />
```

### 3. Application Mobile (`mobile-app`)

Application React Native (Expo) pour Android et iOS.

**Fonctionnalités :**
- Configuration du serveur (première fois)
- Authentification par email/mot de passe
- Liste des portes accessibles
- Ouverture de porte avec authentification biométrique (FaceID/Fingerprint)
- Fermeture de porte
- Vérification du statut

## Installation

### Base de données MySQL

1. Créer la base de données :
```bash
mysql -u root -p < shema.sql
```

2. Modifier le mot de passe de l'utilisateur admin :
```sql
UPDATE users 
SET password_hash = LOWER(HEX(SHA2('ton_mot_de_passe', 256)))
WHERE email = 'admin@example.com';
```

### Serveur Central

1. Ouvrir `BioBridgeDoorControl/BioBridgeDoorControlService.sln` dans Visual Studio
2. Configurer `app.config` avec les informations MySQL
3. Build le projet (Debug ou Release)
4. Installer le service :
```cmd
cd bin\Debug
InstallUtil.exe UDM.exe
```

5. Démarrer le service :
```cmd
net start UDM
```

6. Autoriser le port 8080 (si nécessaire) :
```cmd
netsh http add urlacl url=http://+:8080/ user=Everyone
```

### Agent Local

1. Ouvrir `BioBridgeDoorControl/BioBridgeDoorControlAgent/BioBridgeDoorControlAgent.vbproj` dans Visual Studio
2. Configurer `app.config` avec :
   - `ServerUrl` : URL du serveur central
   - `AgentKey` : Clé unique de l'agent (doit correspondre à celle en base)
   - `EnterpriseId` : ID de l'entreprise
3. Build le projet
4. Installer le service :
```cmd
cd bin\Debug
InstallUtil.exe UDM-Agent.exe
```

5. Démarrer le service :
```cmd
net start UDM-Agent
```

### Application Mobile

1. Installer les dépendances :
```bash
cd mobile-app
npm install
```

2. Démarrer Expo :
```bash
npm start
```

3. Scanner le QR code avec Expo Go (Android) ou l'appareil photo (iOS)

## Configuration Multi-Tenant

Chaque entreprise a son propre "tenant" (slug) dans l'URL :
- `http://serveur:8080/entreprise-1/...`
- `http://serveur:8080/entreprise-2/...`

Les utilisateurs sont liés à une entreprise et ne peuvent accéder qu'aux portes de leur entreprise.

## Sécurité

- **Authentification JWT** : Tokens signés avec expiration configurable
- **Permissions par porte** : Chaque utilisateur a des permissions spécifiques (open/close/status)
- **Authentification biométrique** : Requise pour ouvrir une porte depuis l'app mobile
- **Agent Key** : Chaque agent s'authentifie avec une clé unique

## Développement

### Structure des fichiers

```
.
├── BioBridgeDoorControl/
│   ├── BioBridgeDoorControlService/    # Serveur central
│   │   ├── Service1.vb                  # Service principal
│   │   ├── DatabaseHelper.vb            # Accès MySQL
│   │   ├── AuthHelper.vb                # JWT
│   │   ├── PermissionChecker.vb         # Vérification permissions
│   │   └── CommandQueueManager.vb       # File d'attente
│   └── BioBridgeDoorControlAgent/       # Agent local
│       ├── AgentService.vb              # Service agent
│       ├── ServerClient.vb              # Communication serveur
│       ├── BioBridgeController.vb      # Contrôle BioBridge
│       └── ConfigManager.vb             # Configuration
├── mobile-app/                          # App React Native
│   ├── App.js                           # Navigation
│   ├── services/api.js                 # Service API
│   └── screens/                         # Écrans
└── shema.sql                            # Schéma MySQL
```

## Tests

1. **Test login** :
```bash
curl -X POST http://localhost:8080/entreprise-1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

2. **Test liste des portes** (avec token) :
```bash
curl http://localhost:8080/entreprise-1/doors \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

3. **Test ouverture de porte** :
```bash
curl -X POST http://localhost:8080/entreprise-1/doors/1/open \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delay":3000}'
```

## Logs

Les services Windows écrivent dans l'Event Viewer :
- Serveur central : Source `UDM`
- Agent : Source `UDM-Agent`

## Support

Pour toute question ou problème, vérifier :
1. Les logs Event Viewer
2. La connexion MySQL (serveur central)
3. La connexion HTTP entre agent et serveur central
4. La configuration des `agent_key` en base et dans l'agent
