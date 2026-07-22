# Agent 安装协议

本文件面向读取本仓库的编码 Agent，例如 Codex、Claude Code、OpenCode 和其他具备终端能力的 Agent。

## 用户意图门控

- 只有当用户明确要求安装、配置、启用、更新或验证本插件时，才可修改用户的 Codex 配置。
- 仅仅读取、审查、构建或解释本项目时，不得自动安装。
- 不得代替用户完成企业微信扫码，也不得在未获得明确要求时启动 QQ 邮箱或腾讯文档 OAuth 登录。
- 不得读取、输出或提交任何现有 Cookie、Token、二维码、验证码或账号凭证。

## 推荐安装流程

在仓库根目录执行以下流程，无需先运行 `npm install`。

1. 检查将要执行的动作：

```bash
node scripts/agent-install.mjs --dry-run
```

2. 用户已明确要求安装时，执行无人值守安装。默认使用 GitHub 公开稳定版本：

```bash
node scripts/agent-install.mjs --yes
```

3. 安装器会自动：

- 检查 Node.js 和 Codex CLI。
- 注册或刷新 GitHub Codex Marketplace。
- 安装 `tencent-connectors@codex-tencent-connectors`。
- 验证插件状态。
- 验证 `wecom`、`qq-mail`、`tencent-docs` 三个 MCP 注册状态。
- 输出后续授权命令，但不会自动登录账号。

## 从 GitHub 安装

如果 Agent 读取的是网页或远程仓库信息，而不是本地克隆目录，可直接运行：

```bash
codex plugin marketplace add Fortytwoo/codex-tencent-connectors
codex plugin add tencent-connectors@codex-tencent-connectors
```

不要把两个命令硬编码为仅适用于某个 Shell 的连接表达式。应逐条执行，并且仅在第一条成功后执行第二条。

## 本地开发版本安装

只有用户明确要求安装当前工作树中的未发布版本时，才使用：

```bash
node scripts/agent-install.mjs --yes --local
```

如果同名 Marketplace 已指向 GitHub 或其他目录，安装器会安全停止，不会擅自删除或替换用户已有来源。

## 更新

用户明确要求更新时，逐条执行：

```bash
codex plugin marketplace upgrade codex-tencent-connectors
codex plugin add tencent-connectors@codex-tencent-connectors
```

或者在本地仓库根目录重新执行：

```bash
node scripts/agent-install.mjs --yes
```

## 授权边界

安装完成后向用户说明：

- 需要重启 Codex 才能让当前会话加载新插件。
- 企业微信可在重启后让 Codex 调用 `wecom_start_auth`，由用户自行扫码。
- QQ 邮箱登录命令为 `codex mcp login qq-mail`。
- 腾讯文档登录命令为 `codex mcp login tencent-docs`。
- OAuth 和扫码授权属于用户交互步骤，除非用户明确要求，否则 Agent 不应主动启动。

## 失败恢复

- `codex` 不存在：停止并提示用户安装支持插件功能的 Codex CLI。
- Node.js 低于 20：停止并提示用户升级 Node.js。
- Marketplace 已存在：视为幂等状态，继续安装插件。
- 插件安装失败：报告原始错误，不删除用户其他插件或 Marketplace。
- 验证失败：保留已安装文件，报告失败项，不执行破坏性回滚。
- 不得使用 `git reset --hard`、删除 `~/.codex` 或清空 Codex 配置作为修复手段。

## 开发验证

只有用户要求开发、修改或发布本项目时，才需要执行：

```bash
npm install
npm test
```

普通插件安装不需要安装 npm 依赖，也不需要重新构建仓库。
