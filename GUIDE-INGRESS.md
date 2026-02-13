# URZIS PASS - Guide de connexion Ingress

## Qu'est-ce que l'Ingress ?

L'intégration Ingress permet de synchroniser les evenements d'un systeme de controle d'acces existant (ZKTeco / Ingress) vers URZIS PASS. L'agent interroge periodiquement la base de donnees Ingress et remonte les nouveaux evenements au serveur URZIS PASS.

```
Base MySQL Ingress (systeme existant)
    |
    | Lecture seule (SELECT)
    |
Agent URZIS PASS
    |
    | POST /agents/{id}/events
    |
Serveur URZIS PASS --> door_events (source = 'ingress')
```

---

## Pre-requis

- L'agent URZIS PASS doit avoir acces reseau au serveur MySQL du systeme Ingress
- Un compte MySQL en **lecture seule** sur la base `ingress`
- Les tables suivantes doivent exister dans la base Ingress :
  - `door_eventlog` - Journal des evenements
  - `device` - Liste des terminaux (serial number, IP)
  - `door_eventlog_description` - Description des types d'evenements

---

## Configuration

Editer le fichier `app.config` de l'Agent :

```xml
<!-- Ingress integration -->
<add key="IngressEnabled" value="true" />
<add key="IngressMysqlHost" value="192.168.1.100" />
<add key="IngressMysqlDatabase" value="ingress" />
<add key="IngressMysqlUser" value="ingress" />
<add key="IngressMysqlPassword" value="ingress" />
<add key="IngressSyncInterval" value="30000" />
```

### Parametres

| Parametre | Description | Valeur par defaut |
|-----------|-------------|-------------------|
| `IngressEnabled` | Activer la synchronisation Ingress | `false` |
| `IngressMysqlHost` | **IP ou hostname du serveur MySQL Ingress** | `localhost` |
| `IngressMysqlDatabase` | Nom de la base de donnees | `ingress` |
| `IngressMysqlUser` | Utilisateur MySQL | `ingress` |
| `IngressMysqlPassword` | Mot de passe MySQL | `ingress` |
| `IngressSyncInterval` | Intervalle de synchronisation (ms) | `30000` (30s) |

> **En pratique**, le seul parametre a modifier est `IngressMysqlHost` : l'adresse IP du serveur MySQL ou tourne la base Ingress. Les credentials par defaut sont `ingress` / `ingress` et la base s'appelle `ingress`.

---

## Exemple de configuration typique

```xml
<!-- Le seul changement necessaire : l'IP du serveur MySQL Ingress -->
<add key="IngressEnabled" value="true" />
<add key="IngressMysqlHost" value="192.168.40.5" />
<add key="IngressMysqlDatabase" value="ingress" />
<add key="IngressMysqlUser" value="ingress" />
<add key="IngressMysqlPassword" value="ingress" />
<add key="IngressSyncInterval" value="30000" />
```

---

## Fonctionnement

1. L'agent demarre un thread dedie `IngressSyncLoop`
2. Toutes les 30 secondes (configurable), il interroge la table `door_eventlog` pour les nouveaux evenements
3. Les evenements sont envoyes au serveur via `POST /agents/{id}/events`
4. Le serveur les insere dans `door_events` avec `source = 'ingress'`
5. L'app mobile les affiche dans l'historique d'activite avec le badge "ingress"

### Requete SQL executee

```sql
SELECT el.id, el.serialno, el.eventType, el.eventtime, el.userid,
       d.ipaddress, d.Port,
       COALESCE(eld.description, CONCAT('Event type ', el.eventType)) AS description
FROM door_eventlog el
LEFT JOIN device d ON d.serialno = el.serialno
LEFT JOIN door_eventlog_description eld ON eld.eventtype = CAST(el.eventType AS UNSIGNED)
WHERE el.id > @lastId
ORDER BY el.id ASC
LIMIT 100
```

- Seuls les **nouveaux** evenements sont recuperes a chaque cycle (suivi par `lastSyncId`)
- Maximum **100 evenements** par cycle pour eviter la surcharge
- La jointure avec `device` permet de recuperer l'adresse IP du terminal
- La jointure avec `door_eventlog_description` fournit une description lisible

---

## Verification

1. Demarrer le service Agent avec `IngressEnabled = true`
2. Dans les logs Windows (Event Viewer > Application), verifier :
   ```
   Ingress sync started (interval: 30000ms)
   ```
3. Declencher un evenement sur un terminal Ingress (badge, ouverture, etc.)
4. Attendre 30 secondes maximum
5. Verifier dans l'app mobile : l'evenement doit apparaitre dans l'historique

---

## Depannage

| Probleme | Cause probable | Solution |
|----------|---------------|----------|
| Aucun evenement remonte | `IngressEnabled = false` | Mettre a `true` dans app.config |
| Erreur de connexion MySQL | Mauvaise IP ou credentials | Verifier `IngressMysqlHost` et les identifiants |
| Evenements en double | Agent redemarre | Normal au premier cycle apres redemarrage, se stabilise ensuite |
| Evenements incomplets (pas d'IP) | Table `device` vide ou serialno non matche | Verifier que les terminaux sont enregistres dans la table `device` |
| Pas de description | Table `door_eventlog_description` absente | Le systeme affichera "Event type X" par defaut |

---

## Securite

- L'agent n'a besoin que d'un acces **SELECT** sur la base Ingress
- Creer un utilisateur MySQL dedie si necessaire :
  ```sql
  CREATE USER 'ingress'@'%' IDENTIFIED BY 'ingress';
  GRANT SELECT ON ingress.* TO 'ingress'@'%';
  FLUSH PRIVILEGES;
  ```
- S'assurer que le port MySQL (3306) est ouvert entre la machine Agent et le serveur Ingress
