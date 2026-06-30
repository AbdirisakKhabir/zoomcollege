-- Scope course assessments per class + course (same course, different classes may differ).

SET @has_class_col := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'course_assessments'
    AND COLUMN_NAME = 'classId'
);

SET @sql := IF(
  @has_class_col = 0,
  'ALTER TABLE `course_assessments` ADD COLUMN `classId` INTEGER',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill: duplicate assessments for each class that has this course on the schedule.
INSERT INTO `course_assessments` (`courseId`, `classId`, `name`, `key`, `weightPercent`, `sortOrder`)
SELECT `ca`.`courseId`, `cs`.`classId`, `ca`.`name`, `ca`.`key`, `ca`.`weightPercent`, `ca`.`sortOrder`
FROM `course_assessments` `ca`
INNER JOIN (
  SELECT DISTINCT `courseId`, `classId` FROM `class_schedules`
) `cs` ON `cs`.`courseId` = `ca`.`courseId`
WHERE `ca`.`classId` IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM `course_assessments` `x`
    WHERE `x`.`courseId` = `ca`.`courseId`
      AND `x`.`classId` = `cs`.`classId`
      AND `x`.`key` = `ca`.`key`
  );

-- Remaining rows without classId: assign first class in the same department as the course.
UPDATE `course_assessments` AS `ca`
SET `classId` = (
  SELECT `cl`.`id`
  FROM `classes` AS `cl`
  INNER JOIN `courses` AS `co` ON `co`.`id` = `ca`.`courseId`
  WHERE `cl`.`departmentId` = `co`.`departmentId`
  ORDER BY `cl`.`id`
  LIMIT 1
)
WHERE `ca`.`classId` IS NULL;

DELETE FROM `course_assessments` WHERE `classId` IS NULL;

ALTER TABLE `course_assessments` MODIFY `classId` INTEGER NOT NULL;

SET @has_old_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'course_assessments'
    AND INDEX_NAME = 'course_assessments_courseId_key_key'
);

SET @sql := IF(
  @has_old_idx > 0,
  'ALTER TABLE `course_assessments` DROP INDEX `course_assessments_courseId_key_key`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_new_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'course_assessments'
    AND INDEX_NAME = 'course_assessments_courseId_classId_key_key'
);

SET @sql := IF(
  @has_new_idx = 0,
  'CREATE UNIQUE INDEX `course_assessments_courseId_classId_key_key` ON `course_assessments`(`courseId`, `classId`, `key`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_class_idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'course_assessments'
    AND INDEX_NAME = 'course_assessments_courseId_classId_idx'
);

SET @sql := IF(
  @has_class_idx = 0,
  'CREATE INDEX `course_assessments_courseId_classId_idx` ON `course_assessments`(`courseId`, `classId`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_fk := (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'course_assessments'
    AND CONSTRAINT_NAME = 'course_assessments_classId_fkey'
);

SET @sql := IF(
  @has_fk = 0,
  'ALTER TABLE `course_assessments` ADD CONSTRAINT `course_assessments_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
