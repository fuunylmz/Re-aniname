# 测试计划与指南 (Test Plan & Guide)

**项目名称**: Re:Aniname  
**最后更新**: 2026-02-04

---

## 1. 测试策略概述

本项目的测试策略主要分为三个层级：
1.  **单元测试 (Unit Testing)**: 使用 Jest 测试核心算法 (后端) 和组件逻辑 (前端)。
2.  **集成测试 (Integration Testing)**: 使用 Supertest 测试 API 接口。
3.  **端到端测试 (E2E Testing)**: 使用 Cypress 或 Playwright 模拟用户在浏览器中的操作。

---

## 2. 测试环境准备

### 2.1 依赖安装
```bash
pnpm install
```

### 2.2 运行测试
- **单元/集成测试**:
    ```bash
    pnpm test         # 运行所有测试
    pnpm test:watch   # 监听模式
    ```
- **E2E 测试**:
    ```bash
    pnpm test:e2e
    ```

---

## 3. 核心算法测试用例 (Jest)

### 3.1 清洗器测试 (`cleaner.spec.ts`)
```typescript
describe('Cleaner', () => {
  it('should remove group tags', () => {
    const input = '[VCB-S] Toaru Kagaku no Railgun T [Ma10p_1080p].mkv';
    const output = cleanFilename(input);
    expect(output).toBe('Toaru Kagaku no Railgun T');
  });
});
```

### 3.2 任务类型判断 (`detector.spec.ts`)
```typescript
describe('MediaTypeDetector', () => {
  it('should detect TV show', () => {
    expect(detectType('Title S01E01')).toBe('TV');
  });
  
  it('should detect Movie', () => {
    expect(detectType('Avatar 2009')).toBe('MOVIE');
  });
});
```

---

## 4. API 接口测试 (Supertest)

```typescript
describe('POST /api/v1/tasks', () => {
  it('should create a new task', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .send({ path: '/tmp/test', isAnime: true });
    
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });
});
```

---

## 5. 自动化测试流程 (CI/CD)

项目配置 GitHub Actions 进行自动化测试。

`.github/workflows/test.yml`:
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: pnpm install
      - run: pnpm test
```

---

## 6. AI 识别能力测试

专门的测试脚本 `scripts/test-ai.ts` 用于评估 LLM 的表现。

```bash
ts-node scripts/test-ai.ts --provider openai --case ./test-cases/complex-season.json
```
