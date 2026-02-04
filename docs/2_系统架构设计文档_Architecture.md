# 系统架构设计文档 (System Architecture)

**项目名称**: Re:Aniname  
**最后更新**: 2026-02-04

---

## 1. 总体架构图 (High-Level Architecture)

本项目采用 **前后端分离 (Decoupled Architecture)** 模式。前端基于 Next.js 构建 SPA (单页应用)，后端基于 Node.js 提供 API 和核心业务逻辑。

```mermaid
graph TD
    User[用户] --> |HTTP/Browser| Frontend[前端 (Next.js + MUI)]
    Downloader[qBittorrent] --> |Webhook (REST)| Backend[后端 (Node.js/Express)]

    subgraph "Frontend Layer"
        Page[页面组件]
        Store[状态管理 (Zustand)]
        SocketClient[Socket.io Client]
    end

    subgraph "Backend Layer (Express)"
        APIGateway[API Gateway / Router]
        Service[业务服务层]
        Core[重命名核心引擎]
        Queue[任务队列 (BullMQ)]
    end

    subgraph "Core Engine"
        Cleaner[清洗模块]
        Matcher[匹配模块]
        AI_Adapter[AI 适配器]
        FileSys[文件系统操作]
    end

    subgraph "External Services"
        TMDB[TMDB API]
        Jikan[Jikan API]
        LLM[OpenAI/Gemini]
    end

    Frontend --> |REST API| APIGateway
    Frontend --> |WebSocket| APIGateway
    Backend --> |调用| Core
    Core --> |API Request| TMDB
    Core --> |API Request| Jikan
    AI_Adapter --> |API Request| LLM
    FileSys --> |fs/fs-extra| Disk[本地磁盘]
```

---

## 2. 模块详细说明

### 2.1 前端表现层 (Frontend)

- **技术栈**: Next.js 14 (App Router), React, TypeScript, Material UI v5.
- **职责**:
  - **Dashboard**: 展示任务队列、实时日志、统计图表。
  - **Config**: 动态表单配置系统参数。
  - **Task**: 手动提交任务入口。
- **状态管理**: 使用 Zustand 管理全局配置和 WebSocket 连接状态。

### 2.2 后端服务层 (Backend)

- **技术栈**: Node.js, Express (或 NestJS), TypeScript, Socket.io.
- **职责**:
  - **API Server**: 提供 RESTful API (`/api/v1/tasks`, `/api/v1/config`).
  - **WebSocket Server**: 实时推送 `log` 和 `task_update` 事件。
  - **Task Queue**: 使用简单的内存队列或 BullMQ 处理并发任务。

### 2.3 核心业务层 (Core Engine)

- **位置**: `src/core/`
- **模块**:
  - `Renamer`: 核心类，协调清洗、搜索、匹配流程。
  - `MediaInfo`: 封装 `ffprobe` (可选) 或文件名解析逻辑。
  - `TMDBClient`: 封装 `axios` 请求 TMDB。
  - `AIProvider`: 策略模式封装 OpenAI/Gemini 接口。

---

## 3. 技术选型 (Tech Stack)

| 领域            | 技术/库              | 选择理由                                              |
| :-------------- | :------------------- | :---------------------------------------------------- |
| **前端框架**    | Next.js              | 业界标准 React 框架，开发体验极佳，SSR 有利于首屏加载 |
| **UI 组件库**   | Material UI (MUI)    | 成熟、美观、组件丰富，符合 Google Design 规范         |
| **后端框架**    | Express + TypeScript | 轻量级，生态极其丰富，TS 提供类型安全                 |
| **实时通信**    | Socket.io            | 解决前后端实时日志推送需求，比轮询更高效              |
| **HTTP 客户端** | Axios                | 前后端通用的 HTTP 请求库                              |
| **验证库**      | Zod                  | 运行时 Schema 验证 (Config/API 参数校验)              |
| **AI SDK**      | OpenAI Node SDK      | 官方 SDK，集成方便                                    |

---

## 4. 核心数据流 (Data Flow)

### 4.1 自动重命名流程

1.  **触发**: qBittorrent 调用 `POST /api/v1/webhook/qbittorrent`。
2.  **入队**: Controller 将请求参数封装为 Task 对象推入 Queue。
3.  **处理**: Worker 从 Queue 取出任务，实例化 `Renamer`。
4.  **清洗**: `string-similarity` 或正则库处理文件名。
5.  **匹配**:
    - **分支 A**: 调用 TMDB API。
    - **分支 B**: 调用 OpenAI API (传入 JSON Schema)。
6.  **执行**: 使用 `fs.link()` 创建硬链接。
7.  **通知**: 通过 Socket.io 广播 `task_complete` 事件，前端更新 UI。

---

## 5. 目录结构规范

```text
re-aniname/
├── frontend/           # Next.js 项目
│   ├── src/
│   │   ├── app/        # App Router 页面
│   │   ├── components/ # MUI 组件
│   │   └── lib/        # 工具函数
├── backend/            # Node.js 项目
│   ├── src/
│   │   ├── api/        # Controllers
│   │   ├── core/       # 核心业务逻辑 (Renamer, Matcher)
│   │   ├── services/   # TMDB, AI Service
│   │   └── utils/
│   ├── package.json
├── docker-compose.yml
└── README.md
```
