# 博客部署指南

## 方式一：GitHub Pages（推荐）

### 首次部署

1. 将代码推送到 GitHub 仓库

2. 在 GitHub 仓库页面，进入 **Settings → Pages**

3. 在 **Build and deployment** 部分：
   - Source 选择 **GitHub Actions**
   - 工作流会自动运行，无需额外配置

4. 等待几分钟，部署完成后会显示访问链接

### 手动触发部署

1. 进入仓库的 **Actions** 标签页

2. 点击左侧的 **Deploy to GitHub Pages**

3. 点击 **Run workflow** 按钮

### 自定义域名（可选）

1. 在 **Settings → Pages → Custom domain** 中添加域名

2. 在仓库根目录创建 `CNAME` 文件，内容为你的域名

## 方式二：Cloudflare Pages

### 首次部署

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → **Create a project**

2. 选择你的 GitHub 仓库

3. 配置构建设置：
   - **Build command**: `node scripts/build.js`
   - **Build output directory**: `output`
   - **Node.js version**: `18`

4. 点击 **Save and Deploy**

### 使用 Wrangler CLI 部署

```bash
# 安装依赖
npm install

# 构建并部署
npm run build
npx wrangler pages deploy output
```

## 本地开发

```bash
# 安装依赖
npm install

# 构建并预览
npm run dev
```

## 发布新文章

1. 在 `posts/` 目录创建新的 `.md` 文件

2. 文件格式：
```markdown
---
title: "文章标题"
date: 2026-04-12
tags: ["标签1", "标签2"]
---

文章内容...
```

3. 提交到仓库，GitHub Actions 会自动构建和部署
