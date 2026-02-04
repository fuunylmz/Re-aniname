# API 接口文档 (API Documentation)

**项目名称**: Re:Aniname  
**最后更新**: 2026-02-04

---

## 1. 概述
本项目后端提供 RESTful API，Base URL 为 `/api/v1`。
支持 CORS，所有响应均为 JSON 格式。

**通用响应格式**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**错误响应格式**:
```json
{
  "success": false,
  "error": "Path not found",
  "code": 404
}
```

---

## 2. Webhook 接口

### 2.1 qBittorrent 触发重命名
- **URL**: `/api/v1/webhook/qbittorrent`
- **Method**: `POST`
- **Content-Type**: `application/x-www-form-urlencoded` 或 `application/json`

#### 请求参数 (Body)

| 参数名 | 类型 | 必填 | 描述 |
| :--- | :--- | :--- | :--- |
| `path` | string | 是 | 下载完成的绝对路径。 |
| `tags` | string | 否 | 标签，逗号分隔 (如 `anime,raw`)。 |
| `category` | string | 否 | 分类 (如 `Anime`)。 |

#### qBittorrent 配置示例
```bash
curl -d "path=%F" -d "tags=%L" -d "category=%K" http://localhost:3001/api/v1/webhook/qbittorrent
```

---

## 3. 任务管理接口 (Task Management)

### 3.1 获取任务列表
- **URL**: `/api/v1/tasks`
- **Method**: `GET`
- **Query Params**:
    - `page`: 页码 (默认 1)
    - `limit`: 每页数量 (默认 20)
    - `status`: 状态筛选 (`pending`, `completed`, `failed`)

### 3.2 提交手动任务
- **URL**: `/api/v1/tasks`
- **Method**: `POST`
- **Body**:
```json
{
  "path": "/data/downloads/example",
  "isAnime": true
}
```

---

## 4. 配置接口 (System Config)

### 4.1 获取当前配置
- **URL**: `/api/v1/config`
- **Method**: `GET`

### 4.2 更新配置
- **URL**: `/api/v1/config`
- **Method**: `PUT`
- **Body**:
```json
{
  "tmdbApiKey": "new_key",
  "aiProvider": "gemini"
}
```

---

## 5. WebSocket 事件 (Socket.io)

连接 URL: `ws://localhost:3001`

### 5.1 监听事件
- **`log`**: 实时日志推送。
    ```json
    { "level": "info", "message": "Processing file...", "timestamp": "..." }
    ```
- **`task_update`**: 任务状态变更通知。
    ```json
    { "taskId": "uuid", "status": "completed", "progress": 100 }
    ```

### 5.2 发送事件
- **`subscribe_log`**: 订阅日志频道。
