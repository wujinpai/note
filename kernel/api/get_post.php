<?php
$cookie = $_COOKIE['auth_token'] ?? null;
$session = $_SESSION['auth_token'] ?? null;
if (!isset($cookie) || !isset($session) || $cookie !== $session) {
    $is_login = false;
} else {
    $is_login = true;
}

// 获取POST参数并设置默认值
$id = (int) $_POST['id'] ?? -1;
$search = $_POST['search'] ?? '';
$sort = $_POST['sort'] ?? 0;
$date_range = $_POST['date_range'] ?? [];
$date = $_POST['date'] ?? '';
$tag = $_POST['tag'] ?? -1;
$mode = $_POST['mode'] ?? 0;
$page = $_POST['page'] ?? 0;

// 验证并清理输入
$page = (int) $page;
$tag = (int) $tag;
$sort = (int) $sort;
$mode = (int) $mode;
// 数据库连接
$db = DataBase::getInstance();

// 构建基础查询
$query = "SELECT * FROM content WHERE 1=1";
$params = [];
$paramTypes = [];

// 添加搜索条件
if (!empty($search)) {
    $search = "%$search%";
    switch ($mode) {
        case 0: // 模糊搜索
            $query .= " AND (C_title LIKE ? OR C_content LIKE ?)";
            $params[] = $search;
            $params[] = $search;
            $paramTypes[] = 's';
            $paramTypes[] = 's';
            break;
        case 1: // 高级搜索(简单实现)
            $keywords = array_filter(explode(',', $search), 'trim'); // 分割关键词并去除空值
            if (!empty($keywords)) {
                $query .= " AND (";
                $conditions = [];

                foreach ($keywords as $keyword) {
                    $keyword = "%" . trim($keyword) . "%"; // 去除单个关键词前后空格并添加通配符
                    // 每个关键词搜索所有字段（融合搜索）
                    $conditions[] = "(C_title LIKE ? OR C_content LIKE ? OR C_location LIKE ? OR C_tag LIKE ? OR C_weather LIKE ?)";

                    // 每个关键词需要绑定5次（因为有5个字段）
                    for ($i = 0; $i < 5; $i++) {
                        $params[] = $keyword;
                        $paramTypes[] = 's';
                    }
                }

                $query .= implode(" AND ", $conditions) . ")"; // 用AND连接多个关键词条件
            }
            break;
    }
}

// 在构建查询时，添加隐藏内容的过滤条件
if (!$is_login) {
    $query .= " AND C_hidden = 0"; // 普通用户看不到隐藏内容
}
// 添加标签过滤
if ($tag > -1) {
    $tagInfo = DataBase::getInstance()->fetch("SELECT * FROM tags WHERE id = ?", [$tag]); //获取单条
    if ($tagInfo) {
        $query .= " AND C_tag = ?";
        $params[] = $tagInfo['T_name'];
        $paramTypes[] = 's';
    }
}
// 隐藏标签的内容（仅对非管理员）
if (!$is_login) {
    $query .= " AND (SELECT T_hidden FROM tags WHERE T_name = C_tag) = 0";
}

// 添加日期范围过滤
if (!empty($date_range)) {
    $dates = json_decode($date_range, true);
    foreach ($dates as $i => $item) {
        $dates[$i] = preg_replace('/[^\d\-\s\/,]/', '', $item);
    }
    if (is_array($dates)) {
        if (count($dates) == 2 && strlen($dates[0]) !== 0 && strlen($dates[1]) !== 0) {
            // 两个日期都存在的情况
            $startDate = $dates[0];
            $endDate = $dates[1] . " 23:59:59";
            $query .= " AND C_date BETWEEN ? AND ?";
            $params[] = $startDate;
            $params[] = $endDate;
            $paramTypes[] = 's';
            $paramTypes[] = 's';
            // 只有一个日期的情况
        } elseif (isset($dates[0]) && strlen($dates[0]) !== 0) {
            // 只有第一个日期 - 输出该日期之后的内容
            $startDate = $dates[0];
            $query .= " AND C_date >= ?";
            $params[] = $startDate;
            $paramTypes[] = 's';
        } elseif (isset($dates[1]) && strlen($dates[1]) !== 0) {
            // 只有第二个日期 - 输出该日期之前的内容
            $endDate = $dates[1];
            $query .= " AND C_date <= ?";
            $params[] = $endDate;
            $paramTypes[] = 's';
        }
    }
}

// 添加单日期过滤
if (!empty($date)) {
    $query .= $_ENV['CALENDAR_SEARCH'] == 'only' ? " AND DATE(C_date) = ?" : " AND C_date >= ?";
    $params[] = $date;
    $paramTypes[] = 's';
}

// 添加archive过滤条件（重点优化部分）
if ($sort == 4) {
    if ($is_login) {
        // 管理员：仅显示archive=1的内容
        $query .= " AND C_archive = 1";
    } else {
        // 普通用户：强制无结果（避免通过SQL注入绕过）
        $query .= " AND 1=0";
    }
} else {
    // 非sort=4时，确保不显示任何archive内容（即使通过SQL注入尝试）
    $query .= " AND C_archive = 0";
}

if ($tag == -999) {
    $query .= " AND C_media LIKE ?";
    $params[] = '%Enc_%';
    $paramTypes[] = 's';
}
if ($id > 0) {
    $query .= " AND id LIKE ?";
    $params[] = $id;
    $paramTypes[] = 's';
}


// 添加排序条件
switch ($sort) {
    case 0: // 默认顺序(置顶优先)
        $query .= " ORDER BY C_pin DESC, C_date DESC";
        break;
    case 1: // 时间降序 
        $query .= " ORDER BY C_date DESC";
        break;
    case 2:// 时间升序
        $query .= " ORDER BY C_date ASC";
        break;
    case 3: // 隐藏优先
        if (!$is_login) {
            die(json_encode(["code" => 10401, 'info' => 'no login']));
        }
        $query .= " ORDER BY C_hidden DESC, id DESC";
        break;
    case 4: // 仅archive帖子（已在上面处理）
        if (!$is_login) {
            die(json_encode(["code" => 10401, 'info' => 'no login']));
        }
        $query .= " ORDER BY id ASC";
        break;
    default:
        $query .= " ORDER BY id ASC";
}

// 获取总记录数

$countQuery = "SELECT COUNT(*) FROM ($query) AS temp";
$stmt = $db->query($countQuery, $params);

$totalItems = $stmt->fetchColumn();
$totalPages = max(1, ceil($totalItems / $_ENV['POST_COUNT']));

// 验证页码
$offset = $page * $_ENV['POST_COUNT'];

// 添加分页限制
$query .= " LIMIT ? OFFSET ?";
$params[] = (int) $_ENV['POST_COUNT'];
$params[] = (int) $offset;
$paramTypes[] = 'i';
$paramTypes[] = 'i';

// 执行主查询
$result = $db->fetchAll($query, $params);

// 处理结果
$Date = [];

$view_date = date('Y-m-d H:iz', time() - $_ENV['VIEW_RANGE'] * 86400);
$blocked = $_ENV['VIEW_RANGE'] !== '0' && !$is_login;
$blocked_data = $blocked ? $_ENV['VIEW_RANGE'] : 0;
$coninue = false;
foreach ($result as $value) {
    if ($value['C_date'] < $view_date && $blocked) {
        $coninue = true;
        break;
    }
    $item = [
        "id" => $value['id'],
        "date" => $value['C_date'],
        "tag" => $value['C_tag'],
        "title" => $value['C_title'],
        "content" => $value['C_content'],
        "hidden" => $value['C_hidden'],
        "pin" => $value['C_pin'],
        "weather" => $value['C_weather'],
        "location" => $value['C_location'],
        "pics" => $value['C_media'],
        "archive" => $value['C_archive'],
        'is_hidden' => $_ENV['POST_HIDDEN_TIP']
    ];
    $Date[] = $item;
}

// 添加分页信息
$pagination = [
    "current_page" => $page + 1,
    "total_pages" => $totalPages,
    "total_items" => $totalItems,
    "items_per_page" => (int) $_ENV['POST_COUNT'],
    "has_previous" => $page > 0,
    "has_next" => $coninue ? false : $page + 1 < $totalPages,
    "avg" => $id == -1 ? -1 : ($coninue ? $blocked_data : 0)
];

//登录可见
if ($_ENV['SITE_VISIBILITY'] == "private") {
    if (!isset($cookie) || !isset($session) || $cookie !== $session) {
        $Date = [];
        $pagination = [
            "public"=>'1'
        ];
    }
}

// 返回JSON响应
header('Content-Type: application/json');
echo json_encode([
    "data" => $Date,
    "pagination" => $pagination
], JSON_UNESCAPED_UNICODE);