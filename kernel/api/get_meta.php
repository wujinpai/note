<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}
$id = json_decode($_POST['id'], true);
$meta = DataBase::getInstance()->fetch("SELECT C_weather, C_location FROM content WHERE id = ?", [$id]);

$weather = json_decode($meta['C_weather'], true);
$location = json_decode($meta['C_location'], true);
$mode = $_ENV['LOCATION_SHOW_MODE'];
$location["mode"]=$mode;

echo json_encode(['weather' => $weather, 'location' => $location], JSON_UNESCAPED_UNICODE);