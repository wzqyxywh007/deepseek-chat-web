## Context

纯前端项目，Vite + Vue3 + TypeScript 构建，部署到 GitHub Pages。无后端，数据全部存 `localStorage`。浏览器直接调用 DeepSeek API，通过 SSE（Server-Sent Events）接收流式响应。

**约束条件**：
- API Key 只存在 `localStorage`，不能出现在源码中
- 流式输出使用 `fetch` + `ReadableStream`（不用 axios，因为 axios 不原生支持 SSE 流）
- 移动端侧边栏用抽屉（drawer）交互
- 深度思考的 `reasoning_content` 和正式回答 `content` 要在 UI 上明确区分

## Goals / Non-Goals

**Goals:**
- 搭建完整的对话界面，支持多会话管理
- 流式接收并渲染 AI 回复（包含思考链）
- Markdown + 代码高亮 + 数学公式正确渲染
- API Key 安全管理（用户自输入，存 localStorage）
- 响应式布局，兼容移动端
- 暗黑模式

**Non-Goals:**
- 不做后端
- 不做用户系统
- 不做文件上传

## Decisions

### 1. 项目结构

```
deepseek-chat-web/
├── src/
│   ├── api/
│   │   └── deepseek.ts        # DeepSeek API 调用（fetch + SSE）
│   ├── components/
│   │   ├── ChatInput.vue      # 底部输入框
│   │   ├── ChatMessage.vue    # 单条消息气泡
│   │   ├── MessageList.vue    # 消息列表滚动区域
│   │   ├── ReasoningBlock.vue # 思考链折叠面板
│   │   ├── Sidebar.vue        # 会话列表侧边栏
│   │   └── SettingsModal.vue  # 设置弹窗（API Key + 模型切换）
│   ├── stores/
│   │   ├── chat.ts            # Pinia：会话列表、消息、发送逻辑
│   │   └── settings.ts        # Pinia：API Key、模型、主题
│   ├── types/
│   │   └── index.ts           # Message、Session、Model 等类型定义
│   ├── utils/
│   │   └── storage.ts         # localStorage 封装
│   ├── App.vue
│   └── main.ts
├── index.html
├── vite.config.ts
└── package.json
```

### 2. 数据结构

```typescript
// 消息
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string              // 正式回答
  reasoningContent?: string    // 思考链（仅 reasoner 模型有）
  isStreaming?: boolean        // 是否正在流式输出中
  createdAt: number
}

// 会话
interface Session {
  id: string
  title: string                // 取第一条用户消息的前 20 字
  messages: Message[]
  createdAt: number
  updatedAt: number
}

// 设置
interface Settings {
  apiKey: string
  model: 'deepseek-reasoner' | 'deepseek-chat'
  theme: 'light' | 'dark' | 'system'
}
```

### 3. SSE 流式请求实现

不用 axios，直接用原生 `fetch`：

```typescript
// src/api/deepseek.ts
export async function streamChat(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
  onReasoning: (delta: string) => void,
  onContent: (delta: string) => void,
  onDone: () => void
) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  })

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '))
    
    for (const line of lines) {
      const data = line.slice(6)
      if (data === '[DONE]') { onDone(); return }
      
      const parsed = JSON.parse(data)
      const delta = parsed.choices[0]?.delta
      if (delta?.reasoning_content) onReasoning(delta.reasoning_content)
      if (delta?.content) onContent(delta.content)
    }
  }
}
```

### 4. Pinia Store 设计

**`settings.ts`**：
- state: `{ apiKey, model, theme }`
- 初始化时从 `localStorage` 读取
- 修改时自动同步写入 `localStorage`
- `hasApiKey` computed：判断是否已配置 Key

**`chat.ts`**：
- state: `{ sessions: Session[], currentSessionId }`
- 初始化时从 `localStorage` 加载
- 变更时自动 `watch` 写回 `localStorage`
- actions: `createSession`, `deleteSession`, `sendMessage`, `abortStream`

### 5. UI 布局

```
┌─────────────────────────────────────────────────────┐
│  ┌──────────┐  ┌───────────────────────────────┐   │
│  │          │  │  顶部栏：会话标题 + 设置按钮    │   │
│  │  侧边栏  │  ├───────────────────────────────┤   │
│  │          │  │                               │   │
│  │ 会话列表 │  │     消息列表区域               │   │
│  │          │  │  （用户气泡 / AI气泡）         │   │
│  │ [新建]   │  │  思考链折叠面板在AI气泡上方    │   │
│  │          │  │                               │   │
│  │          │  ├───────────────────────────────┤   │
│  │          │  │  底部输入框 + 发送按钮         │   │
│  └──────────┘  └───────────────────────────────┘   │
└─────────────────────────────────────────────────────┘

移动端：侧边栏收起，左上角汉堡按钮展开为 Drawer
```

### 6. 思考链展示

`ReasoningBlock.vue` 组件：
- 默认折叠，标题为"深度思考"（附思考时长）
- 流式输出期间自动展开，显示实时思考内容
- 完成后自动折叠，用户可手动展开查看
- 样式：淡蓝色背景区分于正式回答，左侧带竖线装饰

### 7. Markdown 渲染

使用 `markdown-it` + `highlight.js` + `katex`：
- 代码块：语法高亮 + 一键复制按钮
- 数学公式：行内 `$...$` 和块级 `$$...$$` 均支持
- XSS 防护：`markdown-it` 默认转义 HTML

### 8. 主题切换

使用 CSS 变量实现，在 `html` 元素上切换 `data-theme="dark"` 属性：

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
  /* ... */
}
[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --text-primary: #f0f0f0;
}
```

### 9. GitHub Pages 部署

`vite.config.ts` 设置 `base: '/deepseek-chat-web/'`（对应 GitHub 仓库名），构建产物放 `dist/`，通过 GitHub Actions 自动部署。

## Implementation Notes

1. `fetch` SSE 在部分旧浏览器需要注意兼容性，Vite 构建目标设为 `es2020+` 即可覆盖主流浏览器
2. `localStorage` 有容量限制（约 5MB），会话历史过多时需提示用户清理
3. 首次打开无 API Key 时，直接弹出设置弹窗引导配置，不进入对话界面
4. 流式输出中断（用户关闭页面/切换会话）需调用 `reader.cancel()` 避免内存泄漏
