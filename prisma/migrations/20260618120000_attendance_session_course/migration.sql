-- Remaining steps if courseId column already exists (safe to re-run partial failures)
SET @has_course := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'attendance_sessions'
    AND COLUMN_NAME = 'courseId'
);

SET @sql := IF(
  @has_course = 0,
  'ALTER TABLE `attendance_sessions` ADD COLUMN `courseId` INTEGER',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `attendance_sessions` AS s
SET `courseId` = (
  SELECT c.id
  FROM `courses` AS c
  INNER JOIN `classes` AS cl ON cl.id = s.`classId`
  WHERE c.`departmentId` = cl.`departmentId` AND c.`isActive` = true
  ORDER BY c.id
  LIMIT 1
)
WHERE s.`courseId` IS NULL;

DELETE FROM `attendance_sessions` WHERE `courseId` IS NULL;

ALTER TABLE `attendance_sessions` MODIFY `courseId` INTEGER NOT NULL;

SET @has_new_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'attendance_sessions'
    AND INDEX_NAME = 'attendance_sessions_classId_courseId_date_shift_key'
);

SET @sql := IF(
  @has_new_idx = 0,
  'CREATE UNIQUE INDEX `attendance_sessions_classId_courseId_date_shift_key` ON `attendance_sessions`(`classId`, `courseId`, `date`, `shift`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_old_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'attendance_sessions'
    AND INDEX_NAME = 'attendance_sessions_classId_date_shift_key'
);

SET @sql := IF(
  @has_old_idx > 0,
  'ALTER TABLE `attendance_sessions` DROP INDEX `attendance_sessions_classId_date_shift_key`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fk := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'attendance_sessions'
    AND CONSTRAINT_NAME = 'attendance_sessions_courseId_fkey'
);

SET @sql := IF(
  @has_fk = 0,
  'ALTER TABLE `attendance_sessions` ADD CONSTRAINT `attendance_sessions_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
