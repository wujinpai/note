<?php
class DataBase {
    private static $instance;
    private $pdo;
    private $connectionError = null; // 新增：存储连接错误信息

    private function __construct() {
        $host = aes256Decrypt($_ENV['DB_HOST'], $_ENV['DB_KEY']) ?: 'localhost';
        $username = aes256Decrypt($_ENV['DB_USER'], $_ENV['DB_KEY']);
        $password = aes256Decrypt($_ENV['DB_PASS'], $_ENV['DB_KEY']);
        $dbname = $_ENV['DB_NAME'] ?: 'note';
        $port = $_ENV['DB_PORT'] ?: 3306;
        $charset = 'utf8mb4';

        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=$charset";

        $options = [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES => false,
        ];
        try {
            $this->pdo = new \PDO($dsn, $username, $password, $options);
        } catch (\PDOException $e) {
            die($this->connectionError = "数据库连接失败: " . $e->getMessage());
        }
    }

    private function __clone() {
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * 执行 SQL 查询并返回 PDOStatement 对象
     * 
     * @param string $sql 要执行的 SQL 语句（支持预处理参数）
     * @param array $params 绑定到 SQL 语句的参数数组（默认空数组）
     * @return PDOStatement|false 成功返回 PDOStatement 对象，失败返回 false
     * @throws PDOException 当 SQL 执行出错时会记录错误日志（通过 error_log）
     */
    public function query($sql, $params = []) {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("SQL 错误: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 执行查询并返回所有结果行
     * 
     * @param string $sql 要执行的 SQL 语句（支持预处理参数）
     * @param array $params 绑定到 SQL 语句的参数数组（默认空数组）
     * @return array 查询结果数组（空数组表示无结果或查询失败）
     * 
     * @example
     * $results = $db->fetchAll("SELECT * FROM users WHERE active = ?", [1]);
     */
    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt ? $stmt->fetchAll() : [];
    }

    /**
     * 执行查询并返回单行结果
     * 
     * @param string $sql 要执行的 SQL 语句（支持预处理参数）
     * @param array $params 绑定到 SQL 语句的参数数组（默认空数组）
     * @return array|false 成功返回关联数组形式的单行结果，无结果或失败返回 false
     * 
     * @example
     * $user = $db->fetch("SELECT * FROM users WHERE id = ?", [1]);
     * if ($user) { echo $user['username']; }
     */
    public function fetch($sql, $params = []): mixed {
        $stmt = $this->query($sql, $params);
        return $stmt ? $stmt->fetch() : false;
    }

    /**
     * 插入数据并返回最后插入的ID
     * 
     * @param string $sql 插入数据的SQL语句（支持预处理参数）
     * @param array $params 绑定到SQL语句的参数数组（默认空数组）
     * @return int|false 成功返回最后插入的ID（转换为整型），失败返回false
     * 
     * @example
     * $id = $db->insert(
     *     "INSERT INTO users (username, email) VALUES (?, ?)", 
     *     ['john_doe', 'john@example.com']
     * );
     */
    public function insert(string $sql, array $params = []): int|false {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return (int) $this->pdo->lastInsertId();
        } catch (PDOException $e) {
            error_log("插入失败: " . $e->getMessage());
            return false;
        }
    }


    /**
     * 更新数据并返回受影响的行数
     * 
     * @param string $sql 更新数据的SQL语句（支持预处理参数）
     * @param array $params 绑定到SQL语句的参数数组（默认空数组）
     * @return int|false 成功返回受影响的行数，失败返回false
     * 
     * @example
     * $affected = $db->update(
     *     "UPDATE users SET status = ? WHERE id = ?", 
     *     ['active', 5]
     * );
     */
    public function update(string $sql, array $params = []): int|false {
        try {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->rowCount();
        } catch (PDOException $e) {
            error_log("更新失败: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 删除数据并返回受影响的行数
     * 
     * @param string $sql 删除数据的SQL语句（支持预处理参数）
     * @param array $params 绑定到SQL语句的参数数组（默认空数组）
     * @return int|false 成功返回受影响的行数，失败返回false
     * 
     * @note 实际实现复用update方法，因为两者都需要返回影响行数
     * @example
     * $deleted = $db->delete("DELETE FROM users WHERE last_login < ?", ['2020-01-01']);
     */
    public function delete(string $sql, array $params = []): int|false {
        // 删除操作实际上和更新操作相同，都是执行SQL并返回影响行数
        return $this->update($sql, $params);
    }

    /**
     * 执行事务处理
     * 
     * @param callable $callback 事务回调函数，接收当前数据库实例作为参数
     *                          回调函数返回false或抛出异常将触发回滚
     * @return bool 事务是否成功提交（true=成功，false=失败）
     * 
     * @example
     * $success = $db->transaction(function ($db) {
     *     $db->insert("INSERT INTO orders (...) VALUES (...)", [...]);
     *     $db->update("UPDATE inventory SET stock = stock - ?", [1]);
     *     return true; // 返回false会触发回滚
     * });
     * 
     * @throws Exception 如果回调函数中抛出异常，会捕获并记录日志
     */
    public function transaction(callable $callback): bool {
        // 检查PDO是否已初始化
        if (!isset($this->pdo)) {
            throw new RuntimeException("PDO未初始化");
        }

        // 确保错误模式为异常模式
        $originalErrMode = $this->pdo->getAttribute(PDO::ATTR_ERRMODE);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        try {
            // 检查是否已有活跃事务
            if ($this->pdo->inTransaction()) {
                throw new RuntimeException("已有活跃事务，请避免嵌套事务");
            }

            $this->pdo->beginTransaction();
            $result = $callback($this);

            if ($result === false) {
                $this->pdo->rollBack();
                return false;
            }

            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            // 仅在事务活跃时回滚（避免"There is no active transaction"错误）
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            error_log("事务失败: " . $e->getMessage());
            return false;
        } finally {
            // 恢复原始错误模式
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, $originalErrMode);
        }
    }

}