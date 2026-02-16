/*
  Migration: Event Pipeline Fixes
  - doors: add serial_no for Ingress serial-number matching
  - door_events: add event_time (actual time from ingress), ingress_user_id
  - notification_preferences: add notify_event_types (comma-separated event codes)
*/

USE `udm_multitenant`;

-- 1. doors.serial_no — maps to Ingress device.serialno
ALTER TABLE `doors`
  ADD COLUMN `serial_no` VARCHAR(50) DEFAULT NULL AFTER `terminal_port`;

ALTER TABLE `doors`
  ADD KEY `idx_doors_enterprise_serial` (`enterprise_id`, `serial_no`, `is_active`);

-- 2. door_events — preserve original timestamp and ingress user
ALTER TABLE `door_events`
  ADD COLUMN `event_time` DATETIME DEFAULT NULL AFTER `created_at`,
  ADD COLUMN `ingress_user_id` VARCHAR(50) DEFAULT NULL AFTER `event_time`;

-- 3. notification_preferences — granular event-type filtering
ALTER TABLE `notification_preferences`
  ADD COLUMN `notify_event_types` TEXT DEFAULT NULL AFTER `notify_on_forced`;
