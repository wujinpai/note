<?php
$new_password = "mufengqiang1994"; // 改成你自己的密码
$pass_salt = "rl9gURanTEXZWlVTzTAbxr6LyV0d+CckP/Gn3RAAEBM=";
$salt_bytes = base64_decode($pass_salt);
$combined = $new_password . $salt_bytes;
$new_hash = hash('sha256', $combined);
echo "新密码哈希: " . $new_hash;
?>