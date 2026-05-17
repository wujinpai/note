<?php
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

function _DIR_() {
    return $_SERVER['DOCUMENT_ROOT'] . '/';
}

function config($dir) {
    $envContent = file_get_contents(_DIR_() . $dir);
    $lines = explode("\n", $envContent);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value, "'\" ");
        }
    }
}

// 先检查 .env 并加载配置
$has_env = file_exists(_DIR_() . 'kernel/config/.env');
if ($has_env) {
    config('kernel/config/.env');
    config('kernel/config/version.conf');
}

// 现在设置应用模式 - 使用 $_ENV['APP_ENV'] 或默认 production
$app_env = $_ENV['APP_ENV'] ?? 'production';
dev_mode($app_env === 'development');

ini_set('session.gc_maxlifetime', 3600);
session_start();
$_SESSION['is_lg_ok'] = $_SESSION['is_lg_ok'] ?? null;
@$_COOKIE['auth_token'] ?? $_SESSION['is_lg_ok'] = false;

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

// 如果 .env 不存在，则重定向到安装程序
if (!$has_env) {
    header('Location: /kernel/install.php');
    exit;
}

@$_u = trim($_ENV['UID']);
$_DOM = str_replace('www.', '', $_SERVER['HTTP_HOST']);

try {
    $db = DataBase::getInstance();
} catch (RuntimeException $e) {
    die('error link basedata');
}

date_default_timezone_set($_ENV['SITE_TIME_ZONE']);
$rateLimiter = new RateLimiter(_DIR_() . 'kernel/log', APP_MODE == 'development', _DIR_() . 'kernel/config/ratelimit_storage.json');

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

    static $registered = false;
    if (!$registered) {
        register_shutdown_function(function () use (&$debug_buffer) {
            if (!empty($debug_buffer)) {
                echo '<script>';
                echo 'if(document.body){';
                echo 'var db=document.createElement("div");';
                echo 'db.innerHTML=' . json_encode(implode('', $debug_buffer)) . ';';
                echo 'document.body.appendChild(db);';
                echo '}else{';
                echo 'document.write(' . json_encode(implode('', $debug_buffer)) . ');';
                echo '}';
                echo '</script>';
            }
        });
        $registered = true;
    }
}

function debug($value) {
    error_log($value, 3, _DIR_() . "kernel/log/debug.txt");
}

function pass_encrypt($password, $salt = null) {
    if (!$salt) {
        $salt = bin2hex(random_bytes(16));
    }
    $mixed = $salt . $password . $salt;
    $hash = hash('sha256', $mixed);
    return [
        'hash' => $hash,
        'salt' => $salt
    ];
}

function pass_verify($password, $hash, $salt) {
    $mixed = (string) $salt . $password . $salt;
    $checkHash = hash('sha256', $mixed);
    return hash_equals($hash, $checkHash);
}

function aes256Encrypt($plaintext, $key) {
    $key = base64_decode($key);
    if (strlen($key) !== 32) {
        throw new Exception("Key must be 32 bytes (256-bit) for AES-256");
    }

    $iv = openssl_random_pseudo_bytes(16);
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

    return base64_encode($iv . $ciphertext);
}

function aes256Decrypt($encrypted, $key) {
    $key = base64_decode($key);
    if (strlen($key) !== 32) {
        throw new Exception("Key must be 32 bytes (256-bit) for AES-256");
    }

    $data = base64_decode($encrypted);
    if ($data === false) {
        throw new Exception('Base64 decoding failed');
    }

    $iv = substr($data, 0, 16);
    $ciphertext = substr($data, 16);

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

function getRandomBase64Key($value) {
    $salt = random_bytes(16);
    $iterations = 100000;
    return base64_encode(hash_pbkdf2('sha256', $value, $salt, $iterations, 32, true));
}

function filter_pass($input, $allowedChars = '') {
    $defaultAllowed = 'a-zA-Z0-9\s@\-\_';
    $pattern = '/[^' . ($allowedChars ?: $defaultAllowed) . ']/u';
    return preg_replace($pattern, '', (string) $input);
}

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

function formatBytes($bytes, $decimals = 2) {
    if ($bytes <= 0) return '0B';

    $units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    $index = floor(log($bytes, 1024));
    $size = $bytes / pow(1024, $index);
    $index = min($index, count($units) - 1);

    return round($size, $decimals) . ' ' . $units[$index];
}

function php_version_8_1() {
    return version_compare(PHP_VERSION, '8.1.0', '>=');
}

function gd_webp_supported() {
    if (!extension_loaded('gd')) return 0;
    $gdInfo = gd_info();
    if (!isset($gdInfo['WebP Support']) || !$gdInfo['WebP Support']) return 0;
    if (defined('IMG_WEBP_LOSSLESS')) return 1;
    return 2;
}

function imagick_webp_supported() {
    if (!extension_loaded('imagick')) return false;
    try {
        $imagick = new Imagick();
        $formats = $imagick->queryFormats();
        return in_array('WEBP', $formats);
    } catch (Exception $e) {
        return false;
    }
}

function compressImageWithImagick($inputPath, $outputPath, $quality = 80, $size = null, $animation = true, $format = 'webp') {
    if (!extension_loaded('imagick')) throw new Exception('Imagick extension is not loaded.');
    if (!file_exists($inputPath)) throw new Exception("Input file not found: $inputPath");

    $format = strtolower($format);
    if (!in_array($format, ['webp', 'avif'])) throw new Exception('Unsupported format. Use webp or avif.');

    $image = new Imagick();
    $image->readImage($inputPath);

    $isGif = ($image->getNumberImages() > 1);
    if ($isGif && !$animation) {
        $image = $image->coalesceImages();
        $image->setIteratorIndex(0);
        $frame = $image->getImage();
        
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

function compressImageWithGD($input, $outputPath, $quality = 80, $size = null, $format = 'webp') {
    if (!extension_loaded('gd')) throw new Exception('GD extension is not loaded.');

    $format = strtolower($format);
    if ($format === 'avif') throw new Exception('AVIF not supported by GD.');
    if (!in_array($format, ['webp', 'png', 'jpg', 'jpeg'])) throw new Exception('Unsupported format. Use webp, png or jpg.');

    $isBase64 = preg_match('/^data:image\/(\w+);base64,/', $input, $matches);
    $mime = null;
    if ($isBase64) {
        // 获取 MIME 类型
        $mime = 'image/' . $matches[1];
        $base64Data = substr($input, strpos($input, ',') + 1);
        $imageData = base64_decode($base64Data);
        if ($imageData === false) throw new Exception('Invalid Base64 data.');
        $src = imagecreatefromstring($imageData);
    } else {
        $info = getimagesize($input);
        if ($info === false) throw new Exception('Invalid image file: ' . $input);
        $mime = $info['mime'];
        switch ($mime) {
            case 'image/jpeg': $src = imagecreatefromjpeg($input); break;
            case 'image/png': $src = imagecreatefrompng($input); break;
            case 'image/gif': $src = imagecreatefromgif($input); break;
            case 'image/webp': 
                if (!function_exists('imagecreatefromwebp')) throw new Exception('GD build does not support WebP input.');
                $src = imagecreatefromwebp($input); break;
            default: throw new Exception('Unsupported source image type: ' . $mime);
        }
    }

    if (!$src) throw new Exception('Failed to create image resource from source.');
    $srcW = imagesx($src);
    $srcH = imagesy($src);

    if ($size && is_array($size) && count($size) === 2 && (int)$size[0] > 0 && (int)$size[1] > 0) {
        $dstW = (int)$size[0];
        $dstH = (int)$size[1];
        $srcRatio = $srcW / $srcH;
        $dstRatio = $dstW / $dstH;
        
        if ($srcRatio > $dstRatio) {
            $cropH = $srcH;
            $cropW = (int) round($srcH * $dstRatio);
            $srcX = (int) round(($srcW - $cropW) / 2);
            $srcY = 0;
        } else {
            $cropW = $srcW;
            $cropH = (int) round($srcW / $dstRatio);
            $srcX = 0;
            $srcY = (int) round(($srcH - $cropH) / 2);
        }

        $dst = imagecreatetruecolor($dstW, $dstH);
        
        if (in_array($format, ['png', 'webp']) || in_array($mime, ['image/png', 'image/gif', 'image/webp'])) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefill($dst, 0, 0, $transparent);
        }

        $resampled = imagecopyresampled($dst, $src, 0, 0, $srcX, $srcY, $dstW, $dstH, $cropW, $cropH);
        if (!$resampled) {
            imagedestroy($src);
            imagedestroy($dst);
            throw new Exception('Resampling failed.');
        }
    } else {
        $dst = imagecreatetruecolor($srcW, $srcH);
        if (in_array($format, ['png', 'webp']) || ($mime && in_array($mime, ['image/png', 'image/gif', 'image/webp']))) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefill($dst, 0, 0, $transparent);
        }
        if (!imagecopy($dst, $src, 0, 0, 0, 0, $srcW, $srcH)) {
            imagedestroy($src);
            imagedestroy($dst);
            throw new Exception('Copying image failed.');
        }
    }

    $success = false;
    if ($format === 'webp') {
        if (!function_exists('imagewebp')) {
            imagedestroy($src); imagedestroy($dst);
            throw new Exception('GD build does not support WebP output.');
        }
        $success = imagewebp($dst, $outputPath, (int)$quality);
    } elseif ($format === 'png') {
        $pngLevel = (int) round((9 * (100 - min(100, max(0, $quality)))) / 100);
        $success = imagepng($dst, $outputPath, $pngLevel);
    } else {
        $jpgQuality = (int) min(100, max(0, $quality));
        $success = imagejpeg($dst, $outputPath, $jpgQuality);
    }

    imagedestroy($src); imagedestroy($dst);

    if ($success === false) throw new Exception('Failed to write output image: ' . $outputPath);
    return true;
}

function isAnimatedWebP($filePath) {
    $file = fopen($filePath, 'rb');
    if (!$file) return false;

    $header = fread($file, 12);
    fclose($file);
    
    if (substr($header, 0, 4) !== 'RIFF') return false;

    $file = fopen($filePath, 'rb');
    $data = fread($file, 1024);
    fclose($file);

    return (strpos($data, 'ANMF') !== false) || (strpos($data, 'VP8X') !== false);
}

function isDateInFuture(string $date): bool {
    $givenDate = new DateTime($date);
    $currentDate = new DateTime();
    return $givenDate > $currentDate;
}

function clearDirectory($dir) {
    if (!is_dir($dir)) return false;

    $iterator = new FilesystemIterator($dir);
    foreach ($iterator as $item) {
        if ($item->isDir()) {
            clearDirectory($item->getPathname());
            rmdir($item->getPathname());
        } else {
            unlink($item->getPathname());
        }
    }
    return true;
}

function createJsonFromDays($YearMonth, $Day) {
    $arr = [];
    for ($i = 1; $i <= date('t', strtotime("{$YearMonth}-01")); $i++) {
        $arr[$i] = 0;
    }
    return $arr;
}

function updateTag($tag, $mode, $visit) {
    $tagPDO = DataBase::getInstance()->fetch("SELECT * FROM tags WHERE T_name = ?", [$tag]);
    if ($tagPDO === false) {
        $createTag = DataBase::getInstance()->insert("INSERT INTO tags (T_name, T_count, T_count_visit, T_hidden) VALUES (?, ?, ?, ?)", [$tag, 1, $visit, 0]);
        if ($createTag === false) die(json_encode(["code" => 10444, "info" => "标签库创建失败"]));
    } else {
        $count = intval($tagPDO['T_count']) + $mode;
        $visit = intval($tagPDO['T_count_visit']) + $visit;
        if ($count !== 0) {
            $updateTag = DataBase::getInstance()->update("UPDATE tags SET T_count = ?, T_count_visit = ? WHERE T_name = ?", [$count, $visit, $tag]);
            if ($updateTag === false) die(json_encode(["code" => 10443, "info" => "标签库更新失败"]));
        } else {
            $deleteTag = DataBase::getInstance()->delete("DELETE FROM tags WHERE T_name = ?", [$tag]);
            if ($deleteTag === false) die(json_encode(["code" => 10443, "info" => "标签删除失败"]));
        }
    }
}

function updateCalendar($date, $mode) {
    $YearMonth = (new DateTime($date))->format('Ym');
    $Day = (new DateTime($date))->format('j');

    $calendarPDO = DataBase::getInstance()->fetch("SELECT * FROM calendar WHERE D_date = ?", [$YearMonth]);
    if ($calendarPDO === false) {
        $insertCalendar = DataBase::getInstance()->insert("INSERT INTO calendar (D_date, D_count) VALUES (?, ?)", [$YearMonth, json_encode(createJsonFromDays($YearMonth, $Day))]);
        if ($insertCalendar === false) die(json_encode(["code" => 10441, "info" => "日历Josn创建失败"]));
        else $calendarPDO = DataBase::getInstance()->fetch("SELECT * FROM calendar WHERE D_date = ?", [$YearMonth]);
    }

    $array = json_decode($calendarPDO['D_count'], true);
    $count = max(intval($array[$Day]) + $mode, 0);
    $array = JsonEditor::set($array, $Day, $count);
    $updatePDO = DataBase::getInstance()->update("UPDATE calendar SET D_count = ? WHERE D_date = ?", [json_encode($array), $YearMonth]);
    if ($updatePDO === false) die(json_encode(["code" => 10442, "info" => "日历库更新失败"]));
}

function getImageInfo($imagePath, $options = []) {
    $allFields = [
        'resolution' => true,
        'size' => true,
        'last_time' => true,
        'bit_depth' => true,
        'exif' => true
    ];

    $mergedOptions = array_merge($allFields, $options);
    $result = [];

    if (!file_exists($imagePath)) throw new Exception("File not found: " . $imagePath);

    $fileSize = filesize($imagePath);
    $lastModified = filemtime($imagePath);
    $imageSize = getimagesize($imagePath);

    foreach ($mergedOptions as $field => $enabled) {
        if (!$enabled) continue;
        switch ($field) {
            case 'resolution': $result[$field] = $imageSize[0] . 'x' . $imageSize[1]; break;
            case 'size': $result[$field] = formatBytes($fileSize); break;
            case 'last_time': $result[$field] = date('Y-m-d H:i:s', $lastModified); break;
            case 'bit_depth':
                if (extension_loaded('imagick')) {
                    $imagick = new Imagick($imagePath);
                    $result[$field] = $imagick->getImageDepth() . '位';
                    $imagick->clear(); $imagick->destroy();
                } else {
                    $result[$field] = "需要Imagick支持";
                }
                break;
            case 'exif':
                if (function_exists('exif_read_data')) {
                    $exif = @exif_read_data($imagePath);
                    if ($exif !== false) {
                        $desiredExifFields = [
                            'DateTimeOriginal', 'ExposureTime', 'FNumber', 'ISOSpeedRatings', 'FocalLength', 'Model', 'Software', 'ImageDescription'
                        ];
                        $result[$field] = [];
                        foreach ($desiredExifFields as $exifKey) {
                            if (isset($exif[$exifKey])) $result[$field][$exifKey] = $exif[$exifKey];
                        }
                        if (empty($result[$field])) $result[$field] = "NULL";
                    } else {
                        $result[$field] = "NULL";
                    }
                } else {
                    $result[$field] = "需要EXIF扩展支持";
                }
                break;
            default: $result[$field] = "Unknown field: {$field}";
        }
    }
    return $result;
}

function ENVManage($envPath, $action, $key, $value = null) {
    if (!file_exists($envPath)) return false;
    
    $envContent = file_get_contents($envPath);
    if ($envContent === false) return false;

    $lines = explode("\n", $envContent);
    $existingFields = [];
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($currentKey, $currentValue) = explode('=', $line, 2);
            $existingFields[trim($currentKey)] = trim($currentValue);
        }
    }

    $updated = false;
    switch ($action) {
        case 'add':
            if (!isset($existingFields[$key])) { $lines[] = "$key=$value"; $updated = true; }
            break;
        case 'delete':
            if (isset($existingFields[$key])) {
                $lines = array_filter($lines, function ($line) use ($key) { return !(strpos($line, "$key=") === 0 && strpos($line, '=') !== false); });
                $updated = true;
            }
            break;
        case 'update':
            $found = false;
            foreach ($lines as &$line) {
                if (strpos($line, "$key=") === 0) {
                    $line = "$key=$value";
                    $found = true; break;
                }
            }
            if (!$found) { $lines[] = "$key=$value"; }
            $updated = true;
            break;
        default: die('action 变量有误');
    }

    if ($updated) {
        $newContent = implode("\n", $lines);
        return (file_put_contents($envPath, $newContent) !== false);
    }
    return true;
}

function cachev($link) {
    $ver = trim($_ENV['DEV_V']);
    $pathInfo = pathinfo($link);
    $dirname = $pathInfo['dirname'] ?? '.';
    $filename = $pathInfo['filename'] ?? '';
    $extension = $pathInfo['extension'] ?? '';
    $URLPath = "/{$dirname}/{$filename}.{$ver}.{$extension}";
    $URLPath2 = "/{$dirname}/{$filename}.{$extension}";
    $DirPath = _DIR_() . $dirname . "/{$filename}.{$ver}.{$extension}";

    if (APP_MODE === 'development') return $URLPath2;
    if (!file_exists($DirPath)) $URLPath = $URLPath2;
    return $URLPath;
}

function processFilesWithVersion(array $filePaths, string $oldVersion, string $newVersion, bool $upEnv) {
    foreach ($filePaths as $filePath) {
        $pathInfo = pathinfo($filePath);
        $dirname = $pathInfo['dirname'] ?? '.';
        $filename = $pathInfo['filename'] ?? '';
        $extension = $pathInfo['extension'] ?? '';
        $oldFilePath = $dirname . DIRECTORY_SEPARATOR . "{$filename}.{$oldVersion}.{$extension}";
        $newFilePath = $dirname . DIRECTORY_SEPARATOR . "{$filename}.{$newVersion}.{$extension}";
        if (file_exists($oldFilePath)) {
            if ($upEnv) {
                if (!unlink($oldFilePath)) { echo "警告：无法删除旧版本文件 '{$oldFilePath}'，已跳过\n"; return false; }
                if (!copy($filePath, $newFilePath)) { echo "警告：无法拷贝文件 '{$filePath}' 到 '{$newFilePath}'，已跳过\n"; return false; }
                $file = _DIR_() . 'kernel/config/version.conf';
                ENVManage($file, 'update', 'DEV_V', $newVersion);
            }
        } else {
            $pattern = $dirname . DIRECTORY_SEPARATOR . "{$filename}.*.{$extension}";
            $allVersionFiles = glob($pattern);
            if (!empty($allVersionFiles)) {
                foreach ($allVersionFiles as $versionedFile) {
                    if (!unlink($versionedFile)) { echo "警告：无法删除版本文件 '{$versionedFile}'\n"; return false; }
                }
            }
            if (!copy($filePath, $newFilePath)) { echo "警告：无法拷贝文件 '{$filePath}' 到 '{$newFilePath}'，已跳过\n"; return false; }
            $file = _DIR_() . 'kernel/config/version.conf';
            ENVManage($file, 'update', 'DEV_V', $newVersion);
        }
    }
    return true;
}

$dir = _DIR_() . 'kernel/asset/';
$filePath = [
    "{$dir}css/main.css", "{$dir}css/settings.css", "{$dir}css/icon-main.css", "{$dir}css/icon-icomoon.css",
    "{$dir}js/main.js", "{$dir}js/module.js", "{$dir}js/settings.js"
];

function updateResourceCache($filePath, $upEnv = true) {
    if (APP_MODE === 'development') return;
    $random = time();
    $newVer = processFilesWithVersion($filePath, $_ENV['DEV_V'], $random, $upEnv);
    if ($newVer !== false) return true; else return false;
}

function getDomain() {
    $protocol = 'http://';
    $host = $_SERVER['HTTP_HOST'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
        $protocol = $_SERVER['HTTP_X_FORWARDED_PROTO'] . '://';
    } elseif (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        $protocol = 'https://';
    }
    return $protocol . $host;
}

function updateSitemap() {
    $sitemap = new SitemapGenerator(getDomain(), _DIR_() . 'sitemap.xml');
    $list = $_ENV['SITE_MAP'];
    $arr = explode(',', $list);
    $query = "SELECT C_date, C_tag, id FROM content WHERE C_hidden = 0 AND C_archive = 0";
    foreach ($arr as $tag) { $query .= " OR C_tag = '$tag'"; }
    $upSiteMap = DataBase::getInstance()->fetchAll($query);
    
    foreach ($upSiteMap as $item) {
        $sitemap->addUrl("{$item['C_tag']}/{$item['id']}.html", $item['C_date'], 'never', 1.0);
    }
    
    if ($sitemap->generate()) return $sitemap->getUrlCount(); else return false;
}

function curlRequest($url, $options = []) {
    $defaults = [
        'method' => 'GET', 'post_data' => null, 'headers' => [], 'timeout' => 30, 'ssl_verify' => true,
        'ca_cert' => null, 'follow_redirects' => true
    ];
    $options = array_merge($defaults, $options);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $options['timeout']);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($options['method']));
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, $options['follow_redirects']);
    
    $postData = $options['post_data'];
    if ($postData !== null) {
        if (is_array($postData)) {
            if (isset($options['headers']['Content-Type']) && strpos($options['headers']['Content-Type'], 'application/json') !== false) {
                $postData = json_encode($postData);
            } else {
                $postData = http_build_query($postData);
            }
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    }

    if (!empty($options['headers'])) {
        $headers = [];
        foreach ($options['headers'] as $key => $value) {
            if (is_int($key)) { $headers[] = $value; } else { $headers[] = "$key: $value"; }
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    }

    if ($options['ssl_verify']) {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
        if ($options['ca_cert']) { curl_setopt($ch, CURLOPT_CAINFO, $options['ca_cert']); }
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
        'http_code' => $httpCode
    ];
}

// 清理一下定时任务（保持原样但确保语法正确）
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
                    DataBase::getInstance()->update("UPDATE content SET C_archive = ?, C_date = ?, C_tag = ? WHERE id = ?", [0, $date, $tag, $id]);
                    JsonEditor::delete($filePath, $id);
                    updateCalendar($date, 1);
                    updateTag($tag, 1, $hid);
                } catch (Exception $e) { }
            }
        }
    }
})();
