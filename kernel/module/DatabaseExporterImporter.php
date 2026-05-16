<?php

class DatabaseExporterImporter
{
    /**
     * 导出整个数据库为SQL文件
     * 
     * @param string $outputFile 输出文件路径
     * @param bool $includeData 是否包含数据（true=导出结构和数据，false=只导出结构）
     * @param bool $dropTables 是否在导出中包含DROP TABLE语句
     * @return bool 导出是否成功
     * @throws Exception
     */
    public static function exportDatabase(string $outputFile, bool $includeData = true, bool $dropTables = true): bool
    {
        $db = DataBase::getInstance();
        
        // 获取所有表名
        $tables = $db->query("SHOW TABLES")->fetchAll();
        if (empty($tables)) {
            throw new Exception("数据库中没有表可导出");
        }
        
        $output = "-- 数据库导出\n";
        $output .= "-- 生成时间: " . date('Y-m-d H:i:s') . "\n\n";
        $output .= "SET FOREIGN_KEY_CHECKS = 0;\n\n";
        
        foreach ($tables as $tableRow) {
            $table = reset($tableRow); // 获取表名
            
            // 获取表结构
            $createTable = $db->query("SHOW CREATE TABLE `{$table}`")->fetch();
            if ($dropTables) {
                $output .= "DROP TABLE IF EXISTS `{$table}`;\n";
            }
            $output .= $createTable['Create Table'] . ";\n\n";
            
            if ($includeData) {
                // 获取表数据
                $data = $db->query("SELECT * FROM `{$table}`")->fetchAll();
                if (!empty($data)) {
                    $output .= "-- 导出表 `{$table}` 的数据\n";
                    
                    // 获取列名
                    $columns = array_keys($data[0]);
                    $columns = array_map(function($col) { return "`{$col}`"; }, $columns);
                    $columnsStr = implode(', ', $columns);
                    
                    foreach ($data as $row) {
                        $values = [];
                        foreach ($row as $value) {
                            $values[] = self::quoteValue($value);
                        }
                        $valuesStr = implode(', ', $values);
                        $output .= "INSERT INTO `{$table}` ({$columnsStr}) VALUES ({$valuesStr});\n";
                    }
                    $output .= "\n";
                }
            }
        }
        
        $output .= "SET FOREIGN_KEY_CHECKS = 1;\n";
        
        // 写入文件
        return file_put_contents($outputFile, $output) !== false;
    }
    
    /**
     * 从SQL文件导入数据库
     * 
     * @param string $inputFile SQL文件路径
     * @return bool 导入是否成功
     * @throws Exception
     */
    public static function importDatabase(string $inputFile): bool
    {
        if (!file_exists($inputFile)) {
            throw new Exception("SQL文件不存在: {$inputFile}");
        }
        
        $sql = file_get_contents($inputFile);
        if ($sql === false) {
            throw new Exception("无法读取SQL文件");
        }
        
        return self::executeSqlScript($sql);
    }
    
    /**
     * 执行SQL脚本（支持多条语句）
     * 
     * @param string $sql SQL脚本
     * @return bool 执行是否成功
     * @throws Exception
     */
    public static function executeSqlScript(string $sql): bool
    {
        $db = DataBase::getInstance();
        
        // 移除注释
        $sql = preg_replace('/--.*|\/\*.*\*\//sU', '', $sql);
        
        // 分割SQL语句（以分号结尾）
        $queries = preg_split('/;\s*\n/', $sql);
        
        // 过滤空查询
        $queries = array_filter($queries, function($query) {
            return trim($query) !== '';
        });
        
        if (empty($queries)) {
            throw new Exception("SQL脚本中没有有效语句");
        }
        
        try {
            $db->transaction(function() use ($db, $queries) {
                foreach ($queries as $query) {
                    $db->query($query);
                }
            });
            return true;
        } catch (Exception $e) {
            throw new Exception("执行SQL脚本失败: " . $e->getMessage());
        }
    }
    
    /**
     * 转义并引用SQL值
     * 
     * @param mixed $value 要转义的值
     * @return string 转义后的SQL字符串
     */
    protected static function quoteValue($value): string
    {
        $db = DataBase::getInstance();
        
        // 如果值为null
        if (is_null($value)) {
            return 'NULL';
        }
        
        // 如果值为布尔值
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        
        // 如果值为整数
        if (is_int($value) || is_float($value)) {
            return (string)$value;
        }
        
        // 对于字符串值，使用PDO的quote方法（假设DataBase内部使用PDO）
        // 我们需要获取底层的PDO连接来调用quote方法
        try {
            // 假设DataBase类有一个getPdo方法获取PDO实例
            if (method_exists($db, 'getPdo')) {
                $pdo = $db->getPdo();
                return $pdo->quote((string)$value);
            }
            
            // 如果没有getPdo方法，尝试反射获取内部属性（不推荐，但作为后备）
            $reflection = new ReflectionClass($db);
            if ($reflection->hasProperty('pdo')) {
                $property = $reflection->getProperty('pdo');
                $property->setAccessible(true);
                $pdo = $property->getValue($db);
                if ($pdo instanceof PDO) {
                    return $pdo->quote((string)$value);
                }
            }
        } catch (ReflectionException $e) {
            // 反射失败，使用替代方案
        }
        
        // 如果以上方法都失败，使用简单的替代方案（不安全，仅作为最后手段）
        return "'" . str_replace(["\\", "'"], ["\\\\", "\\'"], (string)$value) . "'";
    }
}