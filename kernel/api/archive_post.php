<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

$id = $_POST['id'];

$delete = DataBase::getInstance()->update("UPDATE content SET C_archive =  CASE WHEN C_archive = 1 THEN 0 WHEN C_archive = 0 THEN 1 ELSE C_archive END WHERE id = ?", [$id]);
$sql=DataBase::getInstance()->fetch("SELECT C_archive FROM content WHERE id = ?",[$id]);
if ($delete !== false) {
    echo json_encode([
        "code" => 10200,
        "info" => "success",
        "mode" => $sql['C_archive']
    ]);
} else {
    echo json_encode([
        "code" => 10203,
        "info" => "failure"
    ]);
}