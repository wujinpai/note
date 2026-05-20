<?php
header('Content-Type: application/json');

// 返回站点配置
echo json_encode([
    'code' => 10200,
    'info' => 'success',
    'data' => [
        'site_url' => $_ENV['SITE_URL'] ?? '',
        'domain' => $_ENV['SITE_URL'] ?? '',
        'uid' => $_ENV['UID'] ?? ''
    ]
]);
