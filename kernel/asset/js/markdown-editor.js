/**
 * Markdown 编辑器增强功能
 * 提供Markdown语法辅助工具
 */

// Markdown 工具栏 HTML
function getMarkdownToolbar() {
    return `
        <div class="markdown-toolbar" id="markdownToolbar">
            <button type="button" data-action="bold" title="粗体 (Ctrl+B)">
                <strong>B</strong>
            </button>
            <button type="button" data-action="italic" title="斜体 (Ctrl+I)">
                <em>I</em>
            </button>
            <button type="button" data-action="strikethrough" title="删除线 (Ctrl+S)">
                <del>S</del>
            </button>
            <span class="toolbar-divider"></span>
            <button type="button" data-action="heading1" title="标题 1">H1</button>
            <button type="button" data-action="heading2" title="标题 2">H2</button>
            <button type="button" data-action="heading3" title="标题 3">H3</button>
            <span class="toolbar-divider"></span>
            <button type="button" data-action="ul" title="无序列表">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
                </svg>
            </button>
            <button type="button" data-action="ol" title="有序列表">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zM7 5h14v2H7V5zm0 8h14v2H7v-2zm0 8h14v2H7v-2z"/>
                </svg>
            </button>
            <button type="button" data-action="quote" title="引用">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/>
                </svg>
            </button>
            <button type="button" data-action="code" title="行内代码">
                <code>&lt;/&gt;</code>
            </button>
            <button type="button" data-action="codeblock" title="代码块">
                <code>{ }</code>
            </button>
            <span class="toolbar-divider"></span>
            <button type="button" data-action="link" title="链接 (Ctrl+K)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                </svg>
            </button>
            <button type="action" data-action="image" title="图片">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
            </button>
            <button type="button" data-action="hr" title="分割线">—</button>
            <button type="button" data-action="table" title="表格">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 3v18h18V3H3zm16 16H5v-4h14v4zm0-6H5v-4h14v4zm0-6H5V5h14v4z"/>
                </svg>
            </button>
            <span class="toolbar-divider"></span>
            <button type="button" data-action="math-inline" title="行内公式 ($...$)">
                <span style="font-family:serif;font-style:italic;">fx</span>
            </button>
            <button type="button" data-action="math-block" title="块级公式 ($$...$$)">
                <span style="font-family:serif;font-style:italic;font-weight:bold;">∑</span>
            </button>
            <span class="toolbar-divider"></span>
            <button type="button" data-action="preview" title="预览 (Ctrl+P)" class="btn-preview">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
            </button>
            <button type="button" data-action="help" title="Markdown 帮助">
                ?
            </button>
        </div>
    `;
}

// 初始化 Markdown 工具栏
function initMarkdownToolbar() {
    const toolbar = document.getElementById('markdownToolbar');
    if (!toolbar) return;

    // 绑定按钮事件
    toolbar.addEventListener('click', handleToolbarAction);
    
    // 绑定快捷键
    document.addEventListener('keydown', handleMarkdownShortcuts);
}

// 处理工具栏操作
function handleToolbarAction(e) {
    const button = e.target.closest('button');
    if (!button) return;
    
    const action = button.dataset.action;
    const editor = document.getElementById('editor_content');
    if (!editor) return;

    switch (action) {
        case 'bold':
            insertMarkdownSyntax(editor, '**', '**', '粗体文本');
            break;
        case 'italic':
            insertMarkdownSyntax(editor, '*', '*', '斜体文本');
            break;
        case 'strikethrough':
            insertMarkdownSyntax(editor, '~~', '~~', '删除线文本');
            break;
        case 'heading1':
            insertLineStart(editor, '# ');
            break;
        case 'heading2':
            insertLineStart(editor, '## ');
            break;
        case 'heading3':
            insertLineStart(editor, '### ');
            break;
        case 'ul':
            insertLineStart(editor, '- ');
            break;
        case 'ol':
            insertLineStart(editor, '1. ');
            break;
        case 'quote':
            insertLineStart(editor, '> ');
            break;
        case 'code':
            insertMarkdownSyntax(editor, '`', '`', '代码');
            break;
        case 'codeblock':
            insertCodeBlock(editor);
            break;
        case 'link':
            insertLink(editor);
            break;
        case 'image':
            insertImage(editor);
            break;
        case 'hr':
            insertAtCursor(editor, '\n---\n');
            break;
        case 'table':
            insertTable(editor);
            break;
        case 'math-inline':
            insertMarkdownSyntax(editor, '$', '$', 'E = mc^2');
            break;
        case 'math-block':
            const mathBlock = '\n$$\n\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\cdots + x_n\n$$\n';
            insertAtCursor(editor, mathBlock);
            break;
        case 'preview':
            togglePreview();
            break;
        case 'help':
            showMarkdownHelp();
            break;
    }
}

// 插入 Markdown 语法（带选中文本）
function insertMarkdownSyntax(editor, before, after, placeholder) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    const newText = selectedText || placeholder;
    const markdownText = before + newText + after;
    
    // 如果有选中文本，替换它；否则在光标位置插入
    if (selectedText) {
        document.execCommand('insertText', false, markdownText);
    } else {
        document.execCommand('insertText', false, markdownText);
        
        // 选中新插入的占位符文本
        setTimeout(() => {
            const newSelection = window.getSelection();
            if (newSelection.rangeCount > 0) {
                const newRange = newSelection.getRangeAt(0);
                const textNode = newRange.startContainer;
                if (textNode.nodeType === Node.TEXT_NODE) {
                    const startOffset = newRange.startOffset - before.length;
                    const endOffset = startOffset + placeholder.length;
                    newRange.setStart(textNode, Math.max(0, startOffset));
                    newRange.setEnd(textNode, Math.min(textNode.length, endOffset));
                    newSelection.removeAllRanges();
                    newSelection.addRange(newRange);
                }
            }
        }, 0);
    }
    
    editor.focus();
}

// 在行首插入语法
function insertLineStart(editor, syntax) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    
    // 获取当前行的开始位置
    let lineStart = range.startOffset;
    const textContent = editor.textContent || '';
    const beforeCursor = textContent.substring(0, range.startOffset);
    const lastNewlineIndex = beforeCursor.lastIndexOf('\n');
    
    // 在当前行首插入
    const position = lastNewlineIndex + 1;
    
    document.execCommand('insertText', false, syntax);
    editor.focus();
}

// 插入代码块
function insertCodeBlock(editor) {
    const codeBlock = '\n```javascript\n// 在这里输入代码\n```\n';
    insertAtCursor(editor, codeBlock);
}

// 插入链接
function insertLink(editor) {
    const url = prompt('请输入链接地址:', 'https://');
    if (!url) return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString() || '链接文本';
    const linkText = `[${selectedText}](${url})`;
    
    document.execCommand('insertText', false, linkText);
    editor.focus();
}

// 插入图片
function insertImage(editor) {
    const url = prompt('请输入图片地址:', 'https://');
    if (!url) return;
    
    const alt = prompt('请输入图片描述（可选）:', '');
    const imageText = `![${alt}](${url})`;
    
    document.execCommand('insertText', false, imageText);
    editor.focus();
}

// 插入表格
function insertTable(editor) {
    const table = `
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容 | 内容 | 内容 |
| 内容 | 内容 | 内容 |
`;
    insertAtCursor(editor, table);
}

// 在光标位置插入文本
function insertAtCursor(editor, text) {
    document.execCommand('insertText', false, text);
    editor.focus();
}

// 处理快捷键
function handleMarkdownShortcuts(e) {
    const editor = document.getElementById('editor_content');
    if (!editor || !editor.contains(e.target)) return;
    
    // Ctrl+B: 粗体
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        handleToolbarAction({ target: { closest: () => ({ dataset: { action: 'bold' } }) } });
    }
    
    // Ctrl+I: 斜体
    if (e.ctrlKey && e.key === 'i') {
        e.preventDefault();
        handleToolbarAction({ target: { closest: () => ({ dataset: { action: 'italic' } }) } });
    }
    
    // Ctrl+K: 链接
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        handleToolbarAction({ target: { closest: () => ({ dataset: { action: 'link' } }) } });
    }
    
    // Ctrl+P: 预览
    if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        togglePreview();
    }
}

// 切换预览模式
let isPreviewMode = false;
function togglePreview() {
    const editor = document.getElementById('editor_content');
    const previewBtn = document.querySelector('[data-action="preview"]');
    
    if (!editor) return;
    
    isPreviewMode = !isPreviewMode;
    
    if (isPreviewMode) {
        // 显示预览
        const content = editor.innerText;
        let renderedHtml = '';
        
        try {
            if (typeof renderMarkdown === 'function') {
                renderedHtml = renderMarkdown(content);
            } else {
                renderedHtml = `<pre>${content}</pre>`;
            }
        } catch (e) {
            renderedHtml = `<p>预览错误: ${e.message}</p>`;
        }
        
        // 保存原始内容到 dataset
        editor.dataset.originalContent = content;
        
        // 替换为预览内容
        editor.innerHTML = `<div class="markdown-preview">${renderedHtml}</div>`;
        editor.contentEditable = 'false';
        
        if (previewBtn) {
            previewBtn.classList.add('active');
            previewBtn.title = '返回编辑';
        }
    } else {
        // 返回编辑模式
        const originalContent = editor.dataset.originalContent || '';
        editor.innerHTML = originalContent;
        editor.contentEditable = 'true';
        delete editor.dataset.originalContent;
        
        if (previewBtn) {
            previewBtn.classList.remove('active');
            previewBtn.title = '预览 (Ctrl+P)';
        }
    }
    
    editor.focus();
}

// 显示 Markdown 帮助
function showMarkdownHelp() {
    const helpContent = `
        <div style="max-width:600px;max-height:80vh;overflow-y:auto;padding:20px;">
            <h2 style="margin-top:0;">Markdown 语法帮助</h2>
            
            <h3>基础语法</h3>
            <ul style="list-style:none;padding-left:0;">
                <li><code># 标题1</code> - 一级标题</li>
                <li><code>## 标题2</code> - 二级标题</li>
                <li><code>### 标题3</code> - 三级标题</li>
                <li><code>**粗体**</code> - <strong>粗体</strong></li>
                <li><code>*斜体*</code> - <em>斜体</em></li>
                <li><code>~~删除线~~</code> - <del>删除线</del></li>
                <li><code>\`行内代码\`</code> - <code>行内代码</code></li>
            </ul>
            
            <h3>列表</h3>
            <ul style="list-style:none;padding-left:0;">
                <li><code>- 无序列表项</code> 或 <code>* 无序列表项</code></li>
                <li><code>1. 有序列表项</code></li>
            </ul>
            
            <h3>链接和图片</h3>
            <ul style="list-style:none;padding-left:0;">
                <li><code>[链接文本](URL)</code> - 链接</li>
                <li><code>![图片描述](URL)</code> - 图片</li>
            </ul>
            
            <h3>引用和代码块</h3>
            <ul style="list-style:none;padding-left:0;">
                <li><code>> 引用文本</code> - 引用块</li>
                <li><code>\`\`\`语言名<br>代码<br>\`\`\`</code> - 代码块</li>
            </ul>
            
            <h3>其他</h3>
            <ul style="list-style:none;padding-left:0;">
                <li><code>---</code> - 分割线</li>
                <li><code>&lt;br&gt;</code> - 换行（两个空格也可以）</li>
            </ul>
            
            <h3>数学公式 (KaTeX)</h3>
            <ul style="list-style:none;padding-left:0;">
                <li><code>$E = mc^2$</code> - 行内公式</li>
                <li><code>$$\\sum_{i=1}^{n} x_i$$</code> - 块级公式（独立成行）</li>
            </ul>
            <p style="font-size:0.9em;color:#666;margin:8px 0;">
                支持的符号：+ - × ÷ = ∫ ∑ ∏ √ ∞ π α β γ δ θ λ μ σ φ ω<br>
                上标：x^2 &nbsp; 下标：x_1 &nbsp; 分数：\\frac{a}{b}<br>
                根号：\\sqrt{x} &nbsp; 求和：\\sum &nbsp; 积分：\\int
            </p>
            
            <h3>表格</h3>
            <pre style="background:#f5f5f5;padding:10px;border-radius:4px;">
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容 | 内容 | 内容 |
            </pre>
            
            <h3>快捷键</h3>
            <ul style="list-style:none;padding-left:0;">
                <li><kbd>Ctrl+B</kbd> - 粗体</li>
                <li><kbd>Ctrl+I</kbd> - 斜体</li>
                <li><kbd>Ctrl+K</kbd> - 链接</li>
                <li><kbd>Ctrl+P</kbd> - 预览</li>
            </ul>
        </div>
    `;
    
    // 创建模态框显示帮助
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background: white;
        border-radius: 8px;
        max-width: 90%;
        max-height: 90vh;
        overflow: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    modalContent.innerHTML = helpContent + '<div style="text-align:center;margin-top:20px;"><button onclick="this.closest(\'.modal-overlay\').remove()" style="padding:8px 24px;background:#29adff;color:white;border:none;border-radius:4px;cursor:pointer;">关闭</button></div>';
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 添加工具栏样式
const toolbarStyles = `
    .editor-toolbar-wrapper {
        margin: 8px 0;
        background: #fff;
        border-radius: 6px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .markdown-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 8px;
        background: #f8f9fa;
        border: 1px solid #e1e4e8;
        border-radius: 6px;
    }

    .markdown-toolbar button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
        padding: 0 8px;
        background: white;
        border: 1px solid #d1d5da;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        color: #24292e;
        transition: all 0.15s ease;
    }

    .markdown-toolbar button:hover {
        background: #f1f3f5;
        border-color: #a8b2bd;
    }

    .markdown-toolbar button:active {
        background: #e1e4e8;
    }

    .markdown-toolbar button.active {
        background: #0366d6;
        color: white;
        border-color: #0366d6;
    }

    .markdown-toolbar code {
        font-family: "SFMono-Regular", Consolas, monospace;
        font-size: 12px;
        font-weight: 600;
    }

    .toolbar-divider {
        width: 1px;
        height: 32px;
        background: #d1d5da;
        margin: 0 4px;
    }

    .markdown-preview {
        padding: 12px;
        min-height: 100px;
        background: #fafbfc;
        border: 1px solid #e1e4e8;
        border-radius: 4px;
    }

    @media (max-width: 768px) {
        .editor-toolbar-wrapper {
            margin: 4px 0;
        }
        
        .markdown-toolbar {
            padding: 6px;
            gap: 2px;
        }

        .markdown-toolbar button {
            min-width: 28px;
            height: 28px;
            font-size: 12px;
        }
        
        .toolbar-divider {
            height: 28px;
        }
    }
`;

// 注入样式
function injectToolbarStyles() {
    if (!document.getElementById('markdown-toolbar-styles')) {
        const style = document.createElement('style');
        style.id = 'markdown-toolbar-styles';
        style.textContent = toolbarStyles;
        document.head.appendChild(style);
    }
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    injectToolbarStyles();
    console.log('Markdown 编辑器工具已加载');
});
