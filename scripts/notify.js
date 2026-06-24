#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const webhookUrl = process.env.NOTIFY_WEBHOOK_URL;
if (!webhookUrl) {
    console.log('NOTIFY_WEBHOOK_URL not set, skipping notification');
    process.exit(0);
}

const repoUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
    : '';

const commitSha = process.env.GITHUB_SHA || '';
const commitMessage = process.env.GITHUB_EVENT_PATH
    ? (() => {
        try {
            const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'));
            return event.head_commit ? event.head_commit.message.split('\n')[0] : '';
        } catch { return ''; }
    })()
    : '';

// Find changed markdown files in posts/
const { execSync } = require('child_process');
let changedFiles = [];
try {
    const output = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf-8' });
    changedFiles = output.trim().split('\n').filter(f => f.startsWith('posts/') && f.endsWith('.md'));
} catch {
    console.log('Could not detect changed files (possibly first commit or shallow clone)');
}

// Parse frontmatter for each changed post
const postsDir = path.join(__dirname, '..', 'posts');
const blogUrl = 'https://blog.diepthink.top';

const posts = changedFiles.map(file => {
    const fullPath = path.join(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) return null;
    const content = fs.readFileSync(fullPath, 'utf-8');
    let title;
    const quotedTitle = content.match(/^title:\s*["'](.+?)["']/m);
    const unquotedTitle = content.match(/^title:\s*(.+)$/m);
    if (quotedTitle) {
        title = quotedTitle[1];
    } else if (unquotedTitle) {
        title = unquotedTitle[1].trim();
    }
    // Fall back to first heading like build.js does
    if (!title) {
        const heading = content.match(/^#\s+(.+)$/m);
        title = heading ? heading[1].trim() : path.basename(file, '.md');
    }
    const slug = file.replace(/\.md$/, '.html').replace(/^posts\//, '');
    return { title, url: `${blogUrl}/posts/${slug}` };
}).filter(Boolean);

if (posts.length === 0) {
    console.log('No changed posts detected, skipping notification');
    process.exit(0);
}

const payload = JSON.stringify({
    event: 'blog_update',
    repository: process.env.GITHUB_REPOSITORY || '',
    commit: commitSha,
    commit_message: commitMessage,
    commit_url: commitSha ? `${repoUrl}/commit/${commitSha}` : '',
    posts: posts
});

console.log(`Notifying webhook about ${posts.length} updated post(s):`);
posts.forEach(p => console.log(`  - ${p.title}: ${p.url}`));

// Parse webhook URL
const isHttps = webhookUrl.startsWith('https://');
const urlObj = new URL(webhookUrl);
const client = isHttps ? https : http;

const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (isHttps ? 443 : 80),
    path: urlObj.pathname + urlObj.search,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'Blog-Notify/1.0'
    }
};

const req = client.request(options, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log(`Webhook responded: ${res.statusCode}`);
        process.exit(0);
    });
});
req.on('error', err => {
    console.error('Webhook request failed:', err.message);
    process.exit(1);
});
req.write(payload);
req.end();
