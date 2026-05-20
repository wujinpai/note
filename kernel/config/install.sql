SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `calendar`;
CREATE TABLE `calendar` (
  `id` int NOT NULL AUTO_INCREMENT,
  `D_date` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `D_count` json NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `content`;
CREATE TABLE `content` (
  `id` int NOT NULL AUTO_INCREMENT,
  `C_date` datetime NOT NULL,
  `C_tag` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `C_title` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `C_content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `C_pin` tinyint(1) NOT NULL,
  `C_hidden` tinyint(1) NOT NULL,
  `C_weather` json NOT NULL,
  `C_location` json NOT NULL,
  `C_media` json NOT NULL,
  `C_archive` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=342 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DROP TABLE IF EXISTS `tags`;
CREATE TABLE `tags` (
  `id` int NOT NULL AUTO_INCREMENT,
  `T_name` tinytext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `T_count` int NOT NULL,
  `T_hidden` tinyint(1) NOT NULL,
  `T_count_visit` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;