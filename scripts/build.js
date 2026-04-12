#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

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

    if (['javascript', 'js', 'typescript', 'ts', 'json'].includes(lang)) {
        // Strings
        code = code.replace(/('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g, '<span class="hl-string">$1</span>');
        // Comments
        code = code.replace(/(\/\/.*$)/gm, '<span class="hl-comment">$1</span>');
        code = code.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>');
        // Keywords
        code = code.replace(/\b(const|let|var|function|class|import|from|export|default|if|else|for|while|return|try|catch|new|this|true|false|null|undefined|async|await|switch|case|break|continue|typeof|instanceof)\b/g, '<span class="hl-keyword">$1</span>');
        // Numbers
        code = code.replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>');
        // Functions
        code = code.replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\()/g, '<span class="hl-func">$1</span>');
    }
    else if (['html', 'xml'].includes(lang)) {
        code = code.replace(/(&lt;\/?)([\w-]+)/g, '$1<span class="hl-tag">$2</span>');
        code = code.replace(/([\w-]+)(=)/g, '<span class="hl-attr">$1</span>$2');
        code = code.replace(/(".*?")/g, '<span class="hl-string">$1</span>');
    }
    else if (['css', 'scss', 'less'].includes(lang)) {
        code = code.replace(/([\w-]+)(?=\s*:)/g, '<span class="hl-attr">$1</span>');
        code = code.replace(/(:)\s*([^;]+)/g, '$1 <span class="hl-value">$2</span>');
        code = code.replace(/(\.[\w-]+)/g, '<span class="hl-class">$1</span>');
        code = code.replace(/(#[\w-]+)/g, '<span class="hl-id">$1</span>');
    }
    else if (['markdown', 'md'].includes(lang)) {
        code = code.replace(/(#{1,6}.+)/g, '<span class="hl-keyword">$1</span>');
        code = code.replace(/(`[^`]+`)/g, '<span class="hl-string">$1</span>');
        code = code.replace(/(\*\*|__|~~|\*|_)/g, '<span class="hl-bold">$1</span>');
    }

    return code;
}

// Helper: Escape HTML
function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Markdown Parser using marked

// Custom renderer that adds IDs to headings (for TOC)
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

// Marked configuration
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
        const tagsMatch = frontmatterStr.match(/^tags:\s*\[(.+?)\]/m);

        if (titleMatch) frontmatter.title = titleMatch[1];
        if (dateMatch) frontmatter.date = dateMatch[1].trim();
        if (tagsMatch) {
            frontmatter.tags = tagsMatch[1]
                .split(',')
                .map(t => t.trim().replace(/["']/g, ''));
        }
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

                posts.push({
                    slug: urlSlug,
                    filename: entry.name,
                    category: category,
                    title: frontmatter.title || 'Untitled',
                    date: frontmatter.date || '',
                    tags: frontmatter.tags || [],
                    content: lazyHtml,
                    toc: toc,
                    excerpt: lazyHtml.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
                    description: frontmatter.description || lazyHtml.replace(/<[^>]*>/g, '').substring(0, 160).trim()
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
            TITLE: 'My Blog',
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
        TITLE: page === 1 ? 'My Blog' : `第 ${page} 页 - My Blog`,
        SIDEBAR: page === 1 ? renderSidebar(posts) : '',
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
    
    return `
<div class="sidebar-card">
    <div class="sidebar-avatar">
        <img src="/assets/avatar.jpg" alt="头像" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23e8e8e8%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%238590a6%22 font-size=%2240%22>👤</text></svg>'">
    </div>
    <div class="sidebar-bio">
        <p class="sidebar-name">西南</p>
        <p class="sidebar-desc"></p>
    </div>
</div>

${categoryHtml}

<div class="sidebar-card">
    <div class="sidebar-card-title">快速导航</div>
    <div class="sidebar-links">
        <a href="/archive.html" class="sidebar-link">📅 文章归档</a>
        <a href="/search.html" class="sidebar-link">🔍 搜索文章</a>
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
        const metaHtml = metaParts.length > 0 ? `<div class="post-meta">${metaParts.join(' · ')}</div>` : '';

        html += `
        <article class="post-item">
            ${metaHtml}
            <h2 class="post-title">
                <a href="/posts/${post.slug}.html">${post.title}</a>
                ${post.category ? `<span class="post-category"><a href="/categories/${post.category}.html">${post.category}</a></span>` : ''}
            </h2>
            <p class="post-excerpt">${post.excerpt}</p>
            <div class="post-tags">
                ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
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

// Generate individual post pages
function generatePostPages(posts) {
    // Read article layout template
    const articleTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'article.html'), 'utf-8');

    posts.forEach((post, index) => {
        const prevPost = posts[index + 1];
        const nextPost = posts[index - 1];

        const dateHtml = post.date ? `<div class="post-meta">${formatDate(post.date)}</div>` : '';

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
            <div class="post-tags">
                ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </article>
        <article class="markdown-body post-content">
            ${post.content}
        </article>
        ${shareHtml.replace(/\{\{URL\}\}/g, `/posts/${post.slug}.html`)}
        <nav class="post-nav">
            ${prevPost ? `<a href="/posts/${prevPost.slug}.html">&larr; ${prevPost.title}</a>` : '<span></span>'}
            ${nextPost ? `<a href="/posts/${nextPost.slug}.html">${nextPost.title} &rarr;</a>` : '<span></span>'}
        </nav>
        `;

        const html = renderTemplate(articleTemplate, {
            TITLE: post.title + ' - My Blog',
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
        tags: post.tags,
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

        const html = renderTemplate(categoryTemplate, {
            TITLE: `${category} - My Blog`,
            SIDEBAR: renderSidebar(posts),  // Show sidebar with avatar
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
        html += `<a href="/categories/${category}.html" class="sidebar-link${isHidden}">📁 ${category} (${count})</a>`;
    });
    
    if (hasMore) {
        const hiddenCount = categories.length - MAX_VISIBLE;
        html += `<button class="category-toggle" onclick="this.parentElement.classList.toggle('expanded');this.textContent=this.parentElement.classList.contains('expanded')?'收起':'展开 (+' + ${hiddenCount} + ')';">展开 (+${hiddenCount})</button>`;
    }
    
    html += '</div></div>';
    return html;
}

// Generate search page
function generateSearchPage(posts) {
    const searchTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'search.html'), 'utf-8');

    const searchData = JSON.stringify(posts.map(p => ({
        slug: p.slug,
        title: p.title,
        date: formatDate(p.date),
        tags: p.tags,
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
        TITLE: '搜索 - My Blog',
        CONTENT: content,
        SEARCH_DATA: searchData
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'search.html'), html);
    console.log('Generated: search.html');
}

// Generate archive page
function generateArchive(posts) {
    let content = '<div class="markdown-body archive-header"><h1>归档</h1></div>\n<div class="archive-list">\n';

    let currentYear = '';
    posts.forEach(post => {
        const year = new Date(post.date).getFullYear().toString();
        if (year !== currentYear) {
            content += `<h2 class="archive-year">${year}</h2>`;
            currentYear = year;
        }
        content += `
        <div class="archive-item">
            <a href="/posts/${post.slug}.html">${post.title}</a>
            <span class="archive-date">${formatDate(post.date)}</span>
        </div>
        `;
    });

    content += '</div>';

    const html = renderTemplate(layoutTemplate, {
        TITLE: '归档 - My Blog',
        CONTENT: content
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'archive.html'), html);
    console.log('Generated: archive.html');
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
    generateArchive(posts);
    generateSearchIndex(posts);
    generateSearchPage(posts);
    generate404();
    generateSitemap(posts);

    console.log('\nBuild complete! Output directory: output/');
}

// Generate 404 page
function generate404() {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - 页面未找到</title>
    <link rel="stylesheet" href="/assets/style.css">
    <style>
        .error-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 80vh;
            text-align: center;
        }
        .error-code { font-size: 80px; font-weight: 800; color: var(--accent); margin-bottom: 0; line-height: 1; }
        .error-msg { font-size: 20px; color: var(--text-secondary); margin-bottom: 30px; }
        .error-btn {
            display: inline-block;
            padding: 10px 24px;
            background: var(--accent);
            color: #fff;
            text-decoration: none;
            border-radius: 20px;
            font-weight: 600;
            transition: var(--transition);
        }
        .error-btn:hover { background: var(--accent-hover); transform: translateY(-2px); }
    </style>
</head>
<body>
    <div class="page-wrapper">
        <header class="site-header">
            <div class="container">
                <nav><ul class="nav-links"><li><a href="/index.html">首页</a></li></ul></nav>
            </div>
        </header>
        <div class="error-page">
            <div class="error-code">404</div>
            <div class="error-msg">页面未找到 / Page Not Found</div>
            <a href="/index.html" class="error-btn">返回首页</a>
        </div>
        <footer class="site-footer"><div class="container"><p>使用静态博客生成器构建 &copy; 2026</p></div></footer>
    </div>
</body>
</html>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, '404.html'), html);
    console.log('Generated: 404.html');
}

// Generate Sitemap
function generateSitemap(posts) {
    const baseUrl = 'https://yourdomain.com'; // TODO: Replace with actual domain
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    ['', '/archive.html', '/search.html'].forEach(page => {
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

// Run build
build();
