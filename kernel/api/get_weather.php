<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

$api_URL = $_ENV['WEATHER_API_URL'];

$location = json_decode($_POST['location'], true);

$lat = $location[0];
$lon = $location[1];
if (!(gettype($lat) === 'double' && gettype($lon) === 'double')) {
    echo json_encode(["code" => '00000', "info" => "非法经纬度" . gettype($lat) . gettype($lon)]);
    return;
}

if ($_ENV['WEATHER_API_KEY'] == '' || $_ENV['API_KEY'] == '') {
    echo json_encode(["code" => '00000', "info" => "配置有误"]);
    return;
}
$Key = aes256Decrypt($_ENV['WEATHER_API_KEY'], $_ENV['API_KEY']);
$keyarr = ['{lat}' => $lat, '{lon}' => $lon, '{lang}' => 'zh_CN', '{key}' => $Key, '{units}' => 'metric'];
$api_URL = str_replace(array_keys($keyarr), array_values($keyarr), $api_URL);

$curl = curl_init();

curl_setopt($curl, CURLOPT_URL, $api_URL);          // 请求的 URL
curl_setopt($curl, CURLOPT_TIMEOUT, 12);       // 总执行超时
curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 6); // 连接超时
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);  // 返回结果而不是直接输出
curl_setopt($curl, CURLOPT_HEADER, false);         // 不包含响应头
curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false); // 跳过 SSL 验证（仅测试环境）
$response = curl_exec($curl);

if (curl_errno($curl)) {
    echo json_encode(["code" => 10804, "info" => "curl error"]);
    die("cURL 错误: " . curl_error($curl));
}

curl_close($curl);

$data = json_decode($response, true); // true 表示返回关联数组
if (json_last_error() !== JSON_ERROR_NONE) {
    die("JSON 解析错误: " . json_last_error_msg());
}

echo json_encode(get_response_path($data), JSON_PRETTY_PRINT);


function get_response_path(array $data) {
    $path = $_ENV['WEATHER_API_PATH'];
    $paths = explode(',', $path);
    $result = [];
    $current = $data;
    for ($i = 0; $i < count($paths); $i++) {
        $keys = explode('=', $paths[$i]);
        $temp = [];
        $values = explode('>', $keys[1]);
        foreach ($values as $value) {
            if (!isset($current[$value])) {
                return ["code" => '00002', "info" => "错误的key: $value"];
            }
            $current = $current[$value];
            if (gettype($current) !== 'array') {
                $temp = [$keys[0], $current];
                $current = $data;
            }
        }
        $result[$temp[0]] = $temp[1];
    }
    $result['code'] = 10200;
    $result['info'] = 'success';
    return $result;
}