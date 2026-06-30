-- DropSemester: remove semester columns and semesters table

-- classes: replace unique [name, semester, year] with [name, year, departmentId]
ALTER TABLE `classes` DROP INDEX `classes_name_semester_year_key`;
ALTER TABLE `classes` DROP COLUMN `semester`;
ALTER TABLE `classes` ADD UNIQUE INDEX `classes_name_year_departmentId_key`(`name`, `year`, `departmentId`);

-- class_schedules: remove semester column
ALTER TABLE `class_schedules` DROP COLUMN `semester`;

-- tuition_payments: replace unique [studentId, semester, year] with [studentId, year]
ALTER TABLE `tuition_payments` DROP INDEX `tuition_payments_studentId_semester_year_key`;
ALTER TABLE `tuition_payments` DROP COLUMN `semester`;
ALTER TABLE `tuition_payments` ADD UNIQUE INDEX `tuition_payments_studentId_year_key`(`studentId`, `year`);

-- exam_records: replace unique [studentId, courseId, semester, year] with [studentId, courseId, year]
ALTER TABLE `exam_records` DROP INDEX `exam_records_studentId_courseId_semester_year_key`;
ALTER TABLE `exam_records` DROP COLUMN `semester`;
ALTER TABLE `exam_records` ADD UNIQUE INDEX `exam_records_studentId_courseId_year_key`(`studentId`, `courseId`, `year`);

-- Drop semesters table
DROP TABLE `semesters`;
