-- Sample data for BugSage
-- Run this after schema.sql to populate with demo data

USE bugsage;

-- Insert demo users
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@bugsage.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin'),
('Alice Johnson', 'alice@bugsage.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Developer'),
('Bob Smith', 'bob@bugsage.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Tester'),
('Carol Davis', 'carol@bugsage.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Developer'),
('David Wilson', 'david@bugsage.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Tester');

-- Insert demo projects
INSERT INTO projects (name, description) VALUES
('Web Application', 'Main web application project'),
('Mobile App', 'iOS and Android mobile application'),
('API Service', 'Backend API and microservices'),
('Documentation', 'User guides and technical documentation');

-- Insert demo bugs
INSERT INTO bugs (project_id, title, description, priority, status, assignee_id, reporter_id) VALUES
(1, 'Login page not responsive on mobile', 'The login form breaks on screen sizes below 768px. Elements overlap and form is unusable.', 'High', 'New', 2, 3),
(1, 'Dashboard charts not loading', 'Charts on the main dashboard fail to load intermittently. Console shows JavaScript errors.', 'Medium', 'In Progress', 2, 1),
(2, 'App crashes on iOS 15', 'Application crashes immediately after launch on iOS 15 devices. Works fine on iOS 14.', 'Critical', 'New', 4, 3),
(1, 'Search functionality returns no results', 'Bug search feature returns empty results even when bugs exist matching the query.', 'High', 'Resolved', 2, 5),
(3, 'API rate limiting not working', 'Rate limiting middleware allows more requests than configured limit.', 'Medium', 'In Progress', 4, 1),
(1, 'Email notifications not sent', 'Users not receiving email notifications for bug assignments and status changes.', 'Medium', 'New', NULL, 3),
(2, 'Push notifications delayed', 'Push notifications arrive 10-15 minutes after the triggering event.', 'Low', 'Closed', 4, 5),
(1, 'File upload fails for large files', 'Files larger than 5MB fail to upload with timeout error.', 'Medium', 'Resolved', 2, 1),
(3, 'Database connection pool exhausted', 'API becomes unresponsive during high traffic due to connection pool issues.', 'Critical', 'In Progress', 4, 2),
(1, 'User profile image not displaying', 'Profile images show broken image icon instead of uploaded photo.', 'Low', 'New', 2, 5);

-- Insert demo comments
INSERT INTO comments (bug_id, user_id, comment_text) VALUES
(1, 2, 'I can reproduce this issue. Working on a fix using CSS Grid instead of Flexbox.'),
(1, 3, 'Thanks for the quick response! Let me know if you need any additional testing.'),
(2, 1, 'This might be related to the Chart.js version we are using. Investigating...'),
(3, 4, 'Crash logs show memory allocation issues. Might be related to the new image processing library.'),
(4, 2, 'Fixed the search indexing issue. The FULLTEXT index was corrupted and needed rebuilding.'),
(5, 4, 'Rate limiting is now working correctly after updating the middleware configuration.'),
(9, 4, 'Increased connection pool size from 10 to 50. Monitoring performance impact.');

-- Insert demo bug history
INSERT INTO bug_history (bug_id, changed_by, field_changed, old_value, new_value) VALUES
(2, 2, 'status', 'New', 'In Progress'),
(4, 2, 'status', 'In Progress', 'Resolved'),
(5, 4, 'status', 'New', 'In Progress'),
(7, 4, 'status', 'Resolved', 'Closed'),
(8, 2, 'status', 'In Progress', 'Resolved'),
(9, 4, 'status', 'New', 'In Progress');
