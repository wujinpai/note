<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

$update = updateSiteMap();
if ($update) {
    echo json_encode(['code' => 10200, 'success' => 'ok', 'info' => $update]);
} else {
    echo json_encode(['code' => 10200, 'success' => 'error', 'info' => "Failed to generate sitemap."]);
}