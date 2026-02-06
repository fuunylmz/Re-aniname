# Re:aniname 部署文档

## 1. Docker 部署 (推荐)

### 1.1 前置条件
- 服务器已安装 Docker 和 Docker Compose。

### 1.2 部署步骤

1. **创建目录并下载配置文件**
   在服务器上创建一个目录，例如 `/opt/re-aniname`，并放入 `docker-compose.yml`。

   ```yaml
   version: '3.8'
   services:
     app:
       image: re-aniname:latest
       container_name: re-aniname
       restart: always
       ports:
         - "3000:3000"
       environment:
         - OPENAI_API_KEY=sk-xxxxxx
         - NODE_ENV=production
         - WEB_PASSWORD=admin # 设置你的Web登录密码
       volumes:
         - /path/to/your/media:/media  # 挂载媒体目录
         - ./config:/app/config        # 挂载配置目录
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. **访问**
   访问 `http://your-server-ip:3000`。

## 2. 常规部署 (Linux / Node.js)

如果您不想使用 Docker，可以直接在 Linux 服务器上运行 Node.js 环境。

### 2.1 环境准备

确保服务器已安装：
- **Node.js** (推荐 v18 或更高版本)
- **npm** 或 **pnpm** (推荐)
- **PM2** (进程管理器，用于后台运行)

```bash
# 安装 PM2
npm install -g pm2
```

### 2.2 部署步骤

1. **上传代码**
   将项目代码上传到服务器目录，例如 `/var/www/re-aniname`。

2. **安装依赖**
   ```bash
   cd /var/www/re-aniname
   npm install
   # 或者使用 pnpm
   pnpm install
   ```

3. **构建项目**
   ```bash
   npm run build
   # 或者
   pnpm build
   ```

4. **配置环境变量**
   在项目根目录创建 `.env.local` 文件，或直接在 PM2 配置中设置。
   
   ```bash
   # .env.local 示例
   WEB_PASSWORD=your_secure_password
   AUTH_SECRET=your_random_secret_string
   ```

5. **启动服务 (使用 PM2)**
   项目根目录已包含 `ecosystem.config.js` 配置文件。

   ```bash
   # 启动服务
   pm2 start ecosystem.config.js
   
   # 保存当前进程列表，以便开机自启
   pm2 save
   
   # 设置开机自启 (根据提示运行生成的命令)
   pm2 startup
   ```

6. **查看日志**
   ```bash
   pm2 logs re-aniname
   ```

## 3. 环境变量配置

请在 `.env.local` 文件或 PM2 `ecosystem.config.js` 的 `env` 字段中配置：

| 变量名 | 描述 | 示例 | 默认值 |
| :--- | :--- | :--- | :--- |
| `WEB_PASSWORD` | Web 界面登录密码 | `mysecretpass` | `admin` |
| `AUTH_SECRET` | JWT 签名密钥 (生产环境建议修改) | `random-string` | (内置默认值) |
| `PORT` | 服务端口 | `3000` | `3000` |

## 4. 反向代理 (Nginx)

建议使用 Nginx 进行反向代理，以便使用标准 HTTP 端口 (80) 或配置 SSL (443)。

```nginx
server {
    listen 80;
    server_name re-aniname.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # 传递真实 IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
