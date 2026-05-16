<?php
// 启用开发模式以显示错误
match (getenv('APP_ENV')) {
    'development' => dev_mode(true),
    'production' => dev_mode(false),
    default => die('未配置运行环境ENV')
};
ini_set('session.gc_maxlifetime', 3600); // 设置为 1 小时
session_start(); // 启动会话
$_SESSION['is_lg_ok'] = $_SESSION['is_lg_ok'] ?? null;
@$_COOKIE['auth_token'] ?? $_SESSION['is_lg_ok'] = false;

function _DIR_() {
    return $_SERVER['DOCUMENT_ROOT'] . '/';
}

/**
 * 自动加载器
 */
spl_autoload_register(function ($class) {
    $file = _DIR_() . '/kernel/module/' . $class . '.php';
    if (file_exists($file)) {
        require $file;
    } else {
        throw new Exception("Class '$class' not found!");
    }
});

// 手动解析 .env 文件
function config($dir) {
    $envContent = file_get_contents(_DIR_() . $dir);
    $lines = explode("\n", $envContent);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value, "'\" "); // 处理引号和空格
        }
    }
}

if (!file_exists(_DIR_() . 'kernel/config/.env')) {
    header('Location: /kernel/install.php');
    exit;
}

config('kernel/config/.env');
config('kernel/config/version.conf');
@$_u = trim($_ENV['UID']);
$_DOM = str_replace('www.', '', $_SERVER['HTTP_HOST']);

try {
    $db = DataBase::getInstance();
} catch (RuntimeException $e) {
    die('error link basedata');
}

date_default_timezone_set($_ENV['SITE_TIME_ZONE']); // 设置为中国时区
// 创建API限流器实例
$rateLimiter = new RateLimiter(_DIR_() . 'kernel/log', APP_MODE == 'development', _DIR_() . 'kernel/config/ratelimit_storage.json');

/**
 * 快速切换PHP开发模式和运营模式
 * @param bool $devMode true为开发模式，false为运营模式
 */
function dev_mode($devMode = true) {
    if ($devMode) {
        ini_set('display_errors', 1);
        ini_set('display_startup_errors', 1);
        error_reporting(E_ALL);
        define('APP_MODE', 'development');
    } else {
        ini_set('display_startup_errors', 0);
        error_reporting(0);
        define('APP_MODE', 'production');
    }
}

// debug窗口
function debug_info($data) {
    static $debug_buffer = [];
    $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 1)[0];
    $info = '<div style="background:#f8f8f8;border:1px solid #ccc;padding:10px;margin:10px 0;font-size:14px;color:#333;z-index:9999;overflow:scroll;max-height:40vh;">';
    $info .= '<p style="font-size:10px;word-wrap: break-word;color:#b9b9b9">来源:' . $trace['file'] . ' 第 ' . $trace['line'] . ' 行 ( "Type: ' . gettype($data) . '“ )</p>';
    $info .= '<pre>';
    if (is_array($data) || is_object($data)) {
        ob_start();
        var_dump($data);
        $info .= ob_get_clean();
    } else {
        $info .= print_r($data, true);
    }
    $info .= '</pre></div>';
    $debug_buffer[] = $info;

    // 注册shutdown函数只执行一次
    static $registered = false;
    if (!$registered) {
        register_shutdown_function(function () use (&$debug_buffer) {
            if (!empty($debug_buffer)) {
                echo '<script>
                if(document.body){
                    var dbg=document.createElement("div");
                    dbg.innerHTML = ' . json_encode(implode('', $debug_buffer)) . ';
                    document.body.appendChild(dbg);
                } else {
                    document.write(' . json_encode(implode('', $debug_buffer)) . ');
                }
                </script>';
            }
        });
        $registered = true;
    }
}

function debug($value) {
    error_log($value, 3, _DIR_() . "kernel/log/debug.txt");
}

/**
 * 密码加密，使用不可逆的算法，加盐，并用明文密码混淆
 * @param string $password 明文密码
 * @param string $salt 盐值（可选，不传则自动生成）
 * @return array ['hash' => string, 'salt' => string]
 */
function pass_encrypt($password, $salt = null) {
    if (!$salt) {
        // 生成随机盐
        $salt = bin2hex(random_bytes(16));
    }
    // 混淆：盐+密码+盐
    $mixed = $salt . $password . $salt;
    // 不可逆加密（哈希）
    $hash = hash('sha256', $mixed);
    return [
        'hash' => $hash,
        'salt' => $salt
    ];
}

/**
 * 验证密码
 * @param string $password 明文密码（或前端发送的加密密码）
 * @param string $hash 已存储的哈希值
 * @param string $salt 已存储的盐
 * @param bool $isPreHashed 密码是否已经是前端预哈希的
 * @return bool
 */
function pass_verify($password, $hash, $salt, $isPreHashed = false) {
    // 前端登录时会计算 SHA256(password + domain + UID)
    // 后端存储时已经用 salt 对前端发送的密码进行了哈希
    // 验证时：直接用存储的逻辑计算并比较
    $mixed = (string) $salt . $password . $salt;
    $checkHash = hash('sha256', $mixed);
    return hash_equals($hash, $checkHash);
}


/**
 * AES-256-CBC 加密
 * @param string $plaintext 明文
 * @param string $key 加密密钥（32字节的Base64编码）
 * @return string 返回 Base64 编码的加密结果（IV + 密文）
 */
function aes256Encrypt($plaintext, $key) {
    $key = base64_decode($key);
    // 检查密钥长度
    if (strlen($key) !== 32) {
        throw new Exception("Key must be 32 bytes (256-bit) for AES-256");
    }

    // 生成随机初始化向量（IV）
    $iv = openssl_random_pseudo_bytes(16);

    // 加密（自动填充 PKCS#7）
    $ciphertext = openssl_encrypt(
        $plaintext,
        'AES-256-CBC',
        $key,
        OPENSSL_RAW_DATA,
        $iv
    );

    if ($ciphertext === false) {
        throw new Exception("Encryption failed: " . openssl_error_string());
    }

    // 返回 IV + 密文，并 Base64 编码
    return base64_encode($iv . $ciphertext);
}

/**
 * AES-256-CBC 解密
 * @param string $encrypted Base64 编码的加密数据（IV + 密文）
 * @param string $key 解密密钥（32字节的Base64编码）
 * @return string 返回解密后的明文
 */
function aes256Decrypt($encrypted, $key) {
    $key = base64_decode($key);
    // 检查密钥长度
    if (strlen($key) !== 32) {
        throw new Exception("Key must be 32 bytes (256-bit) for AES-256");
    }

    // 解码 Base64
    $data = base64_decode($encrypted);
    if ($data === false) {
        throw new Exception("Base64 decoding failed");
    }

    // 提取 IV（前16字节）和密文（剩余部分）
    $iv = substr($data, 0, 16);
    $ciphertext = substr($data, 16);

    // 解密
    $plaintext = openssl_decrypt(
        $ciphertext,
        'AES-256-CBC',
        $key,
        OPENSSL_RAW_DATA,
        $iv
    );

    if ($plaintext === false) {
        return false;
    }

    return $plaintext;
}

/**
 * 从密码生成随机 32 字节的Base64密钥
 *
 * @param string $value 传入任何字符
 * @return string 32 字节的Base64编码
 */
function getRandomBase64Key($value) {
    $salt = random_bytes(16);
    $iterations = 100000;
    return base64_encode(hash_pbkdf2('sha256', $value, $salt, $iterations, 32, true));
}

/**
 * 过滤输入字符串，只保留允许的字符。
 *
 * @param string $input         要过滤的输入字符串。
 * @param string $allowedChars  允许的字符集合（正则表达式字符集），默认为字母、数字、空白、@、连字符、下划线。
 * @return string               过滤后的字符串，仅包含允许的字符。
 */
function filter_pass($input, $allowedChars = '') {
    // 默认允许字母、数字、空白、@、-、_
    $defaultAllowed = 'a-zA-Z0-9\s@\-\_';
    $pattern = '/[^' . ($allowedChars ?: $defaultAllowed) . ']/u';
    return preg_replace($pattern, '', (string) $input);
}


/**
 * Only_Cookie 快速设置 Cookie
 * @param string $fieldName 字段名
 * @param int $life 生命周期，单位秒，默认3600秒（1小时）
 * @param bool $clear 是否清除该字段
 */
function onlyCookie($fieldName, $token, $life, $clear = false) {
    if ($clear) {
        unset($_COOKIE[$fieldName]);
        $life *= -1;
    }

    setcookie($fieldName, $token, [
        'expires' => time() + $life,
        'path' => '/',
        'httponly' => true,
        'secure' => true,
        'samesite' => 'Lax'
    ]);
}

/**
 * 多条件判断
 * @param string $a 与其他条件进行判断
 * @param array $b 其他条件
 * @param boolean $mode 默认true = && ; false = ||
 * @return bool 返回判断结果
 */
function ifs(string $a, array $b, bool $mode = true) {
    $result = false;
    if ($mode) {
        $_r = true;
        foreach ($b as $_b) {
            if ($_b !== $a) {
                $_r = false;
            }
        }
        $result = $_r;
    } else {
        $_r = false;
        foreach ($b as $_b) {
            if ($_b == $a) {
                $_r = true;
            }
        }
        $result = $_r;
    }
    return $result;
}

function _round($num) {
    if ($num < 0.5) {
        return 1;
    }
    return (int) round($num);
}

/**
 * 转换为字节（便于比较）
 * @param mixed $sizeStr 带单位的大小
 * @return int 字节
 */
function convertToBytes($sizeStr) {
    $unit = strtoupper(substr($sizeStr, -1));
    $value = (int) $sizeStr;
    switch ($unit) {
        case 'G':
            $value *= 1024 * 1024 * 1024;
            break;
        case 'M':
            $value *= 1024 * 1024;
            break;
        case 'K':
            $value *= 1024;
            break;
    }
    return $value;
}

/**
 * 将字节数转换为带单位的字符串（自动选择合适单位）
 * @param int $bytes 字节数
 * @param int $decimals 保留小数位数（默认2位）
 * @return string 格式化后的字符串（如 "1.25 MB"）
 */
function formatBytes($bytes, $decimals = 2) {
    if ($bytes <= 0)
        return '0B';

    $units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    $index = floor(log($bytes, 1024)); // 计算单位索引
    $size = $bytes / pow(1024, $index); // 转换值

    // 防止单位越界（如字节数超过 PB）
    $index = min($index, count($units) - 1);

    return round($size, $decimals) . ' ' . $units[$index];
}

/**
 * 检查php版本是否满足程序要求
 * @return bool|int
 */
function php_version_8_1() {
    return version_compare(PHP_VERSION, '8.1.0', '>=');
}

/**
 * 检查GD库是否支持WebP（包括无损压缩）
 * @return int 0:不支持 1: 无损 2: 有损
 */
function gd_webp_supported() {
    if (!extension_loaded('gd')) {
        return 0;
    }

    $gdInfo = gd_info();
    // 检查GD是否支持WebP（基本支持）
    if (!isset($gdInfo['WebP Support']) || !$gdInfo['WebP Support']) {
        return 0;
    }

    // 检查是否支持WebP无损（PHP 8.1+ 且 libgd 支持）
    if (defined('IMG_WEBP_LOSSLESS')) {
        return 1; // 支持无损压缩
    }

    return 2; // 仅支持有损压缩
}

/**
 * 检查Imagick扩展是否支持WebP
 * @return bool 支持与否
 */
function imagick_webp_supported() {
    if (!extension_loaded('imagick')) {
        return false;
    }

    try {
        $imagick = new Imagick();
        $formats = $imagick->queryFormats();
        return in_array('WEBP', $formats);
    } catch (Exception $e) {
        return false;
    }
}

/**
 * 用Imagick压缩图像
 * @param string $inputPath 输入图片路径
 * @param string $outputPath 输出图片路径
 * @param array|null $size 指定[宽,高]，为null则不调整尺寸
 * @param string $format 输出格式（webp/avif）
 * @param int $quality 质量（1-100）
 * @param bool $animation 是否保留GIF动画
 * @return bool 是否为GIF
 * @throws \Exception
 */
function compressImageWithImagick($inputPath, $outputPath, $quality = 80, $size = null, $animation = true, $format = 'webp') {
    if (!extension_loaded('imagick')) {
        throw new Exception('Imagick extension is not loaded.');
    }

    if (!file_exists($inputPath)) {
        throw new Exception("Input file not found: $inputPath");
    }

    $format = strtolower($format);
    if (!in_array($format, ['webp', 'avif'])) {
        throw new Exception('Unsupported format. Use webp or avif.');
    }

    $image = new Imagick();
    $image->readImage($inputPath);

    $isGif = ($image->getNumberImages() > 1);
    if ($isGif && !$animation) {
        // 静态GIF：只处理第一帧
        $image = $image->coalesceImages();
        $image->setIteratorIndex(0); // 定位到第一帧
        $frame = $image->getImage(); // 获取当前帧（Imagick对象）

        $frame->setImageFormat($format);
        if ($quality === 100) {
            $frame->setOption('webp:lossless', 'true');
        } else {
            $frame->setImageCompressionQuality($quality);
        }

        if (!$frame->getImageAlphaChannel()) {
            $frame->setImageAlphaChannel(Imagick::ALPHACHANNEL_SET);
        }
        $frame->setImageBackgroundColor(new ImagickPixel('transparent'));

        if ($size && is_array($size) && count($size) === 2) {
            $width = (int) $size[0];
            $height = (int) $size[1];
            if ($width > 0 && $height > 0) {
                $frame->cropThumbnailImage($width, $height);
            }
        }

        $frame->writeImage($outputPath);
        $frame->clear();
    } else {
        // 动态GIF或多帧图片
        $frames = $image->coalesceImages();
        foreach ($frames as $frame) {
            $frame->setImageFormat($format);
            $frame->setImageCompressionQuality($quality);

            if (!$frame->getImageAlphaChannel()) {
                $frame->setImageAlphaChannel(Imagick::ALPHACHANNEL_SET);
            }

            if ($size && is_array($size) && count($size) === 2) {
                $width = (int) $size[0];
                $height = (int) $size[1];
                if ($width > 0 && $height > 0) {
                    $frame->cropThumbnailImage($width, $height);
                }
            }
        }
        $frames->writeImages($outputPath, true);
        $frames->clear();
    }

    $image->clear();
    $image->destroy();
    return $isGif && $animation;
}

/**
 * 使用 GD 压缩图像（非动画 GIF，仅支持 webp/png/jpg）
 *
 * @param string $input 输入图片路径 babse64
 * @param string $outputPath 输出图片路径
 * @param array|null $size 指定 [宽, 高]，若为 null 则不裁剪/缩放
 * @param string $format 输出格式：'webp'|'png'|'jpg'（不支持 avif）
 * @param int $quality 质量：0-100（对 PNG 会映射为 0-9 的压缩级别）
 * @return bool
 * @throws Exception
 */
function compressImageWithGD($input, $outputPath, $quality = 80, $size = null, $format = 'webp') {
    if (!extension_loaded('gd')) {
        throw new Exception('GD extension is not loaded.');
    }

    $format = strtolower($format);
    if ($format === 'avif') {
        throw new Exception('AVIF not supported by GD.');
    }
    if (!in_array($format, ['webp', 'png', 'jpg', 'jpeg'])) {
        throw new Exception('Unsupported format. Use webp, png or jpg.');
    }

    // 读取源图信息
    $info = @getimagesize($input);
    if ($info === false) {
        throw new Exception('Invalid image file: ' . $input);
    }

    $mime = $info['mime'];

    $isBase64 = preg_match('/^data:image\/(\w+);base64,/', $input, $matches);
    // 处理输入：Base64 或文件路径
    if ($isBase64) {

        // Base64 输入
        $mime = 'image/' . $matches[1];
        $base64Data = substr($input, strpos($input, ',') + 1);
        $imageData = base64_decode($base64Data);
        if ($imageData === false) {
            throw new Exception('Invalid Base64 data.');
        }
        $src = @imagecreatefromstring($imageData);
    } else {
        // 文件路径输入
        $info = @getimagesize($input);
        if ($info === false) {
            throw new Exception('Invalid image file: ' . $input);
        }
        $mime = $info['mime'];
        switch ($mime) {
            case 'image/jpeg':
                $src = @imagecreatefromjpeg($input);
                break;
            case 'image/png':
                $src = @imagecreatefrompng($input);
                break;
            case 'image/gif':
                $src = @imagecreatefromgif($input);
                break;
            case 'image/webp':
                if (!function_exists('imagecreatefromwebp')) {
                    throw new Exception('GD build does not support WebP input.');
                }
                $src = @imagecreatefromwebp($input);
                break;
            default:
                throw new Exception('Unsupported source image type: ' . $mime);
        }
    }

    // 自动修正 JPEG 方向（如果存在 EXIF 数据）
    if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
        $exif = @exif_read_data($isBase64 ? $input : $input);
        if ($exif && isset($exif['Orientation'])) {
            switch ($exif['Orientation']) {
                case 3:
                    $src = imagerotate($src, 180, 0);
                    break;
                case 6:
                    $src = imagerotate($src, -90, 0);
                    break;
                case 8:
                    $src = imagerotate($src, 90, 0);
                    break;
            }
        }
    }


    if (!$src) {
        throw new Exception('Failed to create image resource from source.');
    }

    $srcW = imagesx($src);
    $srcH = imagesy($src);

    // 计算目标尺寸 / 裁剪（模仿 Imagick 的 cropThumbnailImage：填满并裁剪中心）
    if ($size && is_array($size) && count($size) === 2 && (int) $size[0] > 0 && (int) $size[1] > 0) {
        $dstW = (int) $size[0];
        $dstH = (int) $size[1];

        $srcRatio = $srcW / $srcH;
        $dstRatio = $dstW / $dstH;

        if ($srcRatio > $dstRatio) {
            // 源比目标更宽：裁剪左右
            $cropH = $srcH;
            $cropW = (int) round($srcH * $dstRatio);
            $srcX = (int) round(($srcW - $cropW) / 2);
            $srcY = 0;
        } else {
            // 源比目标更高：裁剪上下
            $cropW = $srcW;
            $cropH = (int) round($srcW / $dstRatio);
            $srcX = 0;
            $srcY = (int) round(($srcH - $cropH) / 2);
        }

        $dst = imagecreatetruecolor($dstW, $dstH);
        // 处理透明（PNG / WebP / GIF）
        if (in_array($format, ['png', 'webp']) || $mime === 'image/png' || $mime === 'image/gif' || $mime === 'image/webp') {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefill($dst, 0, 0, $transparent);
        }

        $resampled = imagecopyresampled(
            $dst,
            $src,
            0, 0, // dest x,y
            $srcX, $srcY, // src x,y
            $dstW, $dstH, // dest w,h
            $cropW, $cropH  // src w,h
        );
        if (!$resampled) {
            imagedestroy($src);
            imagedestroy($dst);
            throw new Exception('Resampling failed.');
        }
    } else {
        // 不裁剪/缩放，使用原尺寸
        $dstW = $srcW;
        $dstH = $srcH;
        $dst = imagecreatetruecolor($dstW, $dstH);
        if (in_array($format, ['png', 'webp']) || $mime === 'image/png' || $mime === 'image/gif' || $mime === 'image/webp') {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefill($dst, 0, 0, $transparent);
        }
        if (!imagecopy($dst, $src, 0, 0, 0, 0, $dstW, $dstH)) {
            imagedestroy($src);
            imagedestroy($dst);
            throw new Exception('Copying image failed.');
        }
    }

    // 输出到目标文件
    $success = false;
    if ($format === 'webp') {
        if (!function_exists('imagewebp')) {
            imagedestroy($src);
            imagedestroy($dst);
            throw new Exception('GD build does not support WebP output.');
        }
        // imagewebp 的 quality 0-100
        $success = imagewebp($dst, $outputPath, (int) $quality);
    } elseif ($format === 'png') {
        // PNG 的 compression_level 0 (无压缩) - 9 (最高)，与 quality 映射（quality 越高压缩越小）
        $pngLevel = (int) round((9 * (100 - min(100, max(0, $quality)))) / 100);
        $success = imagepng($dst, $outputPath, $pngLevel);
    } else { // jpg/jpeg
        // imagejpeg quality 0-100
        $jpgQuality = (int) min(100, max(0, $quality));
        $success = imagejpeg($dst, $outputPath, $jpgQuality);
    }

    imagedestroy($src);
    imagedestroy($dst);

    if ($success === false) {
        throw new Exception('Failed to write output image: ' . $outputPath);
    }

    return true;
}

function isAnimatedWebP($filePath) {
    $file = fopen($filePath, 'rb');
    if (!$file)
        return false;

    // 读取 WebP 文件头（12字节）
    $header = fread($file, 12);
    fclose($file);

    // 检查是否是 WebP 格式（前4字节应为 "RIFF"）
    if (substr($header, 0, 4) !== 'RIFF')
        return false;

    // 检查是否有动画片段（ANMF 或 VP8X）
    // 动态 WebP 通常包含 "ANMF" 或 "VP8X" 块
    $file = fopen($filePath, 'rb');
    $data = fread($file, 1024); // 读取前 1KB 数据
    fclose($file);

    return (strpos($data, 'ANMF') !== false) || (strpos($data, 'VP8X') !== false);
}

/**
 * 判断给定日期是否大于当前日期（是否在未来）
 *
 * @param string $date 要比较的日期（格式：'Y-m-d' 或 'Y-m-d H:i:s'）
 * @return bool 如果日期在未来则返回 true，否则返回 false
 */
function isDateInFuture(string $date): bool {
    $givenDate = new DateTime($date);
    $currentDate = new DateTime(); // 当前时间
    return $givenDate > $currentDate;
}

/**
 * 清空目录
 * @param mixed $dir 目录
 * @return bool
 */
function clearDirectory($dir) {
    if (!is_dir($dir)) {
        return false;
    }

    $iterator = new FilesystemIterator($dir);
    foreach ($iterator as $item) {
        if ($item->isDir()) {
            clearDirectory($item->getPathname()); // 递归删除子目录
            rmdir($item->getPathname()); // 删除空目录
        } else {
            unlink($item->getPathname()); // 删除文件
        }
    }
    return true;
}


/**
 * 定时文章
 * @return void
 */
(function () {
    $filePath = _DIR_() . 'kernel/config/delayPost.json';
    $arr = JsonEditor::getAll($filePath);
    if (!empty($arr)) {
        foreach ($arr as $id => $value) {
            $date = $value[0];
            $tag = $value[1];
            $hid = $value[2] == 1 ? 0 : 1;
            if (!isDateInFuture($date)) {
                try {
                    DataBase::getInstance()->update("UPDATE content SET C_archive = ?,C_date = ?,C_tag = ? WHERE id = ?", [0, $date, $tag, $id]);
                    JsonEditor::delete($filePath, $id);
                    updateCalendar($date, 1);
                    updateTag($tag, 1, $hid);
                } catch (Exception $e) {
                }
            }
        }
    }
})();

/**
 * 创建日历表的数据结构。
 * @param mixed $YearMonth
 * @param mixed $Day
 * @return int[]
 */
function createJsonFromDays($YearMonth, $Day) {
    $arr = [];
    for ($i = 1; $i <= date('t', strtotime("{$YearMonth}-01")); $i++) {
        $arr[$i] = 0;
    }
    return $arr;
}

/**
 * 更新标签表
 * @param string $tag 标签
 * @param bool $mode 1 加 -1 减
 * @param number $visit 文章标签是隐藏传0，修改删除时传1或者-1。
 */
function updateTag($tag, $mode, $visit) {
    $tagPDO = DataBase::getInstance()->fetch("SELECT * FROM tags WHERE T_name = ?", [$tag]);
    if ($tagPDO === false) {
        $createTag = DataBase::getInstance()->insert("INSERT INTO tags  (T_name, T_count,T_count_visit, T_hidden) VALUES (?, ?, ?, ?)", [$tag, 1, $visit, 0]);
        if ($createTag === false) {
            die(json_encode(["code" => 10444, "info" => "标签库创建失败"]));
        }
    } else {
        $count = intval($tagPDO['T_count']) + $mode;
        $visit = intval($tagPDO['T_count_visit']) + $visit;
        if ($count !== 0) {
            $updateTag = DataBase::getInstance()->update("UPDATE tags SET T_count = ? , T_count_visit = ? WHERE T_name = ?", [$count, $visit, $tag]);
            if ($updateTag === false) {
                die(json_encode(["code" => 10443, "info" => "标签库更新失败"]));
            }
        } else {
            $deleteTag = DataBase::getInstance()->delete("DELETE FROM tags WHERE T_name = ?", [$tag]);
            if ($deleteTag === false) {
                die(json_encode(["code" => 10443, "info" => "标签删除失败"]));
            }
        }
    }
}

/**
 * 更新日历表
 * @param string $date 日期
 * @param bool $mode true 加 false 减
 */
function updateCalendar($date, $mode) {
    $YearMonth = (new DateTime($date))->format('Ym');
    $Day = (new DateTime($date))->format('j');

    $calendarPDO = DataBase::getInstance()->fetch("SELECT * FROM calendar WHERE D_date = ?", [$YearMonth]);
    if ($calendarPDO === false) {
        $insertCalendar = DataBase::getInstance()->insert("INSERT INTO calendar (D_date, D_count) VALUES (?, ?)", [$YearMonth, json_encode(createJsonFromDays($YearMonth, $Day))]);
        if ($insertCalendar === false) {
            die(json_encode(["code" => 10441, "info" => "日历Josn创建失败"]));
        } else {
            $calendarPDO = DataBase::getInstance()->fetch("SELECT * FROM calendar WHERE D_date = ?", [$YearMonth]);
        }
    }

    $array = json_decode($calendarPDO['D_count'], true);
    $count = max(intval($array[$Day]) + $mode, 0);
    $array = JsonEditor::set($array, $Day, $count);
    $updatePDO = DataBase::getInstance()->update("UPDATE calendar SET D_count = ? WHERE D_date = ?", [json_encode($array), $YearMonth]);
    if ($updatePDO === false) {
        die(json_encode(["code" => 10442, "info" => "日历库更新失败"]));
    }
}

/**
 * 获取图片信息
 *
 * @param string $imagePath 图片路径
 * @param array $options 输出选项控制数组
 * @return array 包含图片信息的数组
 */
function getImageInfo($imagePath, $options = []) {
    // 定义所有可能的字段及其默认值
    $allFields = [
        'resolution' => true,
        'size' => true,
        'last_time' => true,
        'bit_depth' => true,
        'exif' => true
    ];

    // 合并选项：用户传入的键会覆盖默认值，但保留用户键顺序
    $mergedOptions = array_replace($allFields, $options);

    // 初始化结果数组
    $result = [];

    // 检查文件是否存在
    if (!file_exists($imagePath)) {
        throw new Exception("文件不存在: " . $imagePath);
    }

    $fileSize = filesize($imagePath);
    $lastModified = filemtime($imagePath);
    $imageSize = getimagesize($imagePath);

    // 动态处理每个字段
    foreach ($mergedOptions as $field => $enabled) {
        if (!$enabled)
            continue;

        // 根据字段名填充数据
        switch ($field) {
            case 'resolution':
                $result[$field] = $imageSize[0] . 'x' . $imageSize[1];
                break;
            case 'size':
                $result[$field] = formatBytes($fileSize);
                break;
            case 'last_time':
                $result[$field] = date('Y-m-d H:i:s', $lastModified);
                break;
            case 'bit_depth':
                if (extension_loaded('imagick')) {
                    $imagick = new Imagick($imagePath);
                    $result[$field] = $imagick->getImageDepth() . '位';
                    $imagick->clear();
                    $imagick->destroy();
                } else {
                    $result[$field] = "需要Imagick支持";
                }
                break;
            case 'exif':
                if (function_exists('exif_read_data')) {
                    $exif = @exif_read_data($imagePath);
                    if ($exif !== false) {
                        // 只提取需要的EXIF字段
                        $desiredExifFields = [
                            'DateTimeOriginal',
                            'ExposureTime',
                            'FNumber',
                            'ISOSpeedRatings',
                            'FocalLength',
                            'Model',
                            'Software',
                            'ImageDescription'
                        ];

                        $result[$field] = [];
                        foreach ($desiredExifFields as $exifKey) {
                            if (isset($exif[$exifKey])) {
                                $result[$field][$exifKey] = $exif[$exifKey];
                            }
                        }

                        // 如果没有找到任何需要的字段，设置为NULL
                        if (empty($result[$field])) {
                            $result[$field] = "NULL";
                        }
                    } else {
                        $result[$field] = "NULL";
                    }
                } else {
                    $result[$field] = "需要EXIF扩展支持";
                }
                break;
            default:
                // 支持动态字段（如果用户传入了 $allFields 未定义的键）
                $result[$field] = "未知字段: {$field}";
        }
    }

    return $result;
}

/**
 * 管理 .env 文件字段（增加、删除、修改）
 * 
 * @param string $envPath .env 文件路径
 * @param string $action 操作类型：'add'|'delete'|'update'
 * @param string $key 字段名（如 SITE_TITLE）
 * @param string|null $value 字段值（删除操作时可为 null）
 * @return bool 操作是否成功
 */
function ENVManage($envPath, $action, $key, $value = null) {
    // 检查文件是否存在
    if (!file_exists($envPath)) {
        return false;
    }

    // 读取 .env 文件内容
    $envContent = file_get_contents($envPath);
    if ($envContent === false) {
        return false;
    }

    // 解析现有字段
    $lines = explode("\n", $envContent);
    $existingFields = [];
    foreach ($lines as $line) {
        $line = trim($line);
        // 跳过空行和注释
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        // 解析 KEY=VALUE 格式
        if (strpos($line, '=') !== false) {
            [$currentKey, $currentValue] = explode('=', $line, 2);
            $existingFields[trim($currentKey)] = trim($currentValue);
        }
    }

    // 执行操作
    $updated = false;
    switch ($action) {
        case 'add':
            // 如果字段不存在，则添加
            if (!isset($existingFields[$key])) {
                $lines[] = "$key=$value";
                $updated = true;
            }
            break;

        case 'delete':
            // 如果字段存在，则删除
            if (isset($existingFields[$key])) {
                $lines = array_filter($lines, function ($line) use ($key) {
                    return !(strpos($line, "$key=") === 0 && strpos($line, '=') !== false);
                });
                $updated = true;
            }
            break;

        case 'update':
            // 如果字段存在，则更新；否则可以添加（可选）
            $found = false;
            foreach ($lines as &$line) {
                if (strpos($line, "$key=") === 0) {
                    $line = "$key=$value";
                    $found = true;
                    break;
                }
            }
            if (!$found) {
                $lines[] = "$key=$value"; // 如果不存在，可以选择添加
            }
            $updated = true;
            break;

        default:
            die('action 变量有误');
    }

    // 重新写入文件
    if ($updated) {
        $newContent = implode("\n", $lines);
        return (file_put_contents($envPath, $newContent) !== false);
    }

    return true; // 没有变化也视为成功
}

function cachev($link) {
    $ver = trim($_ENV['DEV_V']);
    $pathInfo = pathinfo($link);
    $dirname = $pathInfo['dirname'] ?? '.';
    $filename = $pathInfo['filename'] ?? '';
    $extension = $pathInfo['extension'] ?? '';
    $URLPath = "/$dirname/$filename.$ver.$extension";
    $URLPath2 = "/$dirname/$filename.$extension";
    $DirPath = _DIR_() . $dirname . "/$filename.$ver.$extension";

    if (APP_MODE === 'development') {
        return $URLPath2;
    }

    if (!file_exists($DirPath)) {
        $URLPath = $URLPath2;
    }
    return $URLPath;
}

/**
 * 处理文件路径集合和版本变量
 * 
 * @param array $filePaths 文件路径集合
 * @param bool $upEnv 是否更新环境
 * @return string|bool 成功返回新版本变量，失败返回false
 */
function processFilesWithVersion(array $filePaths, string $oldVersion, string $newVersion, bool $upEnv) {
    $oldVersion = trim($oldVersion);
    foreach ($filePaths as $filePath) {
        $pathInfo = pathinfo($filePath);
        $dirname = $pathInfo['dirname'] ?? '.';
        $filename = $pathInfo['filename'] ?? '';
        $extension = $pathInfo['extension'] ?? '';
        $oldFilePath = $dirname . DIRECTORY_SEPARATOR . "$filename.$oldVersion.$extension";
        $newFilePath = $dirname . DIRECTORY_SEPARATOR . "$filename.$newVersion.$extension";
        if (file_exists($oldFilePath)) {
            if ($upEnv) {
                if (!unlink($oldFilePath)) {
                    echo "警告：无法删除旧版本文件 '{$oldFilePath}'，已跳过\n";
                    return false;
                }
                if (!copy($filePath, $newFilePath)) {
                    echo "警告：无法拷贝文件 '{$filePath}' 到 '{$newFilePath}'，已跳过\n";
                    return false;
                }
                $file = _DIR_() . 'kernel/config/version.conf';
                ENVManage($file, 'update', 'DEV_V', $newVersion);
            }
        } else {
            $pattern = $dirname . DIRECTORY_SEPARATOR . "$filename.*.$extension";
            $allVersionFiles = glob($pattern);
            if (!empty($allVersionFiles)) {
                foreach ($allVersionFiles as $versionedFile) {
                    if (!unlink($versionedFile)) {
                        echo "警告：无法删除版本文件 '{$versionedFile}'\n";
                        return false;
                    }
                }
            }
            if (!copy($filePath, $newFilePath)) {
                echo "警告：无法拷贝文件 '{$filePath}' 到 '{$newFilePath}'，已跳过\n";
                return false;
            }
            $file = _DIR_() . 'kernel/config/version.conf';
            ENVManage($file, 'update', 'DEV_V', $newVersion);
        }
    }
    return true;
}

$dir = _DIR_() . 'kernel/asset/';
$filePath = ["{$dir}css/main.css", "{$dir}css/settings.css", "{$dir}css/icon-main.css", "{$dir}css/icon-icomoon.css", "{$dir}js/main.js", "{$dir}js/module.js", "{$dir}js/settings.js"];
//更新资源缓存
function updateResourceCache($filePath, $upEnv = true) {
    if (APP_MODE === 'development') {
        return;
    }
    $random = time();
    $newVer = processFilesWithVersion($filePath, $_ENV['DEV_V'], $random, $upEnv);
    if ($newVer !== false) {
        return true;
    } else {
        return false;
    }
}

updateResourceCache($filePath, false);


function getDomain() {
    $protocol = 'http://';
    $host = $_SERVER['HTTP_HOST'];
    // 检测 HTTPS
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
        $protocol = $_SERVER['HTTP_X_FORWARDED_PROTO'] . '://';
    } elseif (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        $protocol = 'https://';
    }

    return $protocol . $host;
}


function updateSiteMap() {
    $sitemap = new SitemapGenerator(getDomain(), _DIR_() . 'sitemap.xml');
    $list = $_ENV['SITE_MAP'];
    $arr = explode(',', $list);
    $query = "SELECT C_date,C_tag,id FROM content WHERE C_hidden = 0 AND C_archive = 0";
    foreach ($arr as $tag) {
        $query .= " OR C_tag = '$tag'";
    }
    $up_site_map = DataBase::getInstance()->fetchAll($query);

    foreach ($up_site_map as $item) {
        $sitemap->addUrl("{$item['C_tag']}/{$item['id']}.html", $item['C_date'], 'never', 1.0);
    }

    if ($sitemap->generate()) {
        return $sitemap->getUrlCount();
    } else {
        return false;
    }
}

/**
 * 发送 HTTP 请求并返回数据
 * 
 * @param string $url 请求的 URL
 * @param array $options 可选参数：
 *     - method: 请求方法 (GET/POST/PUT/DELETE)，默认 GET
 *     - post_data: POST 数据 (array/string)
 *     - headers: 自定义请求头 (array)
 *     - timeout: 超时时间(秒)，默认 30
 *     - ssl_verify: 是否验证 SSL 证书，默认 true
 *     - ca_cert: 自定义 CA 证书路径（若 ssl_verify=true）
 * @return array 返回结果数组：
 *     - 'status' => 布尔值，请求是否成功
 *     - 'data' => 响应内容（成功时）
 *     - 'error' => 错误信息（失败时）
 *     - 'http_code' => HTTP 状态码
 */
function curlRequest($url, $options = []) {
    $defaults = [
        'method' => 'GET',
        'post_data' => null,
        'headers' => [],
        'timeout' => 30,
        'ssl_verify' => true,
        'ca_cert' => null,
        'follow_redirects' => true,
    ];
    $options = array_merge($defaults, $options);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $options['timeout']);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($options['method']));
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, $options['follow_redirects']);

    // 处理 POST/PUT 数据
    $postdata = $options['post_data'];
    if ($postdata !== null) {
        if (is_array($postdata)) {
            if (isset($options['headers']['Content-Type']) &&
                strpos($options['headers']['Content-Type'], 'application/json') !== false) {
                $postdata = json_encode($postdata);
            } else {
                $postdata = http_build_query($postdata);
            }
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postdata);
    }

    // 处理请求头
    if (!empty($options['headers'])) {
        $headers = [];
        foreach ($options['headers'] as $key => $value) {
            if (is_int($key)) {
                // 允许直接传入 "Header: value" 格式
                $headers[] = $value;
            } else {
                $headers[] = "$key: $value";
            }
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    // SSL 验证
    if ($options['ssl_verify']) {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        if ($options['ca_cert']) {
            curl_setopt($ch, CURLOPT_CAINFO, $options['ca_cert']);
        }
    } else {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    $isSuccess = $response !== false && $httpCode >= 200 && $httpCode < 300;
    return [
        'status' => $isSuccess,
        'data' => $isSuccess ? $response : null,
        'error' => $isSuccess ? null : ($error ?: "HTTP error code: $httpCode"),
        'http_code' => $httpCode,
    ];
}