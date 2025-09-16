<?php
// BugSage Configuration File

// Start session if not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Application settings
define('APP_NAME', 'BugSage');
define('APP_VERSION', '1.0.0');
define('BASE_URL', 'http://localhost/bugsagev3/');

// File upload settings
define('UPLOAD_DIR', '../uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt']);

// Pagination settings
define('BUGS_PER_PAGE', 20);

// Security settings
define('PASSWORD_MIN_LENGTH', 6);

// Include database configuration
require_once 'database.php';

// Helper functions
function isLoggedIn() {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

function requireLogin() {
    if (!isLoggedIn()) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Authentication required', 'authenticated' => false]);
        exit();
    }
}

function getUserRole() {
    return $_SESSION['user_role'] ?? null;
}

function isAdmin() {
    return getUserRole() === 'Admin';
}

function sanitizeInput($data) {
    if ($data === null || $data === '') {
        return '';
    }
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

function formatDate($date) {
    return date('M j, Y g:i A', strtotime($date));
}

function getPriorityColor($priority) {
    switch($priority) {
        case 'Critical': return 'bg-red-500';
        case 'High': return 'bg-orange-500';
        case 'Medium': return 'bg-yellow-500';
        case 'Low': return 'bg-green-500';
        default: return 'bg-gray-500';
    }
}

function getStatusColor($status) {
    switch($status) {
        case 'New': return 'bg-blue-500';
        case 'In Progress': return 'bg-purple-500';
        case 'Resolved': return 'bg-green-500';
        case 'Closed': return 'bg-gray-500';
        default: return 'bg-gray-500';
    }
}

// JSON response helper
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json');
    header('Cache-Control: no-cache, must-revalidate');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit();
}

// Validate email
function isValidEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Debug function
function debugLog($message, $data = null) {
    if ($data !== null) {
        error_log("BugSage Debug - $message: " . print_r($data, true));
    } else {
        error_log("BugSage Debug - $message");
    }
}
?>