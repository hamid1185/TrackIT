<?php
require_once '../config/config.php';

header('Content-Type: application/json');
setCorsHeaders();
handlePreflight();

requireLogin();

$action = $_GET['action'] ?? 'stats';

debugLog("Dashboard API called", [
    'action' => $action,
    'user_id' => $_SESSION['user_id']
]);

try {
    switch($action) {
        case 'stats':
            getDashboardStats();
            break;
        case 'recent':
            getRecentBugs();
            break;
        case 'charts':
            getChartData();
            break;
        default:
            jsonResponse(['error' => 'Invalid action'], 400);
    }
} catch (Exception $e) {
    debugLog("Dashboard API Exception", ['message' => $e->getMessage()]);
    jsonResponse(['error' => 'Internal server error: ' . $e->getMessage()], 500);
}

function getDashboardStats() {
    global $pdo;
    
    try {
        $stats = [
            'total_bugs' => getCount("SELECT COUNT(*) FROM bugs"),
            'my_bugs' => getCount("SELECT COUNT(*) FROM bugs WHERE assignee_id = ?", [$_SESSION['user_id']]),
            'recent_bugs' => getCount("SELECT COUNT(*) FROM bugs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"),
            'status_counts' => getGroupedCounts("SELECT status, COUNT(*) as count FROM bugs GROUP BY status"),
            'priority_counts' => getGroupedCounts("SELECT priority, COUNT(*) as count FROM bugs GROUP BY priority")
        ];
        
        debugLog("Dashboard stats retrieved", $stats);
        jsonResponse($stats);
        
    } catch (PDOException $e) {
        debugLog("getDashboardStats database error", ['error' => $e->getMessage()]);
        
        // Return default values instead of failing
        jsonResponse([
            'total_bugs' => 0,
            'my_bugs' => 0,
            'recent_bugs' => 0,
            'status_counts' => getDefaultStatusCounts(),
            'priority_counts' => getDefaultPriorityCounts()
        ]);
    }
}

function getCount($sql, $params = []) {
    global $pdo;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int)$stmt->fetchColumn();
}

function getGroupedCounts($sql) {
    global $pdo;
    $stmt = $pdo->query($sql);
    return $stmt->fetchAll() ?: [];
}

function getDefaultStatusCounts() {
    return [
        ['status' => 'New', 'count' => 0],
        ['status' => 'In Progress', 'count' => 0],
        ['status' => 'Resolved', 'count' => 0],
        ['status' => 'Closed', 'count' => 0]
    ];
}

function getDefaultPriorityCounts() {
    return [
        ['priority' => 'Low', 'count' => 0],
        ['priority' => 'Medium', 'count' => 0],
        ['priority' => 'High', 'count' => 0],
        ['priority' => 'Critical', 'count' => 0]
    ];
}

function getRecentBugs() {
    global $pdo;
    
    try {
        $stmt = $pdo->prepare("
            SELECT b.bug_id, b.title, b.description, b.priority, b.status, b.created_at,
                   p.name as project_name,
                   reporter.name as reporter_name,
                   assignee.name as assignee_name
            FROM bugs b
            LEFT JOIN projects p ON b.project_id = p.project_id
            LEFT JOIN users reporter ON b.reporter_id = reporter.user_id
            LEFT JOIN users assignee ON b.assignee_id = assignee.user_id
            ORDER BY b.created_at DESC
            LIMIT 10
        ");
        
        $stmt->execute();
        $recentBugs = $stmt->fetchAll();
        
        debugLog("Recent bugs retrieved", ['count' => count($recentBugs)]);
        jsonResponse(['recent_bugs' => $recentBugs ?: []]);
        
    } catch (PDOException $e) {
        debugLog("getRecentBugs database error", ['error' => $e->getMessage()]);
        jsonResponse(['recent_bugs' => []]);
    }
}

function getChartData() {
    global $pdo;
    
    try {
        $bugsOverTime = getBugsOverTime();
        $resolutionTimes = getResolutionTimes();
        
        debugLog("Chart data retrieved", [
            'bugs_over_time_count' => count($bugsOverTime),
            'resolution_times_count' => count($resolutionTimes)
        ]);
        
        jsonResponse([
            'bugs_over_time' => $bugsOverTime,
            'resolution_times' => $resolutionTimes
        ]);
        
    } catch (PDOException $e) {
        debugLog("getChartData database error", ['error' => $e->getMessage()]);
        
        jsonResponse([
            'bugs_over_time' => getDefaultBugsOverTime(),
            'resolution_times' => getDefaultResolutionTimes()
        ]);
    }
}

function getBugsOverTime() {
    global $pdo;
    
    $stmt = $pdo->query("
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM bugs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    ");
    
    $result = $stmt->fetchAll();
    return !empty($result) ? $result : getDefaultBugsOverTime();
}

function getResolutionTimes() {
    global $pdo;
    
    $stmt = $pdo->query("
        SELECT 
            priority,
            AVG(DATEDIFF(COALESCE(updated_at, NOW()), created_at)) as avg_resolution_days
        FROM bugs 
        WHERE status IN ('Resolved', 'Closed')
        GROUP BY priority
    ");
    
    $result = $stmt->fetchAll();
    return !empty($result) ? $result : getDefaultResolutionTimes();
}

function getDefaultBugsOverTime() {
    $data = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $data[] = ['date' => $date, 'count' => 0];
    }
    return $data;
}

function getDefaultResolutionTimes() {
    return [
        ['priority' => 'Low', 'avg_resolution_days' => 0],
        ['priority' => 'Medium', 'avg_resolution_days' => 0],
        ['priority' => 'High', 'avg_resolution_days' => 0],
        ['priority' => 'Critical', 'avg_resolution_days' => 0]
    ];
}
?>