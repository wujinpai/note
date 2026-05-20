<?php
$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

$data = json_decode($_POST['data']);

// 检查目录是否存在，不存在则创建
$targetDir = _DIR_() . 'uploads/temp';
if (!file_exists($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        die(json_encode(["code" => 10453, "info" => "目录创建失败: $targetDir"]));
    }
}

if ($data[0] == 1) {
    $origin = _DIR_() . 'kernel/config/.env';
    $newconf = _DIR_() . 'uploads/temp/config.ini';
    if (!copy($origin, $newconf)) {
        echo json_encode([
            "code" => 10203,
            "info" => 'copy error'
        ]);
    }
}
if ($data[1] == 1) {
    try {
        DatabaseExporterImporter::exportDatabase(_DIR_() . 'uploads/temp/content_backup.sql', true, true);
    } catch (Exception $e) {
        echo json_encode([
            "code" => 10203,
            "info" => $e->getMessage()
        ]);
    }
}

echo json_encode([
    "code" => 10200,
    "info" => "success"
]);