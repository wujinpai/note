<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    echo json_encode(["code" => 10903, "info" => "登录失败"]);
    return;
}

if (@$_POST['token'] == null) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

if ($_ENV['DEFAULT_LOCATION'] == '') {
    die(json_encode(["code" => 10001, "info" => "隐藏不显示"]));
}

if ($_ENV['LOCATION_API_KEY'] == '') {
    $location = explode(',', $_ENV['DEFAULT_LOCATION']);
    if (count($location) < 3) {
        $template = '{"city": "市","district": "区","latitude": "","province": "省","longitude": ""}';
    } else {
        $template = '{"city": "{c}","district": "{d}","latitude": "","province": "{p}","longitude": ""}';
    }
    $replacements = [
        "{p}" => $location[0],
        "{c}" => $location[1],
        "{d}" => $location[2]
    ];
    $result = strtr($template, $replacements);
    $result = json_decode($result, true);
    $result['code'] = 10200;
    $result['info'] = 'success';
    $result['mode'] = (int) $_ENV['LOCATION_SHOW_MODE'];
    echo json_encode($result);
    return;
}

$api_URL = $_ENV['LOCATION_API_URL'];


$ip = $rateLimiter->getClientIp();

if (ifs($ip, ['::1', 'localhost', '127.0.0.1'], false)) {
    echo json_encode(["code" => '00001', "info" => "本地IP", "mode" => $_ENV['LOCATION_SHOW_MODE']]);
    return;
}
if ($_ENV['LOCATION_API_KEY'] == '' || $_ENV['API_KEY'] == '') {
    echo json_encode(["code" => '00000', "info" => "配置有误", "mode" => $_ENV['LOCATION_SHOW_MODE']]);
    return;
}
$Key = aes256Decrypt($_ENV['LOCATION_API_KEY'], $_ENV['API_KEY']);
$keyarr = ['{ip}' => $ip, '{key}' => $Key];
$api_URL = str_replace(array_keys($keyarr), array_values($keyarr), $api_URL);

$curl = curl_init();

curl_setopt($curl, CURLOPT_URL, $api_URL);          // 请求的 URL
curl_setopt($curl, CURLOPT_TIMEOUT, 10);       // 总执行超时
curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 5); // 连接超时
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);  // 返回结果而不是直接输出
curl_setopt($curl, CURLOPT_HEADER, false);         // 不包含响应头
curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false); // 跳过 SSL 验证（仅测试环境）
$response = curl_exec($curl);
if (curl_errno($curl)) {
    echo json_encode(["code" => 10804]);
    die("cURL 错误: " . curl_error($curl));
}
curl_close($curl);

$data = json_decode($response, true); // true 表示返回关联数组
if (json_last_error() !== JSON_ERROR_NONE) {
    die("JSON 解析错误: " . json_last_error_msg());
}



echo json_encode(get_response_path($data), JSON_PRETTY_PRINT);


function get_response_path(array $data) {
    $path = $_ENV['LOCATION_API_PATH'];
    $paths = explode(',', $path);
    $result = [];
    $current = $data;
    for ($i = 0; $i < count($paths); $i++) {
        $keys = explode('=', $paths[$i]);

        $temp = [];

        $values = explode('>', $keys[1]);
        foreach ($values as $value) {
            if (!isset($current[$value])) {
                return ["code" => '00002', "info" => "错误的key:$value", "mode" => $_ENV['LOCATION_SHOW_MODE']];
            }
            $current = $current[$value];
            if (gettype($current) !== 'array') {
                if ($current == '') {
                    $temp = [$keys[0], "未知"];
                } else {
                    $temp = [$keys[0], $current];
                }
                $current = $data;
            }
        }
        $result[$temp[0]] = $temp[1];
    }
    $result['code'] = 10200;
    $result['info'] = 'success';
    $result['mode'] = (int) $_ENV['LOCATION_SHOW_MODE'];
    return $result;
}