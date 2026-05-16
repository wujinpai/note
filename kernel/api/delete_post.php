<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;

$id = $_POST['id'];

$post = DataBase::getInstance()->fetch("SELECT C_tag, C_date,C_media,C_hidden FROM content WHERE id = ?", [$id]);
$delete = DataBase::getInstance()->delete("DELETE FROM content WHERE id = ?", [$id]);
$media = json_decode($post['C_media'], true);
if (count($media) !== 0) {
    $dir = _DIR_() . 'uploads/' . $media['dir'];
    try {
        clearDirectory($dir);
        rmdir($dir);
    } catch (Exception $e) {
    }
}

if ($delete !== false) {
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


if ($__ses == 'Resume') {
    return;
}

$list = $_ENV['SITE_MAP'];
$arr = explode(',', $list);
if (ifs($post['C_tag'], $arr, false)) {
    updateSiteMap();
}

$hid = $post['C_hidden'] == 1 ? 0 : -1;
updateTag($post['C_tag'], -1, $hid);
updateCalendar($post['C_date'], -1);