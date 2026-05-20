<?php
$apiKey = 'login';
$limit = 5;
$windowMs = 1 * 60 * 1000;
$freezeTimeMs = 5 * 60 * 1000;
$input = isset($_POST['pass']) ? filter_pass($_POST['pass']) : null;
$timeout = $_ENV['LOGIN_TIMEOUT'] ?? 3600;

if ($input === null || strlen($input) < 4) {
    die(json_encode(["code" => 10401, "info" => "密码长度不足或为空"]));
}

if ($input !== 'exit' && !$rateLimiter->checkLimit($apiKey, $limit, $windowMs, $freezeTimeMs, true, $apiKey)) {
    echo json_encode([
        "code" => 10429,
        "info" => "登录频繁，请 " . _round($rateLimiter->getLimitStatus($apiKey, true)['remaining_freeze_time'] / 60000) . " 分钟后重试",
        "time" => _round($rateLimiter->getLimitStatus($apiKey, true)['remaining_freeze_time'] / 60000)
    ]);
    exit;
}

$passHash = $_ENV['PASS_HASH'] ?? '';
$passSalt = $_ENV['PASS_SALT'] ?? '';

if (empty($passHash) || empty($passSalt)) {
    error_log("LOGIN ERROR: PASS_HASH or PASS_SALT is empty in .env file");
    echo json_encode([
        "code" => 10402,
        "info" => "系统配置错误：密码哈希未正确初始化，请重新安装"
    ]);
    exit;
}

if (pass_verify($input, $passHash, $passSalt)) {
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
        "info" => "密码错误，请重试"
    ]);
}
