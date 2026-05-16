<?php
$mode = $_POST['sort'];
$arr = [];
$ng = false;

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    $hidden = 'WHERE T_hidden = 0';
    $ng = true;
} else {
    $hidden = "WHERE 1=1";
}

$sort = '';

switch ($mode) {
    case 1:
        $sort = ' ORDER BY T_name DESC';
        break;
    case 2:
        $sort = ' ORDER BY T_count ASC';
        break;
    case 3:
        $sort = ' ORDER BY T_count DESC';
        break;
    case 4:
        $sort = ' ORDER BY T_hidden DESC';
        break;
    case 0:
    default:
        $sort = ' ORDER BY T_name ASC';
        break;
}
$tagArayy = DataBase::getInstance()->query("SELECT * FROM tags $hidden $sort");
foreach ($tagArayy as $value) {
    if ($value['T_count_visit'] == 0 && $ng) {
        continue;
    }
    array_push($arr, ['id' => $value['id'],
        'tag' => $value['T_name'],
        'count' => $ng ? $value['T_count_visit'] : $value['T_count'],
        'hidden' => $value['T_hidden']
    ]);
}

if (!$ng) {
    $enc_pic = DataBase::getInstance()->fetch("SELECT COUNT(C_media) FROM content WHERE C_media LIKE ?", ['%Enc_%']);
    $count = $enc_pic['COUNT(C_media)'];
    if ($count) {
        array_push($arr, ['id' => -999,
            'tag' => '加密图片',
            'count' => $count,
            'hidden' => 0
        ]);
    }
}

print_r(json_encode($arr, JSON_UNESCAPED_UNICODE));