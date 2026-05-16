<?php
// 在API端点中使用
error_log("Login request received: " . print_r($_POST, true));
$apiKey = 'login'; // 可以是API端点或其他唯一标识
$limit = 5; // 10次请求
$windowMs = 1 * 60 * 1000; // 1分钟窗口
$freezeTimeMs = 5 * 60 * 1000; // 冻结5分钟
$input = isset($_POST['pass']) ? filter_pass($_POST['pass']) : null;
error_log("Input after filter: " . var_export($input, true));
$timeout = $_ENV['LOGIN_TIMEOUT'] ?? 3600; // 登录1小时超时

if ($input === null || strlen($input) < 4) {
    error_log("Invalid input");
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}


if ($input !== 'exit' && !$rateLimiter->checkLimit($apiKey, $limit, $windowMs, $freezeTimeMs, true, $apiKey)) {
    // 请求被限制
    echo json_encode([
        "code" => 10429,
        "info" => "登录限制，请在 $freezeTimeMs 分钟后重试-" . $rateLimiter->getLimitStatus($apiKey, true)['remaining_freeze_time'],
        "time" => _round($rateLimiter->getLimitStatus($apiKey, true)['remaining_freeze_time'] / 60000)
    ]);
    exit;
}


if (pass_verify($input, $_ENV['PASS_HASH'], $_ENV['PASS_SALT'])) {
    $token = bin2hex(random_bytes(16));
    $_SESSION['is_lg_ok'] = true;
    $_SESSION['time_out'] = (time() + $timeout) * 1000;
    $_SESSION['auth_token'] = $token;
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $csrf_token = $_SESSION['csrf_token'];
    onlyCookie('auth_token', $token, $timeout);
    $rateLimiter->resetLimit($apiKey, true);
    echo json_encode([
        "code" => 10200,
        "info" => "登录成功",
        "token" => $csrf_token,
        "data" => [
            [cachev("kernel/asset/js/settings.js"), cachev("kernel/asset/css/settings.css")],
            [$_ENV['PICTURE_ZIP'], $_ENV['PICTURE_ENCRYPTION'], $_ENV['DEFAULT_TAG'], $_ENV['CORS']]
        ]
    ]);
} else {
    $_SESSION['is_lg_ok'] = false;
    if (@$_SESSION['auth_token'] !== null) {
        onlyCookie('auth_token', $_SESSION['auth_token'], $timeout, true);
        unset($_SESSION['auth_token']);
    }
    echo json_encode([
        "code" => 10203,
        "info" => "登录失败"
    ]);
}

