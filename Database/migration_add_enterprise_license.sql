-- Migration: Ajouter dates de licence entreprise (start_date, end_date)
-- Période de grâce: 3 jours après end_date avant blocage.
USE udm_multitenant;

-- license_start_date
SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'udm_multitenant'
      AND TABLE_NAME = 'enterprises'
      AND COLUMN_NAME = 'license_start_date'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE enterprises ADD COLUMN license_start_date DATE NULL AFTER user_quota',
    'SELECT "Column license_start_date already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- license_end_date
SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'udm_multitenant'
      AND TABLE_NAME = 'enterprises'
      AND COLUMN_NAME = 'license_end_date'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE enterprises ADD COLUMN license_end_date DATE NULL AFTER license_start_date',
    'SELECT "Column license_end_date already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
