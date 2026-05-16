<?php
$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    $is_login = false;
} else {
    $is_login = true;
}

$query = "SELECT * FROM calendar WHERE 1 = 1";
$input = (int) ($_POST['date'] ?? 0);
$mode = $_POST['mode'] ?? '';
if (is_int($input) && $input !== 0) {
    $query .= " AND D_date LIKE $input";
}

if ($input == null && strlen($input) > 10) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

$view_date = time() - ($_ENV['VIEW_RANGE'] + 30) * 86400;
$Ym_date = date('Ym', $view_date);
$d_date = date('d', $view_date);
$blocked = $_ENV['VIEW_RANGE'] !== '0' && !$is_login;
$calendar_data = DataBase::getInstance()->query($query);
$arr = [];
if ($mode == 'D') {
    foreach ($calendar_data as $value) {
        if (!($value['D_date'] > $Ym_date) && $blocked) {
            continue;
        }
        array_push($arr, $value['D_count']);
    }
} else {
    $array = [];
    foreach ($calendar_data as $value) {
        if (!($value['D_date'] > $Ym_date) && $blocked) {
            //判断日期
            continue;
        }

        $year = substr($value['D_date'], 0, 4);
        $month = substr($value['D_date'], 4, 2);

        if (!isset($array[$year])) {
            $array[$year] = [];
        }

        array_push($array[$year], $month);
    }
    $arr = $array;
}
echo json_encode($arr, JSON_UNESCAPED_UNICODE);