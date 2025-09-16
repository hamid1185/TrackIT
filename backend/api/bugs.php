<?php
require_once '../config/config.php';

header('Content-Type: application/json');
setCorsHeaders();
handlePreflight();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

debugLog("Bugs API called", [
    'method' => $method,
    'action' => $action,
    'user_id' => $_SESSION['user_id'] ?? 'not_logged_in'
]);

try {
    switch($method) {
        case 'GET':
            handleGetRequest($action);
            break;
        case 'POST':
            handlePostRequest($action);
            break;
        case 'PUT':
            handlePutRequest($action);
            break;
        default:
            jsonResponse(['error' => 'Method not allowed'], 405);
    }
} catch (Exception $e) {
    debugLog("Bugs API Exception", ['message' => $e->getMessage()]);
    jsonResponse(['error' => 'Internal server error: ' . $e->getMessage()], 500);
}

function handleGetRequest($action) {
    switch($action) {
        case 'list':
            getBugsList();
            break;
        case 'details':
            getBugDetails();
            break;
        case 'search':
            searchBugs();
            break;
        default:
            jsonResponse(['error' => 'Invalid GET action'], 400);
    }
}

function handlePostRequest($action) {
    switch($action) {
        case 'create':
            createBug();
            break;
        case 'comment':
            addComment();
            break;
        default:
            jsonResponse(['error' => 'Invalid POST action'], 400);
    }
}

function handlePutRequest($action) {
    if ($action === 'update') {
        updateBug();
    } else {
        jsonResponse(['error' => 'Invalid PUT action'], 400);
    }
}

function getBugsList() {
    requireLogin();
    
    global $pdo;
    
    $page = max(1, intval($_GET['page'] ?? 1));
    $perPage = intval($_GET['per_page'] ?? BUGS_PER_PAGE);
    $offset = ($page - 1) * $perPage;
    
    $filters = buildFilters();
    $whereClause = $filters['where'];
    $params = $filters['params'];
    
    try {
        $sql = "SELECT b.*, p.name as project_name, 
                       reporter.name as reporter_name,
                       assignee.name as assignee_name
                FROM bugs b
                LEFT JOIN projects p ON b.project_id = p.project_id
                LEFT JOIN users reporter ON b.reporter_id = reporter.user_id
                LEFT JOIN users assignee ON b.assignee_id = assignee.user_id
                $whereClause
                ORDER BY b.created_at DESC
                LIMIT $perPage OFFSET $offset";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $bugs = $stmt->fetchAll();
        
        $countSql = "SELECT COUNT(*) FROM bugs b $whereClause";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $totalBugs = $countStmt->fetchColumn();
        
        jsonResponse([
            'bugs' => $bugs,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total_pages' => ceil($totalBugs / $perPage),
                'total_bugs' => $totalBugs
            ]
        ]);
        
    } catch (PDOException $e) {
        debugLog("getBugsList database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Failed to fetch bugs'], 500);
    }
}

function buildFilters() {
    $filters = [];
    $params = [];
    
    if (!empty($_GET['status'])) {
        $filters[] = "b.status = ?";
        $params[] = $_GET['status'];
    }
    
    if (!empty($_GET['priority'])) {
        $filters[] = "b.priority = ?";
        $params[] = $_GET['priority'];
    }
    
    if (!empty($_GET['assignee'])) {
        if ($_GET['assignee'] === 'me') {
            $filters[] = "b.assignee_id = ?";
            $params[] = $_SESSION['user_id'];
        } else {
            $filters[] = "b.assignee_id = ?";
            $params[] = $_GET['assignee'];
        }
    }
    
    if (!empty($_GET['project'])) {
        $filters[] = "b.project_id = ?";
        $params[] = $_GET['project'];
    }
    
    $whereClause = !empty($filters) ? 'WHERE ' . implode(' AND ', $filters) : '';
    
    return ['where' => $whereClause, 'params' => $params];
}

function getBugDetails() {
    requireLogin();
    
    $bugId = intval($_GET['id'] ?? 0);
    if (!$bugId) {
        jsonResponse(['error' => 'Bug ID is required'], 400);
    }
    
    global $pdo;
    
    try {
        $bug = fetchBugById($bugId);
        if (!$bug) {
            jsonResponse(['error' => 'Bug not found'], 404);
        }
        
        $comments = fetchCommentsByBugId($bugId);
        $attachments = fetchAttachmentsByBugId($bugId);
        
        jsonResponse([
            'bug' => $bug,
            'comments' => $comments,
            'attachments' => $attachments
        ]);
        
    } catch (PDOException $e) {
        debugLog("getBugDetails database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Failed to fetch bug details'], 500);
    }
}

function fetchBugById($bugId) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        SELECT b.*, p.name as project_name, 
               reporter.name as reporter_name,
               assignee.name as assignee_name
        FROM bugs b
        LEFT JOIN projects p ON b.project_id = p.project_id
        LEFT JOIN users reporter ON b.reporter_id = reporter.user_id
        LEFT JOIN users assignee ON b.assignee_id = assignee.user_id
        WHERE b.bug_id = ?
    ");
    $stmt->execute([$bugId]);
    return $stmt->fetch();
}

function fetchCommentsByBugId($bugId) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        SELECT c.*, u.name as user_name
        FROM comments c
        JOIN users u ON c.user_id = u.user_id
        WHERE c.bug_id = ?
        ORDER BY c.created_at ASC
    ");
    $stmt->execute([$bugId]);
    return $stmt->fetchAll();
}

function fetchAttachmentsByBugId($bugId) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT * FROM attachments WHERE bug_id = ? ORDER BY uploaded_at ASC");
    $stmt->execute([$bugId]);
    return $stmt->fetchAll();
}

function createBug() {
    requireLogin();
    
    $title = sanitizeInput($_POST['title'] ?? '');
    $description = sanitizeInput($_POST['description'] ?? '');
    $priority = sanitizeInput($_POST['priority'] ?? 'Medium');
    $projectId = intval($_POST['project_id'] ?? 0) ?: null;
    $assigneeId = intval($_POST['assignee_id'] ?? 0) ?: null;
    $forceCreate = isset($_POST['force_create']) && $_POST['force_create'] === 'true';
    
    if (empty($title) || empty($description)) {
        jsonResponse(['error' => 'Title and description are required'], 400);
    }
    
    $validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    if (!in_array($priority, $validPriorities)) {
        jsonResponse(['error' => 'Invalid priority level'], 400);
    }
    
    global $pdo;
    
    try {
        if (!$forceCreate && hasDuplicates($title)) {
            $duplicates = findDuplicates($title);
            jsonResponse([
                'warning' => 'Potential duplicates found',
                'duplicates' => $duplicates
            ]);
            return;
        }
        
        validateReferences($projectId, $assigneeId);
        
        $stmt = $pdo->prepare("
            INSERT INTO bugs (project_id, title, description, priority, assignee_id, reporter_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        
        if ($stmt->execute([$projectId, $title, $description, $priority, $assigneeId, $_SESSION['user_id']])) {
            $bugId = $pdo->lastInsertId();
            debugLog("Bug created successfully", ['bug_id' => $bugId]);
            jsonResponse(['success' => true, 'bug_id' => $bugId, 'message' => 'Bug created successfully']);
        } else {
            jsonResponse(['error' => 'Failed to create bug'], 500);
        }
        
    } catch (PDOException $e) {
        debugLog("createBug database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Database error occurred while creating bug'], 500);
    }
}

function hasDuplicates($title) {
    global $pdo;
    
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM bugs WHERE title LIKE ?");
    $searchTerm = '%' . $title . '%';
    $stmt->execute([$searchTerm]);
    return $stmt->fetchColumn() > 0;
}

function findDuplicates($title) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        SELECT bug_id, title
        FROM bugs 
        WHERE title LIKE ? OR description LIKE ?
        LIMIT 5
    ");
    $searchTerm = '%' . $title . '%';
    $stmt->execute([$searchTerm, $searchTerm]);
    return $stmt->fetchAll();
}

function validateReferences($projectId, $assigneeId) {
    global $pdo;
    
    if ($projectId) {
        $stmt = $pdo->prepare("SELECT project_id FROM projects WHERE project_id = ?");
        $stmt->execute([$projectId]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Invalid project selected'], 400);
        }
    }
    
    if ($assigneeId) {
        $stmt = $pdo->prepare("SELECT user_id FROM users WHERE user_id = ?");
        $stmt->execute([$assigneeId]);
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Invalid assignee selected'], 400);
        }
    }
}

function updateBug() {
    requireLogin();
    
    $bugId = intval($_GET['id'] ?? 0);
    if (!$bugId) {
        jsonResponse(['error' => 'Bug ID is required'], 400);
    }
    
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        jsonResponse(['error' => 'Invalid JSON input'], 400);
    }
    
    global $pdo;
    
    try {
        $currentBug = fetchBugById($bugId);
        if (!$currentBug) {
            jsonResponse(['error' => 'Bug not found'], 404);
        }
        
        $updates = buildUpdateQuery($input, $currentBug, $bugId);
        
        if (empty($updates['fields'])) {
            jsonResponse(['error' => 'No fields to update'], 400);
        }
        
        $sql = "UPDATE bugs SET " . implode(', ', $updates['fields']) . ", updated_at = NOW() WHERE bug_id = ?";
        $updates['params'][] = $bugId;
        
        $stmt = $pdo->prepare($sql);
        if ($stmt->execute($updates['params'])) {
            debugLog("Bug updated successfully", ['bug_id' => $bugId]);
            jsonResponse(['success' => true, 'message' => 'Bug updated successfully']);
        } else {
            jsonResponse(['error' => 'Failed to update bug'], 500);
        }
        
    } catch (PDOException $e) {
        debugLog("updateBug database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Database error occurred while updating bug'], 500);
    }
}

function buildUpdateQuery($input, $currentBug, $bugId) {
    global $pdo;
    
    $updates = ['fields' => [], 'params' => []];
    $allowedFields = ['title', 'description', 'priority', 'status', 'assignee_id'];
    
    foreach ($allowedFields as $field) {
        if (isset($input[$field])) {
            $updates['fields'][] = "$field = ?";
            $updates['params'][] = $input[$field];
            
            if ($currentBug[$field] != $input[$field]) {
                logBugHistory($bugId, $field, $currentBug[$field], $input[$field]);
            }
        }
    }
    
    return $updates;
}

function logBugHistory($bugId, $field, $oldValue, $newValue) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        INSERT INTO bug_history (bug_id, changed_by, field_changed, old_value, new_value, changed_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$bugId, $_SESSION['user_id'], $field, $oldValue, $newValue]);
}

function addComment() {
    requireLogin();
    
    $bugId = intval($_POST['bug_id'] ?? 0);
    $comment = sanitizeInput($_POST['comment'] ?? '');
    
    if (!$bugId || empty($comment)) {
        jsonResponse(['error' => 'Bug ID and comment text are required'], 400);
    }
    
    global $pdo;
    
    try {
        if (!fetchBugById($bugId)) {
            jsonResponse(['error' => 'Bug not found'], 404);
        }
        
        $stmt = $pdo->prepare("INSERT INTO comments (bug_id, user_id, comment_text, created_at) VALUES (?, ?, ?, NOW())");
        if ($stmt->execute([$bugId, $_SESSION['user_id'], $comment])) {
            debugLog("Comment added successfully", ['bug_id' => $bugId]);
            jsonResponse(['success' => true, 'message' => 'Comment added successfully']);
        } else {
            jsonResponse(['error' => 'Failed to add comment'], 500);
        }
        
    } catch (PDOException $e) {
        debugLog("addComment database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Database error occurred while adding comment'], 500);
    }
}

function searchBugs() {
    requireLogin();
    
    $query = sanitizeInput($_GET['q'] ?? '');
    if (empty($query)) {
        jsonResponse(['error' => 'Search query is required'], 400);
    }
    
    global $pdo;
    
    try {
        $searchTerm = '%' . $query . '%';
        $stmt = $pdo->prepare("
            SELECT b.*, p.name as project_name,
                   reporter.name as reporter_name,
                   assignee.name as assignee_name
            FROM bugs b
            LEFT JOIN projects p ON b.project_id = p.project_id
            LEFT JOIN users reporter ON b.reporter_id = reporter.user_id
            LEFT JOIN users assignee ON b.assignee_id = assignee.user_id
            WHERE b.title LIKE ? OR b.description LIKE ?
            ORDER BY b.created_at DESC
            LIMIT 20
        ");
        
        $stmt->execute([$searchTerm, $searchTerm]);
        $results = $stmt->fetchAll();
        
        jsonResponse(['results' => $results]);
        
    } catch (PDOException $e) {
        debugLog("searchBugs database error", ['error' => $e->getMessage()]);
        jsonResponse(['error' => 'Search failed'], 500);
    }
}
?>