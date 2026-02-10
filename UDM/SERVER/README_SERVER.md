# Installation - Serveur Central UDM

## Fichiers inclus

- `UDM.exe` : Service Windows principal
- `UDM.exe.config` : Fichier de configuration
- `InstallUtil.exe` : Utilitaire d'installation (optionnel)

## Installation rapide

### 1. Prérequis

- Windows Server 2016+ ou Windows 10/11 Pro
- .NET Framework 4.8
- MySQL 8.0+
- Port 8080 ouvert dans le pare-feu

### 2. Configuration

Éditer `UDM.exe.config` :

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

**IMPORTANT** : Changer `JWT_SECRET` par une chaîne aléatoire sécurisée (minimum 32 caractères).

### 3. Installation du service

Ouvrir PowerShell en tant qu'administrateur :

```powershell
cd C:\UDM\SERVER
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe UDM.exe
```

### 4. Démarrage

```powershell
Start-Service -Name "UDM"
```

### 5. Vérification

```powershell
Get-Service -Name "UDM"
Get-EventLog -LogName Application -Source "UDM" -Newest 10
```

## Configuration du pare-feu

```powershell
New-NetFirewallRule -DisplayName "UDM HTTP API" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

## Désinstallation

```powershell
Stop-Service -Name "UDM"
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\InstallUtil.exe /u UDM.exe
```

## Logs

Les logs sont disponibles dans Windows Event Viewer :
- Source : "UDM"
- Log : Application

## Support

Voir `../INSTALLATION_GUIDE.md` pour plus de détails.
