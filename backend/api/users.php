<?php
require_once '../config/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

requireLogin();

$action = $_GET['action'] ?? 'list';

debugLog("Users API called", [
    'action' => $action,
    'user_id' => $_SESSION['user_id']
]);

try {
    switch($action) {
        case 'list':
            getUsersList();
            break;
        default:
            jsonResponse(['error' => 'Invalid action'], 400);
    }
} catch (Exception $e) {
    debugLog("Users API Exception", ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    jsonResponse(['error' => 'Internal server error: ' . $e->getMessage()], 500);
}

function getUsersList() {
    global $pdo;
    
    try {
        // Get all users for assignment dropdown
        $stmt = $pdo->query("
            SELECT user_id, name, email, role 
            FROM users 
            ORDER BY name ASC
        ");
        
        $users = $stmt->fetchAll();
        
        debugLog("Users list retrieved", ['count' => count($users)]);
        
        jsonResponse(['users' => $users]);
        
    } catch (PDOException $e) {
        debugLog("getUsersList database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Failed to fetch users'], 500);
    }
}
?>