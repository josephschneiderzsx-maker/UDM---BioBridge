# Installation - Agent Local UDM-Agent

## Fichiers inclus

- `UDM-Agent.exe` : Service Windows de l'agent
- `UDM-Agent.exe.config` : Fichier de configuration
- `BioBridgeSDKDLLv3.dll` : DLL BioBridge SDK
- `Interop.*.dll` : DLLs d'interopérabilité
- `InstallUtil.exe` : Utilitaire d'installation (optionnel)

## Installation rapide

### 1. Prérequis

- Windows 10/11
- .NET Framework 4.8
- Accès réseau au serveur central (port 8080)
- Accès réseau local aux terminaux BioBridge (port 4370)

### 2. Configuration

Éditer `UDM-Agent.exe.config` :

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

**IMPORTANT** :
- `ServerUrl` : URL complète du serveur central
- `AgentKey` : Clé unique pour cet agent (à générer et noter)
- `EnterpriseId` : ID de l'entreprise dans la base de données

### 3. Enregistrer l'agent en base de données

Se connecter à MySQL et exécuter :

```sql
USE udm_multitenant;
INSERT INTO agents (enterprise_id, agent_key, name, is_active) 
VALUES (1, 'CLE_AGENT_UNIQUE', 'Agent Site 1', 1);
```

### 4. Installation du service

Ouvrir PowerShell en tant qu'administrateur :

```powershell
cd C:\UDM\AGENT

# Pour 32-bit
C:\Windows\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe UDM-Agent.exe

# Pour 64-bit
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe UDM-Agent.exe
```

### 5. Démarrage

```powershell
Start-Service -Name "UDM-Agent"
```

### 6. Vérification

```powershell
Get-Service -Name "UDM-Agent"
Get-EventLog -LogName Application -Source "UDM-Agent" -Newest 10
```

Les logs doivent afficher : "Agent registered with ID: X"

## Configuration des portes

Après l'enregistrement de l'agent, configurer les portes en base de données :

```sql
INSERT INTO doors (enterprise_id, agent_id, name, terminal_ip, terminal_port, default_delay) 
VALUES 
(1, 1, 'Porte Principale', '192.168.40.10', 4370, 3000),
(1, 1, 'Porte Secondaire', '192.168.40.9', 4370, 3000);
```

## Désinstallation

```powershell
Stop-Service -Name "UDM-Agent"
C:\Windows\Microsoft.NET\Framework\v4.0.30319\InstallUtil.exe /u UDM-Agent.exe
```

## Logs

Les logs sont disponibles dans Windows Event Viewer :
- Source : "UDM-Agent"
- Log : Application

## Support

Voir `../INSTALLATION_GUIDE.md` pour plus de détails.
