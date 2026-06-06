#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const footnote = require('marked-footnote');
const alert = require('marked-alert');
const katexExtension = require('marked-katex-extension');

// Directories
const POSTS_DIR = path.join(__dirname, '..', 'posts');
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Pagination config
const POSTS_PER_PAGE = 10;

// Read template
const layoutTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'layout.html'), 'utf-8');

// Syntax Highlighter (Zero Dependency)
function highlightCode(code, lang) {
    // Escape HTML first
    code = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    if (!lang) return code;
    lang = lang.toLowerCase();

    // Use placeholder protection: save existing spans, replace with placeholders,
    // apply highlighting, then restore. This prevents double-wrapping.
    const spans = [];
    function protect(code) {
        return code.replace(/<span class="[^"]*">[\s\S]*?<\/span>/g, (m) => {
            spans.push(m);
            return `\x00SPAN${spans.length - 1}\x00`;
        });
    }
    function restore(code) {
        return code.replace(/\x00SPAN(\d+)\x00/g, (_, i) => spans[parseInt(i)]);
    }

    if (['javascript', 'js', 'typescript', 'ts'].includes(lang)) {
        code = jsHighlight(code);
    }
    else if (['python', 'py'].includes(lang)) {
        code = pythonHighlight(code);
    }
    else if (['html', 'xml'].includes(lang)) {
        code = htmlHighlight(code);
    }
    else if (['css', 'scss', 'less'].includes(lang)) {
        code = cssHighlight(code);
    }
    else if (['bash', 'sh', 'shell', 'zsh'].includes(lang)) {
        code = bashHighlight(code);
    }
    else if (['sql'].includes(lang)) {
        code = sqlHighlight(code);
    }
    else if (['json'].includes(lang)) {
        code = jsonHighlight(code);
    }
    else if (['markdown', 'md'].includes(lang)) {
        code = markdownHighlight(code);
    }
    else if (['yaml', 'yml'].includes(lang)) {
        code = yamlHighlight(code);
    }

    return code;
}

// Safe span wrapping
function safeSpan(text, className) {
    return `<span class="${className}">${text}</span>`;
}

function jsHighlight(code) {
    // Template strings
    code = code.replace(/(`(?:[^`\\]|\\.)*`)/g, safeSpan('$1', 'hl-string'));
    // Strings
    code = code.replace(/("(?:[^"\\]|\\.)*")/g, safeSpan('$1', 'hl-string'));
    code = code.replace(/('(?:[^'\\]|\\.)*')/g, safeSpan('$1', 'hl-string'));
    // Comments
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, safeSpan('$1', 'hl-comment'));
    code = code.replace(/(\/\/.*$)/gm, safeSpan('$1', 'hl-comment'));
    // Keywords
    code = code.replace(/\b(const|let|var|function|class|import|from|export|default|if|else|for|while|do|return|try|catch|finally|throw|new|this|super|typeof|instanceof|in|of|delete|void|yield|async|await|switch|case|break|continue|extends|static|get|set|with)\b/g, safeSpan('$1', 'hl-keyword'));
    // Built-in values
    code = code.replace(/\b(true|false|null|undefined|NaN|Infinity)\b/g, safeSpan('$1', 'hl-literal'));
    // Numbers
    code = code.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, safeSpan('$1', 'hl-number'));
    // Functions
    code = code.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/g, safeSpan('$1', 'hl-func'));
    // Built-in objects
    code = code.replace(/\b(console|window|document|Math|JSON|Promise|Array|Object|String|Number|Boolean|Map|Set|Date|RegExp|Error|parseInt|parseFloat|setTimeout|setInterval|require|module|process|Buffer)\b/g, safeSpan('$1', 'hl-built-in'));
    return code;
}

function pythonHighlight(code) {
    // After HTML escaping, " is &quot; — so we need to match that
    // Triple-quoted strings (handle first)
    code = code.replace(/(&quot;&quot;&quot;[\s\S]*?&quot;&quot;&quot;|'''[\s\S]*?''')/g, safeSpan('$1', 'hl-string'));
    // Strings (f-strings, regular strings)
    code = code.replace(/(f?&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, safeSpan('$1', 'hl-string'));
    code = code.replace(/('(?:[^'\\]|\\.)*')/g, safeSpan('$1', 'hl-string'));
    // Comments
    code = code.replace(/(#.*$)/gm, safeSpan('$1', 'hl-comment'));
    // Numbers
    code = code.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, safeSpan('$1', 'hl-number'));
    // Keywords (BEFORE decorators). Note: `class` uses negative lookahead to skip HTML attrs
    code = code.replace(/\b(class)(?!\s*=)/g, safeSpan('$1', 'hl-keyword'));
    code = code.replace(/\b(def|if|elif|else|for|while|return|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|and|or|not|is|in|self|cls|None|True|False|async|await|global|nonlocal|assert|del|print)\b/g, safeSpan('$1', 'hl-keyword'));
    // Built-in functions
    code = code.replace(/\b(print|len|range|int|str|float|list|dict|set|tuple|type|isinstance|issubclass|map|filter|zip|enumerate|sorted|reversed|any|all|sum|min|max|abs|round|open|super|property|staticmethod|classmethod|getattr|setattr|hasattr|format|input|repr|hex|oct|bin|hash|id|vars|dir|help|next|iter|slice|object|Exception|ValueError|TypeError|KeyError|IndexError|FileNotFoundError|IOError|RuntimeError|NotImplementedError|AttributeError)\b/g, safeSpan('$1', 'hl-built-in'));
    // Decorators (LAST)
    code = code.replace(/^(\s*)(@[\w]+)/gm, '$1' + safeSpan('$2', 'hl-decorator'));
    return code;
}

function htmlHighlight(code) {
    // Comments
    code = code.replace(/(&lt;!--[\s\S]*?--&gt;)/g, safeSpan('$1', 'hl-comment'));
    // Tags
    code = code.replace(/(&lt;\/?)([\w-]+)/g, '$1' + safeSpan('$2', 'hl-tag'));
    // Closing tag bracket
    code = code.replace(/(\/&gt;|&gt;)/g, safeSpan('$1', 'hl-tag'));
    // Attributes
    code = code.replace(/([\w-]+)(=)/g, safeSpan('$1', 'hl-attr') + '$2');
    // Attribute values
    code = code.replace(/(".*?")/g, safeSpan('$1', 'hl-string'));
    return code;
}

function cssHighlight(code) {
    // Comments
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, safeSpan('$1', 'hl-comment'));
    // At-rules
    code = code.replace(/(@[\w-]+)/g, safeSpan('$1', 'hl-keyword'));
    // Selectors
    code = code.replace(/(\.[\w-]+)/g, safeSpan('$1', 'hl-class'));
    code = code.replace(/(#[\w-]+)/g, safeSpan('$1', 'hl-id'));
    // Properties and values
    code = code.replace(/([\w-]+)(\s*:\s*)([^;]+)(;)/g, safeSpan('$1', 'hl-attr') + '$2' + safeSpan('$3', 'hl-value') + safeSpan('$4', 'hl-punct'));
    // Numbers with units
    code = code.replace(/\b(\d+)(px|em|rem|%|vh|vw|s|ms|deg|fr)/g, safeSpan('$1$2', 'hl-number'));
    return code;
}

function bashHighlight(code) {
    // Comments
    code = code.replace(/(#.*$)/gm, safeSpan('$1', 'hl-comment'));
    // Strings
    code = code.replace(/(".*?")/g, safeSpan('$1', 'hl-string'));
    code = code.replace(/('.*?')/g, safeSpan('$1', 'hl-string'));
    // Variables
    code = code.replace(/(\$\{?\w+\}?)/g, safeSpan('$1', 'hl-variable'));
    // Keywords
    code = code.replace(/\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|echo|cd|export|source|alias|sudo|chmod|mkdir|rm|cp|mv|ls|cat|grep|awk|sed|curl|wget|tar|zip|unzip|ssh|scp|pip|npm|yarn|node|python|docker)\b/g, safeSpan('$1', 'hl-keyword'));
    return code;
}

function sqlHighlight(code) {
    // Comments
    code = code.replace(/(--.*$)/gm, safeSpan('$1', 'hl-comment'));
    code = code.replace(/(\/\*[\s\S]*?\*\/)/g, safeSpan('$1', 'hl-comment'));
    // Strings
    code = code.replace(/('.*?')/g, safeSpan('$1', 'hl-string'));
    // Keywords
    code = code.replace(/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INTO|VALUES|SET|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|NULL|IS|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|ALL|DISTINCT|COUNT|SUM|AVG|MAX|MIN|INDEX|PRIMARY|KEY|FOREIGN|REFERENCES|CASCADE|CONSTRAINT|EXISTS|BETWEEN|LIKE|IN|CASE|WHEN|THEN|ELSE|END|DESC|ASC|IF)\b/gi, safeSpan('$1', 'hl-keyword'));
    // Numbers
    code = code.replace(/\b(\d+\.?\d*)\b/g, safeSpan('$1', 'hl-number'));
    return code;
}

function jsonHighlight(code) {
    // Keys
    code = code.replace(/("(?:[^"\\]|\\.)*")(\s*:\s*)/g, safeSpan('$1', 'hl-attr') + '$2');
    // String values
    code = code.replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': ' + safeSpan('$1', 'hl-string'));
    // Numbers
    code = code.replace(/:\s*(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, ': ' + safeSpan('$1', 'hl-number'));
    // Booleans and null
    code = code.replace(/:\s*(true|false|null)\b/g, ': ' + safeSpan('$1', 'hl-literal'));
    return code;
}

function markdownHighlight(code) {
    // Headings
    code = code.replace(/^(#{1,6}\s+.+)$/gm, safeSpan('$1', 'hl-keyword'));
    // Bold/Italic
    code = code.replace(/(\*\*[^*]+\*\*|__[^_]+__)/g, safeSpan('$1', 'hl-bold'));
    code = code.replace(/(\*[^*]+\*|_[^_]+_)/g, safeSpan('$1', 'hl-italic'));
    // Inline code
    code = code.replace(/(`[^`]+`)/g, safeSpan('$1', 'hl-string'));
    // Links
    code = code.replace(/(\[.*?\]\(.*?\))/g, safeSpan('$1', 'hl-link'));
    // Lists
    code = code.replace(/^(\s*[-*+]\s)/gm, safeSpan('$1', 'hl-keyword'));
    code = code.replace(/^(\s*\d+\.\s)/gm, safeSpan('$1', 'hl-keyword'));
    return code;
}

function yamlHighlight(code) {
    // Comments
    code = code.replace(/(#.*$)/gm, safeSpan('$1', 'hl-comment'));
    // Keys
    code = code.replace(/^([\w-]+)(\s*:)/gm, safeSpan('$1', 'hl-attr') + '$2');
    // String values
    code = code.replace(/:\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, ': ' + safeSpan('$1', 'hl-string'));
    // Booleans and null
    code = code.replace(/:\s*(true|false|yes|no|on|off|null)\b/gi, ': ' + safeSpan('$1', 'hl-literal'));
    return code;
}

// Helper: Escape HTML
function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Markdown Parser using marked

// Custom renderer that adds IDs to headings (for TOC) and syntax highlighting for code
const renderer = new marked.Renderer();
const headings = [];

renderer.heading = function(options) {
    // marked v13+ passes options object, older versions pass (text, level, raw)
    let text, level;
    if (typeof options === 'object') {
        text = options.text;
        level = options.depth;
    } else {
        text = options;
        level = arguments[1];
    }

    const id = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

    headings.push({ level, text, id });
    return `<h${level} id="${id}">${text}</h${level}>`;
};

// Code block syntax highlighting
renderer.code = function(options) {
    let lang, code;
    if (typeof options === 'object') {
        lang = options.lang || '';
        code = options.text;
    } else {
        code = options;
        lang = arguments[1];
    }

    // Mermaid diagrams — render as <pre class="mermaid"> for JS library
    if (lang === 'mermaid') {
        const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre class="mermaid">${escaped}</pre>`;
    }

    const langAttr = lang ? ` data-lang="${lang}"` : '';
    const highlighted = highlightCode(code, lang);

    return `<pre${langAttr}><code class="language-${lang}">${highlighted}</code></pre>`;
};

// Marked configuration
marked.use(footnote());
marked.use(alert());
marked.use(katexExtension({ throwOnError: false, nonStandard: true }));
const markedOptions = {
    gfm: true,
    breaks: true,
    renderer: renderer
};

// Markdown parser using marked
function parseMarkdown(md) {
    let content = md;

    // Extract and remove frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let frontmatter = {};
    if (frontmatterMatch) {
        const frontmatterStr = frontmatterMatch[1];
        content = content.replace(frontmatterMatch[0], '');

        const titleMatch = frontmatterStr.match(/^title:\s*["'](.+?)["']/m);
        const dateMatch = frontmatterStr.match(/^date:\s*(.+)$/m);
        const authorMatch = frontmatterStr.match(/^author:\s*["'](.+?)["']/m);
        const descMatch = frontmatterStr.match(/^description:\s*["'](.+?)["']/m);
        const seriesMatch = frontmatterStr.match(/^series:\s*["'](.+?)["']/m);
        const orderMatch = frontmatterStr.match(/^order:\s*(\d+)/m);

        // Tags: support YAML array ["a","b"] or comma-separated list
        let tags = [];
        const tagsMatch = frontmatterStr.match(/^tags:\s*\[([\s\S]*?)\]/m);
        if (tagsMatch) {
            tags = tagsMatch[1].split(',').map(t => t.trim().replace(/["']/g, '')).filter(Boolean);
        } else {
            const tagsLine = frontmatterStr.match(/^tags:\s*(.+)$/m);
            if (tagsLine) {
                tags = tagsLine[1].split(',').map(t => t.trim().replace(/["']/g, '')).filter(Boolean);
            }
        }

        if (titleMatch) frontmatter.title = titleMatch[1];
        if (dateMatch) frontmatter.date = dateMatch[1].trim();
        if (authorMatch) frontmatter.author = authorMatch[1];
        if (descMatch) frontmatter.description = descMatch[1];
        if (seriesMatch) frontmatter.series = seriesMatch[1];
        if (orderMatch) frontmatter.order = parseInt(orderMatch[1], 10);
        frontmatter.tags = tags;
    }

    content = content.trim();

    // Strip <pre>...</pre> wrappers around code fences (user's workaround for old parser)
    content = content.replace(/<pre>\s*(```[\s\S]*?```)\s*<\/pre>/g, '$1');

    // Reset headings for TOC
    headings.length = 0;

    // Parse Markdown with marked
    let html = marked.parse(content, markedOptions);

    // Build TOC HTML
    let tocHtml = '';
    if (headings.length > 0) {
        tocHtml = '<nav class="toc-nav"><div class="toc-title">目录</div><ul>';
        headings.forEach(h => {
            tocHtml += `<li class="toc-item toc-level-${h.level}"><a href="#${h.id}">${h.text}</a></li>`;
        });
        tocHtml += '</ul></nav>';
    }

    // If no frontmatter title, extract first heading as fallback
    if (!frontmatter.title && headings.length > 0) {
        frontmatter.title = headings[0].text;
        headings.shift();
        if (headings.length > 0) {
            tocHtml = '<nav class="toc-nav"><div class="toc-title">目录</div><ul>';
            headings.forEach(h => {
                tocHtml += `<li class="toc-item toc-level-${h.level}"><a href="#${h.id}">${h.text}</a></li>`;
            });
            tocHtml += '</ul></nav>';
        } else {
            tocHtml = '';
        }
    }

    if (!frontmatter.title) {
        frontmatter.title = 'Untitled';
    }
    frontmatter.title = frontmatter.title.trim();

    return { html, frontmatter, toc: tocHtml };
}

function renderTemplate(template, replacements) {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.split(`{{${key}}}`).join(value || '');
    }
    // Clean up any remaining unreplaced placeholders
    result = result.replace(/\{\{[A-Z_]+\}\}/g, '');
    return result;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function generateSlug(filename) {
    return filename.replace(/\.md$/, '');
}

// Estimate reading time
function estimateReadingTime(html) {
    const text = html.replace(/<[^>]*>/g, '');
    const cjkChars = (text.match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/g) || []).length;
    const words = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(cjkChars / 500 + words / 200);
    return Math.max(1, minutes);
}

// Clean output directory
function cleanOutput() {
    if (fs.existsSync(OUTPUT_DIR)) {
        fs.rmSync(OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.mkdirSync(path.join(OUTPUT_DIR, 'assets'), { recursive: true });
    fs.mkdirSync(path.join(OUTPUT_DIR, 'categories'), { recursive: true });
}

// Copy assets
function copyAssets() {
    const files = fs.readdirSync(ASSETS_DIR);
    files.forEach(file => {
        const src = path.join(ASSETS_DIR, file);
        const dest = path.join(OUTPUT_DIR, 'assets', file);
        fs.copyFileSync(src, dest);
    });
}

// Read all posts (supports categories as subdirectories)
function readPosts() {
    const posts = [];

    // Recursively read directories
    function readDirRecursive(dir, baseDir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        entries.forEach(entry => {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                readDirRecursive(fullPath, baseDir);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const { html, frontmatter, toc } = parseMarkdown(content);
                
                // Category is the subdirectory name relative to posts/
                const relativePath = path.relative(baseDir, fullPath);
                const pathParts = path.dirname(relativePath).split(path.sep);
                const category = pathParts.length > 0 && pathParts[0] !== '' ? pathParts[0] : '';
                
                const slug = generateSlug(entry.name);
                const urlSlug = category ? `${category}/${slug}` : slug;

                // Add lazy loading to images (Zero Dependency Optimization)
                const lazyHtml = html.replace(/<img /g, '<img loading="lazy" ');

                const readingTime = estimateReadingTime(lazyHtml);

                posts.push({
                    slug: urlSlug,
                    filename: entry.name,
                    category: category,
                    title: frontmatter.title || 'Untitled',
                    date: frontmatter.date || '',
                    author: frontmatter.author || '',
                    tags: frontmatter.tags || [],
                    series: frontmatter.series || '',
                    order: frontmatter.order || 0,
                    content: lazyHtml,
                    toc: toc,
                    excerpt: lazyHtml.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
                    description: frontmatter.description || lazyHtml.replace(/<[^>]*>/g, '').substring(0, 160).trim(),
                    readingTime: readingTime
                });
            }
        });
    }

    readDirRecursive(POSTS_DIR, POSTS_DIR);

    // Sort by date descending
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Generate homepage with pagination
function generateHomepage(posts, page = 1) {
    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);
    const start = (page - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const pagePosts = posts.slice(start, end);

    // If only one page, no pagination needed
    if (totalPages <= 1) {
        renderPostList(posts, '');
        const html = renderTemplate(layoutTemplate, {
            TITLE: '西南',
            META_DESC: '西南的个人博客',
            OG_TITLE: '西南',
            OG_DESC: '西南的个人博客',
            OG_URL: '/',
            OG_IMAGE: '/assets/avatar.jpg',
            OG_TYPE: 'website',
            SIDEBAR: renderSidebar(posts),
            CONTENT: renderPostList(posts, ''),
            PAGINATION: ''
        });
        fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
        console.log('Generated: index.html');
        return;
    }

    let content = renderPostList(pagePosts, '', page);

    // Generate pagination HTML
    let pagination = '<div class="pagination">';

    // Previous button
    if (page > 1) {
        pagination += page === 2
            ? '<a href="/index.html" class="pagination-btn">&larr; 上一页</a>'
            : `<a href="/page/${page - 1}.html" class="pagination-btn">&larr; 上一页</a>`;
    } else {
        pagination += '<span class="pagination-btn disabled">上一页</span>';
    }

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === page) {
            pagination += `<span class="pagination-btn active">${i}</span>`;
        } else if (i === 1) {
            pagination += '<a href="/index.html" class="pagination-btn">1</a>';
        } else {
            pagination += `<a href="/page/${i}.html" class="pagination-btn">${i}</a>`;
        }
    }

    // Next button
    if (page < totalPages) {
        pagination += `<a href="/page/${page + 1}.html" class="pagination-btn">下一页 &rarr;</a>`;
    } else {
        pagination += '<span class="pagination-btn disabled">下一页</span>';
    }

    pagination += '</div>';

    const html = renderTemplate(layoutTemplate, {
        TITLE: page === 1 ? '西南' : `第 ${page} 页 - 西南`,
        META_DESC: '西南的个人博客',
        OG_TITLE: page === 1 ? '西南' : `第 ${page} 页 - 西南`,
        OG_DESC: '西南的个人博客',
        OG_URL: page === 1 ? '/' : `/page/${page}.html`,
        OG_IMAGE: '/assets/avatar.jpg',
        OG_TYPE: 'website',
        SIDEBAR: renderSidebar(posts),
        CONTENT: content,
        PAGINATION: pagination
    });

    const filename = page === 1 ? 'index.html' : `page/${page}.html`;
    
    // Create page directory for pagination pages
    if (page > 1) {
        const pageDir = path.join(OUTPUT_DIR, 'page');
        if (!fs.existsSync(pageDir)) {
            fs.mkdirSync(pageDir, { recursive: true });
        }
    }
    
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), html);
    console.log(`Generated: ${filename}`);
}

// Render homepage sidebar
function renderSidebar(posts) {
    const categoryHtml = getCategoryList(posts);
    const tagHtml = getSidebarTagList(posts);
    
    return `
<div class="sidebar-card">
    <div class="sidebar-avatar">
        <img src="/assets/avatar.jpg" alt="头像" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23e8e8e8%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%238590a6%22 font-size=%2240%22>?</text></svg>'">
    </div>
    <div class="sidebar-bio">
        <p class="sidebar-name">西南</p>
        <p class="sidebar-desc"></p>
    </div>
</div>

${categoryHtml}
${tagHtml}

<div class="sidebar-card">
    <div class="sidebar-card-title">快速导航</div>
    <div class="sidebar-links">
        <a href="/search.html" class="sidebar-link">搜索文章</a>
        <a href="/tags/index.html" class="sidebar-link">标签云</a>
        <a href="/feed.xml" class="sidebar-link">订阅(RSS)</a>
    </div>
</div>
`;
}

// Render post list HTML
function renderPostList(posts, className = '', currentPage = 1) {
    let html = `<div class="post-list ${className}">\n`;

    posts.forEach(post => {
        const metaParts = [];
        if (post.date) metaParts.push(formatDate(post.date));
        if (post.readingTime) metaParts.push(`${post.readingTime} 分钟`);
        const metaHtml = metaParts.length > 0 ? `<div class="post-meta">${metaParts.join(' · ')}</div>` : '';

        const tagsHtml = post.tags && post.tags.length > 0
            ? `<div class="post-tags">${post.tags.map(t => `<a class="tag" href="/tags/${encodeURIComponent(t)}.html">#${t}</a>`).join('')}</div>`
            : '';

        html += `
        <article class="post-item">
            ${metaHtml}
            <h2 class="post-title">
                <a href="/posts/${post.slug}.html">${post.title}</a>
                ${post.category ? `<span class="post-category"><a href="/categories/${post.category}.html">${post.category}</a></span>` : ''}
            </h2>
            ${tagsHtml}
            <p class="post-excerpt">${post.excerpt}</p>
            ${post.author ? `<div class="post-author"><span class="author-badge">${post.author}</span></div>` : ''}
        </article>
        `;
    });

    html += '</div>';
    return html;
}

// Generate all pagination pages
function generatePaginationPages(posts) {
    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

    // If only one page, generate normal homepage
    if (totalPages <= 1) {
        generateHomepage(posts);
        return;
    }

    // Generate homepage (page 1)
    generateHomepage(posts, 1);

    // Generate remaining pages
    for (let page = 2; page <= totalPages; page++) {
        generateHomepage(posts, page);
    }

    console.log(`Generated ${totalPages} pagination pages`);
}

// Find related posts (same category first, then same tags)
function findRelatedPosts(currentPost, allPosts, maxCount = 3) {
    const scored = allPosts
        .filter(p => p.slug !== currentPost.slug)
        .map(p => {
            let score = 0;
            if (p.category && p.category === currentPost.category) score += 3;
            if (currentPost.tags && p.tags) {
                const common = currentPost.tags.filter(t => p.tags.includes(t));
                score += common.length;
            }
            return { post: p, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxCount);

    // Fallback: if no related, return latest posts
    if (scored.length === 0) {
        return allPosts.filter(p => p.slug !== currentPost.slug).slice(0, maxCount);
    }
    return scored.map(s => s.post);
}

// Get series navigation HTML
function getSeriesHtml(post, allPosts) {
    if (!post.series) return '';
    const seriesPosts = allPosts
        .filter(p => p.series === post.series)
        .sort((a, b) => a.order - b.order);
    if (seriesPosts.length === 0) return '';

    const currentIdx = seriesPosts.findIndex(p => p.slug === post.slug);
    if (currentIdx === -1) return '';

    let html = `<div class="series-banner"><div class="series-banner-title">系列：${post.series}</div>`;
    html += `<div class="series-progress">第 ${currentIdx + 1} / ${seriesPosts.length} 篇</div>`;
    html += `<ul class="series-list">`;
    seriesPosts.forEach((sp, i) => {
        const cls = i === currentIdx ? 'active' : '';
        html += `<li class="${cls}"><a href="/posts/${sp.slug}.html">${sp.title}</a></li>`;
    });
    html += `</ul></div>`;
    return html;
}

// Generate individual post pages
function generatePostPages(posts) {
    // Read article layout template
    const articleTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'article.html'), 'utf-8');

    posts.forEach((post, index) => {
        const prevPost = posts[index + 1];
        const nextPost = posts[index - 1];

        const metaParts = [];
        if (post.date) metaParts.push(formatDate(post.date));
        if (post.readingTime) metaParts.push(`${post.readingTime} 分钟`);
        const dateHtml = metaParts.length > 0 ? `<div class="post-meta">${metaParts.join(' · ')}</div>` : '';

        // Tags
        const tagsHtml = post.tags && post.tags.length > 0
            ? `<div class="article-tags">${post.tags.map(t => `<a class="tag" href="/tags/${encodeURIComponent(t)}.html">#${t}</a>`).join('')}</div>`
            : '';

        // Series
        const seriesHtml = getSeriesHtml(post, posts);

        // Related posts
        const relatedPosts = findRelatedPosts(post, posts);
        let relatedHtml = '';
        if (relatedPosts.length > 0) {
            relatedHtml = '<div class="related-posts"><div class="related-posts-title">相关文章</div><div class="related-posts-list">';
            relatedPosts.forEach(rp => {
                relatedHtml += `<a href="/posts/${rp.slug}.html" class="related-post-item">
                    <div class="related-post-title">${rp.title}</div>
                    ${rp.date ? `<div class="related-post-date">${formatDate(rp.date)}</div>` : ''}
                </a>`;
            });
            relatedHtml += '</div></div>';
        }

        // Share buttons HTML (URL will be resolved dynamically on page load)
        const shareHtml = `
        <div class="share-section">
            <div class="share-title">分享文章</div>
            <div class="share-buttons">
                <button class="share-btn copy-link-btn" data-title="${post.title}" title="复制链接">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    <span>复制链接</span>
                </button>
                <a class="share-btn twitter-btn" data-share="twitter" href="#" target="_blank" rel="noopener" title="分享到 Twitter/X">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    <span>X / Twitter</span>
                </a>
                <a class="share-btn telegram-btn" data-share="telegram" href="#" target="_blank" rel="noopener" title="分享到 Telegram">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>
                    <span>Telegram</span>
                </a>
                <a class="share-btn email-btn" data-share="email" href="#" target="_blank" rel="noopener" title="通过邮件分享">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    <span>邮件</span>
                </a>
            </div>
        </div>
        `;

        let content = `
        <article class="post-header">
            ${dateHtml}
            <h1>${post.title}</h1>
            ${tagsHtml}
            ${post.author ? `<div class="post-author"><span class="author-badge">${post.author}</span></div>` : ''}
        </article>
        ${seriesHtml}
        <article class="markdown-body post-content">
            ${post.content}
        </article>
        ${shareHtml.replace(/\{\{URL\}\}/g, `/posts/${post.slug}.html`)}
        ${relatedHtml}
        <nav class="post-nav">
            ${prevPost ? `<a href="/posts/${prevPost.slug}.html">&larr; ${prevPost.title}</a>` : '<span></span>'}
            ${nextPost ? `<a href="/posts/${nextPost.slug}.html">${nextPost.title} &rarr;</a>` : '<span></span>'}
        </nav>
        `;

        const ogDesc = post.description || post.excerpt.replace(/<[^>]*>/g, '').substring(0, 160);
        const html = renderTemplate(articleTemplate, {
            TITLE: post.title + ' - 西南',
            META_DESC: ogDesc,
            OG_TITLE: post.title + ' - 西南',
            OG_DESC: ogDesc,
            OG_URL: `/posts/${post.slug}.html`,
            OG_IMAGE: '/assets/avatar.jpg',
            OG_TYPE: 'article',
            TOC: post.toc,
            CONTENT: content
        });

        const outputDir = path.join(OUTPUT_DIR, 'posts', post.category);
        fs.mkdirSync(outputDir, { recursive: true });
        
        const outputPath = path.join(outputDir, `${post.filename.replace(/\.md$/, '')}.html`);
        fs.writeFileSync(outputPath, html);
        console.log(`Generated: posts/${post.slug}.html`);
    });
}

// Generate search index JSON
function generateSearchIndex(posts) {
    const index = posts.map(post => ({
        slug: post.slug,
        title: post.title,
        date: post.date,
        author: post.author,
        tags: post.tags || [],
        excerpt: post.excerpt,
        // Plain text content for searching
        content: post.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    }));

    const json = JSON.stringify(index, null, 2);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'search-index.json'), json);
    console.log('Generated: search-index.json');
}

// Generate category pages
function generateCategoryPages(posts) {
    // Get all categories
    const categories = [...new Set(posts.map(p => p.category).filter(c => c))];
    
    if (categories.length === 0) {
        console.log('No categories found');
        return;
    }

    const categoryTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'layout.html'), 'utf-8');

    categories.forEach(category => {
        const categoryPosts = posts.filter(p => p.category === category);
        
        // Generate category header
        let content = `<div class="category-header">
            <h1>${category}</h1>
            <p class="category-count">${categoryPosts.length} 篇文章</p>
        </div>\n`;
        
        content += renderPostList(categoryPosts, '');

        const desc = `${category} 分类 - ${categoryPosts.length} 篇文章`;
        const html = renderTemplate(categoryTemplate, {
            TITLE: `${category} - 西南`,
            META_DESC: desc,
            OG_TITLE: `${category} - 西南`,
            OG_DESC: desc,
            OG_URL: `/categories/${category}.html`,
            OG_IMAGE: '/assets/avatar.jpg',
            OG_TYPE: 'website',
            SIDEBAR: renderSidebar(posts),
            CONTENT: content,
            PAGINATION: ''
        });

        const outputPath = path.join(OUTPUT_DIR, 'categories', `${category}.html`);
        fs.writeFileSync(outputPath, html);
        console.log(`Generated: categories/${category}.html`);
    });
}

// Generate category list for sidebar
function getCategoryList(posts) {
    const categories = [...new Set(posts.map(p => p.category).filter(c => c))];
    
    if (categories.length === 0) return '';

    const MAX_VISIBLE = 4;
    const hasMore = categories.length > MAX_VISIBLE;
    
    let html = '<div class="sidebar-card"><div class="sidebar-card-title">分类目录</div><div class="category-list">';
    
    categories.forEach((category, index) => {
        const count = posts.filter(p => p.category === category).length;
        const isHidden = index >= MAX_VISIBLE ? ' hidden' : '';
        html += `<a href="/categories/${category}.html" class="sidebar-link${isHidden}">${category} (${count})</a>`;
    });
    
    if (hasMore) {
        const hiddenCount = categories.length - MAX_VISIBLE;
        html += `<button class="category-toggle" onclick="this.parentElement.classList.toggle('expanded');this.textContent=this.parentElement.classList.contains('expanded')?'收起':'展开 (+' + ${hiddenCount} + ')';">展开 (+${hiddenCount})</button>`;
    }
    
    html += '</div></div>';
    return html;
}

// Get sidebar tag list (sorted by count, limited)
function getSidebarTagList(posts) {
    const tagMap = collectTags(posts);
    const entries = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return '';

    const MAX_VISIBLE = 4;
    const hasMore = entries.length > MAX_VISIBLE;

    let html = '<div class="sidebar-card"><div class="sidebar-card-title">热门标签</div><div class="category-list">';

    entries.forEach(([tag, count], index) => {
        const isHidden = index >= MAX_VISIBLE ? ' hidden' : '';
        html += `<a href="/tags/${encodeURIComponent(tag)}.html" class="sidebar-link${isHidden}">${tag} (${count})</a>`;
    });

    if (hasMore) {
        const hiddenCount = entries.length - MAX_VISIBLE;
        html += `<button class="category-toggle" onclick="this.parentElement.classList.toggle('expanded');this.textContent=this.parentElement.classList.contains('expanded')?'收起':'展开 (+' + ${hiddenCount} + ')';">展开 (+${hiddenCount})</button>`;
    }

    html += '</div></div>';
    return html;
}

// Collect tags from all posts, returns { tagName: count }
function collectTags(posts) {
    const tagMap = {};
    posts.forEach(p => {
        (p.tags || []).forEach(t => {
            tagMap[t] = (tagMap[t] || 0) + 1;
        });
    });
    return tagMap;
}

// Generate search page
function generateSearchPage(posts) {
    const searchTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'search.html'), 'utf-8');

    const searchData = JSON.stringify(posts.map(p => ({
        slug: p.slug,
        title: p.title,
        date: formatDate(p.date),
        author: p.author,
        tags: p.tags || [],
        excerpt: p.excerpt,
        content: p.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    })));

    const content = `
<div class="markdown-body search-header">
    <h1>搜索</h1>
    <p class="search-desc">在博客中搜索文章</p>
</div>
<div class="search-container">
    <div class="search-box">
        <svg class="search-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"></path>
        </svg>
        <input type="text" id="search-input" class="search-input" placeholder="输入关键词搜索..." autocomplete="off">
        <button id="search-clear" class="search-clear-btn" style="display: none;">&times;</button>
    </div>
    <div id="search-results" class="search-results"></div>
    <div id="search-hint" class="search-hint">输入关键词开始搜索</div>
</div>
`;

    const html = renderTemplate(searchTemplate, {
        TITLE: '搜索 - 西南',
        META_DESC: '在博客中搜索文章',
        OG_TITLE: '搜索 - 西南',
        OG_DESC: '在博客中搜索文章',
        OG_URL: '/search.html',
        OG_IMAGE: '/assets/avatar.jpg',
        OG_TYPE: 'website',
        CONTENT: content,
        SEARCH_DATA: searchData
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'search.html'), html);
    console.log('Generated: search.html');
}

// Generate 404 page
function generate404() {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - ???</title>
    <style>
        :root {
            --primary: #6c5ce7;
            --bg-gradient: linear-gradient(135deg, #a8c0ff 0%, #3f2b96 100%);
        }

        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-gradient);
            overflow: hidden;
        }

        /* ??????? */
        .circle {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            animation: float 20s infinite linear;
            z-index: 0;
        }

        /* ???? - ????? */
        .glass-card {
            position: relative;
            z-index: 1;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 30px;
            padding: 50px 80px;
            text-align: center;
            box-shadow: 0 25px 45px rgba(0,0,0,0.1);
            color: white;
            max-width: 500px;
        }

        h1 {
            font-size: 10rem;
            margin: 0;
            background: linear-gradient(to bottom, #fff, rgba(255,255,255,0.3));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1;
        }

        p {
            font-size: 1.2rem;
            margin: 20px 0 40px;
            letter-spacing: 2px;
            opacity: 0.9;
        }

        .btn {
            padding: 12px 35px;
            background: #fff;
            color: #3f2b96;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            transition: 0.3s transform ease;
            display: inline-block;
        }

        .btn:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }

        /* ??????? */
        @keyframes float {
            0% { transform: translate(0, 0); }
            50% { transform: translate(100px, 100px); }
            100% { transform: translate(0, 0); }
        }

        @media (max-width: 480px) {
            .glass-card { padding: 40px 20px; width: 80%; }
            h1 { font-size: 6rem; }
        }
    </style>
</head>
<body>
    <div class="circle" style="width: 200px; height: 200px; top: 10%; left: 10%;"></div>
    <div class="circle" style="width: 300px; height: 300px; bottom: 5%; right: 5%; animation-duration: 30s;"></div>

    <div class="glass-card">
        <h1>404</h1>
        <p>你来到了未知的荒原</p>
        <a href="/" class="btn">带星野回家</a>
    </div>
</body>
</html>
 `;
    fs.writeFileSync(path.join(OUTPUT_DIR, '404.html'), html);
    console.log('Generated: 404.html');
}

// Generate Sitemap
function generateSitemap(posts) {
    const baseUrl = 'https://blog.diepthink.top';
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    ['', '/search.html'].forEach(page => {
        xml += `  <url><loc>${baseUrl}${page}</loc><priority>${page === '' ? '1.0' : '0.8'}</priority></url>\n`;
    });

    // Posts
    posts.forEach(post => {
        xml += `  <url><loc>${baseUrl}/posts/${post.slug}.html</loc><priority>0.6</priority></url>\n`;
    });

    xml += '</urlset>';
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), xml);
    console.log('Generated: sitemap.xml');
}

// Generate tag pages and tag cloud
function generateTagPages(posts) {
    const tagMap = collectTags(posts);
    const tags = Object.keys(tagMap);
    if (tags.length === 0) {
        console.log('No tags found');
        return;
    }

    const layout = fs.readFileSync(path.join(TEMPLATES_DIR, 'layout.html'), 'utf-8');
    const maxCount = Math.max(...Object.values(tagMap), 1);

    // Generate individual tag pages
    tags.forEach(tag => {
        const tagPosts = posts.filter(p => p.tags && p.tags.includes(tag));
        let content = `<div class="category-header">
            <h1># ${tag}</h1>
            <p class="category-count">${tagPosts.length} 篇文章</p>
        </div>\n`;
        content += renderPostList(tagPosts, '');

        const tagDesc = `标签 ${tag} - ${tagPosts.length} 篇文章`;
        const html = renderTemplate(layout, {
            TITLE: `${tag} - 标签 - 西南`,
            META_DESC: tagDesc,
            OG_TITLE: `${tag} - 标签 - 西南`,
            OG_DESC: tagDesc,
            OG_URL: `/tags/${encodeURIComponent(tag)}.html`,
            OG_IMAGE: '/assets/avatar.jpg',
            OG_TYPE: 'website',
            SIDEBAR: renderSidebar(posts),
            CONTENT: content,
            PAGINATION: ''
        });

        const tagDir = path.join(OUTPUT_DIR, 'tags');
        fs.mkdirSync(tagDir, { recursive: true });
        fs.writeFileSync(path.join(tagDir, `${encodeURIComponent(tag)}.html`), html);
        console.log(`Generated: tags/${tag}.html`);
    });

    // Generate tag cloud page
    let cloudContent = `<div class="category-header">
        <h1>标签云</h1>
        <p class="category-count">共 ${tags.length} 个标签</p>
    </div>
    <div class="tag-cloud">`;

    tags.sort().forEach(tag => {
        const count = tagMap[tag];
        const size = 0.8 + (count / maxCount) * 1.2;
        cloudContent += `<a href="/tags/${encodeURIComponent(tag)}.html" class="tag-cloud-item" style="font-size: ${size}rem;">#${tag} (${count})</a>`;
    });

    cloudContent += '</div>';

    const cloudHtml = renderTemplate(layout, {
        TITLE: '标签云 - 西南',
        META_DESC: `共 ${tags.length} 个标签`,
        OG_TITLE: '标签云 - 西南',
        OG_DESC: `共 ${tags.length} 个标签`,
        OG_URL: '/tags/index.html',
        OG_IMAGE: '/assets/avatar.jpg',
        OG_TYPE: 'website',
        SIDEBAR: renderSidebar(posts),
        CONTENT: cloudContent,
        PAGINATION: ''
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'tags', 'index.html'), cloudHtml);
    console.log('Generated: tags/index.html');
}

// Generate RSS feed
function generateFeed(posts) {
    const baseUrl = 'https://blog.diepthink.top';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
    <title>西南</title>
    <link>${baseUrl}</link>
    <description>西南的个人博客</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
`;

    const feedPosts = posts.slice(0, 20);
    feedPosts.forEach(post => {
        const description = post.excerpt.replace(/<[^>]*>/g, '').substring(0, 500);
        xml += `    <item>
        <title>${post.title}</title>
        <link>${baseUrl}/posts/${post.slug}.html</link>
        <guid>${baseUrl}/posts/${post.slug}.html</guid>
        <pubDate>${post.date ? new Date(post.date).toUTCString() : new Date().toUTCString()}</pubDate>
        <description><![CDATA[${description}]]></description>
    </item>
`;
    });

    xml += `</channel>
</rss>`;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'feed.xml'), xml);
    console.log('Generated: feed.xml');
}

// Main build function
function build() {
    console.log('Building static blog...\n');

    cleanOutput();
    copyAssets();

    const posts = readPosts();
    console.log(`Found ${posts.length} posts\n`);

    generatePaginationPages(posts);
    generatePostPages(posts);
    generateCategoryPages(posts);
    generateTagPages(posts);
    generateSearchIndex(posts);
    generateSearchPage(posts);
    generate404();
    generateSitemap(posts);
    generateFeed(posts);

    console.log('\nBuild complete! Output directory: output/');
}

// Run build
build();
