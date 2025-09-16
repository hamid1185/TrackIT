<?php
// Database configuration for XAMPP MySQL

$host = 'localhost';
$dbname = 'bugsage';
$username = 'root';
$password = '';

try {
    // Create PDO connection
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4", 
        $username, 
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ]
    );
    
    // Test connection
    $pdo->query("SELECT 1");
    
} catch(PDOException $e) {
    // Log the error
    error_log("Database connection failed: " . $e->getMessage());
    
    // Return JSON error for API calls
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'error' => 'Database connection failed',
            'message' => 'Unable to connect to the database. Please check your configuration.'
        ]);
    }
    exit();
}

// Function to check if database exists and create if needed
function checkDatabase() {
    global $host, $username, $password, $dbname;
    
    try {
        // Connect without specifying database
        $tempPdo = new PDO("mysql:host=$host;charset=utf8mb4", $username, $password);
        $tempPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Check if database exists
        $stmt = $tempPdo->prepare("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?");
        $stmt->execute([$dbname]);
        
        if (!$stmt->fetch()) {
            // Database doesn't exist, create it
            $tempPdo->exec("CREATE DATABASE `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            error_log("Database '$dbname' created successfully");
        }
        
    } catch(PDOException $e) {
        error_log("Database check/creation failed: " . $e->getMessage());
    }
}

// Check and create database if needed
checkDatabase();
?>