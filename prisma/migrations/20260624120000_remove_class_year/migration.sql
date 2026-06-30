-- Remove academic year from classes

ALTER TABLE `classes` DROP INDEX `classes_name_year_departmentId_key`;
ALTER TABLE `classes` DROP COLUMN `year`;
ALTER TABLE `classes` ADD UNIQUE INDEX `classes_name_departmentId_key`(`name`, `departmentId`);
