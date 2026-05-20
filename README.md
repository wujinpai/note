### Apache 扩展支持

    version=2.4.59
    extension = mod_rewrite,mod_cron

### PHP 扩展支持

    version = 8.2
    devVersion = 8.2
    extension = openssl,PDO,GD,Imagick

### 地理位置 API

    通过IP地址获取位置信息
    cz88.net

    【ip-api.com】  http://ip-api.com/json/{ip}?fields=status,message,country,regionName,city,district,lat,lon&lang=zh-CN  无需KEY查询精度较低

    【map.qq.com】  https://apis.map.qq.com/ws/location/v1/ip?ip={ip}&key={key}&output=json

    【cz88.net】  https://cz88.net/api/cz88/ip/base?ip={ip}

### 天气 API

    通过经纬度信息获取天气 (FREE)
    openweathermap.org

    其他天气api选择 腾讯天气，修改需要注意icon图标代码


### 全局变量配置 未配置运行环境ENV

    apache自动配置htaccess

    nginx需要在PHP中配置PHP-FPM 》》 在[www]部分添加 env[APP_ENV] = production
    或者 php_value[APP_ENV] = production


### **HTTP 状态码完整表格**

| **状态码** | **含义**       |
| ---------- | -------------- |
| **10200**  | 登录状态       |
| **10203**  | 登出状态       |
| **10204**  | 密码错误       |
| **10429**  | 请求频繁       |
| **10401**  | 未经授权       |
| **00001**  | 本地 IP        |
| **10804**  | CURL 错误      |
| **00002**  | 疑似本地 ip    |
| **00000**  | 配置有误       |
| **10400**  | 未知格式       |
| **10453**  | dir 创建错误   |
| **10999**  | 未知错误       |
| **10223**  | 不允许的参数   |
| **10451**  | 文件移动失败   |
| **10441**  | 日历 Json 失败 |
| **10442**  | 日历库更新失败 |
| **10443**  | 标签库更新失败 |
| **10444**  | 标签库创建失败 |
| **10911**  | 文件移除失败   |
| **10207**  | env修改失败   |
| **10332**  | 当前禁用缓存   |


## 外部资源

网站图标使用 icommon 生成，描述和昵称部分的字体由 transfonter 提取。

[icomoon.io](https://icomoon.io) 社交图标

[transfonter.org](https://transfonter.org/) 字体范围生成，或许依靠 API 自动生成。

## 媒体格式

### 静态图片

网站默认不启用压缩，上传的什么格式就是什么格式，如果服务器支持可以开启压缩。**原图>有损压缩(GD)>无损压缩(php>8.2 GD or imagick)>极致压缩(imagick)** 极致压缩会同时生成 avif 和 webp 用于回滚显示。文件体积从大到小

[**不压缩**]() （原图不压缩）

[**无损 WEBP**]() （纹理细节高，体积中）

[**有损 WEBP**]() （纹理细节低，体积小）

### 动态图片

[**GIF**]() （源文件不压缩）

[**WEBP**]() （体积小）

### 视频

[**MP4**]() （源文件不压缩）

## 安全相关

### 配置目录权限

    /kernel/api/ 目录设置成 6 4 0 ，所有者读写 组读 其他无权限








### 待填的坑

    数据库标签表中的标签不会清除