-- Migration: MySQL 9+ index optimizations + discovered_devices table
-- Run on existing udm_multitenant databases
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS patterns)

USE udm_multitenant;

-- ============================================================
-- 1. ENTERPRISES — slug lookup covering is_active
-- ============================================================
-- Replace plain UNIQUE(slug) with composite UNIQUE(slug, is_active)
ALTER TABLE `enterprises`
  DROP INDEX IF EXISTS `slug`,
  ADD UNIQUE KEY `uq_slug` (`slug`, `is_active`);

-- ============================================================
-- 2. AGENTS — optimized indexes
-- ============================================================
-- Replace bare enterprise FK index with covering (enterprise_id, is_active, name)
ALTER TABLE `agents`
  DROP INDEX IF EXISTS `fk_agents_enterprise`,
  ADD KEY `idx_agents_enterprise_active` (`enterprise_id`, `is_active`, `name`);

-- Add (id, is_active) for GetEnterpriseIdForAgent / ValidateAgentKey
ALTER TABLE `agents`
  ADD KEY IF NOT EXISTS `idx_agents_id_active` (`id`, `is_active`);

-- ============================================================
-- 3. USERS — login hot path + listing
-- ============================================================
-- Login: WHERE email = @e AND enterprise_id = @ent AND is_active = 1
ALTER TABLE `users`
  ADD KEY IF NOT EXISTS `idx_users_login` (`email`, `enterprise_id`, `is_active`);

-- Replace bare enterprise FK index with covering (enterprise_id, is_active, first_name, last_name)
ALTER TABLE `users`
  DROP INDEX IF EXISTS `fk_users_enterprise`,
  ADD KEY `idx_users_enterprise_active` (`enterprise_id`, `is_active`, `first_name`, `last_name`);

-- ============================================================
-- 4. DOORS — covering indexes for all query patterns
-- ============================================================
-- Widen terminal_ip for IPv6 readiness
ALTER TABLE `doors` MODIFY `terminal_ip` varchar(45) NOT NULL;

-- Replace (enterprise_id, is_active) with covering (enterprise_id, is_active, name)
ALTER TABLE `doors`
  DROP INDEX IF EXISTS `idx_doors_enterprise`,
  ADD KEY `idx_doors_enterprise_active` (`enterprise_id`, `is_active`, `name`);

-- Replace bare agent_id with (agent_id, is_active)
ALTER TABLE `doors`
  DROP INDEX IF EXISTS `idx_doors_agent`,
  ADD KEY `idx_doors_agent_active` (`agent_id`, `is_active`);

-- Ingress IP matching: WHERE enterprise_id = @ent AND terminal_ip = @ip AND is_active = 1
ALTER TABLE `doors`
  ADD KEY IF NOT EXISTS `idx_doors_enterprise_ip` (`enterprise_id`, `terminal_ip`, `is_active`);

-- ============================================================
-- 5. COMMAND_QUEUE — rename for clarity
-- ============================================================
-- The existing idx_agent_status(agent_id, status, created_at) is already optimal.
-- Rename only if present under old name.
ALTER TABLE `command_queue`
  DROP INDEX IF EXISTS `idx_agent_status`,
  ADD KEY `idx_cq_agent_poll` (`agent_id`, `status`, `created_at`);

-- ============================================================
-- 6. DOOR_EVENTS — DESC index, remove dead indexes
-- ============================================================
-- Replace (door_id, created_at) with DESC variant for ORDER BY ... DESC LIMIT
ALTER TABLE `door_events`
  DROP INDEX IF EXISTS `idx_door_created`,
  ADD KEY `idx_de_door_created` (`door_id`, `created_at` DESC);

-- Remove unused indexes (no query filters by source alone or created_at alone)
ALTER TABLE `door_events`
  DROP INDEX IF EXISTS `idx_door_events_source`,
  DROP INDEX IF EXISTS `idx_door_events_created`;

-- Add ingress dedup index
ALTER TABLE `door_events`
  ADD KEY IF NOT EXISTS `idx_de_ingress` (`ingress_event_id`);

-- ============================================================
-- 7. DISCOVERED_DEVICES — new table
-- ============================================================
CREATE TABLE IF NOT EXISTS `discovered_devices` (
  `id`            int                                      NOT NULL AUTO_INCREMENT,
  `enterprise_id` int                                      NOT NULL,
  `agent_id`      int                                      NOT NULL,
  `device_name`   varchar(255) COLLATE utf8mb4_unicode_ci  NOT NULL,
  `terminal_ip`   varchar(45)  COLLATE utf8mb4_unicode_ci  NOT NULL,
  `terminal_port` int                                      NOT NULL DEFAULT 4370,
  `status`        enum('pending','approved','dismissed')   NOT NULL DEFAULT 'pending',
  `discovered_at` datetime                                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at`   datetime                                 DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_discovered_enterprise_ip` (`enterprise_id`, `terminal_ip`),
  KEY `idx_discovered_pending` (`enterprise_id`, `status`, `discovered_at` DESC),
  CONSTRAINT `fk_discovered_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_discovered_agent`      FOREIGN KEY (`agent_id`)      REFERENCES `agents`      (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
