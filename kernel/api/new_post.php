<?php
$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;

$Data = json_decode($_POST['data'], true);

$top = $Data['top'];
$hidden = $Data['hidden'];
$title = $Data['title'];
$tag = $Data['tag'];
if ($tag == '') {
    $tag = $_ENV['DEFAULT_TAG'];
}
$content = $Data['content'];
$_media = $Data['media'];
$media = [];
$_weather = $Data['weather'];
$weather = [];
$_location = $Data['location'];
$location = [];
$date = $Data['date'];
$archive = 0;

$uniqid = str_replace('.', '', uniqid('eld', true));

// 目录创建
if (count($_media) !== 0) {

    $targetDir = _DIR_() . "uploads/$uniqid/";
    if (!file_exists($targetDir)) {
        if (!mkdir($targetDir, 0755, true)) {
            die(json_encode(["code" => 10453, "info" => "目录创建失败: $targetDir"]));
        }
    }
    $mediaItem = [];
    foreach ($_media as $item) {
        $name = $item[1];
        $ext = $item[2];
        $alt = $item[3];

        if (!rename(_DIR_() . "uploads/temp/$name.$ext", "{$targetDir}$name.$ext")) {
            die(json_encode(["code" => 10451, "info" => "$name move err"]));
        }
        if (count($item) == 5) {
            compressImageWithGD($item[4], "{$targetDir}thum-{$name}.webp", 50);
        } else {
            if (file_exists(_DIR_() . "uploads/temp/thum-$name.png")) {
                rename(_DIR_() . "uploads/temp/thum-$name.png", "{$targetDir}thum-$name.png");
            } else {
                if (!rename(_DIR_() . "uploads/temp/thum-$name.webp", "{$targetDir}thum-$name.webp")) {
                    die(json_encode(["code" => 10451, "info" => "$name move err"]));
                }
            }
        }
        array_push($mediaItem, [$name, $ext, $alt]);
    }
    $media['dir'] = $uniqid;
    $media['media'] = $mediaItem;
    //清空temp目录
    $directory = _DIR_() . "uploads/temp/";
    if (!clearDirectory($directory)) {
        die(json_encode(["code" => 10451, "info" => "清空temp目录失败"]));
    }
} else {
    $media = json_decode('{}');
}

if (is_array($_weather)) {
    $weather = ['name' => $_weather['description'], 'icon' => $_weather['icon'], 'temp' => $_weather['temp'], 'humidity' => $_weather['humidity']];
} else {
    $weather = ['name' => 'null', 'icon' => $_weather, 'temp' => 0, 'humidity' => 0];
}

if ($_location == '') {
    $location = ['province' => '', 'city' => '', 'district' => '', 'latitude' => '', 'longitude' => ''];
} elseif ($_location['code'] == 10200 || $_location['code'] == 200) {
    $location = ['province' => $_location['province'], 'city' => $_location['city'], 'district' => $_location['district'], 'latitude' => $_location['latitude'], 'longitude' => $_location['longitude']];
} else {
    $default = explode(',', $_ENV['DEFAULT_LOCATION']);
    $location = ['province' => $default[0], 'city' => $default[1], 'district' => $default[2], 'latitude' => '', 'longitude' => ''];
}

$date = DateTime::createFromFormat('Y-m-d H:i', $date) ? $date : '1980-12-01 16:31';

if (isDateInFuture($date)) {
    $archive = 1;
    $_delay_tag = $tag;
    $_delay_date = $date;
    $tag = '';
    $date = '';
}

$pdoParams = [$date, $tag, $title, $content, $top, $hidden, json_encode($weather), json_encode($location), json_encode($media), $archive];
$post = DataBase::getInstance()->insert("INSERT INTO content (C_date, C_tag, C_title, C_content, C_pin, C_hidden, C_weather, C_location, C_media, C_archive) VALUE (?,?,?,?,?,?,?,?,?,?)", $pdoParams);

if ($post !== false) {
    echo json_encode([
        "code" => 10200,
        "info" => "success",
        "id" => $post,
        "dir" => $uniqid
    ]);
} else {
    echo json_encode([
        "code" => 10203,
        "info" => "failure"
    ]);
}

if ($__ses == 'Resume') {
    return;
}

$list = $_ENV['SITE_MAP'];
$arr = explode(',', $list);
if (ifs($tag, $arr, false)) {
    updateSiteMap();
}

if (isset($_delay_date) && isDateInFuture($_delay_date)) {
    $filePath = _DIR_() . 'kernel/config/delayPost.json';
    $value = [$_delay_date, $_delay_tag, $hidden];
    JsonEditor::set($filePath, $post, $value);
} else {
    updateCalendar($date, 1);
    $hid = $hidden == 1 ? 0 : 1;
    updateTag($tag, 1, $hid);
}