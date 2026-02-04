# 数据存储与配置结构文档 (Data Schema)

**项目名称**: Re:Aniname  
**最后更新**: 2026-02-04

---

## 1. 环境变量配置 (`.env`)

项目使用 `dotenv` 管理敏感配置。

### 1.1 Backend (`backend/.env`)

| 变量名 | 必填 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `PORT` | 否 | 3001 | 后端服务端口。 |
| `NODE_ENV` | 否 | development | 环境 (development/production)。 |
| `TMDB_API_KEY` | 是 | - | TMDB API Key。 |
| `BANGUMI_PATH` | 是 | - | 番剧输出根目录。 |
| `MOVIE_PATH` | 是 | - | 电影输出根目录。 |
| `OPENAI_API_KEY` | 否 | - | OpenAI Key。 |
| `GEMINI_API_KEY` | 否 | - | Google Gemini Key。 |

### 1.2 Frontend (`frontend/.env.local`)

| 变量名 | 必填 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | 是 | http://localhost:3001 | 后端 API 地址。 |
| `NEXT_PUBLIC_SOCKET_URL` | 是 | http://localhost:3001 | WebSocket 连接地址。 |

---

## 2. 运行时数据结构 (TypeScript Interfaces)

后端核心数据类型定义。

### 2.1 任务对象 (`Task`)

```typescript
export interface Task {
  id: string;             // UUID v4
  type: 'TV' | 'MOVIE';   // 自动识别的类型
  status: TaskStatus;     // 枚举
  sourcePath: string;     // 原始路径
  targetPath?: string;    // 最终生成的路径
  tmdbId?: number;        // 匹配到的 TMDB ID
  season?: number;        // 季号
  episode?: number;       // 集号
  error?: string;         // 错误信息
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
```

### 2.2 AI 分析结果 (`AIAnalysisResult`)

```typescript
export interface AIAnalysisResult {
  mappings: EpisodeMapping[];
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
}

export interface EpisodeMapping {
  filename: string;
  season: number;
  episode: number;
}
```

---

## 3. 持久化存储 (JSON/SQLite)

虽然项目主要使用内存队列，但为了重启后不丢失配置，部分数据会持久化。

### 3.1 配置文件 (`config/settings.json`)

```json
{
  "tmdb": {
    "apiKey": "enc_xxxxx",  // 加密存储
    "language": "zh-CN"
  },
  "paths": {
    "bangumi": "/data/bangumi",
    "movie": "/data/movie"
  },
  "ai": {
    "provider": "openai",
    "model": "gpt-4o",
    "threshold": "Medium"
  }
}
```
