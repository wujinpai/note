<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

$envContent = file_get_contents(_DIR_() . 'kernel/config/.env');
$lines = explode("\n", $envContent);
$configList = [];
foreach ($lines as $line) {
    if (strpos($line, '=') !== false) {
        [$key, $value] = explode('=', $line, 2);
        if ($value !== '' && ($key == 'LOCATION_API_KEY' || $key == 'WEATHER_API_KEY')) {
            $value = aes256Decrypt($value, $_ENV['API_KEY']);
        }

        $configList[$key] = $value;
    }
}

$configList["uid"] = $_ENV['UID'];
$configList["version"] = $_ENV['VERSION'];

echo json_encode($configList);

//解密字段

//发送前端