<?php
require_once '../config/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$bugId = intval($_POST['bug_id'] ?? 0);
$newStatus = sanitizeInput($_POST['status'] ?? '');

if (!$bugId || empty($newStatus)) {
    jsonResponse(['error' => 'Bug ID and status are required'], 400);
}

$validStatuses = ['New', 'In Progress', 'Resolved', 'Closed'];
if (!in_array($newStatus, $validStatuses)) {
    jsonResponse(['error' => 'Invalid status'], 400);
}

global $pdo;

// Get current status for history
$stmt = $pdo->prepare("SELECT status FROM bugs WHERE bug_id = ?");
$stmt->execute([$bugId]);
$currentStatus = $stmt->fetchColumn();

if (!$currentStatus) {
    jsonResponse(['error' => 'Bug not found'], 404);
}

if ($currentStatus === $newStatus) {
    jsonResponse(['success' => true, 'message' => 'Status unchanged']);
}

// Update status
$stmt = $pdo->prepare("UPDATE bugs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE bug_id = ?");
if ($stmt->execute([$newStatus, $bugId])) {
    // Add to history
    $historyStmt = $pdo->prepare("
        INSERT INTO bug_history (bug_id, changed_by, field_changed, old_value, new_value)
        VALUES (?, ?, 'status', ?, ?)
    ");
    $historyStmt->execute([$bugId, $_SESSION['user_id'], $currentStatus, $newStatus]);
    
    jsonResponse(['success' => true, 'message' => 'Status updated successfully']);
} else {
    jsonResponse(['error' => 'Failed to update status'], 500);
}
?>
