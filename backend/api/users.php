<?php
require_once '../config/config.php';

header('Content-Type: application/json');
setCorsHeaders();
handlePreflight();

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
    debugLog("Users API Exception", ['message' => $e->getMessage()]);
    jsonResponse(['error' => 'Internal server error: ' . $e->getMessage()], 500);
}

function getUsersList() {
    global $pdo;
    
    try {
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