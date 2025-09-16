-- Migration 001: Initial schema creation
-- Date: 2024-01-01
-- Description: Create initial database structure for BugSage

USE bugsage;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Developer', 'Tester') DEFAULT 'Developer',
    reputation_score INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    project_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bugs table with FULLTEXT indexes
CREATE TABLE IF NOT EXISTS bugs (
    bug_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    status ENUM('New', 'In Progress', 'Resolved', 'Closed') DEFAULT 'New',
    assignee_id INT,
    reporter_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FULLTEXT(title, description)
);

-- Attachments table
CREATE TABLE IF NOT EXISTS attachments (
    attachment_id INT PRIMARY KEY AUTO_INCREMENT,
    bug_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bug_id) REFERENCES bugs(bug_id) ON DELETE CASCADE
);

-- Bug history for audit trail
CREATE TABLE IF NOT EXISTS bug_history (
    history_id INT PRIMARY KEY AUTO_INCREMENT,
    bug_id INT NOT NULL,
    changed_by INT,
    field_changed VARCHAR(50) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bug_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    comment_id INT PRIMARY KEY AUTO_INCREMENT,
    bug_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bug_id) REFERENCES bugs(bug_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bugs_status ON bugs(status);
CREATE INDEX IF NOT EXISTS idx_bugs_priority ON bugs(priority);
CREATE INDEX IF NOT EXISTS idx_bugs_assignee ON bugs(assignee_id);
CREATE INDEX IF NOT EXISTS idx_bugs_reporter ON bugs(reporter_id);
CREATE INDEX IF NOT EXISTS idx_bugs_created ON bugs(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_bug ON comments(bug_id);
CREATE INDEX IF NOT EXISTS idx_history_bug ON bug_history(bug_id);
