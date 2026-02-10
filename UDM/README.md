# UDM - Livrables Client

Ce dossier contient tous les fichiers nécessaires pour l'installation du système UDM BioBridge Door Control.

## Structure

```
UDM/
├── SERVER/          # Serveur central UDM
├── AGENT/           # Agent local UDM-Agent
├── MOBILE_APP/      # Application mobile
└── README.md        # Ce fichier
```

## Contenu des dossiers

### SERVER/
- `UDM.exe` : Exécutable du service Windows
- `UDM.exe.config` : Configuration (MySQL, JWT)
- `BioBridgeSDKDLLv3.dll` : DLL BioBridge (si nécessaire)
- `InstallUtil.exe` : Utilitaire d'installation (optionnel)
- `README_SERVER.md` : Guide d'installation du serveur

### AGENT/
- `UDM-Agent.exe` : Exécutable du service Windows
- `UDM-Agent.exe.config` : Configuration (URL serveur, agent_key)
- `BioBridgeSDKDLLv3.dll` : DLL BioBridge SDK
- `Interop.*.dll` : DLLs d'interopérabilité
- `README_AGENT.md` : Guide d'installation de l'agent

### MOBILE_APP/
- Code source de l'application React Native
- `package.json` : Dépendances
- `README.md` : Guide de build et déploiement

## Installation rapide

1. **Serveur Central** : Voir `INSTALLATION_GUIDE.md` section "Installation du Serveur Central"
2. **Agent Local** : Voir `INSTALLATION_GUIDE.md` section "Installation de l'Agent Local"
3. **Application Mobile** : Voir `INSTALLATION_GUIDE.md` section "Installation de l'Application Mobile"

## Documentation

- `../INSTALLATION_GUIDE.md` : Guide complet d'installation
- `../REQUIREMENTS.md` : Exigences système
- `../TEST_GUIDE.md` : Guide de test
- `../shema.sql` : Schéma de base de données

## Support

Pour toute assistance, consulter la documentation ou contacter le support technique.
