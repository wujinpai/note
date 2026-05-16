<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}


$tag = filter_var($_POST['tag'], ) ?? null;

if ($tag === null && mb_strlen($tag) > 10) {
    die(json_encode(["code" => 10223, "info" => "不允许的参数"]));
}

$result = DataBase::getInstance()->fetchAll("SELECT * FROM tags WHERE T_name LIKE CONCAT(?,'%')", [$tag]);
$name = '';
foreach ($result as $value) {
    $name = $value['T_name'];
}

$data = [];
if (count($result) == 1) {
    if ($name == $tag) {
        $data[0] = 2;
    } else {
        $data[0] = 1;
        $data[1] = $name;
    }
} else {
    $data[0] = 0;
}

$result1 = DataBase::getInstance()->fetch("SELECT * FROM tags WHERE T_name = ?", [$tag]);
if ($result1) {
    if ($result1['T_name'] == $tag) {
        $data[2] = 2;
    }
} else {
    $data[2] = 0;
}

echo json_encode(["code;" => 10200, "info" => $data]);