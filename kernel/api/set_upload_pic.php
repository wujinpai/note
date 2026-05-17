<?php
include_once dirname(__DIR__) . '/functions.php';

// 开启调试
error_reporting(E_ALL);
ini_set('display_errors', 1);

// 调试输出
header('Content-Type: application/json');

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;

if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权", "debug" => ["cookie" => $cookie, "session" => $session]]));
}

$mode = $_POST['mode'] ?? '';
$data = $_POST['data'] ?? '';

// 调试信息
$debug = [
    'mode' => $mode,
    'data_length' => strlen($data),
    'data_prefix' => substr($data, 0, 50)
];

$avatar = _DIR_() . "kernel/asset/img/avatar.webp";
$avatar1 = _DIR_() . "kernel/asset/img/avatar_1.webp";
$background = _DIR_() . "kernel/asset/img/background.webp";
$background1 = _DIR_() . "kernel/asset/img/background1.webp";

// 检查目录权限
$debug['dir'] = [
    'avatar_dir' => dirname($avatar),
    'background_dir' => dirname($background),
    'avatar_dir_writable' => is_writable(dirname($avatar)),
    'background_dir_writable' => is_writable(dirname($background)),
    'avatar_exists' => file_exists($avatar),
    'background_exists' => file_exists($background),
    'avatar_perms' => file_exists($avatar) ? substr(sprintf('%o', fileperms($avatar)), -4) : 'N/A',
    'background_perms' => file_exists($background) ? substr(sprintf('%o', fileperms($background)), -4) : 'N/A'
];

try {
    if ($mode == 'avatar') {
        if (file_exists($avatar)) {
            copy($avatar, $avatar1);
        }
        compressImageWithGD($data, $avatar, 70);
        echo json_encode([
            "code" => 10200,
            "info" => "success",
            "debug" => $debug
        ]);
    } else {
        if (file_exists($background)) {
            copy($background, $background1);
        }
        compressImageWithGD($data, $background, 70);
        echo json_encode([
            "code" => 10200,
            "info" => "success",
            "debug" => $debug
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        "code" => 10203,
        "info" => "failure",
        "error" => $e->getMessage(),
        "debug" => $debug
    ]);
}

// 更新缓存
try {
    $file = _DIR_() . 'kernel/config/.env';
    if (file_exists($file)) {
        ENVManage($file, 'update', 'CACHE', time());
    }
} catch (Exception $e) {
    // 忽略缓存更新错误
}
