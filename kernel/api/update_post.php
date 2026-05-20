<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;

$Data = json_decode($_POST['data'], true);

$id = $Data['id'];
$top = $Data['top'];
$hidden = $Data['hidden'];
$title = $Data['title'];
$tag = $Data['tag'];
if ($tag == '') {
    $tag = '默认';
}
$content = $Data['content'];
$_media = $Data['media'];
$media = json_decode('{}');
$_weather = $Data['weather'];
$weather = [];
$_location = $Data['location'];
$location = [];
$date = $Data['date'];
$archive = $Data['archive'];

$origin = DataBase::getInstance()->fetch("SELECT * FROM content WHERE id= $id");
$O_media = json_decode('{}');
$O_weather = json_decode($origin['C_weather'], true);
$O_location = json_decode($origin['C_location'], true);
$O_tag = $origin['C_tag'];
$O_date = $origin['C_date'];
if ($origin !== false) {
    $O_media = json_decode($origin['C_media'], true);
}

if (count($_media) !== 0) {
    $mediaItem = [];
    foreach ($_media as $item) {
        $url = $item[0] ?? '';
        $sourceName = $item[1] ?? '';
        $alt = $item[2] ?? '';
        array_push($mediaItem, ['url' => $url, 'name' => $sourceName, 'alt' => $alt]);
    }
    $media = new stdClass();
    $media->media = $mediaItem;
} else {
    $media = json_decode('{}');
}

if ($_weather !== $O_weather['icon']) {
    if (is_array($_weather)) {
        $weather = ['name' => $_weather['name'], 'icon' => $_weather['icon'], 'temp' => $_weather['temp'], 'humidity' => $_weather['humidity']];
    } else {
        $weather = ['name' => 'null', 'icon' => $_weather, 'temp' => 0, 'humidity' => 0];
    }
}

if (is_array($_location)) {
    $location = ['province' => $_location['province'], 'city' => $_location['city'], 'district' => $_location['district'], 'latitude' => '', 'longitude' => ''];
} else {
    $location = ['province' => '', 'city' => '', 'district' => '', 'latitude' => '', 'longitude' => ''];
}

if ($tag !== $O_tag) {
    $hidA = $hidden == 1 ? 0 : 1;
    updateTag($tag, 1, $hidA);
    $hidO = $hidden == 1 ? -1 : 0;
    updateTag($O_tag, -1, $hidO);
} else {
    if ($hidden !== $origin['C_hidden']) {
        $change = $hidden == 1 ? -1 : 1;
        updateTag($tag, 0, $change);
    }
}

if ($date !== $O_date) {
    updateCalendar($date, 1);
    updateCalendar($O_date, -1);
}

$pdoParams = [$date, $tag, $title, $content, $top, $hidden, json_encode($weather), json_encode($location), json_encode($media), $archive, $id];
$post = DataBase::getInstance()->update("UPDATE content SET C_date = ?, C_tag = ?, C_title = ?, C_content = ?, C_pin = ?, C_hidden = ?, C_weather = ?, C_location = ?, C_media = ?, C_archive = ? WHERE id = ?", $pdoParams);

if ($post !== false) {
    echo json_encode([
        "code" => 10200,
        "info" => "success"
    ]);
} else {
    echo json_encode([
        "code" => 10203,
        "info" => "failure"
    ]);
}

$list = $_ENV['SITE_MAP'];
$arr = explode(',', $list);
if (ifs($tag, $arr, false)) {
    updateSiteMap();
}
