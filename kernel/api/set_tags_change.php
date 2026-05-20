<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    echo json_encode(["code" => 10903, "info" => "登录失败"]);
    return;
}


$tag = $_POST['tag'];
$mode = $_POST['mode'];
$value = $_POST['value']??'';
$database = DataBase::getInstance();
$que = $database->fetch("SELECT * FROM tags WHERE T_name = ?", [$tag]);
$info = '';

switch ($mode) {
    case 'rename':
        $has = $database->fetch("SELECT COUNT(*) > 0 AS result FROM tags WHERE T_name = ?", [$value]);
        if ($has['result']) {
            $rename = $database->fetch("SELECT * FROM tags WHERE T_name = ?", [$value]);
            $update = $database->update("UPDATE tags SET T_count = ?, T_count_visit = ? WHERE T_name = ?", [$rename['T_count'] + $que['T_count'], $rename['T_count_visit'] + $que['T_count_visit'], $value]);
            if (!$update) {
                die(json_encode(['code' => 10203, 'info' => 'update error']));
            }
            $remove = $database->delete("DELETE FROM tags WHERE T_name = ?", [$tag]);
            if (!$remove) {
                die(json_encode(['code' => 10203, 'info' => 'remove error']));
            }
        } else {
            $result = $database->update("UPDATE tags SET T_name= ? WHERE T_name = ?", [$value, $tag]);
            if (!$result) {
                die(json_encode(['code' => 10203, 'info' => 'change error']));
            }
        }
        $result = $database->update("UPDATE content SET C_tag= ? WHERE C_tag = ?", [$value, $tag]);
        if (!$result) {
            die(json_encode(['code' => 10203, 'info' => 'change error']));
        }
        break;
    case 'hidden':
        $hidden = $que['T_hidden'] == 1 ? 0 : 1;
        $info = $hidden;
        $result = $database->update("UPDATE tags SET T_hidden = ? WHERE T_name = ?", [$hidden, $tag]);
        if (!$result) {
            die(json_encode(['code' => 10203, 'info' => 'hidden error']));
        }
        break;
    case 'delete':
        $result = $database->delete("DELETE FROM content WHERE C_tag = ?", [$tag]);
        $result2 = $database->delete("DELETE FROM tags WHERE T_name = ?", [$tag]);
        if (!$result || !$result2) {
            die(json_encode(['code' => 10203, 'info' => 'delete error']));
        }
        break;
}

echo json_encode(["code" => 10200, 'info' => $info]);
