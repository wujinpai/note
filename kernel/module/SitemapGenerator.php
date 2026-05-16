<?php
class SitemapGenerator {
    private $urls = [];
    private $filename = 'sitemap.xml';
    private $baseUrl = 'https://example.com';

    /**
     * 构造函数
     * @param string $baseUrl 网站基础URL
     * @param string $filename sitemap文件名
     */
    public function __construct($baseUrl = '', $filename = 'sitemap.xml') {
        $this->baseUrl = rtrim($baseUrl, '/') . '/';
        $this->filename = $filename;
    }

    /**
     * 添加URL到sitemap
     * @param string $loc URL地址（相对或绝对）
     * @param string $lastmod 最后修改时间(Y-m-d)
     * @param string $changefreq 更新频率: always|hourly|daily|weekly|monthly|yearly|never
     * @param float $priority 优先级(0.0-1.0)
     */
    public function addUrl($loc, $lastmod = '', $changefreq = '', $priority = '') {
        // 处理相对路径
        if (strpos($loc, 'http') !== 0) {
            $loc = $this->baseUrl . ltrim($loc, '/');
        }

        $url = [
            'loc' => htmlspecialchars($loc, ENT_QUOTES, 'UTF-8')
        ];

        if (!empty($lastmod)) {
            $url['lastmod'] = date('Y-m-d', strtotime($lastmod));
        }
        if (!empty($changefreq)) {
            $url['changefreq'] = $changefreq;
        }
        if ($priority !== '') {
            $priority = floatval($priority);
            $url['priority'] = $priority > 1 ? 1 : ($priority < 0 ? 0 : $priority);
        }

        $this->urls[] = $url;
    }

    /**
     * 批量添加URL
     * @param array $urls URL数组，每个元素可以是字符串或包含URL信息的数组
     */
    public function addUrls(array $urls) {
        foreach ($urls as $url) {
            if (is_string($url)) {
                $this->addUrl($url);
            } elseif (is_array($url)) {
                $this->addUrl(
                    $url['loc'] ?? '',
                    $url['lastmod'] ?? '',
                    $url['changefreq'] ?? '',
                    $url['priority'] ?? ''
                );
            }
        }
    }

    /**
     * 更新已存在的URL
     * @param string $oldLoc 旧的URL位置
     * @param array $newData 新数据
     * @return bool 是否找到并更新
     */
    public function updateUrl($oldLoc, $newData) {
        foreach ($this->urls as &$url) {
            if ($url['loc'] == $oldLoc) {
                if (isset($newData['loc'])) {
                    $url['loc'] = htmlspecialchars($newData['loc'], ENT_QUOTES, 'UTF-8');
                }
                if (isset($newData['lastmod'])) {
                    $url['lastmod'] = date('Y-m-d', strtotime($newData['lastmod']));
                }
                if (isset($newData['changefreq'])) {
                    $url['changefreq'] = $newData['changefreq'];
                }
                if (isset($newData['priority'])) {
                    $priority = floatval($newData['priority']);
                    $url['priority'] = $priority > 1 ? 1 : ($priority < 0 ? 0 : $priority);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * 删除URL
     * @param string $loc 要删除的URL
     * @return bool 是否找到并删除
     */
    public function deleteUrl($loc) {
        foreach ($this->urls as $key => $url) {
            if ($url['loc'] == $loc) {
                unset($this->urls[$key]);
                $this->urls = array_values($this->urls); // 重新索引数组
                return true;
            }
        }
        return false;
    }

    /**
     * 生成并保存sitemap文件
     * @return bool 是否成功保存
     */
    public function generate() {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        foreach ($this->urls as $url) {
            $xml .= "  <url>\n";
            $xml .= "    <loc>{$url['loc']}</loc>\n";
            if (isset($url['lastmod'])) {
                $xml .= "    <lastmod>{$url['lastmod']}</lastmod>\n";
            }
            if (isset($url['changefreq'])) {
                $xml .= "    <changefreq>{$url['changefreq']}</changefreq>\n";
            }
            if (isset($url['priority'])) {
                $xml .= "    <priority>" . number_format($url['priority'], 1) . "</priority>\n";
            }
            $xml .= "  </url>\n";
        }

        $xml .= '</urlset>';

        return file_put_contents($this->filename, $xml) !== false;
    }

    /**
     * 获取当前sitemap中的URL数量
     * @return int
     */
    public function getUrlCount() {
        return count($this->urls);
    }

    /**
     * 清空所有URL
     */
    public function clear() {
        $this->urls = [];
    }
}

// 使用示例
/*
$sitemap = new SitemapGenerator('https://example.com');

// 添加单个URL
$sitemap->addUrl('/', date('Y-m-d'), 'daily', 1.0);
$sitemap->addUrl('/about', '2023-01-01', 'yearly', 0.8);

// 批量添加
$urls = [
    ['loc' => '/contact', 'lastmod' => '2023-05-15', 'priority' => 0.7],
    '/services',
    ['loc' => '/products', 'changefreq' => 'weekly']
];
$sitemap->addUrls($urls);

// 更新URL
$sitemap->updateUrl('/services', [
    'lastmod' => date('Y-m-d'),
    'priority' => 0.9
]);

// 删除URL
$sitemap->deleteUrl('/products');

// 生成sitemap文件
if ($sitemap->generate()) {
    echo "Sitemap generated successfully with {$sitemap->getUrlCount()} URLs.";
} else {
    echo "Failed to generate sitemap.";
}
*/