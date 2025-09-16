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
    debugLog("Dashboard API Exception", ['message' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
    jsonResponse(['error' => 'Internal server error: ' . $e->getMessage()], 500);
}

function getDashboardStats() {
    global $pdo;
    
    try {
        // Total bugs
        $stmt = $pdo->query("SELECT COUNT(*) FROM bugs");
        $totalBugs = $stmt->fetchColumn() ?: 0;
        
        // Bugs by status
        $stmt = $pdo->query("SELECT status, COUNT(*) as count FROM bugs GROUP BY status");
        $statusCounts = $stmt->fetchAll() ?: [];
        
        // Bugs by priority
        $stmt = $pdo->query("SELECT priority, COUNT(*) as count FROM bugs GROUP BY priority");
        $priorityCounts = $stmt->fetchAll() ?: [];
        
        // My assigned bugs
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM bugs WHERE assignee_id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $myBugs = $stmt->fetchColumn() ?: 0;
        
        // Recent activity (last 7 days)
        $stmt = $pdo->query("SELECT COUNT(*) FROM bugs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
        $recentBugs = $stmt->fetchColumn() ?: 0;
        
        debugLog("Dashboard stats retrieved", [
            'total_bugs' => $totalBugs,
            'my_bugs' => $myBugs,
            'status_counts' => count($statusCounts),
            'priority_counts' => count($priorityCounts)
        ]);
        
        jsonResponse([
            'total_bugs' => (int)$totalBugs,
            'my_bugs' => (int)$myBugs,
            'recent_bugs' => (int)$recentBugs,
            'status_counts' => $statusCounts,
            'priority_counts' => $priorityCounts
        ]);
        
    } catch (PDOException $e) {
        debugLog("getDashboardStats database error", ['error' => $e->getMessage()]);
        
        // Return default values instead of failing
        jsonResponse([
            'total_bugs' => 0,
            'my_bugs' => 0,
            'recent_bugs' => 0,
            'status_counts' => [
                ['status' => 'New', 'count' => 0],
                ['status' => 'In Progress', 'count' => 0],
                ['status' => 'Resolved', 'count' => 0],
                ['status' => 'Closed', 'count' => 0]
            ],
            'priority_counts' => [
                ['priority' => 'Low', 'count' => 0],
                ['priority' => 'Medium', 'count' => 0],
                ['priority' => 'High', 'count' => 0],
                ['priority' => 'Critical', 'count' => 0]
            ]
        ]);
    }
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
        // Bugs created over time (last 30 days)
        $stmt = $pdo->query("
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM bugs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ");
        $bugsOverTime = $stmt->fetchAll() ?: [];
        
        // Resolution time analysis
        $stmt = $pdo->query("
            SELECT 
                priority,
                AVG(DATEDIFF(COALESCE(updated_at, NOW()), created_at)) as avg_resolution_days
            FROM bugs 
            WHERE status IN ('Resolved', 'Closed')
            GROUP BY priority
        ");
        $resolutionTimes = $stmt->fetchAll() ?: [];
        
        // If no resolution data, create default structure
        if (empty($resolutionTimes)) {
            $resolutionTimes = [
                ['priority' => 'Low', 'avg_resolution_days' => 0],
                ['priority' => 'Medium', 'avg_resolution_days' => 0],
                ['priority' => 'High', 'avg_resolution_days' => 0],
                ['priority' => 'Critical', 'avg_resolution_days' => 0]
            ];
        }
        
        // If no time data, create some sample data for last 7 days
        if (empty($bugsOverTime)) {
            $bugsOverTime = [];
            for ($i = 6; $i >= 0; $i--) {
                $date = date('Y-m-d', strtotime("-$i days"));
                $bugsOverTime[] = ['date' => $date, 'count' => 0];
            }
        }
        
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
        
        // Return default chart data
        $defaultBugsOverTime = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-$i days"));
            $defaultBugsOverTime[] = ['date' => $date, 'count' => 0];
        }
        
        jsonResponse([
            'bugs_over_time' => $defaultBugsOverTime,
            'resolution_times' => [
                ['priority' => 'Low', 'avg_resolution_days' => 0],
                ['priority' => 'Medium', 'avg_resolution_days' => 0],
                ['priority' => 'High', 'avg_resolution_days' => 0],
                ['priority' => 'Critical', 'avg_resolution_days' => 0]
            ]
        ]);
    }
}
?>