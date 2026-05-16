<?php
$title = $_ENV['SITE_TITLE'];
$twittype = 'summary_large_image';
$content = $_ENV['SITE_DESCRIPTION'];
$media =getDomain().'/kernel/asset/img/apple-touch-icon.png';
if ($share != null) {
    $meta = DataBase::getInstance()->fetch("SELECT LEFT(C_title,100)AS short_title, LEFT( C_content ,100) AS short_content,C_media FROM content WHERE id=?", [$share]);
    $_media = json_decode($meta['C_media'], true);
    strlen($meta['short_title'])>0?$title = $meta['short_title']:'';
    strlen($meta['short_content'])>0?$content = preg_replace(['/(&nbsp;|[ ])+/', '/"/'], [' ','\''],strip_tags($meta['short_content'])):'';
    $twittype = 'summary';
    if (count($_media) > 0 && count($_media['media']) > 0) {
        $name = $_media['media'][0];
        if (in_array($name[1], ['jpg', 'jpeg', 'png', 'gif', 'webp'])){
            $media = getDomain() . '/uploads/' . $_media['dir'] . '/' . $name[0] . '.' . $name[1];
        }else if(in_array($name[1], ['mp4', 'mov', 'mkv', 'webm', 'avi'])){
            $media = getDomain() . '/uploads/' . $_media['dir'] . '/thum-' . $name[0] . '.webp';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="<?php echo $_ENV['SITE_LANG']; ?>">

<head>
    <meta charset="<?php echo $_ENV['SITE_CHARSET']; ?>">
    <meta name="viewport"
        content="width=device-width, initial-scale=1.0<?php echo $_ENV['SITE_ZOOM'] == 1 ? "" : ' ,user-scalable=no'; ?>">
    <meta name="keywords" content="<?php echo $_ENV['SITE_KEYWORDS']; ?>">
    <meta name="description" content="<?php echo $content; ?>">
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?php echo $title; ?>">
    <meta property="og:description" content="<?php echo $content; ?>">
    <meta property="og:url" content="<?php echo getDomain() ?>">
    <meta property="og:site_name" content="<?php echo $_ENV['SITE_TITLE']; ?>">
    <meta property="og:image" content="<?php echo $media; ?>">
    <meta property="og:image:alt" content="网站主图">
    <meta property="og:locale" content="zh_CN">
    <meta name="twitter:card" content="<?php echo $twittype; ?>">
    <meta name="twitter:title" content="<?php echo $title; ?>">
    <meta name="twitter:description" content="<?php echo $content; ?>">
    <meta name="twitter:site" content="<?php echo preg_match('/https?:\/\/twitter\.com\/([a-zA-Z0-9_@]+)/i', $_ENV['SOCIAL_MEDIA'], $matches) ? $matches[1] : '' ?>">
    <meta name="twitter:image" content="<?php echo $media; ?>">
    <meta name="twitter:image:alt" content="网站主图">
    <meta itemprop="name" content="<?php echo $title; ?>">
    <meta itemprop="image" content="<?php echo $media; ?>">
    <link rel="apple-touch-icon" href="/kernel/asset/img/apple-touch-icon.png">
    <link rel="icon" href="/kernel/asset/img/favicon.png" type="image/png">
    <link rel="stylesheet" href="<?php echo cachev("kernel/asset/css/icon-icomoon.css") ?>" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="<?php echo cachev("kernel/asset/css/icon-main.css") ?>" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="<?php echo cachev("kernel/asset/css/main.css") ?>">
    <?php echo $_SESSION['is_lg_ok'] ? '    <link rel="stylesheet" href="' . cachev("kernel/asset/css/settings.css") . '" media="print" onload="this.media=\'all\'">
' : ''; ?>
    <script src="<?php echo cachev("kernel/asset/js/module.js") ?>" defer></script>
    <script src="<?php echo cachev("kernel/asset/js/main.js") ?>" defer></script>
    <?php echo $_SESSION['is_lg_ok'] ? '    <script src="' . cachev("kernel/asset/js/settings.js") . '"></script>
' : ''; ?>
    <title><?php echo $_ENV['SITE_TITLE']; ?></title>
</head>
<style>
    :root {
        <?php
        // 定义允许的 CSS 变量名和默认值
        $cssVars = [
            'MAIN_COLOR',
            'BACKGROUND_COLOR',
            'CARD_COLOR',
            'CARD2_COLOR',
            'TITLE_COLOR',
            'CONTENT_COLOR',
            'DESC_COLOR',
            'TOOL_COLOR',
            'BUTTON_COLOR',
            'INPUT_COLOR',
            'TAG_COLOR'
        ];

        // 遍历并输出安全的 CSS 变量
        foreach ($cssVars as $varName) {
            $value = $_ENV[$varName];
            // 过滤 CSS 颜色值（仅允许十六进制、rgb() 或颜色名称）
            echo "  --{$varName}: {$value};\n";
        }
        ?>
    }
</style>

<body>
    <div id="app" class="no-transition" data-uid="<?php echo trim($_ENV['UID']) ?>" <?php echo APP_MODE == 'development' ? ' data-dev="true"' : '' ?>>