<?php

class RateLimiter {
    /**
     * @var string 日志目录
     */
    private $logDir;

    /**
     * @var bool 是否记录日志
     */
    private $recordLog;

    /**
     * @var array 存储限制数据
     */
    private $storage = [];

    /**
     * @var string 存储文件路径（用于持久化）
     */
    private $storageFile;

    /**
     * RateLimiter 构造函数
     *
     * @param string $logDir 日志目录
     * @param bool $isDevMode 是否记录日志
     * @param string| $storageFile 持久化存储文件路径（可选）
     */
    public function __construct(string $logDir, bool $isDevMode, string $storageFile) {
        $this->logDir = rtrim($logDir, '/\\') . DIRECTORY_SEPARATOR;
        $this->recordLog = $isDevMode;
        $this->storageFile = $storageFile;

        // 只有记录日志时才确保日志目录存在
        if ($this->recordLog) {
            $this->ensureDirectoryExists($this->logDir);
        }

        // 确保存储文件目录存在
        $storageDir = dirname($this->storageFile);
        $this->ensureDirectoryExists($storageDir);

        // 加载持久化数据
        $this->loadStorage();
    }

    /**
     * 确保目录存在（可创建）且可写
     *
     * @param string $dir 目录路径
     * @throws RuntimeException 如果目录不可用
     */
    private function ensureDirectoryExists(string $dir): void {
        if (!is_dir($dir)) {
            if (!@mkdir($dir, 0755, true) && !is_dir($dir)) {
                throw new RuntimeException("无法创建目录: $dir");
            }
        }

        if (!is_writable($dir)) {
            // throw new RuntimeException("目录不可写: $dir");
        }
    }

    /**
     * 加载持久化存储数据
     */
    private function loadStorage(): void {
        if ($this->storageFile && file_exists($this->storageFile)) {
            $data = file_get_contents($this->storageFile);
            if ($data !== false) {
                $this->storage = json_decode($data, true) ?: [];
            }
        }
    }

    /**
     * 保存持久化存储数据
     */
    private function saveStorage(): void {
        if ($this->storageFile) {
            file_put_contents($this->storageFile, json_encode($this->storage));
        }
    }

    /**
     * 获取客户端真实IP
     *
     * @return string
     */
    public function getClientIp(): string {
        $ip = '';

        // 检查共享IP
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            $ip = $_SERVER['HTTP_CLIENT_IP'];
        } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            // 一些代理服务器会将IP放在X-Forwarded-For中
            $ipList = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            $ip = trim($ipList[0]);
        } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
            $ip = $_SERVER['REMOTE_ADDR'];
        }

        // 验证IP格式
        return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
    }

    /**
     * 获取用户代理信息
     *
     * @return string
     */
    private function getUserAgent(): string {
        return $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
    }

    /**
     * 获取当前时间戳（毫秒）
     *
     * @return float
     */
    private function getMillisecond(): float {
        return round(microtime(true) * 1000);
    }

    /**
     * 记录日志
     *
     * @param string $key 限制键
     * @param string $message 日志消息
     */
    private function log(string $key, string $message): void {
        if (!$this->recordLog) {
            return;
        }

        $logFile = $this->logDir . 'ratelimit_' . $key . '.txt';
        $logMessage = sprintf(
            "[%s] %s\n",
            date('Y-m-d H:i:s'),
            $message
        );

        file_put_contents($logFile, $logMessage, FILE_APPEND);
    }

    /**
     * 检查是否超过限制
     *
     * @param string $key 限制键（通常是API端点）
     * @param int $limit 触发限制的次数
     * @param int $windowMs 限制的时间窗口（毫秒）
     * @param int $freezeTimeMs 冻结时间（毫秒）
     * @param bool $onlyIP 是否只针对当前IP限制（true=针对IP，false=针对所有访问者）
     * @param string $logFileName 日志文件名（可选）
     * @return bool 返回true表示允许请求，false表示被限制
     */
    public function checkLimit(
        string $key,
        int $limit,
        int $windowMs,
        int $freezeTimeMs,
        bool $onlyIP = false,
        string $logFileName = ''
    ): bool {
        $now = $this->getMillisecond();
        $ip = $this->getClientIp();
        $userAgent = $this->getUserAgent();
        $logKey = !empty($logFileName) ? $logFileName : $key;

        // 确定实际的限制键
        $rateLimitKey = $onlyIP ? "$key:$ip" : $key;

        // 初始化键的数据
        if (!isset($this->storage[$rateLimitKey])) {
            $this->storage[$rateLimitKey] = [
                'requests' => [],
                'frozen_until' => 0,
                'last_request' => 0,
                'freeze_count' => 0,
            ];
        }

        $data = &$this->storage[$rateLimitKey];

        // 检查是否在冻结期内
        if ($now < $data['frozen_until']) {
            // $remaining = max(0, $data['frozen_until'] - $now);
            // $this->log($logKey, sprintf(
            //     '请求被拒绝 - %s: IP=%s, 剩余时间=%dms, 用户代理=%s',
            //     $onlyIP ? 'IP限制' : '全局限制',
            //     $ip,
            //     $remaining,
            //     $userAgent
            // ));
            return false;
        }

        // 清理过期的请求记录
        $windowStart = $now - $windowMs;
        $data['requests'] = array_filter($data['requests'], function ($timestamp) use ($windowStart) {
            return $timestamp >= $windowStart;
        });

        // 记录当前请求
        $data['requests'][] = $now;
        $requestCount = count($data['requests']);

        // 记录最后请求时间
        $data['last_request'] = $now;

        // 检查是否超过限制
        if ($requestCount > $limit) {
            // 设置冻结时间
            $data['frozen_until'] = $now + $freezeTimeMs;
            $data['freeze_count']++;

            // 记录限制事件
            $this->log($logKey, sprintf(
                '触发限制 - %s: IP=%s, 请求次数=%d, 接口=%s, 用户代理=%s', $onlyIP ? 'IP限制' : '全局限制', $ip, $requestCount, $key, $userAgent
            ));

            // 保存持久化数据
            $this->saveStorage();

            return false;
        }

        // 记录正常请求
        // $this->log($logKey, sprintf(
        //     '允许请求 - %s: IP=%s, 请求次数=%d, 用户代理=%s',
        //     $onlyIP ? 'IP限制' : '全局限制',
        //     $ip,
        //     $requestCount,
        //     $userAgent
        // ));

        // 保存持久化数据
        $this->saveStorage();

        return true;
    }


    /**
     * 手动重置限制（用于测试或管理）
     *
     * @param string $key 限制键
     * @param bool $onlyIP 是否只针对当前IP限制（true=针对IP，false=针对所有访问者）
     */
    public function resetLimit(string $key, bool $onlyIP = false): void {
        $ip = $this->getClientIp();
        $rateLimitKey = $onlyIP ? "$key:$ip" : $key;

        if (isset($this->storage[$rateLimitKey])) {
            unset($this->storage[$rateLimitKey]);
            $this->saveStorage();
        }

        // 可选：同时重置全局键（如果需要）
        if ($onlyIP && isset($this->storage[$key])) {
            unset($this->storage[$key]);
            $this->saveStorage();
        }
    }

    /**
     * 获取当前限制状态（用于监控）
     *
     * @param string $key 限制键
     * @param bool $onlyIP 是否只针对当前IP限制（true=针对IP，false=针对所有访问者）
     * @return array|
     */
    public function getLimitStatus(string $key, bool $onlyIP = false): ?array {
        $ip = $this->getClientIp();
        $rateLimitKey = $onlyIP ? "$key:$ip" : $key;

        if (!isset($this->storage[$rateLimitKey])) {
            return [];
        }

        $now = $this->getMillisecond();
        $data = $this->storage[$rateLimitKey];

        // 清理过期的请求记录
        $windowStart = $now - ($this->storage[$rateLimitKey]['last_request'] - $data['requests'][0] ?? 0);
        $data['requests'] = array_filter($data['requests'], function ($timestamp) use ($windowStart) {
            return $timestamp >= $windowStart;
        });

        return [
            'current_requests' => count($data['requests']),
            'frozen_until' => $data['frozen_until'],
            'remaining_freeze_time' => max(0, $data['frozen_until'] - $now),
            'is_frozen' => $now < $data['frozen_until'],
            'freeze_count' => $data['freeze_count'],
            'last_request' => $data['last_request'],
        ];
    }
}

