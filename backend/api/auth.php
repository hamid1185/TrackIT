<?php
require_once '../config/config.php';

// Set headers for CORS and JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Debug logging
debugLog("Auth API called", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'action' => $_GET['action'] ?? 'none',
    'session_id' => session_id(),
    'session_data' => $_SESSION
]);

$action = $_GET['action'] ?? '';

try {
    switch($action) {
        case 'login':
            handleLogin();
            break;
        case 'register':
            handleRegister();
            break;
        case 'logout':
            handleLogout();
            break;
        case 'check':
            checkAuth();
            break;
        default:
            jsonResponse(['error' => 'Invalid action'], 400);
    }
} catch (Exception $e) {
    debugLog("Auth API Exception", ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    jsonResponse(['error' => 'Internal server error: ' . $e->getMessage()], 500);
}

function handleLogin() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $email = sanitizeInput($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    
    debugLog("Login attempt", ['email' => $email]);
    
    if (empty($email) || empty($password)) {
        jsonResponse(['error' => 'Email and password are required'], 400);
    }
    
    if (!isValidEmail($email)) {
        jsonResponse(['error' => 'Invalid email format'], 400);
    }
    
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("SELECT user_id, name, email, password_hash, role FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password_hash'])) {
            // Regenerate session ID for security
            session_regenerate_id(true);
            
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_role'] = $user['role'];
            $_SESSION['login_time'] = time();
            
            debugLog("Login successful", ['user_id' => $user['user_id'], 'email' => $email]);
            
            jsonResponse([
                'success' => true,
                'authenticated' => true,
                'user' => [
                    'id' => $user['user_id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ]
            ]);
        } else {
            debugLog("Login failed - invalid credentials", ['email' => $email]);
            jsonResponse(['error' => 'Invalid email or password'], 401);
        }
    } catch (PDOException $e) {
        debugLog("Login database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Database error occurred'], 500);
    }
}

function handleRegister() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $name = sanitizeInput($_POST['name'] ?? '');
    $email = sanitizeInput($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $role = sanitizeInput($_POST['role'] ?? 'Developer');
    
    debugLog("Registration attempt", ['name' => $name, 'email' => $email, 'role' => $role]);
    
    if (empty($name) || empty($email) || empty($password)) {
        jsonResponse(['error' => 'All fields are required'], 400);
    }
    
    if (!isValidEmail($email)) {
        jsonResponse(['error' => 'Invalid email format'], 400);
    }
    
    if (strlen($password) < PASSWORD_MIN_LENGTH) {
        jsonResponse(['error' => 'Password must be at least ' . PASSWORD_MIN_LENGTH . ' characters'], 400);
    }
    
    $validRoles = ['Developer', 'Tester', 'Admin'];
    if (!in_array($role, $validRoles)) {
        jsonResponse(['error' => 'Invalid role selected'], 400);
    }
    
    global $pdo;
    
    try {
        // Check if email already exists
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Email address is already registered'], 400);
        }
        
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, NOW())");
        if ($stmt->execute([$name, $email, $password_hash, $role])) {
            $userId = $pdo->lastInsertId();
            debugLog("Registration successful", ['user_id' => $userId, 'email' => $email]);
            jsonResponse([
                'success' => true, 
                'message' => 'Registration successful. You can now login.',
                'user_id' => $userId
            ]);
        } else {
            debugLog("Registration failed - database insert error");
            jsonResponse(['error' => 'Registration failed. Please try again.'], 500);
        }
    } catch (PDOException $e) {
        debugLog("Registration database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Database error occurred during registration'], 500);
    }
}

function handleLogout() {
    debugLog("Logout called", ['session_id' => session_id()]);
    
    // Clear all session variables
    $_SESSION = array();
    
    // Destroy the session cookie
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    
    // Destroy the session
    session_destroy();
    
    jsonResponse(['success' => true, 'message' => 'Logged out successfully', 'authenticated' => false]);
}

function checkAuth() {
    debugLog("Auth check", ['session_data' => $_SESSION, 'session_id' => session_id()]);
    
    if (isLoggedIn()) {
        // Verify session is still valid (not too old)
        $maxAge = 24 * 60 * 60; // 24 hours
        if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > $maxAge) {
            // Session expired
            session_destroy();
            jsonResponse(['authenticated' => false, 'message' => 'Session expired']);
        }
        
        jsonResponse([
            'authenticated' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'name' => $_SESSION['user_name'],
                'email' => $_SESSION['user_email'],
                'role' => $_SESSION['user_role']
            ]
        ]);
    } else {
        jsonResponse(['authenticated' => false]);
    }
}
?>