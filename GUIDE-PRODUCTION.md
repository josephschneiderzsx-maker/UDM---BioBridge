# URZIS PASS - Guide de mise en production

## Architecture de production

```
                          Internet / LAN
                               |
                      [Pare-feu / Reverse Proxy]
                               |
                        Port 8080 (HTTPS)
                               |
                    +---------------------+
                    |  Serveur URZIS PASS |  (Windows Service "UDM")
                    |  BioBridgeDoorControl|
                    |  Service             |
                    +----------+----------+
                               |
                    +----------+----------+
                    |     MySQL Server    |
                    |   udm_multitenant   |
                    +---------------------+

    Machine(s) Agent(s) :
                    +---------------------+
                    |  Agent URZIS PASS   |  (Windows Service "UDM-Agent")
                    |  BioBridgeDoorControl|
                    |  Agent              |
                    +----------+----------+
                         |           |
                    TCP/4370    TCP/4370
                         |           |
                    [Terminal 1] [Terminal 2]   (ZKTeco / BioBridge)
```

---

## Etape 1 : Base de donnees MySQL

### 1.1 Installation MySQL

Installer MySQL Server 8.x sur le serveur de production.

### 1.2 Creation de la base

```bash
mysql -u root -p < Database/shema.sql
```

Cela cree :
- La base `udm_multitenant`
- Toutes les tables (enterprises, agents, doors, users, etc.)
- Les donnees de test (a modifier ensuite)

### 1.3 Executer les migrations

Executer **dans l'ordre** :

```bash
mysql -u root -p < Database/migration_add_quota.sql
mysql -u root -p < Database/migration_add_indexes.sql
mysql -u root -p < Database/migration_v2_features.sql
mysql -u root -p < Database/migration_add_user_quota.sql
mysql -u root -p < Database/migration_add_enterprise_license.sql
```

> **Note :** Si vous partez du `shema.sql` actuel (v2.0), ces migrations sont idempotentes et ne feront rien car les colonnes existent deja. Elles sont utiles pour mettre a jour une base existante.

### 1.4 Creer un utilisateur MySQL dedie

```sql
CREATE USER 'udm'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON udm_multitenant.* TO 'udm'@'localhost';
FLUSH PRIVILEGES;
```

> Remplacer `'localhost'` par `'%'` ou l'IP specifique si MySQL est sur un serveur separe.

### 1.5 Configurer l'entreprise de production

```sql
USE udm_multitenant;

-- Supprimer les donnees de test
DELETE FROM users WHERE enterprise_id = 1;
DELETE FROM doors WHERE enterprise_id = 1;
DELETE FROM agents WHERE enterprise_id = 1;
DELETE FROM enterprises WHERE id = 1;

-- Creer l'entreprise de production
INSERT INTO enterprises (slug, name, door_quota, user_quota, license_start_date, license_end_date)
VALUES ('mon-entreprise', 'Mon Entreprise SARL', 50, 100, '2026-01-01', '2027-01-01');
-- Notez l'ID retourne (ex: 1)
```

Le `slug` est l'identifiant que les utilisateurs saisiront dans le champ "Organization" de l'app mobile.

### 1.6 Creer l'agent

```sql
-- Generer une cle unique et forte (ex: UUID ou chaine aleatoire 32+ caracteres)
INSERT INTO agents (enterprise_id, name, agent_key, is_online)
VALUES (1, 'Agent-Production', 'CLE_AGENT_UNIQUE_FORTE_32_CHARS_MIN', 0);
-- Notez l'ID retourne (ex: 1)
```

### 1.7 Creer l'utilisateur admin

```sql
-- Le mot de passe doit etre hashe en SHA256
-- Exemple pour "MonMotDePasse123" :
-- SHA256 = echo -n "MonMotDePasse123" | sha256sum
INSERT INTO users (enterprise_id, email, password_hash, first_name, last_name, is_admin)
VALUES (1, 'admin@monentreprise.com', 'HASH_SHA256_DU_MOT_DE_PASSE', 'Admin', 'Principal', 1);
```

> Pour generer le hash SHA256 sous PowerShell :
> ```powershell
> $bytes = [System.Text.Encoding]::UTF8.GetBytes("MonMotDePasse123")
> $hash = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
> [BitConverter]::ToString($hash).Replace("-","").ToLower()
> ```

### 1.8 Ajouter les portes

```sql
INSERT INTO doors (enterprise_id, agent_id, name, terminal_ip, terminal_port, default_delay)
VALUES
  (1, 1, 'Porte principale', '192.168.40.10', 4370, 3000),
  (1, 1, 'Porte arriere',    '192.168.40.11', 4370, 3000);
```

---

## Etape 2 : Service Serveur (BioBridgeDoorControlService)

### 2.1 Configuration

Editer `BioBridgeDoorControlService/app.config` :

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <appSettings>
    <!-- MySQL -->
    <add key="MYSQL_HOST" value="localhost" />
    <add key="MYSQL_DATABASE" value="udm_multitenant" />
    <add key="MYSQL_USER" value="udm" />
    <add key="MYSQL_PASSWORD" value="MOT_DE_PASSE_FORT" />

    <!-- JWT - OBLIGATOIRE : changer cette cle ! -->
    <add key="JWT_SECRET" value="GENERER_UNE_CLE_ALEATOIRE_DE_64_CARACTERES" />
    <add key="JWT_EXPIRATION_HOURS" value="24" />
  </appSettings>
</configuration>
```

> **IMPORTANT** : Le `JWT_SECRET` **doit** etre change. Generer une cle aleatoire :
> ```powershell
> -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
> ```

### 2.2 Compilation

```powershell
cd BioBridgeDoorControl
dotnet build BioBridgeDoorControlService.sln --configuration Release
```

Les binaires sont dans `BioBridgeDoorControlService/bin/Release/`.

### 2.3 Reservation du port HTTP

Executer en tant qu'**Administrateur** :

```powershell
netsh http add urlacl url=http://+:8080/ user=Everyone
```

### 2.4 Ouverture du pare-feu

```powershell
netsh advfirewall firewall add rule name="URZIS PASS Server" dir=in action=allow protocol=TCP localport=8080
```

### 2.5 Installation du service Windows

```powershell
# Copier les binaires dans un dossier permanent
New-Item -ItemType Directory -Force -Path "C:\URZIS\Server"
Copy-Item "BioBridgeDoorControlService\bin\Release\*" "C:\URZIS\Server\" -Recurse

# Installer le service
sc.exe create UDM binPath= "C:\URZIS\Server\BioBridgeDoorControlService.exe" start= auto displayname= "URZIS PASS Server"
sc.exe description UDM "URZIS PASS Door Control Server - API REST port 8080"

# Demarrer
sc.exe start UDM
```

### 2.6 Verification

```powershell
# Verifier que le service tourne
sc.exe query UDM

# Tester l'API (remplacer "mon-entreprise" par votre slug)
Invoke-RestMethod -Uri "http://localhost:8080/mon-entreprise/license-status" -Method GET
```

---

## Etape 3 : Service Agent (BioBridgeDoorControlAgent)

### 3.1 Configuration

Editer `BioBridgeDoorControlAgent/app.config` :

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <appSettings>
    <!-- URL du serveur URZIS PASS -->
    <add key="ServerUrl" value="https://app.pass.urzis.com:8080" />

    <!-- Cle d'agent (doit correspondre a agents.agent_key en base) -->
    <add key="AgentKey" value="CLE_AGENT_UNIQUE_FORTE_32_CHARS_MIN" />

    <!-- ID de l'entreprise -->
    <add key="EnterpriseId" value="1" />

    <!-- Performance (valeurs optimisees, ne pas modifier sauf besoin) -->
    <add key="PollingInterval" value="500" />
    <add key="HeartbeatInterval" value="30000" />
    <add key="CommandTimeout" value="2" />

    <!-- Ingress (optionnel - voir GUIDE-INGRESS.md) -->
    <add key="IngressEnabled" value="false" />
    <add key="IngressMysqlHost" value="192.168.40.5" />
    <add key="IngressMysqlDatabase" value="ingress" />
    <add key="IngressMysqlUser" value="ingress" />
    <add key="IngressMysqlPassword" value="ingress" />
    <add key="IngressSyncInterval" value="30000" />
  </appSettings>
</configuration>
```

### 3.2 Pre-requis

- **BioBridgeSDKDLL.dll** et **Interop.zkemkeeper.dll** doivent etre dans le dossier de l'agent
- La machine Agent doit avoir acces reseau :
  - Au serveur URZIS PASS (port 8080)
  - Aux terminaux ZKTeco (port 4370)

### 3.3 Compilation

```powershell
cd BioBridgeDoorControl
dotnet build BioBridgeDoorControlAgent.sln --configuration Release
```

### 3.4 Installation du service Windows

```powershell
# Copier les binaires
New-Item -ItemType Directory -Force -Path "C:\URZIS\Agent"
Copy-Item "BioBridgeDoorControlAgent\bin\Release\*" "C:\URZIS\Agent\" -Recurse

# Installer
sc.exe create UDM-Agent binPath= "C:\URZIS\Agent\BioBridgeDoorControlAgent.exe" start= auto displayname= "URZIS PASS Agent"
sc.exe description UDM-Agent "URZIS PASS Door Control Agent - Communication terminaux"

# Demarrer
sc.exe start UDM-Agent
```

### 3.5 Verification

```powershell
# Verifier que le service tourne
sc.exe query UDM-Agent

# Verifier dans les logs Windows
Get-EventLog -LogName Application -Source "UDM-Agent" -Newest 10
```

L'agent doit afficher :
```
Agent registered with ID: 1
Door info loaded. Total doors: 2
```

---

## Etape 4 : Application mobile

### 4.1 URL du serveur

L'URL de production est codee en dur dans `mobile-app/config.js` :

```javascript
export const SERVER_URL = 'https://app.pass.urzis.com:8080';
```

### 4.2 Build de production (Android)

```bash
cd mobile-app
npx expo install eas-cli
npx eas build --platform android --profile production
```

### 4.3 Build de production (iOS)

```bash
npx eas build --platform ios --profile production
```

### 4.4 Configuration EAS (si pas deja fait)

Creer `eas.json` dans `mobile-app/` :

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "buildType": "archive"
      }
    }
  }
}
```

---

## Etape 5 : HTTPS (Recommande)

### Option A : Reverse proxy (Nginx/Apache)

Placer un reverse proxy devant le port 8080 avec un certificat SSL :

```nginx
server {
    listen 443 ssl;
    server_name app.pass.urzis.com;

    ssl_certificate     /etc/ssl/certs/urzis-pass.crt;
    ssl_certificate_key /etc/ssl/private/urzis-pass.key;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option B : Certificat SSL directement sur le service

Si le serveur est expose directement (sans reverse proxy), configurer un certificat SSL via `netsh` :

```powershell
# Importer le certificat dans le store Windows
# Puis lier au port 8080
netsh http add sslcert ipport=0.0.0.0:8080 certhash=THUMBPRINT_DU_CERTIFICAT appid={GUID_APPLICATION}
```

---

## Etape 6 : Gestion des licences

### Configurer une licence

```sql
UPDATE enterprises
SET license_start_date = '2026-01-01',
    license_end_date = '2027-01-01'
WHERE slug = 'mon-entreprise';
```

### Comportement

| Statut | Condition | Effet |
|--------|-----------|-------|
| `Valid` | Dates NULL ou aujourd'hui dans la plage | Fonctionnement normal |
| `GracePeriod` | 1 a 3 jours apres `license_end_date` | Banner d'avertissement dans l'app, tout fonctionne |
| `Expired` | Plus de 3 jours apres `license_end_date` | **Blocage total** - login refuse |
| `NotStarted` | Aujourd'hui avant `license_start_date` | **Blocage total** - login refuse |

### Renouveler une licence

```sql
UPDATE enterprises
SET license_end_date = '2028-01-01'
WHERE slug = 'mon-entreprise';
```

Effet immediat, pas besoin de redemarrer les services.

---

## Etape 7 : Deploiement de plusieurs agents

Chaque agent gere un ensemble de portes. Pour deployer plusieurs agents :

### 7.1 En base

```sql
-- Agent 1 : Bureau principal
INSERT INTO agents (enterprise_id, name, agent_key) VALUES (1, 'Agent-Bureau', 'CLE_UNIQUE_AGENT_1');

-- Agent 2 : Entrepot
INSERT INTO agents (enterprise_id, name, agent_key) VALUES (1, 'Agent-Entrepot', 'CLE_UNIQUE_AGENT_2');
```

### 7.2 Affecter les portes

```sql
-- Portes du bureau -> Agent 1
UPDATE doors SET agent_id = 1 WHERE name IN ('Porte principale', 'Porte arriere');

-- Portes de l'entrepot -> Agent 2
INSERT INTO doors (enterprise_id, agent_id, name, terminal_ip, terminal_port)
VALUES (1, 2, 'Porte entrepot', '192.168.50.10', 4370);
```

### 7.3 Installer chaque agent

Chaque machine agent a son propre `app.config` avec son `AgentKey` et son `ServerUrl`.

---

## Etape 8 : Multi-tenant

Pour ajouter une nouvelle entreprise :

```sql
-- 1. Creer l'entreprise
INSERT INTO enterprises (slug, name, door_quota, user_quota, license_start_date, license_end_date)
VALUES ('autre-entreprise', 'Autre Entreprise SA', 20, 50, '2026-01-01', '2027-12-31');

-- 2. Creer son agent
INSERT INTO agents (enterprise_id, name, agent_key) VALUES (2, 'Agent-AE', 'CLE_UNIQUE_AUTRE_ENTREPRISE');

-- 3. Creer son admin
INSERT INTO users (enterprise_id, email, password_hash, first_name, last_name, is_admin)
VALUES (2, 'admin@autreentreprise.com', 'HASH_SHA256', 'Admin', 'AE', 1);

-- 4. Ajouter ses portes
INSERT INTO doors (enterprise_id, agent_id, name, terminal_ip, terminal_port)
VALUES (2, 2, 'Porte reception', '10.0.0.10', 4370);
```

Chaque entreprise est completement isolee. Les users de l'entreprise 1 ne voient pas les portes de l'entreprise 2.

---

## Checklist de mise en production

### Securite
- [ ] `JWT_SECRET` change (64 caracteres aleatoires minimum)
- [ ] `MYSQL_PASSWORD` fort et unique
- [ ] `AgentKey` unique par agent (32 caracteres minimum)
- [ ] Mot de passe admin hashe en SHA256
- [ ] HTTPS active (certificat SSL)
- [ ] Port MySQL (3306) non expose sur Internet
- [ ] Pare-feu configure (seul port 8080 ouvert)

### Base de donnees
- [ ] MySQL installe et demarre
- [ ] Schema `shema.sql` execute
- [ ] Toutes les migrations executees
- [ ] Utilisateur MySQL `udm` cree avec privileges
- [ ] Entreprise de production creee (donnees test supprimees)
- [ ] Agent enregistre en base
- [ ] Admin cree en base
- [ ] Portes configurees avec les bonnes IP/port des terminaux

### Service Serveur
- [ ] `app.config` configure (MySQL + JWT)
- [ ] Compile en Release
- [ ] Reservation HTTP port 8080 faite (`netsh`)
- [ ] Service Windows installe et demarre
- [ ] API accessible (`GET /slug/license-status` repond)

### Service Agent
- [ ] `app.config` configure (ServerUrl + AgentKey + EnterpriseId)
- [ ] `BioBridgeSDKDLL.dll` present dans le dossier
- [ ] Compile en Release
- [ ] Service Windows installe et demarre
- [ ] Agent enregistre (log : "Agent registered with ID: X")
- [ ] Portes detectees (log : "Door info loaded. Total doors: X")
- [ ] Terminaux accessibles sur le reseau (ping IP terminal)

### Application mobile
- [ ] `config.js` pointe vers l'URL de production
- [ ] Build APK/IPA genere via EAS
- [ ] Test de connexion avec le slug d'entreprise
- [ ] Test d'ouverture de porte depuis l'app

### Reseau
- [ ] Serveur accessible depuis Internet (port 8080)
- [ ] Agent accessible vers le serveur (port 8080)
- [ ] Agent accessible vers les terminaux (port 4370)
- [ ] Si Ingress : Agent accessible vers MySQL Ingress (port 3306)

---

## Mise a jour du service

Pour deployer une nouvelle version :

```powershell
# 1. Arreter le service
sc.exe stop UDM

# 2. Copier les nouveaux binaires
Copy-Item "BioBridgeDoorControlService\bin\Release\*" "C:\URZIS\Server\" -Recurse -Force

# 3. Redemarrer
sc.exe start UDM
```

Meme procedure pour l'agent avec `UDM-Agent`.

> **Note** : Les mises a jour de base de donnees (migrations) doivent etre executees **avant** de redemarrer les services.

---

## Depannage

| Probleme | Verification | Solution |
|----------|-------------|----------|
| Service ne demarre pas | `Get-EventLog -LogName Application -Source "UDM" -Newest 5` | Verifier app.config et connexion MySQL |
| Agent ne s'enregistre pas | Log agent : "Failed to register agent" | Verifier `ServerUrl` et `AgentKey` dans app.config |
| Porte ne s'ouvre pas | Log agent : "Connection refused" | Verifier IP/port du terminal, connectivite reseau |
| Login refuse (403) | Licence expiree | `UPDATE enterprises SET license_end_date = '20XX-XX-XX'` |
| Login refuse (401) | Mauvais identifiants | Verifier email + hash SHA256 du mot de passe |
| App mobile "Network error" | Pas d'acces au serveur | Verifier URL, pare-feu, certificat SSL |
| Latence elevee | Polling trop lent | Verifier `PollingInterval = 500` et `CommandTimeout = 2` |
