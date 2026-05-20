<?php
header('Content-Type: application/json; charset=utf-8');

$debug = [];
$has_env = file_exists($_SERVER['DOCUMENT_ROOT'] . '/kernel/config/.env');
$debug['env_exists'] = $has_env;

if (!$has_env) {
    echo json_encode([
        'code' => 10401,
        'info' => '.env 文件不存在，请先安装',
        'debug' => $debug
    ]);
    exit;
}

$envContent = file_get_contents($_SERVER['DOCUMENT_ROOT'] . '/kernel/config/.env');
$lines = explode("\n", $envContent);
$envData = [];
foreach ($lines as $line) {
    if (strpos($line, '=') !== false) {
        list($key, $value) = explode('=', $line, 2);
        $envData[trim($key)] = trim($value, "'\" ");
    }
}

$debug['PASS_HASH_empty'] = empty($envData['PASS_HASH']);
$debug['PASS_SALT_empty'] = empty($envData['PASS_SALT']);
$debug['PASS_HASH_length'] = strlen($envData['PASS_HASH'] ?? '');
$debug['PASS_SALT_length'] = strlen($envData['PASS_SALT'] ?? '');
$debug['SITE_URL'] = $envData['SITE_URL'] ?? '(not set)';
$debug['UID'] = $envData['UID'] ?? '(not set)';
$debug['current_host'] = $_SERVER['HTTP_HOST'];
$debug['current_host_no_www'] = str_replace('www.', '', $_SERVER['HTTP_HOST']);

$versionFile = $_SERVER['DOCUMENT_ROOT'] . '/kernel/config/version.conf';
if (file_exists($versionFile)) {
    $verContent = file_get_contents($versionFile);
    $verLines = explode("\n", $verContent);
    foreach ($verLines as $line) {
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            if (trim($key) === 'UID') {
                $debug['version_UID'] = trim($value, "'\" ");
            }
        }
    }
}

$debug['session_status'] = session_status();
$debug['cookie_auth_token'] = $_COOKIE['auth_token'] ?? '(not set)';
$debug['session_auth_token'] = $_SESSION['auth_token'] ?? '(not set)';
$debug['session_is_lg_ok'] = $_SESSION['is_lg_ok'] ?? '(not set)';
$debug['https'] = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] == 443);
$debug['request_method'] = $_SERVER['REQUEST_METHOD'];

if (isset($_POST['pass'])) {
    $input = $_POST['pass'];
    $debug['received_pass_length'] = strlen($input);
    $debug['received_pass_prefix'] = substr($input, 0, 20) . '...';

    if (!empty($envData['PASS_HASH']) && !empty($envData['PASS_SALT'])) {
        require_once $_SERVER['DOCUMENT_ROOT'] . '/kernel/functions.php';
        $verify = pass_verify($input, $envData['PASS_HASH'], $envData['PASS_SALT']);
        $debug['verify_result'] = $verify;

        $testHash = hash('sha256', $envData['PASS_SALT'] . $input . $envData['PASS_SALT']);
        $debug['test_hash_matches'] = hash_equals($envData['PASS_HASH'], $testHash);

        echo json_encode([
            'code' => $verify ? 10200 : 10203,
            'info' => $verify ? '验证成功' : '验证失败',
            'debug' => $debug
        ]);
    } else {
        echo json_encode([
            'code' => 10402,
            'info' => 'PASS_HASH 或 PASS_SALT 为空',
            'debug' => $debug
        ]);
    }
} else {
    echo json_encode([
        'code' => 10200,
        'info' => '调试信息',
        'debug' => $debug
    ]);
}
