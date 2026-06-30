-- Remove faculty: drop departments.facultyId FK/column and faculties table

ALTER TABLE `departments` DROP FOREIGN KEY `departments_facultyId_fkey`;
ALTER TABLE `departments` DROP COLUMN `facultyId`;
DROP TABLE `faculties`;
