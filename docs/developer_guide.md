# Re:aniname 开发者指南

## 1. 开发环境搭建

### 前置要求
- Node.js 18.17 或更高版本
- pnpm / npm / yarn
- Git

### 安装步骤
```bash
# 克隆仓库
git clone https://github.com/your-repo/Re-aniname.git
cd Re-aniname

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入必要的 API Key
```

### 启动开发服务器
```bash
pnpm dev
```
访问 `http://localhost:3000` 查看效果。

## 2. 项目结构

```
Re-aniname/
├── app/                 # Next.js App Router 目录
│   ├── api/             # 后端 API 路由
│   ├── page.tsx         # 首页
│   └── layout.tsx       # 全局布局
├── components/          # React 组件
│   ├── ui/              # Shadcn UI 基础组件
│   └── feature/         # 业务组件
├── lib/                 # 工具库
│   ├── ai/              # AI 相关逻辑 (Function Calling)
│   ├── scanner/         # 文件扫描逻辑
│   └── renamer/         # 重命名逻辑
├── public/              # 静态资源
├── docs/                # 项目文档
└── tests/               # 测试文件
```

## 3. 核心模块开发

### AI Module (`lib/ai`)
使用 Vercel AI SDK (`ai` 包) 进行流式传输和函数调用。
- `actions.ts`: 定义 Server Actions。
- `schema.ts`: 定义 Zod Schema，用于约束 AI 输出。

### 文件操作 (`lib/scanner`, `lib/renamer`)
- 使用 Node.js `fs/promises` 进行异步文件操作。
- 确保所有路径操作使用 `path` 模块以保证跨平台兼容性 (Windows/Linux)。
- **硬链接实现**: 使用 `fs.link(src, dest)`。注意捕获 `EXDEV` 错误（跨设备链接错误），如果捕获到该错误，应提示用户或降级为复制模式。

## 4. 测试指南

项目使用 **Vitest** 进行单元测试，**Playwright** (可选) 进行端到端测试。

### 运行单元测试
```bash
pnpm test
```

### 编写测试用例
在 `tests/` 目录下创建 `*.test.ts` 文件。
示例：
```typescript
import { describe, it, expect } from 'vitest';
import { parseFilename } from '@/lib/ai/parser';

describe('Filename Parser', () => {
  it('should parse movie correctly', async () => {
    const result = await parseFilename('Inception.2010.1080p.BluRay.x264.mkv');
    expect(result.title).toBe('Inception');
    expect(result.year).toBe(2010);
  });
});
```

## 5. 贡献指南
1. Fork 本仓库。
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)。
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)。
4. 推送到分支 (`git push origin feature/AmazingFeature`)。
5. 提交 Pull Request。
