<?php
include "functions.php";
if (APP_MODE === 'development') {
    header("Access-Control-Allow-Origin: *");
} else {
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
    $host = $_SERVER['HTTP_HOST'];
    $currentOrigin = $protocol . "://" . $host;
    header("Access-Control-Allow-Origin: $currentOrigin");
}
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: application/json');

$content_len = formatBytes($_SERVER['CONTENT_LENGTH']);
$postMax = ini_get('post_max_size');
if (convertToBytes($postMax) < $_SERVER['CONTENT_LENGTH']) {
    die(json_encode(["code" => 10413, 'info' => "服务器的上传限制为：$postMax,你已超过最大上传限制：$content_len"]));
}

//CSRF 白名单
$white_list = ['login', 'tags_all', 'calendar_post_num', 'get_post', 'login_status'];
// CSRF 验证
$isLoginApi = ifs($_POST['api'] ?? '', $white_list, false);
$isTokenValid = isset($_SESSION['csrf_token'], $_POST['token']) && hash_equals($_SESSION['csrf_token'], $_POST['token']);
if (!$isLoginApi && !$isTokenValid) {
    die(json_encode(["code" => 10403, "info" => "未经授权"]));

}

$status = false;
$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (isset($cookie, $session) && $cookie === $session) {
    $status = true;
}

$api = filter_pass($_POST['api']);
$dir = _DIR_() . 'kernel/api/';

include "$dir/$api.php";