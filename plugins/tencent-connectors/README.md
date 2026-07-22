# Tencent Connectors for Codex

Use WeCom (企业微信), QQ Mail (QQ 邮箱), and Tencent Docs (腾讯文档) directly from OpenAI Codex.

[![Codex Plugin](https://img.shields.io/badge/Codex-plugin-111827)](https://developers.openai.com/codex/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/platform-Windows-0078D4)](#requirements)

## One-Line Install

Run this in PowerShell, Command Prompt, or a modern shell:

```powershell
codex plugin marketplace add Fortytwoo/codex-tencent-connectors && codex plugin add tencent-connectors@codex-tencent-connectors
```

Restart Codex after installation.

## What You Get

- **WeCom:** messages, contacts, documents, smart sheets, meetings, schedules, and to-dos through the official `wecom-cli`.
- **QQ Mail:** read, search, send, reply, forward, delete, and download attachments through the official QQ Mail MCP.
- **Tencent Docs:** search, read, create, edit, and organize personal Tencent Docs through the official Tencent Docs MCP.
- **Safer writes:** state-changing WeCom operations use an in-memory prepare/confirm flow. QQ Mail preserves its upstream `42801` confirmation protocol.
- **Native OAuth:** QQ Mail and Tencent Docs credentials stay in Codex's credential storage and are never persisted by this plugin.

## Sign In

### WeCom

Ask Codex:

```text
登录企业微信
```

Codex calls `wecom_start_auth`, opens the official `work.weixin.qq.com` page in your default browser, and waits for you to scan the QR code. If the browser cannot open, Codex returns the official URL as a fallback.

### QQ Mail

```powershell
codex mcp login qq-mail
```

### Tencent Docs

```powershell
codex mcp login tencent-docs
```

## Example Prompts

```text
查看我最近的企业微信消息
给张三发一条企业微信消息，发送前让我确认
总结 QQ 邮箱中的未读邮件
在腾讯文档中查找本周周报
```

## Architecture

```text
Codex
  |-- WeCom MCP (local stdio) -> bundled wecom-cli -> WeCom
  |-- QQ Mail MCP (OAuth) ----> https://api.mail.qq.com/mcp
  `-- Tencent Docs MCP (OAuth) -> https://docs.qq.com/openapi/mcp
```

Codex connects directly to the two official remote MCP services. The local process handles only WeCom and never receives QQ Mail or Tencent Docs OAuth tokens.

## Requirements

- Windows x64
- Codex CLI with plugin support
- Node.js 20 or newer
- A WeCom account for WeCom features
- A QQ account for QQ Mail and Tencent Docs features

The repository includes the Windows x64 `wecom-cli` runtime so GitHub marketplace installation requires no clone, npm install, or local build. Other operating systems can build from source if a compatible `@wecom/cli` native package is available.

## Manage The Plugin

Update the marketplace snapshot and reinstall the latest plugin version:

```powershell
codex plugin marketplace upgrade codex-tencent-connectors && codex plugin add tencent-connectors@codex-tencent-connectors
```

Remove the plugin:

```powershell
codex plugin remove tencent-connectors@codex-tencent-connectors
```

## Build From Source

```powershell
git clone https://github.com/Fortytwoo/codex-tencent-connectors.git
cd codex-tencent-connectors
npm install
npm test
node dist/cli.js install
```

Useful commands:

```powershell
npm run check
npm test
node dist/cli.js doctor
node dist/cli.js auth
```

Set `WECOM_CLI_PATH` to use another `wecom-cli` executable. Set `WECOM_CLI_CONFIG_DIR` or `WECOM_CLI_TMP_DIR` to override its configuration and temporary directories.

## Security

- Native processes are invoked with `shell: false`.
- Only allowlisted WeCom operations are exposed.
- Prepared write arguments cannot be changed during confirmation.
- Browser authorization URLs are accepted only from the official `work.weixin.qq.com` domain.
- QQ Mail and Tencent Docs OAuth tokens are managed by Codex, not this repository.
- No WorkBuddy credentials or private gateway endpoints are used.

## Scope

This release supports personal Tencent Docs. Tencent Docs Enterprise/OneID is not configured. The bundled native WeCom runtime currently targets Windows x64.

## License

[MIT](LICENSE). The bundled official WeCom CLI remains covered by its own MIT license; see [Third-Party Notices](THIRD_PARTY_NOTICES.md).
