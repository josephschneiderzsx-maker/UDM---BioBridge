/*
  URZIS PASS (UDM) — MySQL 9.x schema
  Database: udm_multitenant

  Index strategy based on actual query audit:
  - Covering indexes on hot-path queries (login, agent poll, door listing)
  - DESC indexes on created_at for ORDER BY ... DESC LIMIT patterns
  - Redundant/unused indexes removed (source-only, created_at-only on door_events)
  - terminal_ip lookup index for Ingress discovery matching
*/

SET NAMES utf8mb4;
SET SQL_MODE = '';
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `udm_multitenant`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `udm_multitenant`;

/* ============================================================
   enterprises — tenant table
   ============================================================ */
DROP TABLE IF EXISTS `enterprises`;

CREATE TABLE `enterprises` (
  `id`                 int          NOT NULL AUTO_INCREMENT,
  `slug`               varchar(50)  NOT NULL,
  `name`               varchar(255) NOT NULL,
  `door_quota`         int          NOT NULL DEFAULT 2,
  `user_quota`         int          NOT NULL DEFAULT 2,
  `license_start_date` date         DEFAULT NULL,
  `license_end_date`   date         DEFAULT NULL,
  `created_at`         datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active`          tinyint(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  -- Login: WHERE slug = @slug AND is_active = 1 → covers both cols
  UNIQUE KEY `uq_slug` (`slug`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   agents — BioBridge agent instances per enterprise
   ============================================================ */
DROP TABLE IF EXISTS `agents`;

CREATE TABLE `agents` (
  `id`             int          NOT NULL AUTO_INCREMENT,
  `enterprise_id`  int          NOT NULL,
  `name`           varchar(255) NOT NULL,
  `agent_key`      varchar(64)  NOT NULL,
  `last_heartbeat` datetime     DEFAULT NULL,
  `is_online`      tinyint(1)   NOT NULL DEFAULT 0,
  `version`        varchar(20)  NOT NULL DEFAULT '1.0.0',
  `created_at`     datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active`      tinyint(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  -- Agent auth: WHERE agent_key = @key (register) / WHERE id = @id AND agent_key = @key AND is_active = 1 (validate)
  UNIQUE KEY `uq_agent_key` (`agent_key`),
  -- Listing: WHERE enterprise_id = @ent AND is_active = 1 ORDER BY name
  KEY `idx_agents_enterprise_active` (`enterprise_id`, `is_active`, `name`),
  -- GetEnterpriseIdForAgent: WHERE id = @id AND is_active = 1
  KEY `idx_agents_id_active` (`id`, `is_active`),
  CONSTRAINT `fk_agents_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   users — app users per enterprise
   ============================================================ */
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id`                 int          NOT NULL AUTO_INCREMENT,
  `enterprise_id`      int          NOT NULL,
  `email`              varchar(255) NOT NULL,
  `password_hash`      varchar(255) NOT NULL,
  `first_name`         varchar(100) NOT NULL,
  `last_name`          varchar(100) NOT NULL,
  `is_admin`           tinyint(1)   NOT NULL DEFAULT 0,
  `biometric_required` tinyint(1)   NOT NULL DEFAULT 1,
  `created_at`         datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login`         datetime     DEFAULT NULL,
  `is_active`          tinyint(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  -- Login hot path: WHERE email = @e AND enterprise_id = @ent AND is_active = 1
  UNIQUE KEY `uq_email` (`email`),
  KEY `idx_users_login` (`email`, `enterprise_id`, `is_active`),
  -- Listing: WHERE enterprise_id = @ent AND is_active = 1 ORDER BY first_name, last_name
  KEY `idx_users_enterprise_active` (`enterprise_id`, `is_active`, `first_name`, `last_name`),
  CONSTRAINT `fk_users_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   doors — controlled doors per enterprise/agent
   ============================================================ */
DROP TABLE IF EXISTS `doors`;

CREATE TABLE `doors` (
  `id`            int          NOT NULL AUTO_INCREMENT,
  `enterprise_id` int          NOT NULL,
  `agent_id`      int          NOT NULL,
  `name`          varchar(255) NOT NULL,
  `terminal_ip`   varchar(45)  NOT NULL,   -- IPv6-ready (was varchar(15))
  `terminal_port` int          NOT NULL DEFAULT 4370,
  `default_delay` int          NOT NULL DEFAULT 3000,
  `created_at`    datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active`     tinyint(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  -- Door listing (admin): WHERE enterprise_id = @ent AND is_active = 1 ORDER BY name
  KEY `idx_doors_enterprise_active` (`enterprise_id`, `is_active`, `name`),
  -- Agent status: WHERE agent_id = @aid AND is_active = 1
  KEY `idx_doors_agent_active` (`agent_id`, `is_active`),
  -- Ingress IP matching: WHERE enterprise_id = @ent AND terminal_ip = @ip AND is_active = 1
  KEY `idx_doors_enterprise_ip` (`enterprise_id`, `terminal_ip`, `is_active`),
  CONSTRAINT `fk_doors_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_doors_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   user_door_permissions — per-user door access control
   ============================================================ */
DROP TABLE IF EXISTS `user_door_permissions`;

CREATE TABLE `user_door_permissions` (
  `id`              int        NOT NULL AUTO_INCREMENT,
  `user_id`         int        NOT NULL,
  `door_id`         int        NOT NULL,
  `can_open`        tinyint(1) NOT NULL DEFAULT 1,
  `can_close`       tinyint(1) NOT NULL DEFAULT 1,
  `can_view_status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at`      datetime   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- Permission check: WHERE user_id = @uid AND door_id = @did (also prevents duplicates)
  UNIQUE KEY `uq_user_door` (`user_id`, `door_id`),
  -- Reverse lookup (JOIN doors d INNER JOIN udp ON udp.door_id = d.id AND udp.user_id = @uid)
  KEY `idx_udp_door_user` (`door_id`, `user_id`),
  CONSTRAINT `fk_udp_door` FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_udp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   command_queue — agent command pipeline
   ============================================================ */
DROP TABLE IF EXISTS `command_queue`;

CREATE TABLE `command_queue` (
  `id`            int         NOT NULL AUTO_INCREMENT,
  `agent_id`      int         NOT NULL,
  `door_id`       int         NOT NULL,
  `user_id`       int         DEFAULT NULL,
  `command_type`  varchar(50) NOT NULL,
  `parameters`    text,
  `status`        varchar(20) NOT NULL DEFAULT 'pending',
  `result`        text,
  `error_message` text,
  `created_at`    datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at`  datetime    DEFAULT NULL,
  `completed_at`  datetime    DEFAULT NULL,
  PRIMARY KEY (`id`),
  -- HOT PATH — agent polling: WHERE agent_id = @aid AND status = 'pending' ORDER BY created_at ASC
  KEY `idx_cq_agent_poll` (`agent_id`, `status`, `created_at`),
  KEY `fk_cq_door` (`door_id`),
  KEY `fk_cq_user` (`user_id`),
  CONSTRAINT `fk_cq_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cq_door`  FOREIGN KEY (`door_id`)  REFERENCES `doors`  (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cq_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`  (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   door_events — audit log of all door activity
   ============================================================ */
DROP TABLE IF EXISTS `door_events`;

CREATE TABLE `door_events` (
  `id`               int         NOT NULL AUTO_INCREMENT,
  `door_id`          int         NOT NULL,
  `user_id`          int         DEFAULT NULL,
  `agent_id`         int         DEFAULT NULL,
  `command_id`       int         DEFAULT NULL,
  `event_type`       varchar(50) NOT NULL,
  `event_data`       text,
  `created_at`       datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ingress_event_id` int         DEFAULT NULL,
  `source`           varchar(20) NOT NULL DEFAULT 'command',
  PRIMARY KEY (`id`),
  -- HOT PATH — event listing: WHERE door_id = @did ORDER BY created_at DESC LIMIT N
  -- DESC index for optimal reverse-chronological scans (MySQL 8.0+)
  KEY `idx_de_door_created` (`door_id`, `created_at` DESC),
  -- Ingress dedup: prevent re-inserting same ingress event
  KEY `idx_de_ingress` (`ingress_event_id`),
  KEY `fk_de_user`  (`user_id`),
  KEY `fk_de_agent` (`agent_id`),
  KEY `fk_de_cmd`   (`command_id`),
  CONSTRAINT `fk_de_door`  FOREIGN KEY (`door_id`)    REFERENCES `doors`         (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_de_user`  FOREIGN KEY (`user_id`)    REFERENCES `users`         (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_de_agent` FOREIGN KEY (`agent_id`)   REFERENCES `agents`        (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_de_cmd`   FOREIGN KEY (`command_id`) REFERENCES `command_queue` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   notification_preferences — per-user notification settings
   ============================================================ */
DROP TABLE IF EXISTS `notification_preferences`;

CREATE TABLE `notification_preferences` (
  `id`              int        NOT NULL AUTO_INCREMENT,
  `user_id`         int        NOT NULL,
  `door_id`         int        NOT NULL,
  `notify_on_open`  tinyint(1) NOT NULL DEFAULT 1,
  `notify_on_close` tinyint(1) NOT NULL DEFAULT 0,
  `notify_on_forced` tinyint(1) NOT NULL DEFAULT 1,
  `created_at`      datetime   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      datetime   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- Upsert + listing: WHERE user_id = @uid (also covers JOIN on door_id)
  UNIQUE KEY `uq_user_door_notif` (`user_id`, `door_id`),
  KEY `fk_np_door` (`door_id`),
  CONSTRAINT `fk_np_door` FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_np_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================
   discovered_devices — Ingress door devices pending admin approval
   Agent sends discovered door_device entries here.
   If quota allows, doors are auto-created in `doors`.
   If quota exceeded, they land here for admin to approve/dismiss.
   ============================================================ */
DROP TABLE IF EXISTS `discovered_devices`;

CREATE TABLE `discovered_devices` (
  `id`            int                                      NOT NULL AUTO_INCREMENT,
  `enterprise_id` int                                      NOT NULL,
  `agent_id`      int                                      NOT NULL,
  `device_name`   varchar(255)                             NOT NULL,
  `terminal_ip`   varchar(45)                              NOT NULL,  -- IPv6-ready
  `terminal_port` int                                      NOT NULL DEFAULT 4370,
  `status`        enum('pending','approved','dismissed')   NOT NULL DEFAULT 'pending',
  `discovered_at` datetime                                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at`   datetime                                 DEFAULT NULL,
  PRIMARY KEY (`id`),
  -- Agent upsert: ON DUPLICATE KEY UPDATE (one entry per IP per enterprise)
  UNIQUE KEY `uq_discovered_enterprise_ip` (`enterprise_id`, `terminal_ip`),
  -- Admin listing: WHERE enterprise_id = @ent AND status = 'pending' ORDER BY discovered_at DESC
  KEY `idx_discovered_pending` (`enterprise_id`, `status`, `discovered_at` DESC),
  CONSTRAINT `fk_discovered_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_discovered_agent`      FOREIGN KEY (`agent_id`)      REFERENCES `agents`      (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* ============================================================ */

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;
