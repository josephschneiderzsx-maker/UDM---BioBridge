-- Migration: URZIS PASS v2 Features
-- Adds: ingress event tracking columns, notification preferences table
-- Run against: udm_multitenant database

USE udm_multitenant;

-- 1. Add ingress tracking columns to door_events
ALTER TABLE door_events ADD COLUMN ingress_event_id INT NULL;
ALTER TABLE door_events ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'command';

-- Index for source filtering
CREATE INDEX idx_door_events_source ON door_events (source);

-- 2. Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  door_id INT NOT NULL,
  notify_on_open TINYINT(1) NOT NULL DEFAULT 1,
  notify_on_close TINYINT(1) NOT NULL DEFAULT 0,
  notify_on_forced TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_np_user
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,
  CONSTRAINT fk_np_door
    FOREIGN KEY (door_id) REFERENCES doors(id)
      ON DELETE CASCADE,
  CONSTRAINT user_door_notif_unique UNIQUE (user_id, door_id)
);

-- 3. Add index for faster event queries
CREATE INDEX idx_door_events_created ON door_events (created_at DESC);
