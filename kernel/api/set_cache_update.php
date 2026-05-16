<?php
$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

if (APP_MODE === 'development') {
    echo json_encode([
        "code" => 10332,
        "info" => "development"
    ]);
    return;
}

if (updateResourceCache($filePath)) {
    echo json_encode([
        "code" => 10200,
        "info" => "success"
    ]);
} else {
    echo json_encode([
        "code" => 10203,
        "info" => "failure"
    ]);
}