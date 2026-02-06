# Re:aniname 技术设计文档

## 1. 项目概述

**Re:aniname** 是一个基于 Next.js 构建的智能媒体文件重命名系统。该项目的核心目标利用 AI Function Calling 技术，自动识别并重命名下载的电影、电视剧、番剧等媒体文件，使其完全符合 Emby、Plex 等媒体服务器的元数据识别标准（NFO/命名规范）。

### 1.1 核心价值
- **自动化**：消除手动重命名文件的繁琐过程。
- **高精度**：利用 AI 语义理解能力，准确提取文件名中的关键信息（如中文名、英文名、年份、季、集、分辨率、制作组等）。
- **标准化**：输出格式严格遵循 Emby 最佳实践。

## 2. 系统架构

系统采用前后端一体化架构（Next.js App Router），主要包含以下模块：

### 2.1 架构图
```mermaid
graph TD
    User[用户] --> UI[Web 前端界面]
    UI --> API[Next.js API Routes]
    API --> Controller[核心控制器]
    Controller --> Scanner[文件扫描模块]
    Controller --> AI[AI 处理模块]
    Controller --> Renamer[重命名执行模块]
    Controller --> Logger[日志系统]
    AI --> LLM[大语言模型 (OpenAI/Claude/Local)]
    Scanner --> FS[文件系统]
    Renamer --> FS
```

### 2.2 模块说明
- **Web 前端**：提供任务管理、日志查看、配置设置的可视化界面。
- **文件扫描模块**：负责扫描指定目录，过滤非媒体文件，支持递归扫描。
- **AI 处理模块**：构造 Prompt，调用 LLM 的 Function Calling 接口，解析返回的结构化数据。
- **重命名执行模块**：执行文件重命名和移动操作，处理文件冲突。
- **日志系统**：记录所有操作历史，用于回溯和错误分析。

## 3. 技术选型

| 模块 | 技术栈 | 理由 |
| :--- | :--- | :--- |
| **框架** | Next.js 14+ (App Router) | 全栈能力，部署方便，React 生态丰富 |
| **语言** | TypeScript | 类型安全，提高代码质量和可维护性 |
| **UI 组件库** | Shadcn/ui + TailwindCSS | 快速构建美观、响应式的界面 |
| **AI 交互** | Vercel AI SDK | 统一的 AI 接口，简化 Function Calling 实现 |
| **状态管理** | Zustand / React Query | 前端状态管理与服务端数据同步 |
| **任务队列** | BullMQ + Redis (可选) | 处理大量文件的并发控制和重试机制 |
| **文件操作** | Node.js fs/promises | 原生文件系统操作，高性能 |
| **校验** | Zod | 运行时 Schema 校验，确保 AI 返回数据格式正确 |

## 4. 核心功能实现

### 4.1 智能命名算法 (AI Function Calling)

核心逻辑是通过定义严格的 Function Schema，强制 AI 返回结构化 JSON 数据。

**Schema 定义 (Zod 示例):**
```typescript
const MediaInfoSchema = z.object({
  type: z.enum(['Movie', 'Series', 'Anime']),
  title: z.string().describe('主要标题 (中文)'),
  originalTitle: z.string().optional().describe('原名 (英文/日文)'),
  year: z.number().describe('上映年份'),
  season: z.number().optional().describe('季号 (Sxx)'),
  episode: z.number().optional().describe('集号 (Exx)'),
  resolution: z.string().optional().describe('分辨率 (1080p, 4k)'),
  source: z.string().optional().describe('来源 (Web-DL, BluRay)'),
  group: z.string().optional().describe('制作组'),
});
```

**Emby 命名规范转换:**
- **电影**: `Movies/标题 (年份)/标题 (年份) - [分辨率].ext`
- **剧集**: `TV Shows/标题 (年份)/Season XX/标题 - SXXEXX - [分辨率].ext`

### 4.2 批量处理与大文件优化
- **队列机制**：使用生产者-消费者模型，将扫描到的文件加入队列，避免瞬间高并发导致 AI 接口限流或系统卡顿。
- **流式处理**：对于日志和进度反馈，使用 Server-Sent Events (SSE) 或 WebSocket 实时推送到前端。
- **无需读取全量内容**：仅读取文件名和必要的元数据（如文件头信息），不读取整个大文件内容，确保处理 GB 级视频文件时的 IO 效率。

### 4.3 文件处理模式 (Output Mode)
系统支持多种文件处理模式，以满足不同用户的需求（如 PT 保种）：
- **Move (移动)**: 默认模式。将文件从源路径移动到目标路径。
- **HardLink (硬链接)**: 推荐模式。在目标路径创建指向源文件 inode 的硬链接。
  - **优点**: 不占用额外磁盘空间，源文件保持不变（不影响做种），目标文件符合 Emby 命名规范。
  - **限制**: 源目录和目标目录必须位于**同一文件系统/分区**。
- **SymLink (软链接)**: 创建符号链接。
- **Copy (复制)**: 完整复制文件（占用双倍空间，仅在跨盘且需要保留源文件时使用）。

## 5. API 接口设计

遵循 RESTful 风格，部分复杂交互使用 Server Actions。

### 5.1 核心端点

- `POST /api/scan`: 触发指定目录扫描
  - Body: `{ path: string, recursive: boolean }`
- `POST /api/process`: 提交重命名任务
  - Body: `{ fileIds: string[], config: { outputMode: 'move' | 'link' | 'copy', outputDir: string, ... } }`
- `GET /api/tasks`: 获取任务队列状态
- `GET /api/logs`: 获取操作日志
- `GET /api/config`: 获取当前配置
- `PUT /api/config`: 更新配置

## 6. 错误处理机制

- **AI 解析失败**：
  - 策略：自动重试 (最多 3 次)。
  - 降级：如果 AI 持续失败，标记为“需人工确认”，不执行重命名。
- **文件系统错误 (权限/占用)**：
  - 策略：捕获异常，记录详细错误日志，跳过当前文件，继续处理下一个。
- **命名冲突**：
  - 策略：检测目标路径是否存在，若存在则自动添加后缀 `(1)`, `(2)` 或根据配置覆盖/跳过。

## 7. 性能优化方案

- **并发控制**：限制同时进行的 AI 请求数量 (如 max 5)，防止 API Rate Limit。
- **缓存机制**：对相同文件名的解析结果进行本地缓存 (SQLite/JSON DB)，避免重复消耗 Token。
- **预加载**：前端使用 React Query 预加载常用配置和日志数据。

## 8. 部署运维

- **Docker 化**：提供 `Dockerfile` 和 `docker-compose.yml`，一键部署。
- **环境变量**：通过 `.env` 管理 API Key、端口、挂载目录等敏感信息。
- **健康检查**：提供 `/api/health` 接口供负载均衡器或 Docker Healthcheck 使用。
