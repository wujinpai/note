/**
 * Markdown 工具函数
 * 提供Markdown解析和渲染功能
 */

// 全局调试开关
const MARKDOWN_DEBUG = true;

// 全局存储：保存每篇文章的原始 Markdown 文本（用于编辑时恢复）
window._markdownRawStore = window._markdownRawStore || new Map();

function mdLog(...args) {
    if (MARKDOWN_DEBUG) {
        console.log('[Markdown]', ...args);
    }
}

// 检测内容是否为Markdown格式
function isMarkdownContent(content) {
    if (!content) {
        mdLog('isMarkdownContent: 内容为空');
        return false;
    }
    
    // 清理HTML实体，获取纯文本用于检测
    let cleanContent = content;
    
    // 如果内容包含HTML标签，先提取文本
    if (content.includes('<') && content.includes('>')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        cleanContent = tempDiv.textContent || tempDiv.innerText || content;
    }
    
    mdLog('isMarkdownContent: 原始内容前100字符:', content.substring(0, 100));
    mdLog('isMarkdownContent: 清理后内容前100字符:', cleanContent.substring(0, 100));
    
    // 常见的Markdown语法模式（更宽松的检测）
    const markdownPatterns = [
        /^#{1,6}\s/m,                    // 标题 # ## ###
        /^\s*[-*+]\s/m,                   // 无序列表 - item
        /^\s*\d+\.\s/m,                  // 有序列表 1. item
        /\*\*[^*]+\*\*/m,                // 粗体 **text**
        /__[^_]+__/m,                     // 粗体 __text__
        /(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/m,  // 斜体 *text*
        /`[^`]+`/m,                       // 行内代码 `code`
        /^```[\s\S]*?```/ms,              // 代码块 ```code```
        /^\s*>/m,                         // 引用 > text
        /^---+$/m,                        // 分割线 ---
        /^\|.*\|\s*$/m,                  // 表格 | col |
        /\[([^\]]+)\]\(([^)]+)\)/m,      // 链接 [text](url)
        /!\[([^\]]*)\]\(([^)]+)\)/m,     // 图片 ![alt](url)
        /~~[^~]+~~/m                      // 删除线 ~~text~~
    ];
    
    // 检查是否以HTML块级标签开头（如果是则不作为Markdown处理）
    const htmlBlockPattern = /^<(p|div|h[1-6]|ul|ol|table|section|article)\b/i;
    if (htmlBlockPattern.test(content.trim())) {
        mdLog('isMarkdownContent: 以HTML标签开头，跳过');
        return false;
    }
    
    // 检查是否包含至少一个Markdown特征
    for (let i = 0; i < markdownPatterns.length; i++) {
        const pattern = markdownPatterns[i];
        if (pattern.test(cleanContent)) {
            mdLog(`isMarkdownContent: 匹配到模式 ${i+1}`, pattern.toString());
            return true;
        }
    }
    
    mdLog('isMarkdownContent: 未匹配到任何Markdown模式');
    return false;
}

// 将Markdown转换为HTML
function renderMarkdown(text) {
    if (!text || typeof text === 'undefined') {
        mdLog('renderMarkdown: 内容为空或未定义');
        return '';
    }
    
    mdLog('renderMarkdown: 开始渲染，长度:', text.length);
    
    try {
        // 使用marked库解析
        if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
            mdLog('renderMarkdown: 使用 marked 库解析');
            
            // 配置marked选项
            marked.setOptions({
                breaks: true,           // 支持GFM换行
                gfm: true,              // 启用GitHub风格Markdown
                headerIds: true,        // 为标题生成ID
                mangle: false,          // 不转义特殊字符
                sanitize: false,         // 不消毒（信任内容）
                smartLists: true,       // 智能列表
                smartypants: false       // 不自动转换引号
            });
            
            let result = marked.parse(text);

            result = convertVideoLinks(result);
            mdLog('renderMarkdown: 视频链接已转换');

            if (typeof katex !== 'undefined') {
                result = renderMathInHTML(result);
                mdLog('renderMarkdown: 数学公式已渲染');
            }

            mdLog('renderMarkdown: 渲染成功，结果长度:', result.length);
            return result;
        } else {
            mdLog('renderMarkdown: marked 库未加载，使用备用解析器');
            let result = simpleMarkdownParse(text);

            // 尝试渲染数学公式
            if (typeof katex !== 'undefined') {
                result = renderMathInHTML(result);
            }

            return result;
        }
    } catch (e) {
        console.error('[Markdown] 渲染错误:', e);
        mdLog('renderMarkdown: 渲染出错，使用备用解析器', e.message);
        return simpleMarkdownParse(text);
    }
}

// 在 HTML 中渲染数学公式（使用 KaTeX）
function renderMathInHTML(html) {
    if (!html || typeof katex === 'undefined') {
        return html;
    }
    
    mdLog('renderMathInHTML: 开始渲染数学公式');
    
    try {
        // 创建临时容器
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 配置 KaTeX 自动渲染
        const renderConfig = {
            delimiters: [
                {left: '$$', right: '$$', display: true},    // 块级公式
                {left: '$', right: '$', display: false},     // 行内公式
                {left: '\\(', right: '\\)', display: false},  // LaTeX 行内
                {left: '\\[', right: '\\]', display: true}   // LaTeX 块级
            ],
            throwOnError: false,
            errorColor: '#cc0000'
        };
        
        // 使用 auto-render 渲染数学公式
        if (typeof renderMathInElement !== 'undefined') {
            renderMathInElement(tempDiv, renderConfig);
        } else {
            // 手动查找并渲染公式
            renderMathManually(tempDiv, renderConfig.delimiters);
        }
        
        mdLog('renderMathInHTML: 数学公式渲染完成');
        return tempDiv.innerHTML;
        
    } catch (e) {
        console.error('[KaTeX] 渲染错误:', e);
        mdLog('renderMathInHTML: 渲染错误', e.message);
        return html;
    }
}

// 手动渲染数学公式（备用方案）
function renderMathManually(container, delimiters) {
    const text = container.innerHTML;
    
    // 查找所有 $...$ 和 $$...$$ 公式
    for (const delim of delimiters) {
        const regex = new RegExp(
            delim.left.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 
            '[\\s\\S]*?' + 
            delim.right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 
            'g'
        );
        
        container.innerHTML = container.innerHTML.replace(regex, (match) => {
            try {
                const formula = match.slice(delim.left.length, -delim.right.length);
                
                if (delim.display) {
                    return katex.renderToString(formula, { displayMode: true, throwOnError: false });
                } else {
                    return katex.renderToString(formula, { displayMode: false, throwOnError: false });
                }
            } catch (e) {
                console.warn('[KaTeX] 公式渲染失败:', e);
                return match; // 渲染失败则保留原始文本
            }
        });
    }
}

// 简单的Markdown解析器（备用方案）
function simpleMarkdownParse(text) {
    if (!text) return '';
    
    mdLog('simpleMarkdownParse: 使用简单解析器');
    
    let html = text;
    
    // 转义HTML特殊字符（但在代码块中的除外）
    html = escapeHtml(html);
    
    // 代码块 ```code```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    
    // 行内代码 `code`
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // 标题 # ## ### ...
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // 粗体 **text** 或 __text__
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // 斜体 *text* 或 _text_
    html = html.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_)_(?!_)([^_]+)(?<!_)_(?!_)/g, '<em>$1</em>');
    
    // 删除线 ~~text~~
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    
    // 链接 [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // 图片 ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    
    // 引用 > text
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    
    // 分割线 --- or *** or ___
    html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr>');
    
    // 无序列表 - item
    html = html.replace(/^[\*\-+] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // 有序列表 1. item
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    // 段落
    html = html.replace(/\n\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // 清理空段落
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<div|<pre|<blockquote|<ul|<ol|<h[1-6]|<hr|<table)/g, '$1');
    html = html.replace(/(<\/div>|<\/pre>|<\/blockquote>|<\/ul>|<\/ol>|<\/h[1-6]>|<\/table>)<\/p>/g, '$1');
    
    // 换行
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

// 转义HTML特殊字符
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 将视频链接转换为 video 标签
function convertVideoLinks(html) {
    if (!html) return html;

    mdLog('convertVideoLinks: 开始转换视频链接');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // 视频文件扩展名
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.m4v', '.mov', '.avi'];
    const youtubePattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/i;
    const bilibiliPattern = /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/i;

    // 1. 处理独立视频链接（单独一行的视频URL）
    const paragraphs = tempDiv.querySelectorAll('p');
    paragraphs.forEach(p => {
        const text = p.textContent.trim();
        if (!text) return;

        // 检查是否是视频链接
        const isVideoLink = videoExtensions.some(ext => text.toLowerCase().endsWith(ext));
        const isYouTube = youtubePattern.test(text);
        const isBilibili = bilibiliPattern.test(text);

        if (isVideoLink) {
            mdLog('convertVideoLinks: 找到视频链接:', text);
            p.innerHTML = '<div class="markdown-video-wrapper">' + createVideoElement(text, 'local') + '</div>';
        } else if (isYouTube) {
            const match = text.match(youtubePattern);
            if (match) {
                mdLog('convertVideoLinks: 找到 YouTube 视频:', match[1]);
                p.innerHTML = '<div class="markdown-video-wrapper">' + createVideoElement(match[1], 'youtube') + '</div>';
            }
        } else if (isBilibili) {
            const match = text.match(bilibiliPattern);
            if (match) {
                mdLog('convertVideoLinks: 找到 B站视频:', match[1]);
                p.innerHTML = '<div class="markdown-video-wrapper">' + createVideoElement(match[1], 'bilibili') + '</div>';
            }
        }
    });

    // 2. 处理 <a> 标签中的视频链接
    const links = tempDiv.querySelectorAll('a[href]');
    links.forEach(link => {
        const href = link.getAttribute('href') || '';
        const isVideoLink = videoExtensions.some(ext => href.toLowerCase().endsWith(ext));

        if (isVideoLink && link.textContent.trim() === href) {
            mdLog('convertVideoLinks: 转换 <a> 标签视频:', href);
            const wrapper = document.createElement('div');
            wrapper.className = 'markdown-video-wrapper';
            wrapper.innerHTML = createVideoElement(href, 'local');
            link.parentNode.replaceChild(wrapper, link);
        }
    });

    // 3. 处理图片标签中的视频（用户可能用 ![]() 语法插入视频）
    const images = tempDiv.querySelectorAll('img[src]');
    images.forEach(img => {
        const src = img.getAttribute('src') || '';
        const isVideoSrc = videoExtensions.some(ext => src.toLowerCase().endsWith(ext));

        if (isVideoSrc) {
            mdLog('convertVideoLinks: 转换 <img> 视频为 video:', src);
            const wrapper = document.createElement('div');
            wrapper.className = 'markdown-video-wrapper';
            wrapper.innerHTML = createVideoElement(src, 'local');
            img.parentNode.replaceChild(wrapper, img);
        }
    });

    mdLog('convertVideoLinks: 转换完成');
    return tempDiv.innerHTML;
}

// 智能图片布局：统一收集文章所有图片 + 九宫格 + 灯箱（微信朋友圈风格）
function applySmartImageLayout(container) {
    if (!container) return;
    
    const post = container.closest('.post') || container;
    
    if (post.querySelector('.md-img-grid')) {
        mdLog('applySmartImageLayout: 已存在九宫格，跳过重复处理');
        return;
    }
    
    const allPostImages = collectPostImages(post);
    
    if (allPostImages.length === 0) {
        mdLog('applySmartImageLayout: 无图片，跳过');
        return;
    }
    
    mdLog('applySmartImageLayout: 文章共 ' + allPostImages.length + ' 张图片 → 创建统一九宫格');
    
    const grid = document.createElement('div');
    grid.className = 'md-img-grid';
    
    const total = allPostImages.length;
    const displayCount = Math.min(total, 9);
    
    if (total === 1) grid.classList.add('md-grid-1');
    else if (total === 2) grid.classList.add('md-grid-2');
    else if (total === 3) grid.classList.add('md-grid-3');
    else if (total === 4) grid.classList.add('md-grid-4');
    else if (total === 5) grid.classList.add('md-grid-5');
    else if (total === 6) grid.classList.add('md-grid-6');
    else if (total === 7) grid.classList.add('md-grid-7');
    else if (total === 8) grid.classList.add('md-grid-8');
    else grid.classList.add('md-grid-9');
    
    var imageSrcList = [];
    
    allPostImages.forEach(function(img, index) {
        if (index >= 9) return;
        
        var wrapper = document.createElement('div');
        wrapper.className = 'md-grid-item';
        
        var clone = document.createElement('img');
        clone.src = img.src;
        clone.alt = img.alt || '';
        clone.loading = 'lazy';
        clone.decoding = 'async';
        
        var fullSrc = img.src;
        if (img.dataset.url && !img.dataset.cnbUrl) {
            fullSrc = window.location.origin + "/uploads/" + img.dataset.url;
        }
        clone.dataset.src = fullSrc;
        clone.dataset.lightboxIndex = index;
        clone.setAttribute('data-lightbox', 'unified-gallery');
        clone._lightboxBound = true;
        clone.style.cursor = 'zoom-in';
        
        if (img.dataset.url) {
            clone.dataset.url = img.dataset.url;
        }
        if (img.dataset.info) {
            clone.dataset.info = img.dataset.info;
        }
        if (img.dataset.cnbUrl) {
            clone.dataset.cnbUrl = img.dataset.cnbUrl;
        }
        
        imageSrcList.push(fullSrc);
        
        (function(idx) {
            clone.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                mdLog('Lightbox[九宫格]: 图片 #' + (idx+1) + ' 被点击');
                var allGridImgs = grid.querySelectorAll('[data-lightbox]');
                var srcList = Array.from(allGridImgs).map(function(el) { return el.dataset.src; });
                openLightbox(this.dataset.src, this.alt || '', srcList);
            });
        })(index);
        
        if (index === 8 && total > 9) {
            var moreOverlay = document.createElement('div');
            moreOverlay.className = 'md-grid-more';
            moreOverlay.textContent = '+' + (total - 9);
            wrapper.appendChild(clone);
            wrapper.appendChild(moreOverlay);
        } else {
            wrapper.appendChild(clone);
        }
        
        grid.appendChild(wrapper);
        
        img.classList.add('md-img-collected');
    });
    
    var annex = post.querySelector('.annex');
    if (annex) {
        annex.classList.add('md-annex-hidden');
        annex.parentNode.insertBefore(grid, annex);
    } else {
        var contentEl = post.querySelector('.content');
        if (contentEl) {
            contentEl.appendChild(grid);
        }
    }
    
    var contentEl = post.querySelector('.content');
    if (contentEl) {
        contentEl.dataset.imageDominant = 'true';
        contentEl.style.maxHeight = '';
        var readmore = contentEl.nextElementSibling;
        if (readmore && (readmore.className === 'readmore' || readmore.classList?.contains('readmore'))) {
            readmore.remove();
        }
    }
    
    mdLog('applySmartImageLayout: ✓ 统一九宫格创建完成 (' + total + ' 张图，显示 ' + displayCount + ' 张)');
}

// 创建视频元素 HTML
function createVideoElement(source, type) {
    switch (type) {
        case 'youtube':
            return `<div class="markdown-video-container">
                <iframe src="https://www.youtube.com/embed/${source}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen 
                    loading="lazy">
                </iframe>
            </div>`;

        case 'bilibili':
            return `<div class="markdown-video-container">
                <iframe src="//player.bilibili.com/player.html?bvid=${source}&high_quality=1&danmaku=0" 
                    frameborder="0" 
                    allowfullscreen 
                    scrolling="no" 
                    loading="lazy">
                </iframe>
            </div>`;

        case 'local':
        default:
            return `<div class="markdown-video-container">
                <video controls preload="metadata" playsinline>
                    <source src="${source}" type="video/mp4">
                    您的浏览器不支持视频播放。
                </video>
            </div>`;
    }
}

// 初始化图片预览弹窗（Lightbox）- 统一灯箱系统
function initImageLightbox(container) {
    var rootContainer = container || document;
    var post = rootContainer.closest('.post') || rootContainer;
    
    var allPostImages = collectPostImages(post);
    
    if (allPostImages.length === 0) return;

    mdLog('initImageLightbox: 文章共 ' + allPostImages.length + ' 张图片（含 Markdown + 附件）');

    allPostImages.forEach(function(img, index) {
        if (img._lightboxBound) return;
        
        img.style.cursor = 'zoom-in';
        img.dataset.lightboxIndex = index;
        img.dataset.lightboxGroup = 'post_' + (post.dataset.id || 'unknown');
        img._lightboxBound = true;

        img.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            mdLog('Lightbox: 图片被点击, src=', this.src.substring(0, 60));
            
            var currentPost = this.closest('.post');
            var currentAllImages = currentPost ? collectPostImages(currentPost) : [this];
            var srcList = currentAllImages.map(function(im) { return im.src; });
            openLightbox(this.src, this.alt || '', srcList);
        });
    });
    
    mdLog('initImageLightbox: ✓ 已绑定 ' + allPostImages.length + ' 张图片');
}

// 收集文章内的所有图片（统一处理 Markdown 和附件图片）
function collectPostImages(postElement) {
    if (!postElement) return [];
    
    var images = [];
    var seenSrcs = new Set();
    
    function addImage(img) {
        var src = img.src || '';
        if (!src || seenSrcs.has(src)) return;
        seenSrcs.add(src);
        images.push(img);
    }
    
    var mdImages = postElement.querySelectorAll('.markdown-body img:not(.md-img-collected)');
    mdImages.forEach(addImage);
    
    var annexImages = postElement.querySelectorAll('.annex:not(.md-annex-hidden) img');
    annexImages.forEach(addImage);
    
    var contentImages = postElement.querySelectorAll('.content > :not(.markdown-body) > img:not(.md-img-collected), .content > img:not(.md-img-collected)');
    contentImages.forEach(addImage);
    
    return images;
}

// 全局 Lightbox 初始化（页面加载后）
function initGlobalLightbox() {
    var doInit = function() {
        var allPosts = document.querySelectorAll('.post');
        mdLog('全局 Lightbox: 找到 ' + allPosts.length + ' 篇文章');
        
        if (allPosts.length === 0) return false;
        
        allPosts.forEach(function(post, postIdx) {
            var allPostImages = collectPostImages(post);
            if (allPostImages.length > 0) {
                mdLog('  文章 #' + (postIdx + 1) + ': ' + allPostImages.length + ' 张图片');
                
                allPostImages.forEach(function(img, i) {
                    if (img._lightboxBound) return;
                    
                    img.style.cursor = 'zoom-in';
                    img.dataset.lightboxIndex = i;
                    img.dataset.lightboxGroup = 'post_' + (post.dataset.id || postIdx);
                    img._lightboxBound = true;

                    img.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        mdLog('Lightbox[全局]: 图片被点击');
                        
                        var currentPost = this.closest('.post');
                        var currentAllImages = currentPost ? collectPostImages(currentPost) : [this];
                        var srcList = currentAllImages.map(function(im) { return im.src; });
                        openLightbox(this.src, this.alt || '', srcList);
                    });
                });
            }
        });
        
        mdLog('全局 Lightbox: ✓ 初始化完成');
        
        if (typeof applySmartImageLayout === 'function') {
            var layoutCount = 0;
            allPosts.forEach(function(post) {
                applySmartImageLayout(post);
                layoutCount++;
            });
            if (layoutCount > 0) {
                mdLog('全局智能布局: 已为 ' + layoutCount + ' 篇文章应用统一图片布局');
            }
        }
        return true;
    };

    var timer1, timer2, timer3;
    
    function tryInit() {
        var result = doInit();
        if (result) {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        }
    }
    
    timer1 = setTimeout(function() { tryInit(); }, 800);
    timer2 = setTimeout(function() { tryInit(); }, 2000);
    timer3 = setTimeout(function() { tryInit(); }, 4000);

    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType !== Node.ELEMENT_NODE) return;
                
                if (node.classList && node.classList.contains('post')) {
                    var newImages = collectPostImages(node);
                    bindLightboxToImages(newImages);
                    if (typeof applySmartImageLayout === 'function') {
                        applySmartImageLayout(node);
                    }
                }
                
                if (node.classList && node.classList.contains('markdown-body')) {
                    var post = node.closest('.post');
                    var newImages = post ? collectPostImages(post) : node.querySelectorAll('img');
                    bindLightboxToImages(Array.from(newImages));
                    if (typeof applySmartImageLayout === 'function') {
                        applySmartImageLayout(node);
                    }
                }
                
                if (node.tagName === 'IMG' && node.closest('.post')) {
                    bindLightboxToImages([node]);
                    var mdBody = node.closest('.markdown-body');
                    if (mdBody && typeof applySmartImageLayout === 'function') {
                        setTimeout(function() { applySmartImageLayout(mdBody); }, 50);
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
    mdLog('MutationObserver: 已启动');
}

// 批量绑定 Lightbox 事件
function bindLightboxToImages(images) {
    images.filter(function(img) { return !img._lightboxBound; }).forEach(function(img) {
        img.style.cursor = 'zoom-in';
        img.setAttribute('data-lightbox', 'unified-gallery');
        img._lightboxBound = true;

        img.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var post = this.closest('.post');
            var allImages = post ? collectPostImages(post) : [this];
            var srcList = allImages.map(function(im) { return im.src; });
            openLightbox(this.src, this.alt || '', srcList);
        });
    });
}

// 打开 Lightbox 弹窗
function openLightbox(src, alt, allImages) {
    mdLog('openLightbox: 打开预览弹窗');

    var lightbox = document.getElementById('md-lightbox-overlay');
    if (!lightbox) {
        lightbox = createLightboxOverlay();
    }

    var img = lightbox.querySelector('#md-lightbox-img');
    var caption = lightbox.querySelector('#md-lightbox-caption');
    var counter = lightbox.querySelector('#md-lightbox-counter');

    img.src = src;
    img.alt = alt;
    img.style.width = '';
    img.style.height = '';
    caption.textContent = alt;
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';

    currentIndex = allImages.indexOf(src);
    if (currentIndex < 0) currentIndex = 0;
    if (counter && allImages.length > 1) {
        counter.textContent = (currentIndex + 1) + ' / ' + allImages.length;
    }

    currentImages = allImages;

    if (img.complete && img.naturalWidth > 0) {
        fitLightboxImage(img);
    } else {
        img.onload = function() { fitLightboxImage(img); };
    }
}

// 根据图片实际尺寸动态调整灯箱中的显示大小
function fitLightboxImage(img) {
    if (!img || !img.naturalWidth) return;

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var natW = img.naturalWidth;
    var natH = img.naturalHeight;
    var natRatio = natW / natH;

    var availW = vw * 0.95;
    var availH = vh * 0.88;

    var screenRatio = availW / availH;

    var displayW, displayH;

    if (natRatio >= screenRatio) {
        displayW = Math.min(natW, availW);
        displayH = displayW / natRatio;
        if (displayH > availH) {
            displayH = availH;
            displayW = displayH * natRatio;
        }
    } else {
        displayH = Math.min(natH, availH);
        displayW = displayH * natRatio;
        if (displayW > availW) {
            displayW = availW;
            displayH = displayW / natRatio;
        }
    }

    var minDisplay = Math.min(availW, availH) * 0.4;
    if (displayW < minDisplay && displayH < minDisplay) {
        if (natRatio >= 1) {
            displayW = minDisplay;
            displayH = displayW / natRatio;
        } else {
            displayH = minDisplay;
            displayW = displayH * natRatio;
        }
    }

    img.style.width = Math.round(displayW) + 'px';
    img.style.height = Math.round(displayH) + 'px';
    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';

    mdLog('fitLightboxImage: 原始 ' + natW + '×' + natH + ' → 显示 ' + Math.round(displayW) + '×' + Math.round(displayH));
}

// 创建 Lightbox DOM 结构
function createLightboxOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'md-lightbox-overlay';
    overlay.className = 'md-lightbox-overlay';
    overlay.innerHTML = `
        <button class="md-lightbox-close" id="md-lightbox-close" title="关闭 (ESC)">×</button>
        <button class="md-lightbox-prev" id="md-lightbox-prev" title="上一张 (←)">‹</button>
        <button class="md-lightbox-next" id="md-lightbox-next" title="下一张 (→)">›</button>
        <div class="md-lightbox-content">
            <img id="md-lightbox-img" src="" alt="">
        </div>
        <div class="md-lightbox-caption" id="md-lightbox-caption"></div>
        <div class="md-lightbox-counter" id="md-lightbox-counter"></div>
    `;
    document.body.appendChild(overlay);

    // 绑定事件
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeLightbox();
    });

    overlay.querySelector('#md-lightbox-close').addEventListener('click', closeLightbox);
    overlay.querySelector('#md-lightbox-prev').addEventListener('click', () => navigateLightbox(-1));
    overlay.querySelector('#md-lightbox-next').addEventListener('click', () => navigateLightbox(1));

    return overlay;
}

let currentIndex = 0;
let currentImages = [];

// 关闭 Lightbox
function closeLightbox() {
    var lightbox = document.getElementById('md-lightbox-overlay');
    if (lightbox) {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Lightbox 导航（上一张/下一张）
function navigateLightbox(direction) {
    if (!currentImages || currentImages.length === 0) return;

    currentIndex += direction;
    if (currentIndex < 0) currentIndex = currentImages.length - 1;
    if (currentIndex >= currentImages.length) currentIndex = 0;

    var src = currentImages[currentIndex];
    var lightboxImg = document.querySelector('#md-lightbox-img');
    var caption = document.querySelector('#md-lightbox-caption');
    var counter = document.querySelector('#md-lightbox-counter');

    if (lightboxImg) {
        lightboxImg.src = src;
        lightboxImg.alt = '';
        lightboxImg.style.width = '';
        lightboxImg.style.height = '';
        if (lightboxImg.complete && lightboxImg.naturalWidth > 0) {
            fitLightboxImage(lightboxImg);
        } else {
            lightboxImg.onload = function() { fitLightboxImage(lightboxImg); };
        }
    }

    if (caption) caption.textContent = '';
    if (counter && currentImages.length > 1) {
        counter.textContent = (currentIndex + 1) + ' / ' + currentImages.length;
    }
}

// 将HTML转换回Markdown（用于编辑）
function htmlToMarkdown(html) {
    if (!html) return '';
    
    let md = html;
    
    // 视频容器 → 提取视频链接
    md = md.replace(/<div[^>]*class="[^"]*markdown-video-container[^"]*"[^>]*>\s*<video[^>]*>\s*<source\s+src="([^"]*)"[^>]*>.*?<\/video>\s*<\/div>/gis, '$1');
    md = md.replace(/<div[^>]*class="[^"]*markdown-video-wrapper[^"]*"[^>]*>.*?<\/div>/gis, (match) => {
        const srcMatch = match.match(/src="([^"]*\.(mp4|webm|ogg|m4v|mov|avi))"/i);
        return srcMatch ? srcMatch[1] : '';
    });
    
    // YouTube iframe → 链接
    md = md.replace(/<iframe[^>]*src="[^"]*youtube\.com\/embed\/([^"&]+)[^"]*"[^>]*><\/iframe>/gi, 'https://www.youtube.com/watch?v=$1');
    
    // B站 iframe → 链接  
    md = md.replace(/<iframe[^>]*src="[^"]*bilibili\.com\/player\.html\?bvid=([^"&]+)[^"]*"[^>]*><\/iframe>/gi, 'https://www.bilibili.com/video/$1');
    
    // 移除多余空白
    md = md.replace(/\s+/g, ' ');
    
    // 代码块
    md = md.replace(/<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/gi, '```$1\n$2\n```');
    
    // 行内代码
    md = md.replace(/<code>([^<]+)<\/code>/g, '`$1`');
    
    // 标题
    md = md.replace(/<h6[^>]*>([^<]*)<\/h6>/gi, '###### $1');
    md = md.replace(/<h5[^>]*>([^<]*)<\/h5>/gi, '##### $1');
    md = md.replace(/<h4[^>]*>([^<]*)<\/h4>/gi, '#### $1');
    md = md.replace(/<h3[^>]*>([^<]*)<\/h3>/gi, '### $1');
    md = md.replace(/<h2[^>]*>([^<]*)<\/h2>/gi, '## $1');
    md = md.replace(/<h1[^>]*>([^<]*)<\/h1>/gi, '# $1');
    
    // 粗体和斜体
    md = md.replace(/<(?:strong|b)[^>]*>([^<]*)<\/(?:strong|b)>/gi, '**$1**');
    md = md.replace(/<(?:em|i)[^>]*>([^<]*)<\/(?:em|i)>/gi, '*$1*');
    
    // 删除线
    md = md.replace(/<del[^>]*>([^<]*)<\/del>/gi, '~~$1~~');
    
    // 链接
    md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '[$2]($1)');
    
    // 图片
    md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
    
    // 引用
    md = md.replace(/<blockquote[^>]*>([^<]*)<\/blockquote>/gi, '> $1');
    
    // 列表
    md = md.replace(/<li[^>]*>([^<]*)<\/li>/gi, '- $1');
    md = md.replace(/<\/?(?:ul|ol)[^>]*>/gi, '');
    
    // 分割线
    md = md.replace(/<hr\s*\/?>/gi, '---');
    
    // 段落和换行
    md = md.replace(/<\/p>/gi, '\n\n');
    md = md.replace(/<br\s*\/?>/gi, '\n');
    md = md.replace(/<[^>]+>/g, '');
    
    // HTML实体解码
    md = md.replace(/&amp;/g, '&');
    md = md.replace(/&lt;/g, '<');
    md = md.replace(/&gt;/g, '>');
    md = md.replace(/&quot;/g, '"');
    
    // 清理空白
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.trim();
    
    return md;
}

// 获取纯文本内容（去除所有格式）
function getPlainText(html) {
    if (!html) return '';
    
    let text = html;
    
    // 移除脚本和样式
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // 替换块级元素为换行
    text = text.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n');
    
    // 替换br为换行
    text = text.replace(/<br\s*\/?>/gi, '\n');
    
    // 移除所有HTML标签
    text = text.replace(/<[^>]+>/g, '');
    
    // 解码HTML实体
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    
    // 清理多余空白
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();
    
    return text;
}

// 强制重新渲染页面上的 Markdown 内容
function rerenderAllMarkdown() {
    mdLog('rerenderAllMarkdown: 开始重新渲染所有 Markdown 内容');
    
    var posts = document.querySelectorAll('.post .content');
    var count = 0;
    
    posts.forEach(function(content) {
        if (content.querySelector('#editor_content')) return;
        
        var tagSpan = content.querySelector('.tag');
        
        var rawText = content.textContent || content.innerText || '';
        
        if (tagSpan) {
            var tagText = tagSpan.textContent || '';
            rawText = rawText.replace(tagText, '').trim();
        }
        
        if (rawText && isMarkdownContent(rawText)) {
            count++;
            mdLog('rerenderAllMarkdown: 找到 Markdown 内容 #' + count);
            
            try {
                var renderedHtml = renderMarkdown(rawText);
                
                content.innerHTML = '';
                if (tagSpan) {
                    var newTag = tagSpan.cloneNode(true);
                    content.appendChild(newTag);
                }
                
                var mdContainer = document.createElement('div');
                mdContainer.className = 'markdown-body';
                mdContainer.innerHTML = renderedHtml;
                
                mdContainer.dataset.rawMarkdown = rawText;
                content.dataset.rawMarkdown = rawText;
                
                if (window._markdownRawStore) {
                    window._markdownRawStore.set(content, rawText);
                }
                
                var postIndex = Array.from(document.querySelectorAll('.post .content')).indexOf(content);
                if (window._markdownRawStore) {
                    window._markdownRawStore.set('post_' + postIndex, rawText);
                }
                
                content.appendChild(mdContainer);

                if (typeof applySmartImageLayout === 'function') {
                    applySmartImageLayout(mdContainer);
                    mdLog('rerenderAllMarkdown: 已应用智能图片布局 #' + count);
                }

                mdLog('rerenderAllMarkdown: 成功渲染 #' + count);

                setTimeout(function() {
                    initImageLightbox(mdContainer);
                    mdLog('rerenderAllMarkdown: 已为 #' + count + ' 添加图片预览');
                }, 100);
                
                setTimeout(function() {
                    if (typeof foldPost === 'function') {
                        if (content.dataset.imageDominant === 'true') {
                            mdLog('rerenderAllMarkdown: #' + count + ' 是图片文章，跳过展开全文');
                            return;
                        }
                        
                        content.style.maxHeight = '';
                        foldPost(content);
                        mdLog('rerenderAllMarkdown: 已为 #' + count + ' 添加折叠功能');
                    }
                }, 50);
                
            } catch (e) {
                console.error('[Markdown] 重渲染错误:', e);
            }
        }
    });
    
    mdLog('rerenderAllMarkdown: 完成，共渲染 ' + count + ' 个 Markdown 内容');
    return count;
}

// 在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    mdLog('Markdown 工具已加载');

    // 键盘事件：ESC 关闭 Lightbox
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            closeLightbox();
        }
        // 左右箭头导航
        if (document.getElementById('md-lightbox-overlay')?.classList.contains('active')) {
            if (e.key === 'ArrowLeft') navigateLightbox(-1);
            if (e.key === 'ArrowRight') navigateLightbox(1);
        }
    });

    // 窗口大小变化时重新计算灯箱图片尺寸
    window.addEventListener('resize', function() {
        const overlay = document.getElementById('md-lightbox-overlay');
        if (overlay?.classList.contains('active')) {
            const img = document.querySelector('#md-lightbox-img');
            if (img && img.naturalWidth > 0) {
                fitLightboxImage(img);
            }
        }
    });

    // 初始化全局 Lightbox（监听所有 Markdown 图片）
    initGlobalLightbox();
    
    // 检查库状态
    setTimeout(() => {
        if (typeof marked !== 'undefined') {
            mdLog('marked 库已就绪，版本:', marked.version || '未知');
        } else {
            console.warn('[Markdown] ⚠️ marked 库未加载！请检查网络连接');
        }
        
        if (typeof katex !== 'undefined') {
            mdLog('KaTeX 库已就绪，版本:', katex.version || '未知');
        } else {
            console.warn('[Markdown] ⚠️ KaTeX 库未加载！数学公式将无法渲染');
        }
    }, 500);
    
    // 暴露全局调试工具
    window.mdDebug = {
        // 检查指定文章的内容
        checkPost: (index = 0) => {
            const posts = document.querySelectorAll('.post .content');
            if (posts.length === 0) {
                console.warn('[MD-Debug] 没有找到文章内容');
                return null;
            }
            
            const post = posts[Math.min(index, posts.length - 1)];
            return {
                innerHTML: post.innerHTML.substring(0, 500),
                textContent: post.textContent.substring(0, 500),
                isMarkdown: isMarkdownContent(post.textContent)
            };
        },
        
        // 显示所有文章的 Markdown 检测结果
        checkAllPosts: () => {
            const posts = document.querySelectorAll('.post .content');
            console.log(`[MD-Debug] 共找到 ${posts.length} 篇文章`);
            
            posts.forEach((post, i) => {
                const text = post.textContent.substring(0, 100);
                const isMd = isMarkdownContent(text);
                console.log(`[MD-Debug] 文章 #${i+1}: ${isMd ? '✓ Markdown' : '✗ 普通'} - "${text}..."`);
            });
        }
    };
    
    console.log('[Markdown] 调试工具已加载：');
    console.log('  - mdDebug.checkPost(0)  // 检查第一篇文章');
    console.log('  - mdDebug.checkAllPosts() // 检查所有文章');
});
