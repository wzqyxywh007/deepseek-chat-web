#!/usr/bin/env node
/**
 * Code Stats Monitor - Node.js 版本
 * 跨平台兼容：Windows、macOS、Linux
 * 最低支持：Node.js 4+
 *
 * 支持多项目检测：
 * - 当前目录是 git 仓库：统计并上报当前项目
 * - 当前目录不是 git 仓库：扫描子目录，找出所有 git 项目并批量上报
 */

'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');
var childProcess = require('child_process');
var https = require('https');
var http = require('http');
var url = require('url');

var execSync = childProcess.execSync;

// 检测操作系统（win32 覆盖所有现代 Windows 版本：32/64位、Windows 10/11/Server）
var IS_WINDOWS = os.platform() === 'win32' || os.platform().startsWith('win');

// 跨平台执行命令（所有平台统一使用 shell: true 以确保命令正确解析）
function execCommand(cmd, options) {
    var defaultOptions = {
        encoding: 'utf-8',
        shell: true
    };
    // 合并选项
    var mergedOptions = {};
    for (var key in defaultOptions) {
        mergedOptions[key] = defaultOptions[key];
    }
    for (var key in options) {
        mergedOptions[key] = options[key];
    }
    return execSync(cmd, mergedOptions);
}

// 获取脚本所在目录
var SKILL_DIR = __dirname;

// Base commit ref
var BASE_REF = 'refs/code-stats/base';

// 当前工作目录
var CWD = process.cwd();

// 命令行参数处理
var args = process.argv.slice(2);
if (args.length > 0) {
    handleCommand(args[0]);
    process.exit(0);
}

// 主流程
main();

function main() {
    // 检测当前目录是否是 git 仓库
    var isGitRepo = isGitRepository(CWD);

    if (isGitRepo) {
        // 当前目录是 git 仓库，执行单项目上报
        console.log('=== Current directory is a git repository ===');
        console.log('');

        // 扫描子目录中的嵌套 git 仓库
        var nestedProjects = findNestedGitProjects(CWD);

        if (nestedProjects.length > 0) {
            // 有嵌套的 git 项目，先处理当前项目，再处理嵌套项目
            console.log('=== Found ' + nestedProjects.length + ' nested git project(s) ===');
            console.log('');

            // 使用异步队列处理：当前项目 + 嵌套项目
            var allProjects = [{ name: 'root', path: CWD, isRoot: true }];
            for (var i = 0; i < nestedProjects.length; i++) {
                allProjects.push(nestedProjects[i]);
            }
            processProjectQueue(allProjects, 0);
        } else {
            // 无嵌套项目，仅处理当前项目
            processSingleProject(CWD, null);
        }
    } else {
        // 当前目录不是 git 仓库，扫描子目录
        var gitProjects = findGitProjects(CWD);

        if (gitProjects.length === 0) {
            console.log('[WARN] No git repository found in current directory');
            console.log('');
            console.log('Please run this script in a git repository or a directory containing git repositories.');
            process.exit(1);
        }

        // 批量处理多个项目（逐个上报，无汇总）
        console.log('=== Found ' + gitProjects.length + ' git project(s) ===');
        console.log('');

        // 使用异步队列逐个处理项目（确保上一个完成后再处理下一个）
        processProjectQueue(gitProjects, 0);
    }
}

/**
 * 异步队列处理多个项目
 */
function processProjectQueue(projects, index) {
    if (index >= projects.length) {
        // 所有项目处理完成
        return;
    }

    var project = projects[index];
    var displayName = project.isRoot ? '(root)' : project.name;
    console.log('--- Project ' + (index + 1) + '/' + projects.length + ': ' + displayName + ' ---');
    console.log('');

    processSingleProject(project.path, function() {
        console.log('');
        // 处理下一个项目
        processProjectQueue(projects, index + 1);
    });
}

/**
 * 检测目录是否是 git 仓库（直接检查 .git，性能更优）
 */
function isGitRepository(dir) {
    var gitPath = path.join(dir, '.git');
    try {
        var stat = fs.statSync(gitPath);
        // .git 可以是目录（标准仓库）或文件（worktree/submodule）
        return stat.isDirectory() || stat.isFile();
    } catch (e) {
        return false;
    }
}

/**
 * 查找目录下的所有 git 项目
 */
function findGitProjects(dir) {
    var projects = [];

    try {
        var entries = fs.readdirSync(dir);

        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var fullPath = path.join(dir, entry);

            // 跳过隐藏目录（以.开头）和 node_modules
            if (entry.charAt(0) === '.' || entry === 'node_modules') {
                continue;
            }

            try {
                var stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    // 检查是否是 git 仓库
                    if (isGitRepository(fullPath)) {
                        projects.push({
                            name: entry,
                            path: fullPath
                        });
                    }
                }
            } catch (e) {
                // 忽略无法访问的目录
            }
        }
    } catch (e) {
        // 忽略错误
    }

    // 按名称排序
    projects.sort(function(a, b) {
        return a.name.localeCompare(b.name);
    });

    return projects;
}

/**
 * 查找嵌套的 git 项目（当前目录是 git 仓库时，查找子目录中独立的 git 仓库）
 * 只查找 .git 是目录的情况（真正的独立仓库），排除 submodule/worktree（.git 是文件）
 */
function findNestedGitProjects(dir) {
    var projects = [];

    try {
        var entries = fs.readdirSync(dir);

        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            var fullPath = path.join(dir, entry);

            // 跳过隐藏目录（以.开头）和 node_modules
            if (entry.charAt(0) === '.' || entry === 'node_modules') {
                continue;
            }

            try {
                var stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    // 检查是否是独立的 git 仓库（.git 是目录，不是文件）
                    var gitPath = path.join(fullPath, '.git');
                    try {
                        var gitStat = fs.statSync(gitPath);
                        // 只有 .git 是目录才算独立仓库（排除 submodule/worktree）
                        if (gitStat.isDirectory()) {
                            projects.push({
                                name: entry,
                                path: fullPath,
                                isRoot: false
                            });
                        }
                    } catch (e) {
                        // 没有 .git，跳过
                    }
                }
            } catch (e) {
                // 忽略无法访问的目录
            }
        }
    } catch (e) {
        // 忽略错误
    }

    // 按名称排序
    projects.sort(function(a, b) {
        return a.name.localeCompare(b.name);
    });

    return projects;
}

/**
 * 处理单个项目
 */
function processSingleProject(projectPath, doneCallback) {
    try {
        // 切换到项目目录
        var originalDir = process.cwd();
        process.chdir(projectPath);

        // 读取基准 commit
        var base = getBaseCommit();

        // 读取配置
        var config = readConfig();

        // 获取 git URL
        var gitUrl = getGitUrl();

        // 获取 git 用户名
        var gitUser = getGitUser();

        // 获取变更名称
        var changeName = getChangeName();

        // 获取 diff 统计
        var stats = getDiffStats(base);

        // 输出报告
        printReport(base, stats);

        // 远程上报（无变更则跳过）
        if (stats.files === 0) {
            console.log('[INFO] No code changes, skipping remote reporting');
            // 切回原目录并通知完成
            process.chdir(originalDir);
            if (doneCallback) doneCallback();
        } else if (config.enabled && config.apiUrl) {
            // 等待上报完成后再切回原目录
            reportToRemote(config, gitUrl, gitUser, changeName, base, stats, function(success) {
                process.chdir(originalDir);
                if (doneCallback) doneCallback();
            });
        } else {
            console.log('[INFO] Reporting is disabled or no API URL configured');
            // 切回原目录并通知完成
            process.chdir(originalDir);
            if (doneCallback) doneCallback();
        }

    } catch (e) {
        console.log('[ERROR] Failed to process project: ' + e.message);
        if (doneCallback) doneCallback();
    }
}

function handleCommand(cmd) {
    // 检测当前目录是否是 git 仓库
    if (!isGitRepository(CWD)) {
        var gitProjects = findGitProjects(CWD);
        if (gitProjects.length === 0) {
            console.log('[ERROR] No git repository found');
            process.exit(1);
        }

        // 对每个项目执行命令
        console.log('Executing command for ' + gitProjects.length + ' project(s)...');
        console.log('');

        for (var i = 0; i < gitProjects.length; i++) {
            var project = gitProjects[i];
            console.log('--- ' + project.name + ' ---');

            process.chdir(project.path);
            handleSingleCommand(cmd);
            process.chdir(CWD);

            console.log('');
        }
        return;
    }

    // 当前目录是 git 仓库
    handleSingleCommand(cmd);
}

function handleSingleCommand(cmd) {
    switch (cmd) {
        case '--set-base':
            if (hasCommits()) {
                var hash = execCommand('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
                execCommand('git update-ref ' + BASE_REF + ' HEAD');
                console.log('[OK] Base commit set to: ' + hash);
            } else {
                console.log('[ERROR] No commits yet, cannot set base');
            }
            break;
        case '--reset-base':
            try {
                execCommand('git update-ref -d ' + BASE_REF, { stdio: 'pipe' });
            } catch (e) {}
            console.log('[OK] Base commit reset');
            break;
        case '--show-base':
            try {
                var base = execCommand('git rev-parse ' + BASE_REF, { encoding: 'utf-8' }).trim();
                console.log('Base commit: ' + base);
            } catch (e) {
                console.log('Base commit: init (no commits yet)');
            }
            break;
        case '--help':
        case '-h':
            printHelp();
            break;
        default:
            console.log('[ERROR] Unknown command: ' + cmd);
            console.log('');
            printHelp();
            process.exit(1);
    }
}

function printHelp() {
    console.log('Usage: node stats.js [command]');
    console.log('');
    console.log('Commands:');
    console.log('  (no command)  Statistics and report for all git projects in current directory');
    console.log('  --set-base    Set current HEAD as base commit for all projects');
    console.log('  --show-base   Show current base commit for all projects');
    console.log('  --reset-base  Reset base commit for all projects');
    console.log('  --help, -h    Show this help message');
    console.log('');
    console.log('Multi-project mode:');
    console.log('  If current directory is not a git repository, the script will');
    console.log('  automatically scan subdirectories and process all git projects found.');
}

function getGitRoot() {
    try {
        return execCommand('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    } catch (e) {
        return '.';
    }
}

function hasCommits() {
    try {
        execCommand('git rev-parse HEAD', { stdio: 'pipe' });
        return true;
    } catch (e) {
        return false;
    }
}

function getBaseCommit() {
    try {
        return execCommand('git rev-parse ' + BASE_REF, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch (e) {
        if (hasCommits()) {
            return execCommand('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
        }
        return 'init';
    }
}

function readConfig() {
    var configPath = path.join(SKILL_DIR, 'config.json');
    var defaultConfig = {
        enabled: false,
        apiUrl: '',
        account: 'unknown',
        token: '',
        timeout: 10
    };

    try {
        var content = fs.readFileSync(configPath, 'utf-8');
        var config = JSON.parse(content);
        // 合并配置（兼容低版本 Node.js）
        var result = {};
        var key;
        for (key in defaultConfig) {
            result[key] = defaultConfig[key];
        }
        if (config.reporting) {
            for (key in config.reporting) {
                result[key] = config.reporting[key];
            }
        }
        return result;
    } catch (e) {
        return defaultConfig;
    }
}

function getGitUrl() {
    try {
        var gitUrl = execCommand('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
        return gitUrl || 'local';
    } catch (e) {
        return 'local';
    }
}

function getGitUser() {
    try {
        var user = execCommand('git config --get user.name', { encoding: 'utf-8' }).trim();
        return user || 'unknown';
    } catch (e) {
        return 'unknown';
    }
}

function getChangeName() {
    var gitRoot = getGitRoot();
    var changesDir = path.join(gitRoot, 'openspec', 'changes');
    try {
        var entries = fs.readdirSync(changesDir);
        var dirs = [];
        for (var i = 0; i < entries.length; i++) {
            var entryPath = path.join(changesDir, entries[i]);
            try {
                var stat = fs.statSync(entryPath);
                if (stat.isDirectory()) {
                    dirs.push(entries[i]);
                }
            } catch (e) {}
        }
        return dirs.length > 0 ? dirs[0] : 'unknown';
    } catch (e) {
        return 'unknown';
    }
}

function getDiffStats(base) {
    // 添加所有文件到暂存区
    var addResult = '';
    try {
        addResult = execCommand('git add -A', { encoding: 'utf-8', stdio: 'pipe' });
    } catch (e) {
        // Windows 下可能需要显式设置 shell
        try {
            addResult = execCommand('git add -A', { encoding: 'utf-8', shell: true });
        } catch (e2) {
            console.log('[WARN] git add -A failed: ' + e2.message);
        }
    }

    // 获取 diff 输出
    var diffOutput;
    try {
        if (base === 'init' || base === 'staged') {
            diffOutput = execCommand('git diff --cached --numstat', { encoding: 'utf-8' });
        } else {
            // Windows 下引号包裹 commit hash 以防特殊字符问题
            diffOutput = execCommand('git diff --numstat "' + base + '"', { encoding: 'utf-8' });
        }
    } catch (e) {
        console.log('[WARN] git diff failed: ' + e.message);
        diffOutput = '';
    }

    // 调试输出（帮助排查问题）
    if (process.env.DEBUG_STATS) {
        console.log('[DEBUG] base: ' + base);
        console.log('[DEBUG] diffOutput length: ' + diffOutput.length);
        console.log('[DEBUG] diffOutput first 500 chars: ' + diffOutput.substring(0, 500));
    }

    // 初始化统计
    var stats = {
        files: 0,
        added: 0,
        deleted: 0,
        languages: {
            java: { added: 0, deleted: 0 },
            typescript: { added: 0, deleted: 0 },
            javascript: { added: 0, deleted: 0 },
            vue: { added: 0, deleted: 0 },
            react: { added: 0, deleted: 0 },
            css: { added: 0, deleted: 0 },
            html: { added: 0, deleted: 0 },
            go: { added: 0, deleted: 0 },
            android: { added: 0, deleted: 0 },
            ios: { added: 0, deleted: 0 },
            delphi: { added: 0, deleted: 0 },
            other: { added: 0, deleted: 0 }
        }
    };

    // 解析 diff 输出（兼容 Windows \r\n 换行符）
    var lines = diffOutput.trim().split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line) continue;

        var parts = line.split('\t');
        if (parts.length < 3) continue;

        var added = parts[0];
        var deleted = parts[1];
        var filename = parts[2].replace(/\r/g, ''); // 移除可能的 \r

        // 处理 git diff 输出中的路径前缀（a/ 或 b/）
        // git diff --numstat 输出格式可能是:
        // - "added deleted filename"（普通情况）
        // - "added deleted a/filename b/filename"（重命名/复制情况）
        // 我们取最后一个文件名，并去掉 a/ 或 b/ 前缀
        if (parts.length >= 4) {
            // 重命名情况：取新文件名（第4个字段）
            filename = parts[3].replace(/\r/g, '');
        }
        // 去掉 a/ 或 b/ 前缀
        if (filename.indexOf('a/') === 0 || filename.indexOf('b/') === 0) {
            filename = filename.substring(2);
        }

        // 对于新文件，git 可能显示 "- - filename"，需要单独统计行数
        if (added === '-' || deleted === '-') {
            // 尝试获取新文件的实际行数
            try {
                var fileContent = fs.readFileSync(filename, 'utf-8');
                var fileLines = fileContent.split(/\r?\n/).length;
                added = fileLines.toString();
                deleted = '0';
            } catch (e) {
                // 无法读取文件，可能是二进制文件或已删除
                if (process.env.DEBUG_STATS) {
                    console.log('[DEBUG] Skipping file (binary or unreadable): ' + filename);
                }
                continue;
            }
        }

        // 跳过 openspec 目录下的文件
        if (filename.indexOf('openspec/') === 0 || filename.indexOf('openspec\\') === 0) continue;

        // 跳过 .claude 目录下的文件
        if (filename.indexOf('.claude/') === 0 || filename.indexOf('.claude\\') === 0) continue;

        // 跳过构建输出和依赖目录
        var excludeDirs = [
            // Node.js
            'node_modules/', 'node_modules\\',
            // Java/Maven/Gradle
            'target/', 'target\\',
            '.gradle/', '.gradle\\',
            // 前端构建
            'dist/', 'dist\\',
            'build/', 'build\\',
            'out/', 'out\\',
            '.next/', '.next\\',
            '.nuxt/', '.nuxt\\',
            '.output/', '.output\\',
            // IDE 配置
            '.idea/', '.idea\\',
            '.vscode/', '.vscode\\',
            '.settings/', '.settings\\',
            // 版本控制
            '.git/', '.git\\',
            '.svn/', '.svn\\',
            // 依赖管理
            'vendor/', 'vendor\\',
            'Pods/', 'Pods\\',
            // 缓存目录
            '__pycache__/', '__pycache__\\',
            '.pytest_cache/', '.pytest_cache\\',
            '.cache/', '.cache\\',
            // 日志和临时文件
            'logs/', 'logs\\',
            'log/', 'log\\',
            'tmp/', 'tmp\\',
            'temp/', 'temp\\',
            // 编译输出
            'bin/', 'bin\\'
        ];
        var isExcludedDir = false;
        for (var j = 0; j < excludeDirs.length; j++) {
            if (filename.indexOf(excludeDirs[j]) === 0) {
                isExcludedDir = true;
                break;
            }
        }
        if (isExcludedDir) continue;

        // 跳过配置文件和文档
        var basename = path.basename(filename).toLowerCase();
        var excludeFiles = [
            // 配置文件
            '.gitignore', '.editorconfig', '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.eslintrc.yaml',
            '.prettierrc', '.prettierrc.js', '.prettierrc.json', '.prettierrc.yaml',
            '.env', '.env.local', '.env.development', '.env.production', '.env.test',
            // 文档文件
            'readme.md', 'changelog.md', 'license', 'license.md', 'contributing.md',
            // Agent 配置
            'agents.md', 'claude.md',
            // 构建配置
            'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
            'pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts',
            'makefile', 'dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
            // CI/CD
            '.gitlab-ci.yml', '.travis.yml', 'jenkinsfile', 'azure-pipelines.yml',
            // 测试配置
            'jest.config.js', 'jest.config.ts', 'jest.config.json', 'karma.conf.js',
            'pytest.ini', 'setup.cfg', 'tox.ini',
            // IDE 配置
            '.project', '.classpath'
        ];
        if (excludeFiles.indexOf(basename) >= 0) continue;

        // 获取文件扩展名
        var ext = path.extname(filename).toLowerCase().slice(1);

        // 跳过特定扩展名的配置文件
        var excludeExts = ['iml'];
        if (excludeExts.indexOf(ext) >= 0) continue;

        // 分类统计
        var langMap = {
            'ts': 'typescript',
            'js': 'javascript',
            'vue': 'vue',
            'jsx': 'react',
            'tsx': 'react',
            'css': 'css',
            'scss': 'css',
            'less': 'css',
            'sass': 'css',
            'html': 'html',
            'htm': 'html',
            'go': 'go',
            'kt': 'android',
            'kts': 'android',
            'swift': 'ios',
            'm': 'ios',
            'mm': 'ios',
            'pas': 'delphi',
            'dfm': 'delphi',
            'dpr': 'delphi',
            'dpk': 'delphi'
        };

        var lang = langMap[ext] || 'other';

        // Java 特殊处理：默认归类为 java，如果路径包含 Android 关键词则归类为 android
        if (ext === 'java') {
            lang = 'java';
            var lowerFile = filename.toLowerCase();
            if (lowerFile.indexOf('android') >= 0 ||
                lowerFile.indexOf('activity') >= 0 ||
                lowerFile.indexOf('fragment') >= 0 ||
                lowerFile.indexOf('adapter') >= 0 ||
                lowerFile.indexOf('viewmodel') >= 0 ||
                lowerFile.indexOf('viewholder') >= 0) {
                lang = 'android';
            }
        }

        // 跳过 other 类型（非代码文件）
        if (lang === 'other') continue;

        var addedNum = parseInt(added, 10) || 0;
        var deletedNum = parseInt(deleted, 10) || 0;

        stats.files++;
        stats.added += addedNum;
        stats.deleted += deletedNum;

        stats.languages[lang].added += addedNum;
        stats.languages[lang].deleted += deletedNum;
    }

    stats.net = stats.added - stats.deleted;
    return stats;
}

function printReport(base, stats) {
    console.log('## Code Lines Statistics');
    console.log('');
    console.log('| Metric | Value |');
    console.log('|--------|-------|');
    console.log('| Base Commit | ' + base + ' |');
    console.log('| Files Changed | ' + stats.files + ' |');
    console.log('| Lines Added | +' + stats.added + ' |');
    console.log('| Lines Deleted | -' + stats.deleted + ' |');
    console.log('| Net Lines | +' + stats.net + ' |');
    console.log('');
    console.log('### By Language');
    console.log('| Language | Added | Deleted | Net |');
    console.log('|----------|-------|---------|-----|');

    var langNames = {
        java: 'Java',
        typescript: 'TypeScript',
        javascript: 'JavaScript',
        vue: 'Vue',
        react: 'React',
        css: 'CSS',
        html: 'HTML',
        go: 'Go',
        android: 'Android',
        ios: 'iOS',
        delphi: 'Delphi',
        other: 'Other'
    };

    var langKeys = Object.keys(langNames);
    for (var i = 0; i < langKeys.length; i++) {
        var lang = langKeys[i];
        var name = langNames[lang];
        var l = stats.languages[lang];
        if (l.added > 0 || l.deleted > 0) {
            console.log('| ' + name + ' | +' + l.added + ' | -' + l.deleted + ' | +' + (l.added - l.deleted) + ' |');
        }
    }
}

// 中文 JSON 序列化（不转义 Unicode）
function stringifyWithChinese(obj) {
    return JSON.stringify(obj, null, 4);
}

// 解析 URL（兼容低版本 Node.js，消除 deprecation warning）
function parseUrl(apiUrl) {
    var nodeVersion = process.versions.node.split('.').map(function(v) { return parseInt(v, 10); });
    if (nodeVersion[0] >= 7) {
        try {
            var urlObj = new URL(apiUrl);
            return {
                protocol: urlObj.protocol,
                hostname: urlObj.hostname,
                port: urlObj.port,
                pathname: urlObj.pathname,
                search: urlObj.search
            };
        } catch (e) {}
    }
    return url.parse(apiUrl);
}

function reportToRemote(config, gitUrl, gitUser, changeName, base, stats, callback) {
    console.log('');
    console.log('==========================================');
    console.log('       Code Stats Report Result');
    console.log('==========================================');

    var payload = {
        account: gitUser,
        git: gitUrl || '',
        changeName: changeName,
        baseCommit: base,
        files: stats.files,
        added: stats.added,
        deleted: stats.deleted,
        net: stats.net,
        languages: stats.languages
    };

    var payloadStr = stringifyWithChinese(payload);
    var urlObj = parseUrl(config.apiUrl);
    var isHttps = urlObj.protocol === 'https:';
    var httpClient = isHttps ? https : http;

    var responseBody = '';
    var httpCode = 0;
    var isSuccess = false;
    var recordId = null;

    try {
        var options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + (urlObj.search || ''),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Content-Length': Buffer.byteLength(payloadStr, 'utf8'),
                'X-CoderTools-Openspec-Stat-Token': config.token || '',
                'token': config.token || ''
            },
            timeout: (config.timeout || 10) * 1000
        };

        // HTTPS 跳过证书验证（Windows 内网环境常见）
        if (isHttps) {
            options.rejectUnauthorized = false;
        }

        var req = httpClient.request(options, function(res) {
            httpCode = res.statusCode;
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                responseBody += chunk;
            });
            res.on('end', function() {
                // 尝试解析 JSON
                var jsonResponse = null;
                try { jsonResponse = JSON.parse(responseBody); } catch (e) {}

                // 判断是否成功
                if (jsonResponse && (jsonResponse.ok === true || jsonResponse.code === 0 || jsonResponse.type === '200')) {
                    isSuccess = true;
                    recordId = jsonResponse.result;
                } else if (httpCode >= 200 && httpCode < 300) {
                    isSuccess = true;
                }

                // 打印明确的上报结果
                console.log('');
                console.log('| Field           | Value                    |');
                console.log('|-----------------|--------------------------|');
                console.log('| Status          | ' + (isSuccess ? 'SUCCESS ✅' : 'FAILED ❌') + '                    |');
                console.log('| HTTP Code       | ' + httpCode + '                         |');
                console.log('| Record ID       | ' + (recordId || 'N/A') + '                         |');
                console.log('| Account         | ' + gitUser + '               |');
                console.log('| Change Name     | ' + changeName + '               |');
                console.log('| Files Changed   | ' + stats.files + '                          |');
                console.log('| Lines Added     | +' + stats.added + '                         |');
                console.log('| Lines Deleted   | -' + stats.deleted + '                         |');
                console.log('| Net Lines       | +' + stats.net + '                         |');
                if (jsonResponse && jsonResponse.message) {
                    console.log('| Server Message  | ' + jsonResponse.message + '                     |');
                }
                console.log('');
                console.log('==========================================');

                if (!isSuccess) {
                    console.log('[ERROR] Response: ' + responseBody);
                }

                // 调用回调通知完成
                if (callback) callback(isSuccess);
            });
        });

        req.on('error', function(e) {
            console.log('');
            console.log('| Field           | Value                    |');
            console.log('|-----------------|--------------------------|');
            console.log('| Status          | FAILED ❌                 |');
            console.log('| Error           | ' + e.message + '          |');
            console.log('');
            console.log('==========================================');
            if (callback) callback(false);
        });

        req.on('timeout', function() {
            req.destroy();
            console.log('');
            console.log('| Field           | Value                    |');
            console.log('|-----------------|--------------------------|');
            console.log('| Status          | TIMEOUT ❌               |');
            console.log('| Error           | Request timeout          |');
            console.log('');
            console.log('==========================================');
            if (callback) callback(false);
        });

        req.write(payloadStr);
        req.end();

    } catch (e) {
        console.log('');
        console.log('| Field           | Value                    |');
        console.log('|-----------------|--------------------------|');
        console.log('| Status          | FAILED ❌                 |');
        console.log('| Error           | ' + e.message + '          |');
        console.log('');
        console.log('==========================================');
        if (callback) callback(false);
    }
}