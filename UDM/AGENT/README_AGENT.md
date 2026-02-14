# Installation - Agent local UDM-Agent

## Fichiers inclus

- `UDM-Agent.exe` : service Windows de l'agent
- `UDM-Agent.exe.config` : fichier de configuration
- `BioBridgeSDKDLLv3.dll` : DLL BioBridge SDK
- `Interop.*.dll` : DLLs d'interopérabilité
- `InstallUtil32.exe` / `InstallUtil64.exe` : utilitaire d'installation (optionnel)

---

## Prérequis

- Windows 10/11 ou Server
- .NET Framework 4.8
- Accès réseau au serveur URZIS PASS (port 8080)
- Accès réseau aux terminaux BioBridge/ZKTeco (port 4370)

---

## Étape 1 – Emplacement d’installation (important)

- **Éviter** d’installer sous `C:\Program Files\AGENT` si l’agent est compilé en 32 bits (x86) : Windows redirige alors la lecture du fichier de configuration vers `C:\Program Files (x86)\AGENT\`. Il faudrait maintenir le même contenu dans les deux dossiers, ce qui prête à confusion.
- **Recommandation** : installer dans un dossier sans redirection, par exemple :
  - `C:\AGENT`
  - ou `C:\URZIS PASS\AGENT`
- Copier tous les fichiers de l’agent (exe, exe.config, dll) dans ce dossier.

---

## Étape 2 – Fichier de configuration

- Fichier à éditer : **UDM-Agent.exe.config** (dans le même dossier que UDM-Agent.exe).
- Utiliser **obligatoirement** des balises XML en **minuscules** : `<add key="..." value="..." />`. Les majuscules (`<ADD KEY="..." VALUE="..." />`) ne sont pas reconnues et l’agent affiche « AgentKey is required in app.config ».

Exemple :

```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <appSettings>
    <add key="ServerUrl" value="http://app.pass.urzis.com:8080" />
    <add key="AgentKey" value="VOTRE_CLE_AGENT_UNIQUE" />
    <add key="EnterpriseId" value="100" />
    <add key="PollingInterval" value="500" />
    <add key="HeartbeatInterval" value="30000" />
    <add key="CommandTimeout" value="2" />
    <add key="IngressEnabled" value="false" />
  </appSettings>
</configuration>
```

- **ServerUrl** : URL de base du serveur (sans slash final).
- **AgentKey** : clé unique pour cet agent (à reprendre à l’identique en base).
- **EnterpriseId** : ID de l’entreprise dans la base udm_multitenant.

---

## Étape 3 – Enregistrer l’agent en base de données (côté serveur)

Sur le serveur URZIS PASS, dans la base **udm_multitenant** :

```sql
USE udm_multitenant;

-- Vérifier que l'entreprise existe (sinon l'ajuster ou la créer)
SELECT id, name FROM enterprises WHERE id = 100;

INSERT INTO agents (enterprise_id, name, agent_key, is_online, is_active)
VALUES (100, 'Nom de l''agent (ex: Agent Site 1)', 'VOTRE_CLE_AGENT_UNIQUE', 0, 1);
```

- **agent_key** doit être **strictement identique** à la valeur de **AgentKey** dans UDM-Agent.exe.config.
- **enterprise_id** doit correspondre à **EnterpriseId** du config.

---

## Étape 4 – Installer le service Windows

- Ouvrir **PowerShell en tant qu’administrateur** (clic droit sur PowerShell → Exécuter en tant qu’administrateur).
- Se placer dans le dossier de l’agent, par exemple : `cd "C:\AGENT"`.
- Lancer l’installation du service (32 ou 64 bits selon la build de l’agent) :

```powershell
# 32 bits (cas le plus fréquent pour UDM-Agent)
C:\Windows\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe UDM-Agent.exe

# 64 bits
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe UDM-Agent.exe
```

- En cas d’erreur liée au journal des événements (Event Log), relancer PowerShell en administrateur et refaire la commande.

---

## Étape 5 – Si l’agent est installé sous C:\Program Files\AGENT (32 bits)

- Le processus 32 bits lit le config dans **C:\Program Files (x86)\AGENT\**.
- Créer le dossier et y copier le même UDM-Agent.exe.config :

```powershell
New-Item -ItemType Directory -Path "C:\Program Files (x86)\AGENT" -Force
Copy-Item "C:\Program Files\AGENT\UDM-Agent.exe.config" -Destination "C:\Program Files (x86)\AGENT\UDM-Agent.exe.config" -Force
```

- Puis redémarrer le service : `Restart-Service -Name "UDM-Agent"`

---

## Étape 6 – Démarrer et vérifier

```powershell
Start-Service -Name "UDM-Agent"
Get-Service -Name "UDM-Agent"
Get-EventLog -LogName Application -Source "UDM-Agent" -Newest 10
```

- Dans les logs : message du type « Agent registered with ID: X » puis « Door info loaded. Total doors: N ».
- En base : `SELECT id, name, agent_key, is_online, last_heartbeat FROM agents WHERE agent_key = 'VOTRE_CLE';` — **is_online** doit passer à 1 et **last_heartbeat** se mettre à jour.

---

## Configuration des portes

Après l’enregistrement de l’agent, configurer les portes en base de données (sur le serveur) :

```sql
INSERT INTO doors (enterprise_id, agent_id, name, terminal_ip, terminal_port, default_delay)
VALUES
(100, 2, 'Porte Principale', '192.168.40.10', 4370, 3000),
(100, 2, 'Porte Secondaire', '192.168.40.9', 4370, 3000);
```

Remplacer `agent_id` par l’ID de votre agent (voir table `agents`).

---

## Désinstallation

```powershell
Stop-Service -Name "UDM-Agent"
C:\Windows\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe /u UDM-Agent.exe
```

---

## Logs

Les logs sont disponibles dans l’Observateur d’événements Windows :
- Source : **UDM-Agent**
- Journal : **Application**

---

## Dépannage

| Problème | Cause possible | Solution |
|----------|----------------|----------|
| « AgentKey is required in app.config » | Balises XML en majuscules ou mauvais fichier | Utiliser `<add key="..." value="..." />` en minuscules ; vérifier que le config est dans le bon dossier (ou dans Program Files (x86)\AGENT si 32 bits). |
| Agent pas en ligne (is_online = 0) | URL serveur, firewall, ou agent_key incorrecte | Vérifier ServerUrl et AgentKey ; tester depuis la machine agent : `Invoke-WebRequest -Uri "http://serveur:8080/agents/register" -Method POST ...` |
| Erreur Event Log à l’installation | Droits insuffisants | Lancer PowerShell en **administrateur**. |

Documentation détaillée : voir `AGENT-DOCUMENTATION.md` à la racine du projet.
