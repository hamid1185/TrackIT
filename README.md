# BugSage - Bug Tracking System

A comprehensive bug tracking system with separated frontend and backend architecture.

## Project Structure

\`\`\`
bugsage3/
├── backend/           # PHP API backend
│   ├── api/          # REST API endpoints
│   │   ├── auth.php          # Authentication (login, register, logout)
│   │   ├── bugs.php          # Bug management (CRUD, search, comments)
│   │   ├── dashboard.php     # Dashboard statistics
│   │   ├── projects.php      # Project management
│   │   └── updatebugstatus.php # Bug status updates
│   └── config/       # Configuration files
│       ├── config.php        # Main application config
│       └── database.php      # Database connection
├── frontend/         # Pure HTML/CSS/JS frontend
│   ├── css/         # Stylesheets
│   │   ├── global.css       # Base styles
│   │   ├── auth.css         # Authentication pages
│   │   ├── dashboard.css    # Dashboard styles
│   │   ├── kanban.css       # Kanban board styles
│   │   ├── reports.css      # Reports page styles
│   │   └── admin.css        # Admin panel styles
│   ├── js/          # JavaScript files
│   │   ├── main.js          # Core utilities and API handling
│   │   ├── auth.js          # Authentication logic
│   │   ├── dashboard.js     # Dashboard functionality
│   │   ├── bugform.js       # Bug form handling
│   │   ├── kanban.js        # Kanban board logic
│   │   ├── reports.js       # Reports functionality
│   │   └── admin.js         # Admin panel logic
│   ├── index.html           # Landing page
│   ├── login.html           # Login page
│   ├── registration.html    # Registration page
│   ├── dashboard.html       # Main dashboard
│   ├── buglist.html         # Bug listing page
│   ├── createbug.html       # Bug creation form
│   ├── bugdetail.html       # Bug details page
│   ├── kanban.html          # Kanban board view
│   ├── reports.html         # Reports page
│   └── admin.html           # Admin panel
└── sql/             # Database scripts
    ├── schema.sql           # Database schema
    ├── sample_data.sql      # Demo data
    ├── setup.sql            # Complete setup script
    ├── migrations/          # Database migrations
    │   └── 001_initial_schema.sql
    └── README.md            # Database documentation
\`\`\`

## Features

- **User Authentication**: Registration, login, logout with session management
- **Bug Management**: Create, read, update, delete bugs with full audit trail
- **Project Management**: Organize bugs by projects
- **Search & Filter**: Advanced search with FULLTEXT indexing
- **Kanban Board**: Visual bug status management
- **Dashboard**: Statistics and recent activity overview
- **Reports**: Bug analytics and reporting
- **Admin Panel**: User and system management
- **Comments**: Bug discussion and collaboration
- **File Attachments**: Upload files to bugs
- **Role-based Access**: Admin, Developer, Tester roles

## Setup Instructions

1. **Database Setup**:
   \`\`\`bash
   # Import the database schema
   mysql -u root -p < sql/setup.sql
   \`\`\`

2. **Backend Configuration**:
   - Update `backend/config/database.php` with your database credentials
   - Configure `backend/config/config.php` settings

3. **Web Server**:
   - Place the project in your web server directory (e.g., `htdocs` for XAMPP)
   - Ensure PHP and MySQL are running
   - Access the application via `http://localhost/bugsage3/frontend/`

## Demo Accounts

- **Admin**: admin@bugsage.com / admin123
- **Developer**: john@bugsage.com / dev123
- **Tester**: jane@bugsage.com / test123

## Technology Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Backend**: PHP 7.4+
- **Database**: MySQL 5.7+
- **Architecture**: RESTful API with JSON responses

## API Endpoints

- `POST /backend/api/auth.php` - Authentication
- `GET|POST /backend/api/bugs.php` - Bug management
- `GET /backend/api/dashboard.php` - Dashboard data
- `GET|POST /backend/api/projects.php` - Project management
- `POST /backend/api/updatebugstatus.php` - Status updates

## License

This project is open source and available under the MIT License.
