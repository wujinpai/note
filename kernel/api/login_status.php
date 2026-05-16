<?php
$status = false;
$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
$timeout = $_SESSION['time_out'] ?? 0;
if (isset($cookie, $session) && $cookie === $session) {
    $status = true;
}
echo $status ? json_encode(["code" => 10200, "info" => "登录成功", "timeout" => $timeout]) : json_encode(["code" => 10203, "info" => "登录失败", "timeout" => $timeout]);
