<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}
$key = $_POST['key'];
$value = $_POST['value'];
$file = _DIR_() . 'kernel/config/.env';

if ($value !== '' && ($key == 'LOCATION_API_KEY' || $key == 'WEATHER_API_KEY')) {
    $value = aes256Encrypt($value, $_ENV['API_KEY']);
}
$update = ENVManage($file, "update", $key, $value);

if ($update) {
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