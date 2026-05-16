<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

$data = json_decode($_POST['data'], true);

//if
$vfy = pass_verify($data[0], $_ENV['PASS_HASH'], $_ENV['PASS_SALT']);
if (!$vfy) {
    echo json_encode([
        "code" => 10204,
        "info" => "pass error"
    ]);
    return;
}
//enc
$enc = pass_encrypt($data[1], $_ENV['PASS_SALT']);
$newpass = $enc['hash'];

$file = _DIR_() . 'kernel/config/.env';
$update = ENVManage($file, 'update', 'PASS_HASH', $newpass);

if (!$update) {
    echo json_encode([
        "code" => 10207,
        "info" => "env error"
    ]);
    return;
}
echo json_encode([
    "code" => 10200,
    "info" => "success"
]);