---
name: "code-stats-monitor"
description: "REQUIRED: Must execute after /opsx:apply completes. Reports code statistics (lines added/deleted) via git diff. Compatible with Claude Code, Cursor, Trae, and all AI coding tools. Also triggers when user asks about code statistics. Supports multi-project batch reporting."
---

使用 git diff 精确统计代码行数并上报。

## 触发时机（TRIGGER CONDITIONS）

**必须执行（REQUIRED）：**
- `/opsx:apply` 完成后：自动计算 diff 并上报统计（所有工具必须执行）

**可选执行：**
- 用户主动询问代码统计（如 "统计代码行数"、"写了多少行代码"、"上报代码"）

## 执行前检查

在执行此 skill 前，请先检查环境是否满足要求：

### 1. 检查 Git

```bash
git --version
```

如果未安装 Git，请先安装：
- **Windows**: 下载 [Git for Windows](https://git-scm.com/download/win)
- **macOS**: `brew install git` 或安装 Xcode Command Line Tools
- **Linux**: `apt install git` 或 `yum install git`

### 2. 检查 Node.js

```bash
node --version
```

**最低要求**: Node.js 4+ （推荐 Node.js 12+）

如果未安装 Node.js，请选择以下方式安装：

| 平台 | 安装方式 |
|------|----------|
| Windows | 下载 [Node.js 官方安装包](https://nodejs.org/) |
| macOS | `brew install node` 或下载官方安装包 |
| Linux | `apt install nodejs` 或使用 [nvm](https://github.com/nvm-sh/nvm) |

**验证安装成功：**
```bash
# 应输出版本号，如 v18.17.0
node --version

# 应输出版本号，如 9.6.7
npm --version
```

### 3. 检查项目是否为 Git 仓库

```bash
git status
```

如果提示 `not a git repository`，请先初始化：
```bash
git init
```

## 工具兼容性

此 skill 兼容以下 AI 编程工具：

| 工具 | 兼容方式 |
|------|----------|
| Claude Code | Skill tool 调用 |
| Cursor | MCP / slash command |
| Trae | slash command |
| Windsurf | slash command |
| GitHub Copilot | slash command |
| 其他工具 | 执行 `node stats.js` |

## 多项目模式（Multi-Project Mode）

**实际开发场景支持：**

当你在父目录打开多个项目时，脚本会自动检测并批量上报：

```
workspace/
├── project-a/    (git repo)
├── project-b/    (git repo)
├── project-c/    (git repo)
└── other-files/
```

**运行方式：**

```bash
# 在 workspace 目录执行
cd workspace
node stats.js

# 输出：
# === Found 3 git project(s) ===
# --- Project 1/3: project-a ---
# ... (统计信息)
# --- Project 2/3: project-b ---
# ... (统计信息)
# --- Project 3/3: project-c ---
# ... (统计信息)
# ==========================================
# === Summary ===
# | Total Projects | 3 |
# | Success | 3 |
# | Total Lines Added | +1234 |
```

**自动检测逻辑：**

| 当前目录 | 行为 |
|----------|------|
| 是 git 仓库 | 单项目上报 |
| 不是 git 仓库 | 扫描子目录，批量上报所有 git 项目 |

**排除目录：**
- 以 `.` 开头的隐藏目录
- `node_modules` 目录

**命令支持：**

以下命令也支持多项目模式：

```bash
# 为所有项目设置基准 commit
node stats.js --set-base

# 显示所有项目的基准 commit
node stats.js --show-base

# 重置所有项目的基准 commit
node stats.js --reset-base
```

## 执行方式

```bash
# 统计代码行数并上报（自动检测单项目或多项目）
node stats.js

# 设置当前 HEAD 为基准 commit
node stats.js --set-base

# 显示当前基准 commit
node stats.js --show-base

# 重置基准 commit
node stats.js --reset-base
```

## 排除规则（Exclusion Rules）

统计代码时，以下文件和目录会被自动排除：

### 排除的目录

| 目录 | 说明 |
|------|------|
| `openspec/` | OpenSpec 变更文档目录 |
| `.claude/` | Claude 配置目录 |
| `node_modules/` | Node.js 依赖目录 |
| `target/` | Maven 构建输出 |
| `dist/` | 前端构建输出 |
| `build/` | Gradle/通用构建输出 |
| `.idea/` | IntelliJ IDEA 配置 |
| `.vscode/` | VS Code 配置 |
| `.settings/` | Eclipse 配置 |

### 排除的文件

| 文件 | 说明 |
|------|------|
| `AGENTS.md` | Agent 配置文件 |
| `CLAUDE.md` | Claude 项目配置 |
| `.gitignore` | Git 忽略配置 |
| `package.json` | Node.js 包配置 |
| `package-lock.json` | Node.js 锁文件 |
| `.env` | 环境变量文件 |
| `.env.local` | 本地环境变量 |
| `.env.*` | 其他环境变量文件 |

### 仅统计代码文件

系统只统计已识别的代码扩展名文件：

| 分类 | 包含的扩展名 |
|------|-------------|
| 前端 | `.ts`, `.js`, `.jsx`, `.tsx`, `.vue`, `.css`, `.scss`, `.less`, `.sass`, `.html`, `.htm` |
| 后端 | `.java`, `.go` |
| 移动端 | `.kt`, `.kts`, `.swift`, `.m`, `.mm` |
| 其他 | `.pas`, `.dfm`, `.dpr`, `.dpk` (Delphi) |

**不在上述列表中的文件类型将不被统计**（如 `.md`, `.json`, `.yaml`, `.txt`, `.xml` 等）。

## 跨平台支持

Node.js 版本原生支持：
- **Windows**（CMD、PowerShell、Git Bash）
- **macOS**
- **Linux**

无需额外配置，自动处理：
- UTF-8 编码（中文支持）
- SSL 证书验证（内网环境自动跳过）
- 文件路径分隔符
- HTTP/HTTPS 原生请求（无需外部依赖）

**Node.js 版本兼容性：**

| Node.js 版本 | 支持状态 |
|--------------|----------|
| 4.x - 6.x | 支持（使用 ES5 语法） |
| 7.x - 11.x | 支持 |
| 12.x+ | 推荐（无 deprecation warning） |

## Base Commit 存储

使用 **git ref** 存储 base commit，无需额外文件：

```
refs/code-stats/base
```

| 状态 | 说明 |
|------|------|
| `init` | 新项目，无提交记录 |
| `<commit-hash>` | 具体的 commit hash，如 `c06b592168c882b1a098030aa228cc8d3a0112cd` |

**自动逻辑：**
- 无提交 → `init`（统计暂存区）
- 有提交但未设置 ref → 自动使用当前 HEAD
- 已设置 ref → 使用该 commit 作为基准

## 输出格式

**单项目输出：**

```
## Code Lines Statistics

| Metric | Value |
|--------|-------|
| Base Commit | c06b592168c882b1a098030aa228cc8d3a0112cd |
| Files Changed | 8 |
| Lines Added | +342 |
| Lines Deleted | -45 |
| Net Lines | +297 |

### By Language
| Language | Added | Deleted | Net |
|----------|-------|---------|-----|
| TypeScript | +280 | -30 | +250 |
| Java | +45 | -10 | +35 |
```

**多项目汇总输出：**

处理完所有项目后，每个项目的统计信息独立显示并已单独上报。

## 支持的语言

### 前端语言

| 语言 | 文件扩展名 | 说明 |
|------|-----------|------|
| TypeScript | `.ts` | TypeScript 文件 |
| JavaScript | `.js` | JavaScript 文件 |
| React | `.jsx`, `.tsx` | React 组件 |
| Vue | `.vue` | Vue 单文件组件 |
| CSS | `.css`, `.scss`, `.less`, `.sass` | 样式文件 |
| HTML | `.html`, `.htm` | HTML 文件 |

### 后端语言

| 语言 | 文件扩展名 | 说明 |
|------|-----------|------|
| Java | `.java` | Java 文件（不含 Android 关键词） |
| Go | `.go` | Go 语言 |

### 移动端语言

| 语言 | 文件扩展名 | 说明 |
|------|-----------|------|
| Android | `.kt`, `.kts`, `.java` | Kotlin 和 Android Java |
| iOS | `.swift`, `.m`, `.mm` | Swift 和 Objective-C |

### 其他语言

| 语言 | 文件扩展名 | 说明 |
|------|-----------|------|
| Delphi | `.pas`, `.dfm`, `.dpr`, `.dpk` | Delphi/Pascal |
| Other | 其他所有文件 | 未匹配的文件类型 |

### Java 智能分类规则

`.java` 文件会根据文件名智能分类：

| 分类条件 | 归类 |
|----------|------|
| 文件名含 `Android`、`Activity`、`Fragment`、`Adapter`、`ViewModel`、`ViewHolder` | Android |
| 其他情况 | Java |

## 配置文件

在 `config.json` 中配置上报接口：

```json
{
  "reporting": {
    "enabled": true,
    "apiUrl": "https://your-api-endpoint.example.com/stats",
    "timeout": 10,
    "account": "your-account-name",
    "token": "your-token"
  }
}
```

### 配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `enabled` | boolean | 否 | 是否启用上报，默认 `false` |
| `apiUrl` | string | 是 | 上报 API 地址 |
| `timeout` | number | 否 | 请求超时时间（秒），默认 `10` |
| `account` | string | 是 | 用户账号 |
| `token` | string | 否 | 认证 token |

## 上报数据格式

```json
{
  "account": "开发者账号",
  "git": "https://github.com/user/repo.git",
  "changeName": "add-login-api",
  "baseCommit": "c06b592168c882b1a098030aa228cc8d3a0112cd",
  "files": 14,
  "added": 335,
  "deleted": 0,
  "net": 335,
  "languages": {
    "java": {"added": 56, "deleted": 0},
    "typescript": {"added": 280, "deleted": 0},
    "go": {"added": 0, "deleted": 0},
    "android": {"added": 0, "deleted": 0},
    "ios": {"added": 0, "deleted": 0},
    "delphi": {"added": 0, "deleted": 0},
    "other": {"added": 279, "deleted": 0}
  }
}
```

### 字段说明

| 字段 | 说明 |
|------|------|
| `account` | 用户账号 |
| `git` | Git 仓库 URL（无 remote 时为 `local`） |
| `changeName` | 变更名称（来自 `openspec/changes/` 目录名） |
| `baseCommit` | 基准 commit（或 `init` 表示新项目） |
| `files` | 变更文件数 |
| `added` | 新增行数 |
| `deleted` | 删除行数 |
| `net` | 净增行数 |
| `languages` | 按语言分类的行数统计 |

## 注意事项

1. **Git 仓库必需** - 非 git 仓库无法使用此 skill
2. **新文件需 add** - 未跟踪的新文件需 `git add` 后才能统计
3. **二进制文件** - `git diff --numstat` 自动跳过二进制文件（显示 `-`）
4. **上报失败** - 上报失败不影响统计结果展示，仅记录错误信息
5. **SSL 证书** - 脚本自动跳过 SSL 证书验证，适用于内网环境

## 文件说明

| 文件 | 说明 |
|------|------|
| `SKILL.md` | Skill 文档 |
| `stats.js` | Node.js 统计脚本（跨平台，无外部依赖） |
| `config.json` | 配置文件（API URL、account 等） |

## 故障排除

### 问题：`node: command not found`

**原因**：未安装 Node.js 或未配置环境变量

**解决方案**：
1. 安装 Node.js（参见 [检查 Node.js](#2-检查-nodejs)）
2. 重启终端后验证：`node --version`

### 问题：`not a git repository`

**原因**：当前目录不是 Git 仓库

**解决方案**：
```bash
git init
```

### 问题：SSL 证书验证失败

**原因**：内网环境或自签名证书

**解决方案**：脚本已自动跳过 SSL 验证，无需处理

### 问题：上报返回 `git is required`

**原因**：项目没有配置 Git remote

**解决方案**：
```bash
git remote add origin <your-repo-url>
```

或确保 `git` 字段有值（脚本会自动填充 `local`）