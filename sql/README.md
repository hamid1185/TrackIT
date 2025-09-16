# BugSage Database Setup

This folder contains all SQL scripts needed to set up the BugSage database.

## Files

### Core Scripts
- **`setup.sql`** - Complete setup script that creates database, tables, and sample data
- **`schema.sql`** - Database schema only (tables and indexes)
- **`sample_data.sql`** - Demo data for testing (run after schema.sql)

### Migrations
- **`migrations/001_initial_schema.sql`** - Initial schema migration

## Quick Setup

### Option 1: Complete Setup (Recommended)
Run `setup.sql` in phpMyAdmin or MySQL command line:
\`\`\`sql
SOURCE sql/setup.sql;
\`\`\`

### Option 2: Step by Step
1. Run `schema.sql` to create tables
2. Run `sample_data.sql` to add demo data

## Demo Accounts

After running the setup, you can login with these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@bugsage.com | password |
| Developer | alice@bugsage.com | password |
| Tester | bob@bugsage.com | password |
| Developer | carol@bugsage.com | password |
| Tester | david@bugsage.com | password |

## Database Structure

### Tables
- **users** - User accounts and roles
- **projects** - Project organization
- **bugs** - Core bug tracking with FULLTEXT search
- **comments** - Bug discussions
- **attachments** - File uploads
- **bug_history** - Audit trail for changes

### Features
- FULLTEXT search on bug titles and descriptions
- Foreign key constraints for data integrity
- Audit trail for all bug changes
- Role-based access control
- Optimized indexes for performance

## Requirements

- MySQL 5.7+ or MariaDB 10.2+
- XAMPP/WAMP/MAMP for local development
- phpMyAdmin (optional, for GUI management)

## Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check MySQL service is running
   - Verify database credentials in `backend/config/database.php`

2. **FULLTEXT search not working**
   - Ensure MySQL version supports FULLTEXT on InnoDB tables
   - Check that FULLTEXT indexes were created properly

3. **Foreign key constraints fail**
   - Run scripts in correct order (users → projects → bugs → comments)
   - Check that referenced records exist

### Reset Database
To completely reset the database:
\`\`\`sql
DROP DATABASE bugsage;
SOURCE sql/setup.sql;
