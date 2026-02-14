/*
SQLyog Community v13.2.0 (64 bit)
MySQL - 9.6.0 : Database - udm_multitenant
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`udm_multitenant` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `udm_multitenant`;

/*Table structure for table `agents` */

DROP TABLE IF EXISTS `agents`;

CREATE TABLE `agents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enterprise_id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_heartbeat` datetime DEFAULT NULL,
  `is_online` tinyint(1) NOT NULL DEFAULT '0',
  `version` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1.0.0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `agent_key` (`agent_key`),
  KEY `fk_agents_enterprise` (`enterprise_id`),
  CONSTRAINT `fk_agents_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `agents` */

insert  into `agents`(`id`,`enterprise_id`,`name`,`agent_key`,`last_heartbeat`,`is_online`,`version`,`created_at`,`is_active`) values 
(2,100,'HAITI PROPANE','haiti-propane-001-server-agent','2026-02-14 16:01:49',1,'1.0.0','2026-02-14 05:55:59',1);

/*Table structure for table `command_queue` */

DROP TABLE IF EXISTS `command_queue`;

CREATE TABLE `command_queue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agent_id` int NOT NULL,
  `door_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `command_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `parameters` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `result` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_cq_door` (`door_id`),
  KEY `fk_cq_user` (`user_id`),
  KEY `idx_agent_status` (`agent_id`,`status`,`created_at`),
  CONSTRAINT `fk_cq_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cq_door` FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cq_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `command_queue` */

insert  into `command_queue`(`id`,`agent_id`,`door_id`,`user_id`,`command_type`,`parameters`,`status`,`result`,`error_message`,`created_at`,`processed_at`,`completed_at`) values 
(20,2,4,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 08:58:40','2026-02-14 08:58:40','2026-02-14 08:58:53'),
(21,2,5,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 09:02:30','2026-02-14 09:02:30','2026-02-14 09:02:41'),
(22,2,5,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 09:15:38','2026-02-14 09:15:39','2026-02-14 09:15:39'),
(23,2,4,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 14:35:13','2026-02-14 14:35:13','2026-02-14 14:35:24'),
(24,2,4,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 14:36:20','2026-02-14 14:36:20','2026-02-14 14:36:21'),
(25,2,4,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 14:36:55','2026-02-14 14:36:55','2026-02-14 14:36:55'),
(26,2,5,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 15:06:35','2026-02-14 15:06:35','2026-02-14 15:06:46'),
(27,2,4,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 15:30:17','2026-02-14 15:30:17','2026-02-14 15:30:37'),
(28,2,5,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 15:32:54','2026-02-14 15:32:54','2026-02-14 15:33:05'),
(29,2,4,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 15:33:36','2026-02-14 15:33:36','2026-02-14 15:33:47'),
(30,2,5,2,'open','{\"delay\":3000}','completed','{\\',NULL,'2026-02-14 15:35:20','2026-02-14 15:35:20','2026-02-14 15:35:32'),
(31,2,5,2,'status','{}','completed','{\\',NULL,'2026-02-14 15:59:08','2026-02-14 15:59:08','2026-02-14 15:59:09');

/*Table structure for table `door_events` */

DROP TABLE IF EXISTS `door_events`;

CREATE TABLE `door_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `door_id` int NOT NULL,
  `user_id` int DEFAULT NULL,
  `agent_id` int DEFAULT NULL,
  `command_id` int DEFAULT NULL,
  `event_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_data` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ingress_event_id` int DEFAULT NULL,
  `source` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'command',
  PRIMARY KEY (`id`),
  KEY `fk_de_user` (`user_id`),
  KEY `fk_de_agent` (`agent_id`),
  KEY `fk_de_cmd` (`command_id`),
  KEY `idx_door_created` (`door_id`,`created_at`),
  KEY `idx_door_events_source` (`source`),
  KEY `idx_door_events_created` (`created_at`),
  CONSTRAINT `fk_de_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_de_cmd` FOREIGN KEY (`command_id`) REFERENCES `command_queue` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_de_door` FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_de_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `door_events` */

/*Table structure for table `doors` */

DROP TABLE IF EXISTS `doors`;

CREATE TABLE `doors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enterprise_id` int NOT NULL,
  `agent_id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `terminal_ip` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `terminal_port` int NOT NULL DEFAULT '4370',
  `default_delay` int NOT NULL DEFAULT '3000',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_doors_enterprise` (`enterprise_id`,`is_active`),
  KEY `idx_doors_agent` (`agent_id`),
  CONSTRAINT `fk_doors_agent` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_doors_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `doors` */

insert  into `doors`(`id`,`enterprise_id`,`agent_id`,`name`,`terminal_ip`,`terminal_port`,`default_delay`,`created_at`,`is_active`) values 
(4,100,2,'BOOS\'S DOOR','192.168.40.9',4370,3000,'2026-02-14 08:58:29',1),
(5,100,2,'IT DOOR','192.168.40.10',4370,3000,'2026-02-14 08:59:48',1);

/*Table structure for table `enterprises` */

DROP TABLE IF EXISTS `enterprises`;

CREATE TABLE `enterprises` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `door_quota` int NOT NULL DEFAULT '2',
  `user_quota` int NOT NULL DEFAULT '2',
  `license_start_date` date DEFAULT NULL,
  `license_end_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `enterprises` */

insert  into `enterprises`(`id`,`slug`,`name`,`door_quota`,`user_quota`,`license_start_date`,`license_end_date`,`created_at`,`is_active`) values 
(1,'test','test',2,2,'2026-01-01','2026-12-31','2026-02-13 21:36:33',1),
(100,'haiti-propane','Haiti Propane',2,2,NULL,NULL,'2026-02-14 05:55:00',1);

/*Table structure for table `notification_preferences` */

DROP TABLE IF EXISTS `notification_preferences`;

CREATE TABLE `notification_preferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `door_id` int NOT NULL,
  `notify_on_open` tinyint(1) NOT NULL DEFAULT '1',
  `notify_on_close` tinyint(1) NOT NULL DEFAULT '0',
  `notify_on_forced` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_door_notif_unique` (`user_id`,`door_id`),
  KEY `fk_np_door` (`door_id`),
  CONSTRAINT `fk_np_door` FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_np_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `notification_preferences` */

/*Table structure for table `user_door_permissions` */

DROP TABLE IF EXISTS `user_door_permissions`;

CREATE TABLE `user_door_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `door_id` int NOT NULL,
  `can_open` tinyint(1) NOT NULL DEFAULT '1',
  `can_close` tinyint(1) NOT NULL DEFAULT '1',
  `can_view_status` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_door_unique` (`user_id`,`door_id`),
  KEY `idx_udp_door` (`door_id`,`user_id`),
  CONSTRAINT `fk_udp_door` FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_udp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `user_door_permissions` */

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `enterprise_id` int NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `biometric_required` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_enterprise` (`enterprise_id`),
  CONSTRAINT `fk_users_enterprise` FOREIGN KEY (`enterprise_id`) REFERENCES `enterprises` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*Data for the table `users` */

insert  into `users`(`id`,`enterprise_id`,`email`,`password_hash`,`first_name`,`last_name`,`is_admin`,`biometric_required`,`created_at`,`last_login`,`is_active`) values 
(1,1,'admin@example.com','9b8769a4a742959a2d0298c36fb70623f2dfacda8436237df08d8dfd5b37374c','SCHNEIDER','JOSEPH',1,1,'2026-02-13 21:39:44',NULL,1),
(2,100,'admin@urzis.com','d97086919b6522e13ba9b46c04902c38372102218a4b3ef2f45ac2a80e9fd240','URZIS','ADMIN',1,1,'2026-02-14 06:47:07',NULL,1);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
