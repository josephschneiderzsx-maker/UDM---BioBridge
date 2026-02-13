-- Migration: Ajouter user_quota aux entreprises (limite d'utilisateurs par entreprise)
USE udm_multitenant;

SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'udm_multitenant'
      AND TABLE_NAME = 'enterprises'
      AND COLUMN_NAME = 'user_quota'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE enterprises ADD COLUMN user_quota INT NOT NULL DEFAULT 20 AFTER door_quota',
    'SELECT "Column user_quota already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE enterprises
SET user_quota = 20
WHERE user_quota IS NULL OR user_quota = 0;
