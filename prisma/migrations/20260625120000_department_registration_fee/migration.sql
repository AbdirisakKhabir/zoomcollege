-- Rename department tuition fee to one-time registration fee
ALTER TABLE `departments` CHANGE COLUMN `tuitionFee` `registrationFee` DOUBLE NULL DEFAULT 0;

-- Registration fee is one-time per student (not per year)
ALTER TABLE `tuition_payments` DROP INDEX `tuition_payments_studentId_year_key`;
ALTER TABLE `tuition_payments` ADD UNIQUE INDEX `tuition_payments_studentId_key` (`studentId`);
