-- Multi-department user assignments and super admin flag
ALTER TABLE `users` ADD COLUMN `isSuperAdmin` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `user_departments` (
    `userId` INTEGER NOT NULL,
    `departmentId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`userId`, `departmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_departments` ADD CONSTRAINT `user_departments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_departments` ADD CONSTRAINT `user_departments_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_departments` ADD CONSTRAINT `user_departments_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing Admin role users become super admins
UPDATE `users` u
INNER JOIN `roles` r ON u.`roleId` = r.`id`
SET u.`isSuperAdmin` = true
WHERE r.`name` = 'Admin';
