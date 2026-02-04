# 功能详细说明书 (Functional Specification)

**项目名称**: Re:Aniname  
**最后更新**: 2026-02-04

---

## 1. 核心重命名功能 (Core Renaming)

### 1.1 输入处理与清洗

系统能自动处理从下载器传入的原始文件或文件夹路径。

- **FN-01 递归扫描**: 基于 `fs.readdir` (recursive) 扫描目录。
- **FN-02 扩展名过滤**: 仅处理视频文件 (mp4, mkv, avi, iso, rmvb)。
- **FN-03 智能清洗算法**:
  - **去除标签**: 移除 `[VCB-S]`, `[Snow-Raws]` 等。
  - **去除技术参数**: 移除分辨率、编码、音频格式。
  - **去除校验码**: 移除 CRC32。

### 1.2 类型识别 (Type Detection)

系统具备智能判断“电影”与“剧集”的能力。

- **FN-04 双重搜索验证**: 调用 TMDB Search API。
- **FN-05 启发式评分系统**:
  - 关键词权重 (`Season`, `EP`)。
  - 文件数量权重。
- **FN-06 强制类型指定**: 通过 API 参数覆盖自动判断。

### 1.3 匹配与重命名 (Matching & Renaming)

- **FN-07 电影重命名**:
  - 格式: `电影中文名 (年份)/电影中文名 (年份).后缀`
- **FN-08 剧集重命名**:
  - 格式: `剧集中文名 (年份)/Season X/SXXEXX - 标题.后缀`
  - 季号匹配: 自动识别 `Season 2` 目录或文件名中的 `S2`。
  - 集号匹配: 支持 `EP01`, `01`, `E1`。
- **FN-09 特殊内容处理**:
  - **SP/OVA**: 归类至 `Season 0`。
  - **周边内容**: `PV`, `Menu` 移动到 `extras`。
- **FN-10 元数据源回退**: TMDB -> Jikan。

### 1.4 文件操作模式

- **FN-11 硬链接 (Hard Link)**: 默认模式 (`fs.link`)。
- **FN-12 复制/移动**: 可选模式。

---

## 2. AI 智能增强功能 (AI Integration)

### 2.1 AI 引擎支持

- **FN-14 多模型支持**:
  - **OpenAI**: 使用 `openai` npm 包。
  - **Gemini**: 使用 `@google/generative-ai` 包。
- **FN-15 智能映射**:
  - 绝对集数转换 (26 -> S02E01)。
  - 剧场版归类。

### 2.2 质量控制

- **FN-16 置信度评估**: `High`, `Medium`, `Low`。
- **FN-17 阈值控制**: 用户可设置最低接受阈值。

---

## 3. Web 界面功能 (Next.js + MUI)

### 3.1 仪表盘 (Dashboard)

- **FN-19 实时日志**: WebSocket 推送，虚拟滚动列表展示。
- **FN-20 任务队列**: 展示 Pending/Processing/Completed 任务卡片。

### 3.2 配置中心 (Configuration)

- **FN-21 路径映射配置**: 动态表单，支持路径选择器 (可选)。
- **FN-22 API 密钥管理**: 密码框掩码显示，支持连通性测试按钮。
- **FN-23 代理设置**: 支持 HTTP/HTTPS 代理。

### 3.3 手动操作

- **FN-24 手动任务提交**: 拖拽上传或路径输入。
- **FN-25 批量任务**: 支持多路径提交。

---

## 4. 集成与自动化 (Integration)

### 4.1 qBittorrent 集成

- **FN-26 Webhook**: `/api/v1/webhook/qbittorrent`。
- **FN-27 标签联动**: 读取 qBittorrent 标签。

### 4.2 系统级功能

- **FN-29 跨平台支持**: Docker 部署，支持 Linux (amd64/arm64)。
- **FN-30 错误恢复**: 自动重试机制。
- **FN-31 日志持久化**: 使用 `winston` 或 `pino` 记录日志文件。

---

## 5. 性能与限制

- **FN-32 并发控制**: 默认并发数 5 (可配置)，防止磁盘 IO 瓶颈。
- **FN-33 内存优化**: 使用 Stream 处理大文件操作 (复制模式下)。
