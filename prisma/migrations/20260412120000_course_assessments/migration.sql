-- CreateTable
CREATE TABLE `course_assessments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `courseId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `weightPercent` DOUBLE NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `course_assessments_courseId_key_key`(`courseId`, `key`),
    INDEX `course_assessments_courseId_idx`(`courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `course_assessments` ADD CONSTRAINT `course_assessments_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add JSON scores; backfill from legacy columns
ALTER TABLE `exam_records` ADD COLUMN `scores` JSON NULL;

UPDATE `exam_records` SET `scores` = JSON_OBJECT(
  'midExam', IFNULL(`midExam`, 0),
  'finalExam', IFNULL(`finalExam`, 0),
  'assessment', IFNULL(`assessment`, 0),
  'project', IFNULL(`project`, 0),
  'assignment', IFNULL(`assignment`, 0),
  'presentation', IFNULL(`presentation`, 0)
);

-- Default assessment blueprint for courses that have none
INSERT INTO `course_assessments` (`courseId`, `name`, `key`, `weightPercent`, `sortOrder`)
SELECT `c`.`id`, `t`.`name`, `t`.`k`, `t`.`w`, `t`.`so`
FROM `courses` `c`
CROSS JOIN (
  SELECT 'Mid Exam' AS `name`, 'midExam' AS `k`, 20 AS `w`, 0 AS `so`
  UNION ALL SELECT 'Final Exam', 'finalExam', 40, 1
  UNION ALL SELECT 'Assessment', 'assessment', 10, 2
  UNION ALL SELECT 'Project', 'project', 10, 3
  UNION ALL SELECT 'Assignment', 'assignment', 10, 4
  UNION ALL SELECT 'Presentation', 'presentation', 10, 5
) `t`
WHERE NOT EXISTS (SELECT 1 FROM `course_assessments` `ca` WHERE `ca`.`courseId` = `c`.`id`);

ALTER TABLE `exam_records` MODIFY `scores` JSON NOT NULL;

ALTER TABLE `exam_records` DROP COLUMN `midExam`,
  DROP COLUMN `finalExam`,
  DROP COLUMN `assessment`,
  DROP COLUMN `project`,
  DROP COLUMN `assignment`,
  DROP COLUMN `presentation`;
