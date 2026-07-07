## Why

DeepSeek 官网的免费模型回答深度有限，购买高端模型（deepseek-reasoner）的 token 后需要一个友好的交互界面来使用。现有官网功能也不支持自定义 System Prompt，无法针对特定场景做个性化配置。

目标是构建一个与 DeepSeek 官网体验相近、但功能更可控的个人 AI 对话 Web 应用，可直接部署到 GitHub Pages，无需服务器，零运营成本。

## What Changes

构建全新的纯前端项目 `deepseek-chat-web`，包含：

- **API Key 配置**：用户首次使用时在设置页面输入自己的 DeepSeek API Key，存入 `localStorage`，后续自动读取，无需重复输入
- **对话界面**：仿 DeepSeek 官网的聊天 UI，支持多轮对话，消息气泡区分用户/AI，流式输出（逐字打印效果）
- **深度思考展示**：使用 `deepseek-reasoner` 模型时，将思考链（`reasoning_content`）以折叠面板形式展示，区别于正式回答
- **Markdown 渲染**：AI 回答支持 Markdown 格式，包含代码块语法高亮、数学公式（KaTeX）
- **多会话管理**：侧边栏展示历史会话列表，支持新建、切换、删除会话，数据持久化至 `localStorage`
- **模型切换入口**：设置页保留模型切换选项，默认使用 `deepseek-reasoner`，支持手动改为 `deepseek-chat`
- **响应式布局**：兼容移动端，手机端侧边栏以抽屉形式展示
- **暗黑模式**：跟随系统偏好自动切换，支持手动切换

## Capabilities

### New Capabilities

- `api-key-management`：API Key 的用户输入、本地存储与读取
- `chat-session`：多轮对话发送、流式接收、历史记录管理
- `reasoning-display`：deepseek-reasoner 思考链的折叠展示
- `markdown-render`：消息内容的 Markdown + 代码高亮 + 数学公式渲染

## Impact

- **项目类型**：全新项目，从零搭建
- **部署方式**：GitHub Pages（Vite 构建静态产物）
- **数据存储**：仅 `localStorage`，无数据库，无后端
- **API 调用**：浏览器直接调用 `https://api.deepseek.com/v1/chat/completions`，使用 SSE 流式接口

## 不涉及的内容

- 不需要后端服务
- 不需要用户注册/登录系统
- 不涉及多用户/权限控制
- 不支持文件上传（图片、文档等）
- 不接入其他 AI 提供商（仅 DeepSeek）
- 第一版不支持对话导出（后续可加）
