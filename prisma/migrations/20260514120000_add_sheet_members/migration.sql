CREATE TABLE `SheetMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sheetId` INTEGER NOT NULL,
    `memberId` INTEGER NOT NULL,

    UNIQUE INDEX `SheetMember_sheetId_memberId_key`(`sheetId`, `memberId`),
    INDEX `SheetMember_sheetId_fkey`(`sheetId`),
    INDEX `SheetMember_memberId_fkey`(`memberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `SheetMember`
    ADD CONSTRAINT `SheetMember_sheetId_fkey`
    FOREIGN KEY (`sheetId`) REFERENCES `Sheet`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `SheetMember`
    ADD CONSTRAINT `SheetMember_memberId_fkey`
    FOREIGN KEY (`memberId`) REFERENCES `Member`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `SheetMember` (`sheetId`, `memberId`, `createdAt`)
SELECT `Sheet`.`id`, `Member`.`id`, NOW(3)
FROM `Sheet`
INNER JOIN `Member` ON `Member`.`workspaceId` = `Sheet`.`workspaceId`
WHERE `Member`.`status` <> 'DELETED'
  AND `Sheet`.`status` <> 'DELETED';
