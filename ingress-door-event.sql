/*
SQLyog Community v13.2.0 (64 bit)
MySQL - 5.7.42-log : Database - ingress
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`ingress` /*!40100 DEFAULT CHARACTER SET latin1 */;

USE `ingress`;

/*Table structure for table `device` */

DROP TABLE IF EXISTS `device`;

CREATE TABLE `device` (
  `iddevice` int(11) NOT NULL AUTO_INCREMENT,
  `DeviceName` varchar(50) DEFAULT NULL,
  `serialno` varchar(50) DEFAULT NULL,
  `DeviceGroup` int(11) DEFAULT '0',
  `CommunicationMode` int(5) DEFAULT '0',
  `ipaddress` varchar(200) DEFAULT NULL,
  `URL` varchar(200) DEFAULT NULL,
  `Port` int(11) DEFAULT '4370',
  `serialport` varchar(50) DEFAULT 'COM1',
  `Baudrate` varchar(50) DEFAULT '115200',
  `RS232` int(5) DEFAULT '0',
  `RS485` int(5) DEFAULT '0',
  `machinesn` varchar(50) DEFAULT '1',
  `CommKey` varchar(6) DEFAULT NULL,
  `Model` varchar(50) DEFAULT NULL,
  `firmware` varchar(50) DEFAULT NULL,
  `gateway` varchar(50) DEFAULT '192.168.1.1',
  `subnet` varchar(50) DEFAULT '255.255.255.0',
  `algver` varchar(10) DEFAULT '10',
  `FP10Flag` int(5) DEFAULT '0',
  `FaceFlag` int(5) DEFAULT '0',
  `FaceAlgvr` varchar(10) DEFAULT '6',
  `Face7Flag` int(5) DEFAULT '0',
  `manufacturer` varchar(50) DEFAULT 'FingerTec',
  `ManufacturerDate` varchar(50) DEFAULT NULL,
  `WiegandOutputFormat` varchar(50) DEFAULT '0',
  `WiegandOutputPulseWidth` varchar(50) DEFAULT '100',
  `WiegandOutputPulseInterval` varchar(50) DEFAULT '1000',
  `WiegandOutput` varchar(50) DEFAULT '0',
  `WiegandInputFormatType` varchar(2) DEFAULT '0',
  `WiegandInputFormat` varchar(50) DEFAULT '0',
  `WiegandInputPulseWidth` varchar(50) DEFAULT '100',
  `WiegandInputPulseInterval` varchar(50) DEFAULT '1000',
  `WiegandInputBits` varchar(50) DEFAULT '26',
  `WiegandInput` varchar(50) DEFAULT '0',
  `platform` varchar(50) DEFAULT NULL,
  `macaddress` varchar(50) DEFAULT NULL,
  `admincount` int(11) DEFAULT '0',
  `usercount` int(11) DEFAULT '0',
  `fpcount` int(11) DEFAULT '0',
  `passwordcount` int(11) DEFAULT '0',
  `transactioncount` int(11) DEFAULT '0',
  `maxfpsize` int(11) DEFAULT '0',
  `maxusersize` int(11) DEFAULT '0',
  `maxtransactionsize` int(11) DEFAULT '0',
  `ColorScreenFlag` int(5) DEFAULT '0',
  `ControllerFlag` int(5) DEFAULT '0',
  `DoorNo` int(5) DEFAULT '0',
  `NewCommkey` varchar(6) DEFAULT NULL,
  `NewIPAddress` varchar(200) DEFAULT NULL,
  `SyncServerTime` int(5) DEFAULT '1',
  `FP11Match` int(5) DEFAULT '35',
  `FP1NMatch` int(5) DEFAULT '45',
  `Face11Match` int(5) DEFAULT '70',
  `Face1NMatch` int(5) DEFAULT '80',
  `Only11Verify` int(5) DEFAULT '0',
  `CardOnly` int(5) DEFAULT '0',
  `IdleAction` int(5) DEFAULT '0',
  `IdleTime` int(10) DEFAULT '0',
  `PowerOnTime` varchar(50) DEFAULT NULL,
  `PowerOffTime` varchar(50) DEFAULT NULL,
  `SaveFalseLog` int(5) DEFAULT '1',
  `SaveAttFlag` int(5) DEFAULT '1',
  `AntipassbackState` int(5) DEFAULT '0',
  `MasterState` int(5) DEFAULT '-1',
  `AlarmCount_FailVerify` int(5) DEFAULT '3',
  `H2i_AdminCard` varchar(20) DEFAULT NULL,
  `DownAttFlag` int(5) DEFAULT '1',
  `VerifyType` int(11) DEFAULT '0',
  `PortForwarding` int(1) DEFAULT '0',
  `workcode` int(1) DEFAULT '0',
  `extformat` int(1) DEFAULT '0',
  `Encrypted` int(1) DEFAULT '0',
  `totalface` int(11) DEFAULT '0',
  `facecount` int(11) DEFAULT '0',
  `EnableRealTime` int(1) DEFAULT '0',
  `LastDownload` varchar(20) DEFAULT NULL,
  `idadms` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`iddevice`),
  KEY `serialno` (`serialno`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

/*Table structure for table `door` */

DROP TABLE IF EXISTS `door`;

CREATE TABLE `door` (
  `iddoor` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `doorgroup` int(11) DEFAULT '0',
  `idVisualMap` int(11) DEFAULT '0',
  `ControllerState` int(11) DEFAULT '0',
  `DoorType` int(5) DEFAULT '0',
  `idadms` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`iddoor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `door_device` */

DROP TABLE IF EXISTS `door_device`;

CREATE TABLE `door_device` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `idDoor` int(11) DEFAULT NULL,
  `idDevice` int(11) DEFAULT NULL,
  `deviceFunc` varchar(50) DEFAULT NULL,
  `ControllerDoorNo` int(5) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idDoor` (`idDoor`),
  KEY `idDevice` (`idDevice`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `door_eventlog` */

DROP TABLE IF EXISTS `door_eventlog`;

CREATE TABLE `door_eventlog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `serialno` varchar(50) DEFAULT NULL,
  `eventType` varchar(50) DEFAULT NULL,
  `eventtime` datetime DEFAULT NULL,
  `userid` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `EventLogPK` (`serialno`,`eventType`,`eventtime`),
  KEY `eventType` (`eventType`),
  KEY `serialno` (`serialno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `door_eventlog_remote` (events 7, 8, 9 - remote release/open/close) */

DROP TABLE IF EXISTS `door_eventlog_remote`;

CREATE TABLE `door_eventlog_remote` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `idDoor` int(11) DEFAULT NULL,
  `eventType` int(11) DEFAULT NULL,
  `eventTime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idDoor` (`idDoor`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `door_eventlog_description` */

DROP TABLE IF EXISTS `door_eventlog_description`;

CREATE TABLE `door_eventlog_description` (
  `eventtype` int(11) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  `langCode` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`eventtype`),
  KEY `eventtype` (`eventtype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Table structure for table `user` */

DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `Auto_No` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userid` varchar(30) DEFAULT NULL,
  `ic` varchar(20) DEFAULT NULL,
  `Username` varchar(45) DEFAULT NULL,
  `Name` varchar(50) DEFAULT NULL,
  `lastname` varchar(45) DEFAULT NULL,
  `Address` varchar(200) DEFAULT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `Email` varchar(50) DEFAULT NULL,
  `User_Group` int(11) DEFAULT '0',
  `designation` varchar(100) DEFAULT NULL,
  `Gender` tinytext,
  `DOB` date DEFAULT NULL,
  `IssueDate` date DEFAULT '2012-01-01',
  `expirydate` date DEFAULT '2029-12-31',
  `picture` longtext,
  `pictureflag` tinyint(4) DEFAULT '0',
  `Remark` varchar(200) DEFAULT NULL,
  `define_9` varchar(50) DEFAULT '0',
  `define_8` varchar(50) DEFAULT NULL,
  `define_7` varchar(50) DEFAULT NULL,
  `define_6` varchar(50) DEFAULT '0',
  `define_5` varchar(50) DEFAULT NULL,
  `define_3` varchar(50) DEFAULT NULL,
  `define_4` varchar(50) DEFAULT NULL,
  `define_2` varchar(50) DEFAULT '0',
  `define_1` varchar(50) DEFAULT NULL,
  `SuspendedDate` datetime DEFAULT NULL,
  `CreateDate` datetime DEFAULT NULL,
  `LastUpdate` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pay_rate` decimal(9,3) DEFAULT '0.000',
  `pay_type` int(11) DEFAULT '0',
  `nationality` varchar(50) DEFAULT NULL,
  `maritalstatus` int(11) DEFAULT '0',
  `religion` int(11) DEFAULT '0',
  `race` varchar(50) DEFAULT NULL,
  `ename` varchar(50) DEFAULT NULL,
  `econtact` varchar(50) DEFAULT NULL,
  `erelation` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`Auto_No`),
  KEY `UserID` (`userid`),
  KEY `Name` (`Name`),
  KEY `User_Group` (`User_Group`)
) ENGINE=InnoDB AUTO_INCREMENT=231 DEFAULT CHARSET=utf8;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
