CREATE DATABASE IF NOT EXISTS udm_multitenant
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE udm_multitenant;

CREATE TABLE enterprises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  door_quota INT NOT NULL DEFAULT 10,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enterprise_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  agent_key VARCHAR(64) NOT NULL UNIQUE,
  last_heartbeat DATETIME NULL,
  is_online TINYINT(1) NOT NULL DEFAULT 0,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_agents_enterprise
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
      ON DELETE CASCADE
);

CREATE TABLE doors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enterprise_id INT NOT NULL,
  agent_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  terminal_ip VARCHAR(15) NOT NULL,
  terminal_port INT NOT NULL DEFAULT 4370,
  default_delay INT NOT NULL DEFAULT 3000,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_doors_enterprise
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
      ON DELETE CASCADE,
  CONSTRAINT fk_doors_agent
    FOREIGN KEY (agent_id) REFERENCES agents(id)
      ON DELETE CASCADE,
  INDEX idx_doors_enterprise (enterprise_id, is_active),
  INDEX idx_doors_agent (agent_id)
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enterprise_id INT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  biometric_required TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_users_enterprise
    FOREIGN KEY (enterprise_id) REFERENCES enterprises(id)
      ON DELETE CASCADE
);

CREATE TABLE user_door_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  door_id INT NOT NULL,
  can_open TINYINT(1) NOT NULL DEFAULT 1,
  can_close TINYINT(1) NOT NULL DEFAULT 1,
  can_view_status TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_udp_user
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE,
  CONSTRAINT fk_udp_door
    FOREIGN KEY (door_id) REFERENCES doors(id)
      ON DELETE CASCADE,
  CONSTRAINT user_door_unique UNIQUE (user_id, door_id),
  INDEX idx_udp_door (door_id, user_id)
);

CREATE TABLE command_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agent_id INT NOT NULL,
  door_id INT NOT NULL,
  user_id INT NULL,
  command_type VARCHAR(50) NOT NULL,
  parameters TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  result TEXT NULL,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME NULL,
  completed_at DATETIME NULL,
  CONSTRAINT fk_cq_agent
    FOREIGN KEY (agent_id) REFERENCES agents(id)
      ON DELETE CASCADE,
  CONSTRAINT fk_cq_door
    FOREIGN KEY (door_id) REFERENCES doors(id)
      ON DELETE CASCADE,
  CONSTRAINT fk_cq_user
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE SET NULL,
  INDEX idx_agent_status (agent_id, status, created_at)
);

CREATE TABLE door_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  door_id INT NOT NULL,
  user_id INT NULL,
  agent_id INT NULL,
  command_id INT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_de_door
    FOREIGN KEY (door_id) REFERENCES doors(id)
      ON DELETE CASCADE,
  CONSTRAINT fk_de_user
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE SET NULL,
  CONSTRAINT fk_de_agent
    FOREIGN KEY (agent_id) REFERENCES agents(id)
      ON DELETE SET NULL,
  CONSTRAINT fk_de_cmd
    FOREIGN KEY (command_id) REFERENCES command_queue(id)
      ON DELETE SET NULL,
  INDEX idx_door_created (door_id, created_at)
);

-- Données de test
INSERT INTO enterprises (slug, name, door_quota) VALUES
('entreprise-1', 'Entreprise 1', 10);

INSERT INTO agents (enterprise_id, name, agent_key, is_online)
VALUES (1, 'PC Bureau Principal', 'CHANGE_ME_AGENT_KEY_1', 0);

INSERT INTO doors (enterprise_id, agent_id, name, terminal_ip, terminal_port, default_delay)
VALUES
(1, 1, 'Porte principale', '192.168.40.10', 4370, 3000),
(1, 1, 'Porte arrière', '192.168.40.9', 4370, 3000);

INSERT INTO users (enterprise_id, email, password_hash, first_name, last_name, is_admin, biometric_required)
VALUES
(1, 'admin@example.com', 'PLAINTEXT_TO_REPLACE_WITH_HASH', 'Admin', 'UDM', 1, 0);