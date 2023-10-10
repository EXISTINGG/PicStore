/*
 Navicat MySQL Data Transfer

 Source Server         : localhost_3306
 Source Server Type    : MySQL
 Source Server Version : 80030
 Source Host           : localhost:3306
 Source Schema         : picstore

 Target Server Type    : MySQL
 Target Server Version : 80030
 File Encoding         : 65001

 Date: 10/10/2023 09:42:41
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for albums
-- ----------------------------
DROP TABLE IF EXISTS `albums`;
CREATE TABLE `albums`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `creator` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `privacy` enum('0','1') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '1' COMMENT '0:表示公共,1:表示私人',
  `file_count` smallint NULL DEFAULT NULL,
  `storage_location` enum('0','1') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '1' COMMENT '0:表示本机,1:表示第三方储存',
  PRIMARY KEY (`id`, `name`) USING BTREE,
  INDEX `id`(`id`) USING BTREE,
  INDEX `name`(`name`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 45 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for images
-- ----------------------------
DROP TABLE IF EXISTS `images`;
CREATE TABLE `images`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `uploader` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `privacy` enum('0','1') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '1' COMMENT '0:表示公共,1:表示私人',
  `file_size` int NOT NULL COMMENT '基于1000的十进制换算,1000为1kb',
  `upload_date` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '上传时间',
  `storage_location` enum('0','1') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '1' COMMENT '0:表示本机,1:表示第三方储存',
  `album_name` varchar(25) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '所属相册',
  `file_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '链接',
  `version_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '用于删除第三方储存的标识',
  PRIMARY KEY (`id`, `name`) USING BTREE,
  INDEX `album_name`(`album_name`) USING BTREE,
  CONSTRAINT `album_name` FOREIGN KEY (`album_name`) REFERENCES `albums` (`name`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 126 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for interface
-- ----------------------------
DROP TABLE IF EXISTS `interface`;
CREATE TABLE `interface`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `required_permissions` enum('1','2','3','4') CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL DEFAULT '3' COMMENT '所需权限。4:禁用api',
  PRIMARY KEY (`id`, `name`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for systemset
-- ----------------------------
DROP TABLE IF EXISTS `systemset`;
CREATE TABLE `systemset`  (
  `storage_type` enum('0','1') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '1' COMMENT '0:本机储存,1:云存储',
  `cloud_disk_capacity` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '云存储磁盘总量(字节)',
  `local_disk_capacity` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '本机存储磁盘总量(字节)',
  `cloud_disk_usage` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '云存储磁盘使用情况',
  `local_disk_usage` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL COMMENT '本机磁盘使用情况',
  `num_albums` smallint NULL DEFAULT NULL COMMENT '相册数量',
  `num_images` int NULL DEFAULT NULL COMMENT '图片数量',
  `num_users` int NULL DEFAULT NULL COMMENT '用户数量'
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_bin ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL,
  `registration_time` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL COMMENT '注册时间',
  `logout_time` varchar(25) CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NULL DEFAULT NULL COMMENT '注销时间',
  `permissions` enum('1','2','3','4') CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL DEFAULT '3' COMMENT '权限，1:超级管理员,2管理员,3:普通用户:4:禁用功能',
  `status` enum('0','1') CHARACTER SET utf8mb3 COLLATE utf8mb3_bin NOT NULL DEFAULT '1' COMMENT '0:注销，1在用',
  PRIMARY KEY (`id`, `username`, `email`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = utf8mb3 COLLATE = utf8mb3_bin ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Triggers structure for table albums
-- ----------------------------
DROP TRIGGER IF EXISTS `num_albums_del`;
delimiter ;;
CREATE TRIGGER `num_albums_del` AFTER DELETE ON `albums` FOR EACH ROW UPDATE systemset
SET num_albums = (SELECT COUNT(*) FROM albums)
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table albums
-- ----------------------------
DROP TRIGGER IF EXISTS `num_albums_add`;
delimiter ;;
CREATE TRIGGER `num_albums_add` AFTER INSERT ON `albums` FOR EACH ROW UPDATE systemset
SET num_albums = (SELECT COUNT(*) FROM albums);
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table images
-- ----------------------------
DROP TRIGGER IF EXISTS `num_images_del`;
delimiter ;;
CREATE TRIGGER `num_images_del` AFTER DELETE ON `images` FOR EACH ROW UPDATE systemset
SET num_images = (SELECT COUNT(*) FROM images)
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table images
-- ----------------------------
DROP TRIGGER IF EXISTS `num_images_add`;
delimiter ;;
CREATE TRIGGER `num_images_add` AFTER INSERT ON `images` FOR EACH ROW UPDATE systemset
SET num_images = (SELECT COUNT(*) FROM images)
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table images
-- ----------------------------
DROP TRIGGER IF EXISTS `album_num_add`;
delimiter ;;
CREATE TRIGGER `album_num_add` AFTER INSERT ON `images` FOR EACH ROW UPDATE albums
SET file_count = (
  SELECT COUNT(*) FROM images WHERE images.album_name = albums.name
)
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table images
-- ----------------------------
DROP TRIGGER IF EXISTS `album_num_del`;
delimiter ;;
CREATE TRIGGER `album_num_del` AFTER DELETE ON `images` FOR EACH ROW UPDATE albums
SET file_count = (
  SELECT COUNT(*) FROM images WHERE images.album_name = albums.name
)
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table images
-- ----------------------------
DROP TRIGGER IF EXISTS `cloud_disk_usage_add`;
delimiter ;;
CREATE TRIGGER `cloud_disk_usage_add` AFTER INSERT ON `images` FOR EACH ROW UPDATE systemset
SET cloud_disk_usage = (
  SELECT SUM(file_size) FROM images WHERE storage_location = '1'
)
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table images
-- ----------------------------
DROP TRIGGER IF EXISTS `local_disk_usage_add`;
delimiter ;;
CREATE TRIGGER `local_disk_usage_add` AFTER INSERT ON `images` FOR EACH ROW UPDATE systemset
SET local_disk_usage = (
  SELECT SUM(file_size) FROM images WHERE storage_location = '0'
)
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table images
-- ----------------------------
DROP TRIGGER IF EXISTS `cloud_disk_usage_del`;
delimiter ;;
CREATE TRIGGER `cloud_disk_usage_del` AFTER DELETE ON `images` FOR EACH ROW UPDATE systemset
SET cloud_disk_usage = (
  SELECT SUM(file_size) FROM images WHERE storage_location = '1'
)
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table images
-- ----------------------------
DROP TRIGGER IF EXISTS `local_disk_usage_del`;
delimiter ;;
CREATE TRIGGER `local_disk_usage_del` AFTER DELETE ON `images` FOR EACH ROW UPDATE systemset
SET local_disk_usage = (
  SELECT SUM(file_size) FROM images WHERE storage_location = '0'
)
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table user
-- ----------------------------
DROP TRIGGER IF EXISTS `num_users_add`;
delimiter ;;
CREATE TRIGGER `num_users_add` AFTER INSERT ON `user` FOR EACH ROW UPDATE systemset
SET num_users = (SELECT COUNT(*) FROM user)
;;
delimiter ;

-- ----------------------------
-- Triggers structure for table user
-- ----------------------------
DROP TRIGGER IF EXISTS `num_users_del`;
delimiter ;;
CREATE TRIGGER `num_users_del` AFTER DELETE ON `user` FOR EACH ROW UPDATE systemset
SET num_users = (SELECT COUNT(*) FROM user)
;;
delimiter ;

SET FOREIGN_KEY_CHECKS = 1;
