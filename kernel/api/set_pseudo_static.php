<?php
// 安全设置
$mode = $_POST['mode'] ?? '';
$response = ['code' => 0, 'success' => false, 'message' => ''];

// 验证模式参数
if (!in_array($mode, ['true', 'false'])) {
    $response['code'] = 400;
    $response['message'] = 'Invalid mode parameter';
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// 配置
$htaccessPath = _DIR_() . '.htaccess'; // 使用绝对路径更安全
$ruleToCheck = 'RewriteRule ^([^/]+)/(\d+)\.html$ /?tag=$1&id=$2 [L,QSA,NC]';
$ifModuleStart = "<IfModule mod_rewrite.c>";
$ifModuleEnd = "</IfModule>";

try {
    // 检查文件是否存在
    if (!file_exists($htaccessPath) && $mode == 'false') {
        throw new Exception('File does not exist, nothing to delete');
    }

    // 读取当前内容
    $content = file_exists($htaccessPath) ? file_get_contents($htaccessPath) : '';
    $originalContent = $content;

    // 处理删除模式
    if ($mode == 'false') {
        // 更健壮的删除正则表达式
        $pattern = '/[ \t]*' . preg_quote('RewriteRule ^([^/]+)/(\d+)\.html$ /?tag=$1&id=$2 [L,QSA,NC]', '/') . '[ \t]*(\r?\n)?/';
        $content = preg_replace($pattern, '', $content);

        // 验证是否删除成功
        if (strpos($content, $ruleToCheck) !== false) {
            throw new Exception('Failed to delete rule - pattern not found or deletion incomplete');
        }

        $response['message'] = 'Rule successfully deleted';
    }
    // 处理添加模式
    elseif ($mode == 'true') {
        // 检查规则是否已存在
        if (preg_match('/' . preg_quote($ruleToCheck, '/') . '/', $content)) {
            $response['code'] = 10200;
            $response['success'] = true;
            $response['message'] = 'Rule already exists, no changes made';
            echo json_encode($response, JSON_UNESCAPED_UNICODE);
            exit;
        }

        $ruleToAdd = "    RewriteRule ^([^/]+)/(\d+)\.html$ /?tag=\$1&id=\$2 [L,QSA,NC]";

        // **精准匹配 mod_rewrite.c 块**
        if (preg_match('/' . preg_quote($ifModuleStart, '/') . '(.*?)' . preg_quote($ifModuleEnd, '/') . '/s', $content, $matches)) {
            // 提取 mod_rewrite.c 块内容并清理多余空行
            $rewriteBlock = $matches[0];
            $blockContent = trim($matches[1]); // 去除首尾空格

            // 确保 RewriteEngine On 存在
            if (strpos($blockContent, 'RewriteEngine On') === false) {
                $blockContent = "RewriteEngine On\n" . $blockContent;
            }

            // 添加新规则（确保每行只有一个规则）
            $lines = explode("\n", $blockContent);
            $lines = array_map('trim', $lines); // 去除每行首尾空格
            $lines = array_filter($lines); // 移除空行
            $lines[] = $ruleToAdd; // 添加新规则

            // 重新组合块内容（每行缩进4空格，保留一个空行分隔）
            $newBlockContent = "    " . implode("\n    ", $lines);
            $newRewriteBlock = "$ifModuleStart\n$newBlockContent\n$ifModuleEnd";

            // 替换整个 mod_rewrite.c 块
            $content = str_replace($rewriteBlock, $newRewriteBlock, $content);
        } else {
            // 如果没有 mod_rewrite.c 块，创建新的（自动格式化）
            $newBlock = "$ifModuleStart\n    RewriteEngine On\n    $ruleToAdd\n$ifModuleEnd";
            $content .= ($content === '' ? '' : "\n\n") . $newBlock;
        }

        $response['message'] = 'Rule successfully added';
    }

    // 只有内容发生变化时才写入文件
    if ($content !== $originalContent) {
        if (file_put_contents($htaccessPath, $content) === false) {
            throw new Exception('Failed to write to .htaccess file');
        }
    }

    $response['code'] = 10200;
    $response['success'] = true;

} catch (Exception $e) {
    $response['code'] = 500;
    $response['message'] = 'Error: ' . $e->getMessage();
}

echo json_encode($response, JSON_UNESCAPED_UNICODE);