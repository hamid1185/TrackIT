-- BugSage Database Schema
-- Run this in phpMyAdmin or MySQL command line to create all required tables

-- Create database (if not exists)
CREATE DATABASE IF NOT EXISTS `bugsage` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `bugsage`;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL UNIQUE,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('Admin','Developer','Tester') NOT NULL DEFAULT 'Developer',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Projects table
CREATE TABLE IF NOT EXISTS `projects` (
  `project_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_id`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bugs table
CREATE TABLE IF NOT EXISTS `bugs` (
  `bug_id` int(11) NOT NULL AUTO_INCREMENT,
  `project_id` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `priority` enum('Low','Medium','High','Critical') NOT NULL DEFAULT 'Medium',
  `status` enum('New','In Progress','Resolved','Closed') NOT NULL DEFAULT 'New',
  `reporter_id` int(11) NOT NULL,
  `assignee_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`bug_id`),
  KEY `idx_project` (`project_id`),
  KEY `idx_reporter` (`reporter_id`),
  KEY `idx_assignee` (`assignee_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`project_id`) REFERENCES `projects` (`project_id`) ON DELETE SET NULL,
  FOREIGN KEY (`reporter_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`assignee_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  FULLTEXT KEY `ft_search` (`title`, `description`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comments table
CREATE TABLE IF NOT EXISTS `comments` (
  `comment_id` int(11) NOT NULL AUTO_INCREMENT,
  `bug_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment_text` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`),
  KEY `idx_bug` (`bug_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_created` (`created_at`),
  FOREIGN KEY (`bug_id`) REFERENCES `bugs` (`bug_id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attachments table
CREATE TABLE IF NOT EXISTS `attachments` (
  `attachment_id` int(11) NOT NULL AUTO_INCREMENT,
  `bug_id` int(11) NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `uploaded_by` int(11) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attachment_id`),
  KEY `idx_bug` (`bug_id`),
  KEY `idx_uploaded_by` (`uploaded_by`),
  FOREIGN KEY (`bug_id`) REFERENCES `bugs` (`bug_id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bug history table (for tracking changes)
CREATE TABLE IF NOT EXISTS `bug_history` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `bug_id` int(11) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `field_changed` varchar(50) NOT NULL,
  `old_value` text,
  `new_value` text,
  `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_bug` (`bug_id`),
  KEY `idx_changed_by` (`changed_by`),
  KEY `idx_changed_at` (`changed_at`),
  FOREIGN KEY (`bug_id`) REFERENCES `bugs` (`bug_id`) ON DELETE CASCADE,
  FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: 'admin123')
INSERT IGNORE INTO `users` (`name`, `email`, `password_hash`, `role`) VALUES
('Admin User', 'admin@bugsage.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin');

-- Insert sample users (password for all: 'password')
INSERT IGNORE INTO `users` (`name`, `email`, `password_hash`, `role`) VALUES
('Alice Johnson', 'alice@bugsage.com', '$2y$10$4c1XB.Y9w5ZzE.r3H9wB9eN.zHZRt3r8FfK9BKi2.9Lnx8I2L5A4a', 'Developer'),
('Bob Smith', 'bob@bugsage.com', '$2y$10$4c1XB.Y9w5ZzE.r3H9wB9eN.zHZRt3r8FfK9BKi2.9Lnx8I2L5A4a', 'Tester'),
('Carol Davis', 'carol@bugsage.com', '$2y$10$4c1XB.Y9w5ZzE.r3H9wB9eN.zHZRt3r8FfK9BKi2.9Lnx8I2L5A4a', 'Developer'),
('David Wilson', 'david@bugsage