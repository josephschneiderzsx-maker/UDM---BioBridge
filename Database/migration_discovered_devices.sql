-- Migration: discovered_devices table
-- Stores door devices discovered from Ingress that could not be auto-created (quota exceeded).
-- Admin approves which ones to add via the mobile app.

CREATE TABLE IF NOT EXISTS `discovered_devices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `enterprise_id` int(11) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `device_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `terminal_ip` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `terminal_port` int(11) NOT NULL DEFAULT 4370,
  `status` enum('pending','approved','dismissed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `discovered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_discovered_enterprise_ip` (`enterprise_id`, `terminal_ip`),
  KEY `idx_discovered_status` (`enterprise_id`, `status`),
  CONSTRAINT `fk_discovered_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_discovered_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
