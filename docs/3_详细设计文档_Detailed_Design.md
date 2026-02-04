# 详细设计文档 (Detailed Design Document)

**项目名称**: Re:Aniname  
**最后更新**: 2026-02-04

---

## 1. 核心类与模块设计 (Backend)

### 1.1 `RenamerService` (Core Logic)

- **位置**: `backend/src/core/renamer.service.ts`
- **职责**: 协调重命名的全流程。
- **主要方法**:
  - `process(task: TaskDTO): Promise<Result>`: 异步处理入口。
  - `detectType(filename: string): MediaType`: 判断 Movie/TV。
  - `matchSeason(filename: string, tmdbInfo: TMDBShow): number`: 匹配季号。

### 1.2 `AIProvider` (Interface & Implementation)

- **位置**: `backend/src/services/ai/`
- **接口定义**:
  ```typescript
  interface AIProvider {
    analyze(files: FileInfo[], context: TMDBContext): Promise<MappingResult>;
  }
  ```
- **实现类**: `OpenAIService`, `GeminiService`。
- **Prompt 管理**: 使用 Handlebars 或 ES6 Template String 构建 Prompt。

### 1.3 `TaskQueue` (Concurrency)

- **位置**: `backend/src/core/queue.ts`
- **职责**: 管理并发任务，防止过多 I/O 或 API 请求被限流。
- **实现**: 基于 `bullmq` (Redis) 或内存队列 `async.queue`。

---

## 2. 核心算法流程 (Core Algorithms)

### 2.1 任务类型判断算法 (TypeScript)

```typescript
function detectType(filename: string): "TV" | "MOVIE" {
  let score = 0;
  // 1. 关键字加权
  if (/season|s\d{1,2}|ep?\d{1,3}/i.test(filename)) score += 2;

  // 2. TMDB 搜索验证 (伪代码)
  // const tvResults = await tmdb.searchTV(cleanName);
  // if (tvResults.length > 0) score += 1;

  return score > 0 ? "TV" : "MOVIE";
}
```

### 2.2 AI 映射结果解析 (Zod Schema)

AI 返回的数据必须经过 Zod 验证，确保类型安全。

```typescript
const MappingSchema = z.object({
  mappings: z.array(
    z.object({
      original_filename: z.string(),
      season_number: z.number(),
      episode_number: z.number(),
    }),
  ),
  confidence: z.enum(["High", "Medium", "Low"]),
});
```

---

## 3. 数据模型设计 (Data Models)

### 3.1 任务 DTO (`TaskDTO`)

```typescript
interface TaskDTO {
  id: string; // UUID
  path: string; // 绝对路径
  isAnime?: boolean; // 强制指定
  tags: string[]; // qBittorrent 标签
  status: "pending" | "processing" | "completed" | "failed";
}
```

### 3.2 配置文件 (`Config`)

使用 `dotenv` 加载环境变量，结合 `config` 模块。

```typescript
// config/default.ts
export default {
  tmdb: {
    apiKey: process.env.TMDB_API_KEY,
  },
  paths: {
    bangumi: process.env.BANGUMI_PATH,
    movie: process.env.MOVIE_PATH,
  },
  ai: {
    enabled: false,
    provider: "openai",
  },
};
```

---

## 4. 前端组件设计 (Frontend)

### 4.1 布局组件 (`AppLayout`)

使用 MUI 的 `Drawer` 和 `AppBar` 构建响应式布局。

- `Sidebar`: 导航菜单 (Dashboard, Settings, Logs).
- `Header`: 显示当前连接状态 (Socket connected/disconnected).

### 4.2 实时日志组件 (`LogViewer`)

- 使用 `react-window` 或 `virtuoso` 实现虚拟滚动，高性能渲染大量日志。
- 监听 Socket.io 的 `log` 事件，追加到 Zustand store 中。

---

## 5. 异常处理设计

- **API 限流**: 使用 `bottleneck` 库限制 TMDB API 的并发请求数 (如 4 req/s)。
- **全局异常捕获**: Express 中间件统一捕获 Error，返回标准 JSON 错误格式 `{ error: string, code: number }`。
- **文件锁**: 操作文件前检查是否被占用 (Windows 特有坑)。
