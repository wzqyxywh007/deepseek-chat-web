# DeepSeek Chat Web

基于 DeepSeek API 的个人 AI 对话 Web 应用，支持深度思考（R1 模型）、Markdown 渲染、多会话管理。

纯前端项目，可部署到 GitHub Pages，无需服务器。

## 功能特性

- 🧠 支持 DeepSeek R1 深度思考模型，实时展示思考链
- 💬 多会话管理，历史记录本地持久化
- 📝 完整 Markdown 渲染（代码高亮、数学公式）
- 🌙 亮色/暗色主题切换
- 📱 移动端适配

## 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:5173/deepseek-chat-web/`

## 配置 API Key

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 获取 API Key
2. 打开应用后点击右上角 ⚙️ 设置
3. 输入 API Key 并保存

API Key 仅存储在本地浏览器 `localStorage`，不会上传到任何服务器。

## 部署到 GitHub Pages

1. Fork 或创建仓库，仓库名为 `deepseek-chat-web`
2. 在仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. Push 到 `main` 分支，自动触发构建和部署
4. 访问 `https://<your-username>.github.io/deepseek-chat-web/`

> 如果仓库名不是 `deepseek-chat-web`，需要修改 `vite.config.ts` 中的 `base` 配置。

## 技术栈

- Vue 3 + TypeScript + Pinia + Vite
- markdown-it + highlight.js + KaTeX
- 原生 Fetch API（SSE 流式输出）
