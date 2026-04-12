# 博客部署到 Cloudflare Pages

## 部署步骤

### 方式一：通过 Git 直接部署（推荐）

1. 将代码推送到 GitHub 仓库
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → **Create a project**
3. 选择你的 GitHub 仓库
4. 配置构建设置：
   - **Build command**: `node scripts/build.js`
   - **Build output directory**: `output`
   - **Node.js version**: `18` 或更高
5. 点击 **Save and Deploy**

### 方式二：使用 Wrangler CLI

```bash
# 安装依赖
npm install

# 构建博客
npm run build

# 部署到 Cloudflare Pages
npx wrangler pages deploy output
```

## 本地开发

```bash
# 安装依赖
npm install

# 构建并预览
npm run dev
```

## 自定义域名（可选）

1. 在 Cloudflare Pages 项目设置中进入 **Custom Domains**
2. 添加你的域名
3. Cloudflare 会自动配置 DNS 和 SSL
