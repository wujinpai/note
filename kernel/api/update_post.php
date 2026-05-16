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
$O_dir = '';

$origin = DataBase::getInstance()->fetch("SELECT * FROM content WHERE id= $id");
$O_media = json_decode('{}');
$O_weather = json_decode($origin['C_weather'], true);
$O_location = json_decode($origin['C_location'], true);
$O_tag = $origin['C_tag'];
$O_date = $origin['C_date'];
if ($origin !== false) {
    $O_media = json_decode($origin['C_media'], true);
}



//如果没有变更媒体，跳过判断

if (count($O_media) !== 0) {
    $uniqid = $O_media['dir'];
    $O_dir = $O_media['dir'];
    $targetDir = _DIR_() . "uploads/$uniqid/";
    if (!file_exists($targetDir)) {
        if (!mkdir($targetDir, 0755, true)) {
            die(json_encode(["code" => 10453, "info" => "目录创建失败: $targetDir"]));
        }
    }
    //如果原内容有媒体
    $mediaItem = [];

    //区分旧媒体和新媒体
    foreach ($_media as $item) {
        $dir = $item[0];
        $name = $item[1];
        $ext = $item[2];
        $alt = $item[3];

        //新图片处理
        if (strpos($dir, 'temp')) {
            if (!rename(_DIR_() . "uploads/temp/$name.$ext", "{$targetDir}$name.$ext")) {
                die(json_encode(["code" => 10451, "info" => "$name move err"], JSON_UNESCAPED_UNICODE));
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
        }
        array_push($mediaItem, [$name, $ext, $alt]);
    }

    //循环服务器图片看有没有断开的链接，进行删除操作。
    foreach ($O_media['media'] as $o_meida) {
        $O_name = $o_meida[0];
        $O_ext = $o_meida[1];
        $isuse = false;
        foreach ($mediaItem as $n_meida) {
            $N_name = $n_meida[0];
            $N_ext = $n_meida[1];

            if ($O_name == $N_name) {
                $isuse = true;
            }
        }
        if (!$isuse) {
            //删除缩略图
            $thum = _DIR_() . "uploads/" . $O_media['dir'] . "/thum-$O_name";
            if (file_exists("$thum.png")) {
                if (!unlink("$thum.png")) {
                    echo json_encode(['code' => 10911, 'info' => "缩略图删除失败"]);
                }
            } else {
                if (!unlink("$thum.webp")) {
                    echo json_encode(['code' => 10911, 'info' => "缩略图删除失败"]);
                }
            }
            //删除原图
            $pic = _DIR_() . "uploads/" . $O_media['dir'] . "/$O_name.$O_ext";
            if (!unlink($pic)) {
                echo json_encode(['code' => 10911, 'info' => "原图图删除失败"]);
            }
        }
    }

    $media->dir = $O_media['dir'];
    $media->media = $mediaItem;
    //判断空文件移除目录$media清空。
    if (count($_media) == 0) {
        //上传 无 图片
        $media = json_decode('{}');
        //delete dir
        $dirPath = _DIR_() . "uploads/" . $O_media['dir'];
        if (is_dir($dirPath)) {
            if (!rmdir($dirPath)) {
                echo json_encode(["code" => 10911, "info" => "目录删除失败"]);
            }
        }
    }
    $directory = _DIR_() . "uploads/temp/";
    if (!clearDirectory($directory)) {
        if (is_dir($dir)) {
            if (!clearDirectory($directory)) {
                echo json_encode(["code" => 10451, "info" => "清空temp目录失败"], JSON_UNESCAPED_UNICODE);
            }
        }
    }
} else {
    //如果原内容没有媒体则添加目录
    if (count($_media) !== 0) {
        $uniqid = str_replace('.', '', uniqid('eld', true));
        $O_dir = $uniqid;
        $targetDir = _DIR_() . "uploads/$uniqid/";
        if (!file_exists($targetDir)) {
            if (!mkdir($targetDir, 0755, true)) {
                echo json_encode(["code" => 10453, "info" => "目录创建失败: $targetDir"]);
            }
        }
        $mediaItem = [];
        foreach ($_media as $item) {
            $name = $item[1];
            $ext = $item[2];
            $alt = $item[3];

            if (!rename(_DIR_() . "uploads/temp/$name.$ext", "{$targetDir}$name.$ext")) {
                echo json_encode(["code" => 10451, "info" => "$name move err"], JSON_UNESCAPED_UNICODE);
            }
            if (count($item) == 5) {
                compressImageWithGD($item[4], "{$targetDir}thum-{$name}.webp", 50);
            } else {
                //临时媒体移动新目录
                $thum = _DIR_() . "uploads/temp/thum-$name";
                if (file_exists("$thum.png")) {
                    if (!rename("$thum.png", "{$targetDir}thum-$name.png")) {
                        echo json_encode(["code" => 10451, "info" => "$name move err"], JSON_UNESCAPED_UNICODE);
                    }
                } else {
                    if (!rename("$thum.webp", "{$targetDir}thum-$name.webp")) {
                        echo json_encode(["code" => 10451, "info" => "$name move err"], JSON_UNESCAPED_UNICODE);
                    }
                }
            }
            array_push($mediaItem, [$name, $ext, $alt]);
        }
        $media->dir = $uniqid;
        $media->media = $mediaItem;
        $directory = _DIR_() . "uploads/temp/";
        if (is_dir($dir)) {
            if (!clearDirectory($directory)) {
                echo json_encode(["code" => 10451, "info" => "清空temp目录失败"], JSON_UNESCAPED_UNICODE);
            }
        }
    }
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
        "info" => "success",
        "dir" => $O_dir
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

/**缩略图创建*/
function compressImage($old, $new, $quality, $size = null) {
    $isGIF = false;
    if ($_ENV['IMAGICK_PIC'] == true) {
        try {
            $isGIF = compressImageWithImagick($old, $new, $quality, $size);
            $mode = 'i';
        } catch (Exception $e) {
            die(json_encode(["code" => 0000, "info" => "Imagick:缩略图创建失败=>$e"], JSON_UNESCAPED_UNICODE));
        }
    } elseif ($_ENV['GD_PIC'] == true) {
        try {
            compressImageWithGD($old, $new, $quality, $size);
            $mode = 'g';
        } catch (Exception $e) {
            die(json_encode(["code" => 0000, "info" => "Imagick:缩略图创建失败=>$e"], JSON_UNESCAPED_UNICODE));
        }
    } else {
        die(json_encode(["code" => 0000, "info" => "环境不支持操作图片，无法生成缩略图"], JSON_UNESCAPED_UNICODE));
    }
    return [$mode, $isGIF];
}