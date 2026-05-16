<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

$mode = $_POST['mode'];
$data = $_POST['data'];

$avatar = _DIR_() . "kernel/asset/img/avatar.webp";
$avatar1 = _DIR_() . "kernel/asset/img/avatar_1.webp";

$background = _DIR_() . "kernel/asset/img/background.webp";
$background1 = _DIR_() . "kernel/asset/img/background1.webp";
if ($mode == 'avatar') {
    try {
        copy($avatar, "$avatar1");
        compressImageWithGD($data, $avatar,70);
        echo json_encode([
            "code" => 10200,
            "info" => "success"
        ]);
    } catch (Exception $e) {
        echo json_encode([
            "code" => 10203,
            "info" => "failure"
        ]);
    }
} else {
    try {
        copy($background, "$background1");
        compressImageWithGD($data, $background,70);
        echo json_encode([
            "code" => 10200,
            "info" => "success"
        ]);
    } catch (Exception $e) {
        echo json_encode([
            "code" => 10203,
            "info" => "failure"
        ]);
    }
}
$file = _DIR_() . 'kernel/config/.env';
ENVManage($file, 'update', 'CACHE', time());