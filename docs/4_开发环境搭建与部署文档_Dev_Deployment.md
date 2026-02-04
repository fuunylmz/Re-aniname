# 开发环境搭建与部署文档

**项目名称**: Re:Aniname  
**最后更新**: 2026-02-04

---

## 1. 开发环境搭建 (Development Setup)

### 1.1 前置要求
- **Node.js**: `v20.x` 或更高版本 (推荐 LTS)。
- **pnpm**: 推荐使用 pnpm 作为包管理器 (`npm i -g pnpm`)。
- **Git**: 版本控制。

### 1.2 本地运行步骤

1.  **克隆代码库**
    ```bash
    git clone https://github.com/your-repo/re-aniname.git
    cd re-aniname
    ```

2.  **安装依赖 (Root)**
    本项目使用 Monorepo 结构 (Turborepo 可选)。
    ```bash
    pnpm install
    ```

3.  **启动后端 (Backend)**
    ```bash
    cd backend
    cp .env.example .env  # 配置环境变量
    pnpm dev
    # 后端运行在 http://localhost:3001
    ```

4.  **启动前端 (Frontend)**
    ```bash
    cd frontend
    cp .env.example .env.local
    pnpm dev
    # 前端运行在 http://localhost:3000
    ```

### 1.3 环境变量说明 (`.env`)

**Backend**:
```ini
PORT=3001
TMDB_API_KEY=your_key_here
BANGUMI_PATH=/data/bangumi
MOVIE_PATH=/data/movie
OPENAI_API_KEY=sk-...
```

**Frontend**:
```ini
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## 2. Docker 部署指南 (Production Deployment)

### 2.1 构建镜像
使用多阶段构建 (Multi-stage build) 减小镜像体积。

```bash
docker build -t re-aniname:latest .
```

### 2.2 使用 Docker Compose 启动

创建 `docker-compose.yml`:

```yaml
version: '3.8'
services:
  app:
    image: re-aniname:latest
    container_name: re-aniname
    ports:
      - "3000:3000"  # 前端
      - "3001:3001"  # 后端
    environment:
      - TMDB_API_KEY=xxxxx
    volumes:
      - /path/to/downloads:/data/downloads
      - /path/to/media:/data/media
      - ./config:/app/backend/config
    restart: unless-stopped
```

启动服务:
```bash
docker-compose up -d
```

---

## 3. 开发规范

### 3.1 代码风格
- **Linting**: ESLint + Prettier。
- **Commit**: 遵循 Conventional Commits (`feat:`, `fix:`, `docs:` 等)。

### 3.2 调试技巧
- **后端调试**: VS Code `Attach to Node Process`。
- **前端调试**: React Developer Tools。
- **日志查看**: 开发环境直接看控制台，生产环境查看 Docker logs。
