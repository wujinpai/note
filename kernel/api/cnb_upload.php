<?php

function cnb_upload($filePath, $fileName, $type = 'imgs')
{
    $slug = $_ENV['CNB_SLUG'] ?? '';
    $token = $_ENV['CNB_TOKEN'] ?? '';

    if (empty($slug) || empty($token)) {
        return array(
            'success' => false,
            'message' => 'CNB配置不完整,请设置CNB_SLUG和CNB_TOKEN',
        );
    }

    if (!file_exists($filePath)) {
        return array(
            'success' => false,
            'message' => '文件不存在: ' . $filePath,
        );
    }

    $fileSize = filesize($filePath);
    $metaUrl = 'https://api.cnb.cool/' . $slug . '/-/upload/' . $type;
    $metaBody = json_encode(array('name' => $fileName, 'size' => $fileSize));

    $ch = curl_init($metaUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $metaBody);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ));

    $metaResp = curl_exec($ch);
    $metaHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return array('success' => false, 'message' => '请求上传元数据失败: ' . $curlError);
    }

    if ($metaHttpCode !== 200) {
        return array('success' => false, 'message' => '获取上传元数据失败: HTTP ' . $metaHttpCode . ' - ' . $metaResp);
    }

    $metaData = json_decode($metaResp, true);
    if (!$metaData || empty($metaData['upload_url'])) {
        return array('success' => false, 'message' => '上传元数据解析失败: ' . $metaResp);
    }

    $uploadUrl = $metaData['upload_url'];
    $assets = isset($metaData['assets']) ? $metaData['assets'] : array();
    $assetPath = isset($assets['path']) ? $assets['path'] : '';

    $fileData = file_get_contents($filePath);

    $ch = curl_init($uploadUrl);
    curl_setopt($ch, CURLOPT_PUT, true);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 300);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/octet-stream',
    ));

    $tmpFile = tmpfile();
    fwrite($tmpFile, $fileData);
    fseek($tmpFile, 0);
    curl_setopt($ch, CURLOPT_INFILE, $tmpFile);
    curl_setopt($ch, CURLOPT_INFILESIZE, strlen($fileData));

    $uploadResp = curl_exec($ch);
    $uploadHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $uploadError = curl_error($ch);
    curl_close($ch);
    fclose($tmpFile);

    if ($uploadError) {
        return array('success' => false, 'message' => '上传文件到存储失败: ' . $uploadError);
    }

    if ($uploadHttpCode < 200 || $uploadHttpCode >= 300) {
        return array('success' => false, 'message' => '上传文件到存储失败: HTTP ' . $uploadHttpCode . ' - ' . $uploadResp);
    }

    $imgPath = cnb_extract_path($assetPath);
    $proxyUrl = cnb_build_url($imgPath, $type);

    return array(
        'success' => true,
        'url' => $proxyUrl,
        'assets' => $assets,
        'path' => $assetPath,
        'imgPath' => $imgPath,
    );
}

function cnb_extract_path($rawPath)
{
    $path = explode('?', $rawPath);
    $path = explode('#', $path[0]);
    $path = $path[0];
    if (preg_match('/-\/(?:imgs|files)\/(.+)/', $path, $match)) {
        return $match[1];
    }
    return $path;
}

function cnb_build_url($imgPath, $type = 'imgs')
{
    $proxyDomain = !empty($_ENV['CNB_PROXY_DOMAIN']) ? rtrim($_ENV['CNB_PROXY_DOMAIN'], '/') : 'https://cnb.cool';
    if (!empty($_ENV['CNB_PROXY_DOMAIN'])) {
        return $proxyDomain . '/img-api/' . $imgPath;
    }
    $slug = $_ENV['CNB_SLUG'] ?? '';
    return $proxyDomain . '/' . $slug . '/-/' . $type . '/' . $imgPath;
}
