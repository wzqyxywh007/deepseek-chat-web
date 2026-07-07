## 1. 项目初始化

- [x] 1.1 用 Vite 创建 Vue3 + TypeScript 项目（`npm create vite@latest deepseek-chat-web -- --template vue-ts`）
- [x] 1.2 安装依赖：`pinia`、`axios`、`markdown-it`、`highlight.js`、`katex`、`@types/markdown-it`
- [x] 1.3 配置 `vite.config.ts`：设置 `base: '/deepseek-chat-web/'`，配置路径别名 `@`
- [x] 1.4 在 `main.ts` 中注册 Pinia
- [x] 1.5 创建 `src/types/index.ts`，定义 `Message`、`Session`、`Settings`、`ChatMessage` 类型
- [x] 1.6 创建 `src/utils/storage.ts`，封装 localStorage 的 `get`/`set`/`remove` 工具函数

## 2. 全局样式与主题

- [x] 2.1 在 `src/assets/` 下创建 `variables.css`，定义亮色/暗色 CSS 变量（背景色、文字色、气泡色、边框色等）
- [x] 2.2 在 `src/assets/` 下创建 `global.css`，设置 reset、滚动条样式、基础布局
- [x] 2.3 在 `App.vue` 中引入全局样式，实现 `data-theme` 属性切换逻辑（跟随系统 + 手动切换）

## 3. Pinia Store

- [x] 3.1 创建 `src/stores/settings.ts`：state 包含 `apiKey`、`model`、`theme`；初始化时从 localStorage 读取；修改时自动写回；暴露 `hasApiKey` computed
- [x] 3.2 创建 `src/stores/chat.ts`：state 包含 `sessions`、`currentSessionId`；初始化时从 localStorage 加载；使用 `watch` 深监听自动持久化
- [x] 3.3 在 `chat.ts` 中实现 `createSession` action：生成新会话，切换为当前会话
- [x] 3.4 在 `chat.ts` 中实现 `deleteSession` action：删除会话，若删当前则切换到最近一条
- [x] 3.5 在 `chat.ts` 中实现 `renameSession` action：更新会话标题
- [x] 3.6 在 `chat.ts` 中暴露 `currentSession` computed：返回当前会话对象

## 4. DeepSeek API 层

- [x] 4.1 创建 `src/api/deepseek.ts`，实现 `streamChat` 函数：使用 `fetch` + `ReadableStream` 解析 SSE
- [x] 4.2 在 `streamChat` 中分别回调 `onReasoning(delta)`、`onContent(delta)`、`onDone()`、`onError(err)`
- [x] 4.3 返回 `AbortController`，供外部调用 `.abort()` 中断流式请求
- [x] 4.4 在 `chat.ts` 中实现 `sendMessage` action：追加用户消息 → 创建空 AI 消息（isStreaming: true）→ 调用 `streamChat` 流式填充 → 完成后设 isStreaming: false

## 5. Markdown 渲染工具

- [x] 5.1 创建 `src/utils/markdown.ts`，初始化 `markdown-it` 实例，集成 `highlight.js`（代码高亮）
- [x] 5.2 配置 `markdown-it` 支持 KaTeX 数学公式（行内 `$` 和块级 `$$`）
- [x] 5.3 为代码块注入"复制"按钮的 HTML，在组件中通过事件委托绑定复制逻辑

## 6. 组件开发

### 6.1 SettingsModal.vue（设置弹窗）

- [x] 6.1.1 创建模态框组件，包含 API Key 输入框（password 类型，可切换显示）
- [x] 6.1.2 添加模型切换下拉框：`deepseek-reasoner`（深度思考）/ `deepseek-chat`（快速）
- [x] 6.1.3 添加主题切换（跟随系统 / 亮色 / 暗色）
- [x] 6.1.4 保存时写入 settings store，取消时不修改

### 6.2 Sidebar.vue（侧边栏）

- [x] 6.2.1 创建侧边栏组件，顶部放"新建对话"按钮
- [x] 6.2.2 渲染会话列表，当前会话高亮
- [x] 6.2.3 每个会话项支持：点击切换、长按/右键重命名、删除按钮
- [x] 6.2.4 移动端以抽屉（Drawer）形式展示，通过 `v-if` + CSS transition 实现

### 6.3 ReasoningBlock.vue（思考链面板）

- [x] 6.3.1 创建折叠面板组件，接收 `reasoning`（string）和 `isStreaming`（boolean）prop
- [x] 6.3.2 流式输出中自动展开；完成后自动折叠（watch `isStreaming` 变化）
- [x] 6.3.3 标题显示"深度思考"及思考时长（秒数，完成后停止计时）
- [x] 6.3.4 内容区样式：淡蓝色背景，左侧 3px 蓝色竖线，字号略小于正文

### 6.4 ChatMessage.vue（消息气泡）

- [x] 6.4.1 创建消息组件，接收 `message: Message` prop
- [x] 6.4.2 用户消息：右对齐，深色气泡，纯文本
- [x] 6.4.3 AI 消息：左对齐，白色/暗灰气泡，渲染 Markdown
- [x] 6.4.4 AI 消息上方（有 reasoning 时）插入 `ReasoningBlock` 组件
- [x] 6.4.5 流式输出中显示光标闪烁动画（CSS `::after` 伪元素）

### 6.5 MessageList.vue（消息列表）

- [x] 6.5.1 创建消息列表容器，遍历渲染 `ChatMessage`
- [x] 6.5.2 新消息追加时自动滚动到底部（`watch` + `nextTick` + `scrollIntoView`）
- [x] 6.5.3 无消息时显示欢迎引导文案（居中，列出几个示例问题）

### 6.6 ChatInput.vue（输入框）

- [x] 6.6.1 创建底部输入组件，`textarea` 自动增高（最多 6 行）
- [x] 6.6.2 Enter 发送，Shift+Enter 换行
- [x] 6.6.3 流式输出中发送按钮变为"停止"按钮，点击调用 abort
- [x] 6.6.4 无 API Key 时禁用输入，提示"请先在设置中配置 API Key"

## 7. App.vue 组装

- [x] 7.1 在 `App.vue` 中组合 `Sidebar` + 主内容区（`MessageList` + `ChatInput`）
- [x] 7.2 实现顶部栏：展示当前会话标题 + 右上角设置按钮（齿轮图标）
- [x] 7.3 移动端汉堡菜单按钮控制 Sidebar 抽屉的显示/隐藏
- [x] 7.4 首次打开无 API Key 时，自动弹出 `SettingsModal`

## 8. GitHub Pages 部署配置

- [x] 8.1 创建 `.github/workflows/deploy.yml`，配置 GitHub Actions：push to main → `npm run build` → 部署 `dist/` 到 `gh-pages` 分支
- [x] 8.2 创建 `README.md`，说明项目功能、本地运行步骤、API Key 配置方式
- [x] 8.3 创建 `.gitignore`，排除 `node_modules`、`dist`、`.env` 等

## 9. 收尾与测试

- [ ] 9.1 测试 API Key 未填写时的引导流程
- [ ] 9.2 测试流式输出正常显示，思考链折叠/展开正常
- [ ] 9.3 测试 Markdown 代码块、数学公式渲染正确
- [ ] 9.4 测试移动端（375px 宽）布局正常，侧边栏抽屉可用
- [ ] 9.5 测试暗黑模式切换正常
- [ ] 9.6 测试多会话创建、切换、删除逻辑正确，刷新后数据持久化
