-- Migration: Ajouter les index manquants pour optimiser la latence
USE udm_multitenant;

-- Index sur doors.enterprise_id pour accélérer les requêtes de listing par entreprise
ALTER TABLE doors ADD INDEX idx_doors_enterprise (enterprise_id, is_active);

-- Index sur doors.agent_id pour accélérer la recherche de portes par agent
ALTER TABLE doors ADD INDEX idx_doors_agent (agent_id);

-- Index sur user_door_permissions(door_id, user_id) pour accélérer les JOINs
ALTER TABLE user_door_permissions ADD INDEX idx_udp_door (door_id, user_id);
