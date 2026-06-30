-- CreateTable
CREATE TABLE `student_monthly_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `batchId` VARCHAR(36) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `bankId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `amount` DOUBLE NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL DEFAULT 'bank_receipt',
    `receiptNumber` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recordedById` INTEGER NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_monthly_payments_studentId_year_month_key`(`studentId`, `year`, `month`),
    INDEX `student_monthly_payments_batchId_idx`(`batchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_monthly_payments` ADD CONSTRAINT `student_monthly_payments_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_monthly_payments` ADD CONSTRAINT `student_monthly_payments_bankId_fkey` FOREIGN KEY (`bankId`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_monthly_payments` ADD CONSTRAINT `student_monthly_payments_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `transaction_history` ADD COLUMN `studentMonthlyPaymentId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `transaction_history_studentMonthlyPaymentId_key` ON `transaction_history`(`studentMonthlyPaymentId`);

-- AddForeignKey
ALTER TABLE `transaction_history` ADD CONSTRAINT `transaction_history_studentMonthlyPaymentId_fkey` FOREIGN KEY (`studentMonthlyPaymentId`) REFERENCES `student_monthly_payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
