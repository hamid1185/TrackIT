<?php
require_once '../config/config.php';

header('Content-Type: application/json');
setCorsHeaders();
handlePreflight();

requireLogin();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch($method) {
        case 'GET':
            if ($action === 'list') {
                getProjects();
            } else {
                jsonResponse(['error' => 'Invalid action'], 400);
            }
            break;
        case 'POST':
            if ($action === 'create') {
                createProject();
            } else {
                jsonResponse(['error' => 'Invalid action'], 400);
            }
            break;
        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    debugLog("Projects API Exception", ['message' => $e->getMessage()]);
    jsonResponse(['error' => 'Internal server error: ' . $e->getMessage()], 500);
}

function getProjects() {
    global $pdo;
    
    try {
        $stmt = $pdo->query("
            SELECT p.*, COUNT(b.bug_id) as bug_count
            FROM projects p
            LEFT JOIN bugs b ON p.project_id = b.project_id
            GROUP BY p.project_id
            ORDER BY p.name
        ");
        
        $projects = $stmt->fetchAll();
        jsonResponse(['projects' => $projects]);
        
    } catch (PDOException $e) {
        debugLog("getProjects database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Failed to fetch projects'], 500);
    }
}

function createProject() {
    if (!isAdmin()) {
        jsonResponse(['error' => 'Admin access required'], 403);
    }
    
    $name = sanitizeInput($_POST['name'] ?? '');
    $description = sanitizeInput($_POST['description'] ?? '');
    
    if (empty($name)) {
        jsonResponse(['error' => 'Project name is required'], 400);
    }
    
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("INSERT INTO projects (name, description) VALUES (?, ?)");
        if ($stmt->execute([$name, $description])) {
            $projectId = $pdo->lastInsertId();
            debugLog("Project created successfully", ['project_id' => $projectId]);
            jsonResponse(['success' => true, 'project_id' => $projectId, 'message' => 'Project created successfully']);
        } else {
            jsonResponse(['error' => 'Failed to create project'], 500);
        }
    } catch (PDOException $e) {
        debugLog("createProject database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Database error occurred while creating project'], 500);
    }
}
?>