-- Migration: Ajouter door_quota aux entreprises existantes
USE udm_multitenant;

-- Ajouter la colonne door_quota si elle n'existe pas
-- Note: MySQL ne supporte pas IF NOT EXISTS pour ALTER TABLE, donc vérifier d'abord
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'udm_multitenant' 
    AND TABLE_NAME = 'enterprises' 
    AND COLUMN_NAME = 'door_quota'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE enterprises ADD COLUMN door_quota INT NOT NULL DEFAULT 10 AFTER name',
    'SELECT "Column door_quota already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Mettre à jour les entreprises existantes avec un quota par défaut
UPDATE enterprises 
SET door_quota = 10 
WHERE door_quota IS NULL OR door_quota = 0;
