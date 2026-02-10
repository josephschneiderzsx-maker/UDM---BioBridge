# Requirements - UDM BioBridge Door Control

## Exigences Système

### Serveur Central (UDM)

| Composant | Version minimale | Version recommandée | Notes |
|-----------|------------------|---------------------|-------|
| OS | Windows Server 2016 | Windows Server 2022 | Ou Windows 10/11 Pro |
| .NET Framework | 4.8 | 4.8 | Obligatoire |
| MySQL | 8.0 | 8.0+ | Base de données |
| RAM | 2 GB | 4 GB+ | Minimum pour MySQL + Service |
| Disque | 10 GB | 20 GB+ | Pour MySQL et logs |
| CPU | 2 cores | 4 cores+ | Pour performances optimales |
| Réseau | 10 Mbps | 100 Mbps+ | Pour communication avec agents |

**Ports requis :**
- **8080** (HTTP API) - Entrant - Doit être ouvert dans le pare-feu

**Permissions :**
- Droits administrateur pour installer le service Windows
- Accès en lecture/écriture au dossier d'installation
- Accès réseau pour communiquer avec MySQL

---

### Agent Local (UDM-Agent)

| Composant | Version minimale | Version recommandée | Notes |
|-----------|------------------|---------------------|-------|
| OS | Windows 10 | Windows 11 | 32-bit ou 64-bit |
| .NET Framework | 4.8 | 4.8 | Obligatoire |
| RAM | 512 MB | 1 GB+ | Pour le service |
| Disque | 100 MB | 500 MB+ | Pour le service et logs |
| CPU | 1 core | 2 cores+ | Pour performances optimales |
| Réseau | 1 Mbps | 10 Mbps+ | Pour communication avec serveur |

**Réseau requis :**
- Accès sortant au serveur central (port 8080)
- Accès local aux terminaux BioBridge (port 4370)
- Même réseau local que les terminaux BioBridge

**Permissions :**
- Droits administrateur pour installer le service Windows
- Accès en lecture/écriture au dossier d'installation

---

### Application Mobile

| Composant | Version minimale | Version recommandée | Notes |
|-----------|------------------|---------------------|-------|
| Android | 6.0 (API 23) | 10.0+ (API 29+) | Pour production |
| iOS | 12.0 | 15.0+ | Pour production |
| RAM | 2 GB | 4 GB+ | Pour l'application |
| Stockage | 50 MB | 100 MB+ | Pour l'application |
| Réseau | Wi-Fi ou 4G | Wi-Fi ou 5G | Pour communication avec serveur |

**Fonctionnalités requises :**
- **Android** : Capteur d'empreinte digitale ou Face Unlock
- **iOS** : Face ID ou Touch ID
- **Réseau** : Accès au serveur central (port 8080)

**Pour développement :**
- Node.js 16+
- Expo CLI
- Expo Go installé sur l'appareil

---

## Exigences Réseau

### Topologie recommandée

```
Internet
   |
   | (HTTPS/HTTP)
   |
[Serveur Central UDM]
   | Port 8080
   |
   +-- [Agent Local Site 1] -- [Terminal BioBridge 1]
   |                          -- [Terminal BioBridge 2]
   |
   +-- [Agent Local Site 2] -- [Terminal BioBridge 3]
   |
   +-- [Appareils Mobiles] (via Internet ou réseau local)
```

### Ports et Protocoles

| Service | Port | Protocole | Direction | Description |
|---------|------|-----------|-----------|-------------|
| UDM API | 8080 | HTTP/HTTPS | Entrant | API REST du serveur central |
| MySQL | 3306 | TCP | Local | Base de données (optionnel si distant) |
| BioBridge | 4370 | TCP | Local | Communication avec terminaux (agent uniquement) |
| Expo Metro | 8081 | HTTP | Local | Développement mobile uniquement |

### Pare-feu

**Serveur Central :**
- Autoriser le port 8080 (TCP) en entrée
- Autoriser le port 3306 (TCP) en sortie si MySQL est distant

**Agent Local :**
- Autoriser le port 8080 (TCP) en sortie vers le serveur central
- Autoriser le port 4370 (TCP) en sortie vers les terminaux BioBridge

**Appareils Mobiles :**
- Aucune configuration requise (connexion sortante uniquement)

---

## Exigences de Sécurité

### Serveur Central

- **JWT Secret** : Minimum 32 caractères aléatoires
- **HTTPS** : Recommandé pour la production (certificat SSL)
- **MySQL** : Utilisateur dédié avec permissions limitées
- **Pare-feu** : Restreindre l'accès au port 8080 si possible

### Agent Local

- **Agent Key** : Clé unique par agent (minimum 16 caractères)
- **Réseau** : Isoler les terminaux BioBridge sur un réseau privé
- **Service Windows** : Exécuter avec compte LocalSystem (par défaut)

### Application Mobile

- **Authentification biométrique** : Requise pour ouvrir les portes
- **Tokens JWT** : Stockés de manière sécurisée (AsyncStorage)
- **HTTPS** : Obligatoire pour la production

---

## Exigences de Performance

### Serveur Central

- **Connexions simultanées** : Support de 100+ utilisateurs
- **Temps de réponse API** : < 200ms pour la plupart des requêtes
- **File de commandes** : Traitement de 1000+ commandes/heure

### Agent Local

- **Polling interval** : 3 secondes (configurable)
- **Heartbeat** : 30 secondes (configurable)
- **Temps d'exécution commande** : < 5 secondes

### Application Mobile

- **Temps de chargement** : < 2 secondes
- **Temps de réponse** : < 1 seconde pour la plupart des actions

---

## Exigences de Disponibilité

### Serveur Central

- **Uptime** : 99.9% (8.76 heures d'indisponibilité/an)
- **Backup** : Quotidien de la base de données MySQL
- **Monitoring** : Surveillance des logs et performances

### Agent Local

- **Redémarrage automatique** : Configuré par défaut (service Windows)
- **Reconnexion automatique** : En cas de perte de connexion au serveur

---

## Exigences de Maintenance

### Logs

- **Serveur Central** : Windows Event Viewer (Source: "UDM")
- **Agent Local** : Windows Event Viewer (Source: "UDM-Agent")
- **Rétention** : Minimum 30 jours

### Mises à jour

- **Serveur Central** : Mises à jour planifiées avec maintenance
- **Agent Local** : Mises à jour via déploiement manuel
- **Application Mobile** : Mises à jour via App Store / Play Store

---

## Checklist d'Installation

### Avant l'installation

- [ ] .NET Framework 4.8 installé
- [ ] MySQL 8.0+ installé et configuré
- [ ] Ports réseau ouverts (8080 pour serveur)
- [ ] Droits administrateur disponibles
- [ ] Accès réseau vérifié

### Serveur Central

- [ ] Base de données créée
- [ ] Configuration MySQL dans app.config
- [ ] JWT_SECRET changé
- [ ] Service Windows installé
- [ ] Pare-feu configuré
- [ ] Service démarré et testé

### Agent Local

- [ ] Configuration agent_key dans app.config
- [ ] Agent enregistré en base de données
- [ ] Portes configurées en base de données
- [ ] Service Windows installé
- [ ] Service démarré et testé
- [ ] Enregistrement vérifié dans les logs

### Application Mobile

- [ ] Node.js installé (pour développement)
- [ ] Dépendances installées
- [ ] Application testée
- [ ] Build de production créé (si nécessaire)

---

## Support et Documentation

- **Guide d'installation** : `INSTALLATION_GUIDE.md`
- **Guide de test** : `TEST_GUIDE.md`
- **Schéma de base de données** : `shema.sql`
- **Logs** : Windows Event Viewer
