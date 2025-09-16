<?php
require_once '../config/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

requireLogin();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

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

function getProjects() {
    global $pdo;
    
    $stmt = $pdo->query("
        SELECT p.*, COUNT(b.bug_id) as bug_count
        FROM projects p
        LEFT JOIN bugs b ON p.project_id = b.project_id
        GROUP BY p.project_id
        ORDER BY p.name
    ");
    
    $projects = $stmt->fetchAll();
    jsonResponse(['projects' => $projects]);
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
    
    $stmt = $pdo->prepare("INSERT INTO projects (name, description) VALUES (?, ?)");
    if ($stmt->execute([$name, $description])) {
        $projectId = $pdo->lastInsertId();
        jsonResponse(['success' => true, 'project_id' => $projectId, 'message' => 'Project created successfully']);
    } else {
        jsonResponse(['error' => 'Failed to create project'], 500);
    }
}
?>
