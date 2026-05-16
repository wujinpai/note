<?php

$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    die(json_encode(["code" => 10401, "info" => "未经授权"]));
}

$zip = $_POST['zip'];
$file = $_FILES['file'];
$type = $file['type'];
$paramjpg = 80;
$highzip = $_ENV['PICTURE_ZIP_HIGH'];
$zipmode = 'g0';

// 检查目录是否存在，不存在则创建
$targetDir = _DIR_() . 'uploads/temp';
if (!file_exists($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        die(json_encode(["code" => 10453, "info" => "目录创建失败: $targetDir"]));
    }
}

$info = '';

try {
    $imagePath = $file['tmp_name']; // 替换为你的图片路径
    $options = [
        "resolution" => true,
        "size" => true,
        "bit_depth" => true,
        "exif" => true
    ];
    if (strpos($type, 'video') === false) {
        $info = getImageInfo($imagePath, $options);
    }
} catch (Exception $e) {
    $info = 'Error' . $e->getMessage();
}

$fileExt = pathinfo($file['name'], PATHINFO_EXTENSION);
$size = '';
$uniqid = uniqid(true);
$dir = _DIR_() . 'uploads/temp/';
$thumbnail = "thum-$uniqid.webp";
$thumbnailDir = (string) $dir . $thumbnail;
$picture_quality = 80;
$thum_quality = 50;
$pictureDir = "$dir$uniqid.$fileExt";
$webpeDir = "$dir$uniqid.webp";
$isGIF = false;

//不支持的类型终止
if (!isVideoOrImage($type)) {
    die(json_encode(["code" => 10400, "info" => "不支持的格式"]));
}

if ($zip == 9) {
    //加密图片的缩略图直接保存并返回标识符的文件名。
    if (!move_uploaded_file($file['tmp_name'], "{$dir}thum-Enc_$uniqid.png")) {
        die(json_encode(["code" => '0000', "info" => "加密缩略图移动失败"], JSON_UNESCAPED_UNICODE));
    }
    echo "Enc_$uniqid";
    return;
} elseif ($zip == 8) {
    //加密图片的原图直接保存并返回文件信息。
    $uniqid = $_POST['t_name'];
    $newPic = "$dir$uniqid.png";
    if (!move_uploaded_file($file['tmp_name'], $newPic)) {
        die(json_encode(["code" => '0000', "info" => "加密图片移动失败"], JSON_UNESCAPED_UNICODE));
    }
    $zip_size = filesize($newPic);
    echo json_encode(["name" => $uniqid, "ext" => "png", "zip" => $zipmode, "zip_size" => formatBytes($zip_size), 'info' => $info], JSON_UNESCAPED_UNICODE);
    return;
}



//图片缩略图。
if (!(strpos($type, 'video') !== false)) {
    compressImage($file['tmp_name'], $thumbnailDir, $thum_quality, [260, 260],false);
}

if ($zip == 0 || (strpos($type, 'video') !== false)) {
    //未压缩的图片原图直接上传
    try {
        move_uploaded_file($file['tmp_name'], $pictureDir);
    } catch (Exception $e) {
        die(json_encode(["code" => '0000', "info" => "媒体移动保存失败=>$e"], JSON_UNESCAPED_UNICODE));
    }
} elseif ($zip == 1 && !(strpos($type, 'video') !== false)) {
    if ($highzip && $type == 'image/png') {
        //--PNG-- 无损压缩
        $mode = compressImage($file['tmp_name'], $webpeDir, 100);
        $isGIF = $mode[1];
        $zipmode = "$mode[0]1";
        $fileExt = 'webp';
    } else {
        //有损压缩
        $mode = compressImage($file['tmp_name'], $webpeDir, $picture_quality);
        $isGIF = $mode[1];
        $zipmode = "$mode[0]2";
        $fileExt = 'webp';
    }
} else {
    die(json_encode(["code" => 10999, "info" => "未知错误"]));
}

if ($isGIF) {
    $gifwebpdir = str_replace('.webp', 'GIF.webp', $webpeDir);
    $gifwebpthumdir = str_replace('.webp', 'GIF.webp', $thumbnailDir);
    rename($webpeDir, str_replace('.webp', 'GIF.webp', $webpeDir));
    rename($thumbnailDir, str_replace('.webp', 'GIF.webp', $thumbnailDir));
    $webpeDir = $gifwebpdir;
    $thumbnailDir = $gifwebpthumdir;
}

$zip_size = $fileExt == 'webp' ? filesize($webpeDir) : filesize($pictureDir);
echo json_encode(["name" => ($isGIF ? $uniqid . 'GIF' : $uniqid), "ext" => $fileExt, "zip" => $zipmode, "zip_size" => formatBytes($zip_size), 'info' => $info], JSON_UNESCAPED_UNICODE);

/**类型判断 */
function isVideoOrImage($type) {
    $supportedMimeTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', // 图片
        'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', // 视频
    ];
    return in_array($type, $supportedMimeTypes);
}

/**缩略图创建*/
function compressImage($old, $new, $quality, $size = null, $animation = true) {
    $isGIF = false;
    if ($_ENV['IMAGICK_PIC'] == true) {
        try {
            $isGIF = compressImageWithImagick($old, $new, $quality, $size, $animation);
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