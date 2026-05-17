<?php
// 定义dev_mode先，然后直接启用开发模式显示错误
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

// 启用调试模式，方便安装时看到错误
dev_mode(true);

function config($dir) {
    $envContent = file_get_contents($_SERVER['DOCUMENT_ROOT'] . '/' . $dir);
    $lines = explode("\n", $envContent);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value, "'\" "); // 处理引号和空格
        }
    }
}
config('kernel/config/version.conf');

$domain = str_replace('www.', '', $_SERVER['HTTP_HOST']);
$version = trim($_ENV['VERSION']);
$UID = trim($_ENV['UID']);

function getRandomBase64Key($value) {
    $salt = random_bytes(16);
    $iterations = 100000;
    return base64_encode(hash_pbkdf2('sha256', $value, $salt, $iterations, 32, true));
}

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

function php_version_8_1() {
    return version_compare(PHP_VERSION, '8.1.0', '>=');
}

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

function checkServerAndRewriteSupport() {
    $serverSoftware = $_SERVER['SERVER_SOFTWARE'] ?? '';
    $result = [
        'server_type' => 'Unknown',
        'rewrite_supported' => false,
    ];

    // 1. 检测服务器类型
    if (stripos($serverSoftware, 'apache') !== false) {
        $result['server_type'] = 'Apache';
    } elseif (stripos($serverSoftware, 'nginx') !== false) {
        $result['server_type'] = 'Nginx';
    } elseif (stripos($serverSoftware, 'microsoft-iis') !== false) {
        $result['server_type'] = 'IIS';
    } elseif (stripos($serverSoftware, 'lighttpd') !== false) {
        $result['server_type'] = 'Lighttpd';
    }

    // 2. 检测伪静态支持
    if ($result['server_type'] === 'Apache') {
        // Apache: 检查 mod_rewrite
        if (function_exists('apache_get_modules')) {
            $modules = apache_get_modules();
            $result['rewrite_supported'] = in_array('mod_rewrite', $modules);
        } else {
            // 如果无法检测（如 PHP-FPM），尝试通过 $_SERVER 变量判断
            $result['rewrite_supported'] = (
                isset($_SERVER['REDIRECT_URL']) ||
                isset($_SERVER['ORIGINAL_URI']) ||
                isset($_GET['rewrite_test']) // 可配合测试链接
            );
        }
    } elseif ($result['server_type'] === 'Nginx') {
        // Nginx: 无法自动检测，但我们已经手动配置了，所以默认返回 true
        // 或者尝试通过特定变量检测
        $result['rewrite_supported'] = true;
    } else {
        // 其他服务器（如 IIS、Lighttpd）
        $result['rewrite_supported'] = (
            isset($_SERVER['REDIRECT_URL']) ||
            isset($_SERVER['ORIGINAL_URI']) ||
            isset($_SERVER['HTTP_X_REWRITE_URL']) // IIS 可能使用的变量
        );
    }

    return $result;
}
$serverInfo = checkServerAndRewriteSupport();
$acceptLanguage = $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '';

function getPrimaryLanguage($acceptLanguage) {
    $langs = explode(',', $acceptLanguage); // 按逗号分割
    if (empty($langs))
        return 'en'; // 默认返回英语

    // 提取第一个语言标签（可能包含权重，如 "en-US;q=0.9"）
    $primaryLang = explode(';', $langs[0])[0];

    // 标准化语言代码（如 "zh-CN" → "zh" 或保留完整格式）
    return $primaryLang;
}

$userLanguage = getPrimaryLanguage($acceptLanguage);

$info = [
    "SERVER_TYPE" => $serverInfo['server_type'],
    "PHP_VERSION" => PHP_VERSION,
    "PHP_VERSION_SUP" => version_compare(PHP_VERSION, '8.1.0', '>='),
    "PHP_GD" => gd_webp_supported() > 0,
    "PHP_GD_PLUS" => gd_webp_supported() == 1,
    "PHP_IMAGICK" => imagick_webp_supported(),
    "PHP_EXIF" => function_exists('exif_read_data'),
    "STATIC" => $serverInfo['rewrite_supported']
];

$lang = @$_GET['lang'];
$db_localhost = @$_GET['db_localhost'];
$db_table = @$_GET['db_dbname'];
$db_port = @$_GET['db_port'];
$db_name = @$_GET['db_name'];
$db_pass = @$_GET['db_pass'];
$site_title = @$_GET['site_title'];
$site_keys = @$_GET['site_keywords'];
$site_desc = @$_GET['site_description'];
$site_zone = @$_GET['time_zome'];
$site_name = @$_GET['user_name'];
$site_sign = @$_GET['user_sign'];
$site_pass = @$_GET['user_pass'];
$site_mail = @$_GET['user_mail'];
$site_location = @$_GET['default_location'];
$site_static = @$_GET['static'];

$db_link = false;
$db_create = false;
$ver_up = false;
$env_up = false;
$install = false;
$get_db = false;
$get_env = false;

if ($db_localhost !== null) {
    // 使用本地资源而不是远程API
    $sql_file = __DIR__ . '/config/install.sql';
    $env_template = __DIR__ . '/config/env.template';
    
    $db = ['status' => false, 'data' => '', 'error' => ''];
    $env = ['status' => false, 'data' => '', 'error' => ''];
    
    // 读取本地SQL文件
    if (file_exists($sql_file)) {
        $db['data'] = file_get_contents($sql_file);
        $db['status'] = true;
        $get_db = true;
    } else {
        $db['error'] = "SQL file not found: $sql_file";
    }
    
    // 读取本地env模板
    if (file_exists($env_template)) {
        $env['data'] = file_get_contents($env_template);
        $env['status'] = true;
        $get_env = true;
    } else {
        $env['error'] = "Env template not found: $env_template";
    }
    
    // 保存调试信息
    $debug_db = $db;
    $debug_env = $env;

    if ($get_db == true && $get_env == true) {
        try {
            $dsn = "mysql:host={$db_localhost};port={$db_port};dbname={$db_table}";
            $pdo = new PDO($dsn, $db_name, $db_pass);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $db_link = true;
            try {
                $sqlContent = trim($db['data'] ?? '');
                if (empty($sqlContent)) {
                    $db_create = 'Remote SQL data is empty';
                } else {
                    // 拆分 SQL 语句，逐个执行
                    $statements = array_filter(array_map('trim', explode(';', $sqlContent)));
                    foreach ($statements as $stmt) {
                        if (!empty($stmt)) {
                            $pdo->exec($stmt);
                        }
                    }
                    $db_create = true;
                }
            } catch (PDOException $e) {
                $db_create = 'SQL Error: ' . $e->getMessage();
            }
            $pdo = null;
        } catch (PDOException $e) {
            $db_link = 'Connection Error: ' . $e->getMessage();
        }
    }
    $ver = './config/version.conf';
    $_ver_ = ENVManage($ver, 'update', 'SITE_URL', $domain);
    $_ver_ = ENVManage($ver, 'update', 'INSTALL_DATE', date('Y-m-d H:i'));
    $_ver_ = ENVManage($ver, 'update', 'IMAGICK_PIC', $info['PHP_IMAGICK'] ? 'true' : 'false');
    $_ver_ = ENVManage($ver, 'update', 'GD_PIC', $info['PHP_GD'] ? 'true' : 'false');

    if ($_ver_) {
        $ver_up = true;
    } else {
        $ver_up = 'version.conf Create Error';
    }

    $env_ = './config/.env';
    if (!empty($env['data'])) {
        file_put_contents($env_, $env['data']);
    }
    $random1 = getRandomBase64Key('abc');
    $random2 = getRandomBase64Key('def');
    $random3 = getRandomBase64Key('ghi');
    
    // 前端登录时会计算 SHA256(password + domain + UID)
    // 所以安装时也要模拟这个流程
    $pre_hash = hash('sha256', $site_pass . $domain . $UID);
    $user_pass_array = pass_encrypt($pre_hash, $random2);
    $user_pass = isset($user_pass_array['hash']) ? $user_pass_array['hash'] : '';
    $db_host = aes256Encrypt($db_localhost, $random3);
    $db_user = aes256Encrypt($db_name, $random3);
    $db_pass = aes256Encrypt($db_pass, $random3);
    $_env_ = ENVManage($env_, 'update', 'SITE_TITLE', $site_title);
    $_env_ = ENVManage($env_, 'update', 'SITE_KEYWORDS', $site_keys);
    $_env_ = ENVManage($env_, 'update', 'SITE_DESCRIPTION', $site_desc);
    $_env_ = ENVManage($env_, 'update', 'SITE_TIME_ZONE', $site_zone);
    $_env_ = ENVManage($env_, 'update', 'SITE_LANG', $lang);
    $_env_ = ENVManage($env_, 'update', 'USER_NAME', $site_name);
    $_env_ = ENVManage($env_, 'update', 'USER_SIGN', $site_sign);
    $_env_ = ENVManage($env_, 'update', 'USER_EMAIL', $site_mail);
    $_env_ = ENVManage($env_, 'update', 'DEFAULT_TAG', '默认');
    $_env_ = ENVManage($env_, 'update', 'DEFAULT_LOCATION', $site_location);
    $_env_ = ENVManage($env_, 'update', 'PSEUDO_STATIC', $site_static);
    $_env_ = ENVManage($env_, 'update', 'API_KEY', $random1);
    $_env_ = ENVManage($env_, 'update', 'PASS_SALT', $random2);
    $_env_ = ENVManage($env_, 'update', 'PASS_HASH', $user_pass);
    $_env_ = ENVManage($env_, 'update', 'DB_HOST', $db_host);
    $_env_ = ENVManage($env_, 'update', 'DB_NAME', $db_table);
    $_env_ = ENVManage($env_, 'update', 'DB_USER', $db_user);
    $_env_ = ENVManage($env_, 'update', 'DB_PASS', $db_pass);
    $_env_ = ENVManage($env_, 'update', 'DB_PORT', $db_port);
    $_env_ = ENVManage($env_, 'update', 'DB_KEY', $random3);

    if ($_env_) {
        $env_up = true;
    } else {
        $env_up = '.env Create Error';
    }
    $install = true;
}
?>

<!DOCTYPE html>
<html lang="<?php echo $userLanguage ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>install</title>
</head>
<style>
    p,
    p>span {
        text-align: center;
        height: 24px;
        position: relative;
        background-color: white;
        z-index: 2;
        display: flex;
        justify-content: center;
    }

    p>span {
        padding: 0 8px;
    }

    p::before {
        position: absolute;
        content: "";
        width: 100%;
        height: 24px;
        outline: 1px dashed;
        outline-offset: -11px;
        display: block;
        z-index: 1;
    }
</style>

<body>
    <form action="" method="get" onsubmit="return validateForm()">
        <h1>日记程序 Beta
            <select name="lang" id="lang">
                <option value="en_US" <?php echo ($userLanguage === 'en-US') ? 'selected' : ''; ?>>English</option>
                <option value="zh_CN" <?php echo ($userLanguage === 'zh-CN') ? 'selected' : ''; ?>>中文</option>
                <option value="ja" <?php echo ($userLanguage === 'ja') ? 'selected' : ''; ?>>日本語</option>
                <option value="zh_TW" <?php echo ($userLanguage === 'zh-TW') ? 'selected' : ''; ?>>台湾</option>
                <option value="zh_HK" <?php echo ($userLanguage === 'zh-HK') ? 'selected' : ''; ?>>香港</option>
                <option value="ko" <?php echo ($userLanguage === 'ko') ? 'selected' : ''; ?>>한국어</option>
            </select>
        </h1>
        <pre>
    程序版本: <?php echo $version ?>
            
    服务器类型: <?php echo $info['SERVER_TYPE'] ?>
    
    PHP 版本: <?php echo $info['PHP_VERSION'] . ($info['PHP_VERSION_SUP'] ? " ✅" : " 版本低于8.1可能无法运行 ❌"); ?>

    PHP GD: <?php echo $info['PHP_GD'] ? ($info['PHP_GD_PLUS'] ? "支持无损压缩 ✅" : "支持有损压缩 ✅") : "不支持:无法生成缩略图 ⚠️" ?>

    PHP Imagick: <?php echo $info['PHP_IMAGICK'] ? "支持 ✅" : "不支持 ⚠️" ?>

    PHP EXIF: <?php echo $info['PHP_EXIF'] ? "支持 ✅" : "不支持:灯箱无法显示图片信息 ⚠️" ?>
    
    网站伪静态: <?php echo $serverInfo['rewrite_supported'] ? "支持 ✅" : "不支持 ⚠️" ?>
</pre>
        <?php
        if ($db_localhost !== null) {
            echo '<pre style="color:green;background:#cddc39;">';
            function checkInstallationSteps() {
                global $db_link, $get_db, $get_env, $db_create, $ver_up, $env_up, $install;

                if ($get_db === true) {
                    echo '<br>';
                    echo '      Get DBLIST OK';
                } else {
                    echo '<br>';
                    echo "      <span style='color:#d30000'>DB list Get Error</span>";
                    return false;
                }

                if ($get_env === true) {
                    echo '<br>';
                    echo '      Get ENVLIST OK';
                } else {
                    echo '<br>';
                    echo "      <span style='color:#d30000'>Version list Get Error</span>";
                    return false;
                }

                if ($db_link === true) {
                    echo '<br>';
                    echo '      DB Link OK';
                } else {
                    echo '<br>';
                    echo "      <span style='color:#d30000'>$db_link</span>";
                    return false; // 停止检查，但函数返回false而不是退出整个脚本
                }

                if ($db_create === true) {
                    echo '<br>';
                    echo '      DB Create OK';
                } else {
                    echo '<br>';
                    echo "      <span style='color:#d30000'>$db_create</span>";
                    return false;
                }

                if ($ver_up === true) {
                    echo '<br>';
                    echo '      version.conf Create OK';
                } else {
                    echo '<br>';
                    echo "      <span style='color:#d30000'>$ver_up</span>";
                    return false;
                }

                if ($env_up === true) {
                    echo '<br>';
                    echo '      env Create OK';
                } else {
                    echo '<br>';
                    echo "      <span style='color:#d30000'>$env_up</span>";
                    return false;
                }

                if ($install === true) {
                    echo '<br>';
                    echo '      Install OK';
                } else {
                    echo '<br>';
                    echo "      <span style='color:#d30000'>$install</span>";
                    return false;
                }

                return true; // 所有检查都通过
            }

            // 调用检查函数
            $installationOk = checkInstallationSteps();
            echo '</pre>';
        }
        ?>
        <p><span>INSTALL</span></p>
        <pre>
    数据库
    <input name="db_localhost" type="text" value="localhost" placeholder="数据库地址" required>
    数据库名
    <input name="db_dbname" type="text" value="" placeholder="数据库表名称" required>
    端口号
    <input name="db_port" type="number" value="3306" placeholder="数据库端口号" required>
    数据库用户
    <input name="db_name" type="text" value="" placeholder="数据库账户" required>
    连接密码
    <input name="db_pass" type="text" value="" placeholder="数据库密码" required>
    <br>
    网站标题
    <input name="site_title" type="text" value="" placeholder="网站标题">
    关键词
    <input name="site_keywords" type="text" value="" placeholder="网站关键词">
    网站描述
    <input name="site_description" type="text" value="" placeholder="网站描述">
    <br>
    用户名称
    <input name="user_name" value="" placeholder="用户名称">
    用户签名
    <input name="user_sign" type="text" value="" placeholder="用户签名">
    网站登录密码
    <input name="user_pass" type="text" value="" placeholder="网站登录密码" minlength="4" maxlength="18">
    用户邮箱
    <input name="user_mail" type="mail" value="" placeholder="用户邮箱">
    默认地址
    <input name="default_location" type="text" value="省,市,区" placeholder="默认地址">
    伪静态
    <select name="static" id="static">
        <option value="off" selected>关</option>
        <option value="on" <?php echo $info['STATIC'] ? '' : 'disabled' ?>>开</option>
    </select>
    <br>
    <input type="submit" value="install"> <input type="reset" value="reset">
    <p></p>
    时区选择
    <select name="time_zome" id="timezone">
    </select>
    </form>
    
    UID:<?php echo "<b>$UID</b>" ?>

    当前为Beta版本，稳定性较差，BUG提交
    邮箱: puffton@mail.com
    或者 微信: -77449
</pre>
        <script>
            document.addEventListener('DOMContentLoaded', function () {
                const timezoneSelect = document.getElementById('timezone');
                const localTimeDisplay = document.getElementById('local-time');

                const timezones = Intl.supportedValuesOf('timeZone');
                timezones.sort((a, b) => {
                    const offsetA = new Date().toLocaleString('en-US', { timeZone: a, timeZoneName: 'short' }).split(' ').pop();
                    const offsetB = new Date().toLocaleString('en-US', { timeZone: b, timeZoneName: 'short' }).split(' ').pop();
                    return offsetA.localeCompare(offsetB);
                });
                timezones.forEach(timezone => {
                    const option = document.createElement('option');
                    option.value = timezone;

                    const timezoneName = new Date().toLocaleString('en-US', {
                        timeZone: timezone,
                        timeZoneName: 'long'
                    }).split(' ').slice(2).join(' ');
                    const offset = new Date().toLocaleString('en-US', {
                        timeZone: timezone,
                        timeZoneName: 'short'
                    }).split(' ').pop();

                    option.textContent = `${timezone}`;
                    timezoneSelect.appendChild(option);
                });

                const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                if (userTimezone && timezones.includes(userTimezone)) {
                    timezoneSelect.value = userTimezone;
                }
            });

            async function hashString(algorithm, str) {
                const encoder = new TextEncoder();
                const data = encoder.encode(str);
                const hashBuffer = await crypto.subtle.digest(algorithm, data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                return hashHex;
            }

            async function validateForm() {
                const domain = window.location.hostname.replace('www.', '');
                const pass = document.querySelector('input[name=user_pass]');
                const uid = document.querySelector('b').innerText;
                hashString('SHA-256', pass.value + domain + uid)
                    .then(e => {
                        pass.value = e;
                    })
            }
        </script>
</body>

</html>