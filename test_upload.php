<?php
include "kernel/functions.php";

header('Content-Type: application/json');

// 权限检查
$avatar = _DIR_() . "kernel/asset/img/avatar.webp";
$background = _DIR_() . "kernel/asset/img/background.webp";

$response = [
    'debug' => [
        'avatar_path' => $avatar,
        'background_path' => $background,
        'avatar_writable' => is_writable(dirname($avatar)),
        'background_writable' => is_writable(dirname($background)),
        'avatar_exists' => file_exists($avatar),
        'background_exists' => file_exists($background),
        'avatar_perms' => substr(sprintf('%o', fileperms($avatar)), -4),
        'background_perms' => substr(sprintf('%o', fileperms($background)), -4),
    ]
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $mode = $_POST['mode'] ?? 'avatar';
    $data = $_POST['data'] ?? '';
    
    $response['post'] = [
        'mode' => $mode,
        'data_length' => strlen($data),
        'data_preview' => substr($data, 0, 100)
    ];
    
    $targetPath = ($mode === 'avatar') ? $avatar : $background;
    
    try {
        compressImageWithGD($data, $targetPath, 70);
        $response['success'] = true;
        $response['message'] = 'Image compressed successfully';
    } catch (Exception $e) {
        $response['success'] = false;
        $response['error'] = $e->getMessage();
    }
}

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
