<?php
$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

$data = $_FILES['files'];

for ($i = 0; $i < count($data['name']); $i++) {
    $name = $data['name'][$i];
    $file = $data['tmp_name'][$i];

    if (strpos($name, 'ini') !== false) {
        echo 'env';
        $o = _DIR_() . 'kernel/config/.env';
        $b = _DIR_() . 'kernel/config/env.backup';
        copy($o, $b);
        if (!copy($file, $o)) {
            echo json_encode([
                "code" => 10203,
                "info" => 'config copy error'
            ]);
            return;
        }
    } elseif (strpos($name, 'sql') !== false) {
        //创建数据库备份
        try {
            DatabaseExporterImporter::exportDatabase(_DIR_() . 'kernel/config/content_backup.sql', true, true);
        } catch (Exception $e) {
            // echo json_encode([
            //     "code" => 10203,
            //     "info" => $e->getMessage()
            // ], JSON_UNESCAPED_UNICODE);
        }

        try {
            DatabaseExporterImporter::importDatabase($file);
        } catch (Exception $e) {
            echo json_encode([
                "code" => 10203,
                "info" => 'sql copy error'
            ]);
            return;
        }
    }
}

echo json_encode([
    "code" => 10200,
    "info" => "success"
]);