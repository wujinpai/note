<?php

class JsonEditor {
    /**
     * 解析 JSON 源（文件路径或 JSON 字符串/变量）
     * 
     * @param string|array|object $jsonSource 文件路径或 JSON 数据
     * @return array|false 返回解析后的数组或 false（失败时）
     */
    private static function parseJsonSource($jsonSource) {
        try {
            if (is_string($jsonSource)) {
                // 如果是文件路径
                if (file_exists($jsonSource)) {
                    $fileContent = file_get_contents($jsonSource);

                    // 文件为空时返回空数组，但让调用者决定是否保存 :this_newadd
                    if (trim($fileContent) === '') {
                        return [];
                    }

                    $jsonData = json_decode($fileContent, true);

                    if (json_last_error() !== JSON_ERROR_NONE) {
                        return false;
                    }
                    return $jsonData;
                }
                // 文件不存在，创建空数组
                return [];
            } elseif (is_array($jsonSource) || is_object($jsonSource)) {
                // 如果是数组或对象，转换为数组返回
                return json_decode(json_encode($jsonSource), true);
            }
            return false;
        } catch (Exception $e) {
            error_log('JsonEditor.parseJsonSource error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 保存数组到 JSON 文件
     * 
     * @param string $filePath 文件路径
     * @param array $jsonData 要保存的数据
     * @return bool 保存是否成功
     */
    private static function saveToFile($filePath, $jsonData) {
        try {
            // 确保目录存在
            $dir = dirname($filePath);
            if (!file_exists($dir) && !mkdir($dir, 0777, true)) {
                return false;
            }

            $jsonString = json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
            return file_put_contents($filePath, $jsonString) !== false;
        } catch (Exception $e) {
            error_log('JsonEditor.saveToFile error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 设置 JSON 属性（支持点表示法）
     * 
     * @param string|array $jsonSource 文件路径或 JSON 数据
     * @param string $key 要设置的键（支持点表示法如 'user.name'）
     * @param mixed $value 要设置的值
     * @return array|false 操作后的数组或 false（失败时）
     */
    public static function set($jsonSource, $key, $value) {
        try {
            $jsonData = self::parseJsonSource($jsonSource);
            if ($jsonData === false) {
                return false;
            }

            // 支持点表示法
            $keys = explode('.', $key);
            $current = &$jsonData;

            foreach ($keys as $k) {
                if (!isset($current[$k]) || !is_array($current[$k])) {
                    $current[$k] = [];
                }
                $current = &$current[$k];
            }

            $current = $value;

            // 如果是文件路径，保存回文件
            // if (is_string($jsonSource)) {
            //     if (!self::saveToFile($jsonSource, $jsonData)) {
            //         return false;
            //     }
            // }

            // 如果是文件路径，总是尝试保存（包括文件为空的情况）
            if (is_string($jsonSource)) {
                // 如果是空文件，需要创建目录结构（如果需要）
                $dir = dirname($jsonSource);
                if (!file_exists($dir) && !mkdir($dir, 0777, true)) {
                    return false;
                }

                $jsonString = json_encode($jsonData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                if (file_put_contents($jsonSource, $jsonString) === false) {
                    return false;
                }
            }

            return $jsonData;
        } catch (Exception $e) {
            error_log('JsonEditor.set error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 获取 JSON 属性值（支持点表示法）
     * 
     * @param string|array $jsonSource 文件路径或 JSON 数据
     * @param string $key 要获取的键（支持点表示法）
     * @return mixed 属性值或 null（如果不存在）
     */
    public static function get($jsonSource, $key) {
        try {
            $jsonData = self::parseJsonSource($jsonSource);
            if ($jsonData === false) {
                return null;
            }

            // 支持点表示法
            $keys = explode('.', $key);
            $current = $jsonData;

            foreach ($keys as $k) {
                if (!isset($current[$k])) {
                    return null;
                }
                $current = $current[$k];
            }

            return $current;
        } catch (Exception $e) {
            error_log('JsonEditor.get error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * 删除 JSON 属性（支持点表示法）
     * 
     * @param string|array $jsonSource 文件路径或 JSON 数据
     * @param string $key 要删除的键（支持点表示法）
     * @return array|false 操作后的数组或 false（失败时）
     */
    public static function delete($jsonSource, $key) {
        try {
            $jsonData = self::parseJsonSource($jsonSource);
            if ($jsonData === false) {
                return false;
            }

            // 支持点表示法
            $keys = explode('.', $key);
            $current = &$jsonData;

            // 找到要删除的键的父级
            for ($i = 0; $i < count($keys) - 1; $i++) {
                $k = $keys[$i];
                if (!isset($current[$k]) || !is_array($current[$k])) {
                    // 路径不存在，直接返回原数据
                    return $jsonData;
                }
                $current = &$current[$k];
            }

            $lastKey = $keys[count($keys) - 1];
            unset($current[$lastKey]);

            // 如果是文件路径，保存回文件
            if (is_string($jsonSource)) {
                if (!self::saveToFile($jsonSource, $jsonData)) {
                    return false;
                }
            }

            return $jsonData;
        } catch (Exception $e) {
            error_log('JsonEditor.delete error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查 JSON 属性是否存在（支持点表示法）
     * 
     * @param string|array $jsonSource 文件路径或 JSON 数据
     * @param string $key 要检查的键（支持点表示法）
     * @return bool 是否存在
     */
    public static function has($jsonSource, $key) {
        return self::get($jsonSource, $key) !== null;
    }

    /**
     * 获取所有 JSON 数据
     * 
     * @param string|array $jsonSource 文件路径或 JSON 数据
     * @return array|false 返回所有数据或 false（失败时）
     */
    public static function getAll($jsonSource) {
        try {
            $jsonData = self::parseJsonSource($jsonSource);
            return $jsonData === false ? false : $jsonData;
        } catch (Exception $e) {
            error_log('JsonEditor.getAll error: ' . $e->getMessage());
            return false;
        }
    }
}