# 用户操作手册 (User Manual)

**项目名称**: Re:Aniname  
**最后更新**: 2026-02-04

---

## 1. 快速开始 (Quick Start)

### 1.1 访问界面
服务启动后，在浏览器访问 `http://localhost:3000` (或服务器 IP)。
- **界面概览**:
    - 采用 Material Design 设计风格。
    - 左侧侧边栏导航：Dashboard, Tasks, Settings, Logs。
    - 支持浅色/深色模式切换 (右上角)。

### 1.2 首次配置
1.  点击侧边栏的 **Settings**。
2.  **API Keys**:
    - 输入 TMDB API Key (必填)。
    - (可选) 输入 OpenAI/Gemini Key。
3.  **Paths**:
    - 设置 Bangumi/Movie 输出路径。
4.  点击 **Save Changes**，系统会即时验证 Key 的有效性。

---

## 2. 核心功能使用指南

### 2.1 手动整理文件
1.  进入 **Dashboard** 或 **Tasks** 页面。
2.  点击右下角的 **FAB (悬浮按钮) +**。
3.  在弹出的对话框中：
    - 输入服务器上的绝对路径。
    - 勾选 "Is Anime" (如果需要)。
4.  点击 **Submit**。
5.  在 Dashboard 的 "Active Tasks" 区域查看进度条。

### 2.2 配合 qBittorrent 自动整理
这是最推荐的使用方式。

1.  打开 qBittorrent -> **选项** -> **下载**。
2.  勾选 **"下载完成后运行外部程序"**。
3.  输入命令:
    ```bash
    curl -d "path=%F" -d "tags=%L" http://localhost:3001/api/v1/webhook/qbittorrent
    ```

**工作原理**:
- 下载完成后，Re:Aniname 会收到通知。
- 前端 Dashboard 会自动弹出一个新的任务卡片 (Toast Notification)。
- 可以在 Logs 页面看到实时的处理日志。

---

## 3. 常见场景 (FAQ)

### Q: 界面显示 "Disconnected" 是什么意思？
A: 表示前端与后端的 WebSocket 连接断开。请检查后端服务 (Port 3001) 是否正常运行。

### Q: 为什么任务状态一直是 Pending？
A: 可能是任务队列已满，或者后端正在处理大文件。请查看 Logs 页面获取详细信息。

### Q: 如何开启深色模式？
A: 点击右上角的月亮图标即可切换。系统会自动记忆您的偏好。
