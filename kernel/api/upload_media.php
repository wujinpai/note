<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

require_once __DIR__ . '/cnb_upload.php';

$file = $_FILES['file'];
$type = $file['type'];

if (!isVideoOrImage($type)) {
    die(json_encode(["code" => 10400, "info" => "不支持的格式"]));
}

$tmpFile = $file['tmp_name'];
$fileSize = $file['size'];
$sourceName = $file['name'];
$fileExt = strtolower(pathinfo($sourceName, PATHINFO_EXTENSION));
$uploadType = 'imgs';

$videoExts = array('mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v', '3gp', 'ts');
if (in_array($fileExt, $videoExts)) {
    $uploadType = 'files';
}

$newName = date('YmdHis') . mt_rand(1000, 9999) . '.' . $fileExt;

if ($fileSize > 64 * 1024 * 1024) {
    die(json_encode(["code" => 10400, "info" => "文件大小超过CNB平台限制(64MiB)"]));
}

$cnbResult = cnb_upload($tmpFile, $newName, $uploadType);

$info = '';
if ($cnbResult['success']) {
    try {
        $options = [
            "resolution" => true,
            "size" => true,
            "bit_depth" => false,
            "exif" => false
        ];
        if (strpos($type, 'video') === false && file_exists($tmpFile)) {
            $info = getImageInfo($tmpFile, $options);
        }
    } catch (Exception $e) {
        $info = '';
    }
}

if (isset($tmpFile) && file_exists($tmpFile)) {
    @unlink($tmpFile);
}

if (!$cnbResult['success']) {
    die(json_encode(["code" => 10500, "info" => "上传到CNB失败: " . $cnbResult['message']]));
}

$imageUrl = $cnbResult['url'];

echo json_encode([
    "code" => 10200,
    "info" => "success",
    "url" => $imageUrl,
    "name" => pathinfo($newName, PATHINFO_FILENAME),
    "ext" => $fileExt,
    "zip" => "cnb",
    "zip_size" => formatBytes($fileSize),
    "sourceName" => $sourceName,
    "imageInfo" => $info
], JSON_UNESCAPED_UNICODE);

function isVideoOrImage($type) {
    $supportedMimeTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif',
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
    ];
    return in_array($type, $supportedMimeTypes);
}
