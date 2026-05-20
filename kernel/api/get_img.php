<?php
// 目标图片URL
$url = $_POST['url'];

if (str_starts_with($url, 'http')) {
    $url = preg_replace('/^https?:\/\/[^\/]+\//i', '', $url);
    $url = _DIR_() . $url;
} else {
    $url = _DIR_() . $url;
}

// 获取图片内容
$imageData = file_get_contents($url);

if ($imageData === false) {
    header('HTTP/1.1 404 Not Found');
    exit;
}

// 获取图片信息
$imageInfo = getimagesizefromstring($imageData);
if (!$imageInfo) {
    header('HTTP/1.1 400 Bad Request');
    exit;
}

// 设置正确的Content-Type
header('Content-Type: ' . $imageInfo['mime']);

// 输出图片内容
echo $imageData;