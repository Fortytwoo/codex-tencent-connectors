# Codex 腾讯连接器

让 OpenAI Codex 直接使用企业微信、QQ 邮箱和腾讯文档。

[![Codex Plugin](https://img.shields.io/badge/Codex-plugin-111827)](https://developers.openai.com/codex/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-0078D4)](#运行要求)

> [!IMPORTANT]
> 本项目是社区维护的非官方开源项目，与腾讯、企业微信、QQ 邮箱、腾讯文档或 OpenAI 无隶属、代理、合作或背书关系。使用前请阅读[免责声明](#免责声明)，并确认你有权访问和操作相关账号、组织及数据。

## 安装

根据当前操作系统和终端选择对应命令。各环境安装的是同一个插件，插件会自动选择适配当前系统和 CPU 架构的企业微信运行时。

### Windows PowerShell

兼容 Windows PowerShell 5.1 和 PowerShell 7：

```powershell
codex plugin marketplace add Fortytwoo/codex-tencent-connectors; if ($LASTEXITCODE -eq 0) { codex plugin add tencent-connectors@codex-tencent-connectors }
```

### Windows CMD

```bat
codex plugin marketplace add Fortytwoo/codex-tencent-connectors && codex plugin add tencent-connectors@codex-tencent-connectors
```

### macOS Terminal（Zsh/Bash）

适用于 Intel Mac 和 Apple Silicon Mac：

```bash
codex plugin marketplace add Fortytwoo/codex-tencent-connectors && codex plugin add tencent-connectors@codex-tencent-connectors
```

### Linux（Bash/Zsh）

适用于 x64 和 ARM64 Linux：

```bash
codex plugin marketplace add Fortytwoo/codex-tencent-connectors && codex plugin add tencent-connectors@codex-tencent-connectors
```

安装后请重启 Codex。

## 支持能力

- **企业微信：** 通过官方 `wecom-cli` 读取和管理消息、通讯录、文档、智能表格、会议、日程和待办。
- **QQ 邮箱：** 通过官方 QQ 邮箱 MCP 阅读、搜索、发送、回复、转发、删除邮件及下载附件。
- **腾讯文档：** 通过官方腾讯文档 MCP 搜索、读取、创建、编辑和整理个人版腾讯文档。
- **敏感操作确认：** 企业微信写操作采用内存中的准备和确认流程；QQ 邮箱保留上游 `42801` 二阶段确认协议。
- **原生 OAuth：** QQ 邮箱和腾讯文档凭证由 Codex 自身管理，本插件不持久化其 OAuth Token。

## 登录授权

### 企业微信

直接对 Codex 说：

```text
登录企业微信
```

Codex 会调用 `wecom_start_auth`，在默认浏览器打开企业微信官方 `work.weixin.qq.com` 授权页面，并等待用户扫码。如果浏览器无法自动打开，Codex 会返回官方授权链接作为兜底。

在没有桌面浏览器的 Linux 服务器上，可复制 Codex 返回的官方授权链接，在另一台可访问的设备上打开并扫码。

### QQ 邮箱

```powershell
codex mcp login qq-mail
```

### 腾讯文档

```powershell
codex mcp login tencent-docs
```

## 使用示例

```text
查看我最近的企业微信消息
给张三发一条企业微信消息，发送前让我确认
总结 QQ 邮箱中的未读邮件
在腾讯文档中查找本周周报
```

## 工作架构

```text
Codex
  |-- 企业微信 MCP（本地 stdio）-> 内置 wecom-cli -> 企业微信
  |-- QQ 邮箱 MCP（OAuth）-------> https://api.mail.qq.com/mcp
  `-- 腾讯文档 MCP（OAuth）-----> https://docs.qq.com/openapi/mcp
```

Codex 会直接连接两个官方远程 MCP 服务。本地进程仅处理企业微信，不会接收 QQ 邮箱或腾讯文档的 OAuth Token。

## 运行要求

- Windows x64
- macOS Intel x64 或 Apple Silicon ARM64
- Linux x64 或 ARM64
- 支持插件功能的 Codex CLI
- Node.js 20 或更高版本
- 使用企业微信功能时，需要可正常授权的企业微信账号
- 使用 QQ 邮箱和腾讯文档时，需要可正常授权的 QQ 账号

仓库已包含 Windows x64、macOS Intel/Apple Silicon、Linux x64/ARM64 版官方 `wecom-cli` 运行时。从 GitHub Marketplace 安装时不需要克隆仓库、执行 `npm install` 或在本地构建。插件会根据当前操作系统和 CPU 架构自动选择对应运行时。

## 更新与卸载

### Windows PowerShell 更新

```powershell
codex plugin marketplace upgrade codex-tencent-connectors; if ($LASTEXITCODE -eq 0) { codex plugin add tencent-connectors@codex-tencent-connectors }
```

### Windows CMD 更新

```bat
codex plugin marketplace upgrade codex-tencent-connectors && codex plugin add tencent-connectors@codex-tencent-connectors
```

### macOS/Linux 更新

```bash
codex plugin marketplace upgrade codex-tencent-connectors && codex plugin add tencent-connectors@codex-tencent-connectors
```

卸载插件：

```bash
codex plugin remove tencent-connectors@codex-tencent-connectors
```

## 从源码构建

```powershell
git clone https://github.com/Fortytwoo/codex-tencent-connectors.git
cd codex-tencent-connectors
npm install
npm test
node dist/cli.js install
```

常用开发命令：

```powershell
npm run check
npm test
npm run sync:runtimes
node dist/cli.js doctor
node dist/cli.js auth
```

可通过 `WECOM_CLI_PATH` 指定其他 `wecom-cli`。可通过 `WECOM_CLI_CONFIG_DIR` 和 `WECOM_CLI_TMP_DIR` 修改其配置目录和临时目录。

## 安全设计

- 原生进程均使用 `shell: false` 调用，不拼接 Shell 命令。
- 仅暴露白名单内的企业微信操作。
- 写操作在准备后不可修改参数，确认后才会执行。
- 浏览器授权地址只接受企业微信官方 `work.weixin.qq.com` 域名。
- QQ 邮箱和腾讯文档 OAuth Token 由 Codex 管理，不由本仓库保存。
- 不使用 WorkBuddy 凭证、私有 Token 或私有网关接口。

## 功能边界

- 当前腾讯文档仅支持个人版，不配置企业版腾讯文档或 OneID。
- 内置企业微信原生运行时支持 Windows x64、macOS x64/ARM64、Linux x64/ARM64；其他系统或架构需要通过 `WECOM_CLI_PATH` 自行提供兼容程序。
- 第三方服务的接口、权限、限额、登录策略和可用性可能随时变化。
- 本插件不能替代企业内部的审批、数据分级、合规审查和账号权限管理制度。

## 免责声明

1. **非官方项目：** 本项目由社区独立开发和维护，与腾讯、企业微信、QQ 邮箱、腾讯文档、OpenAI 及其关联公司不存在隶属、代理、合作、认证或背书关系。相关名称、商标和服务归各自权利人所有。
2. **授权与合规：** 使用者应确保自己对接入的账号、企业组织、邮箱、文档及其他数据拥有合法访问和操作权限，并遵守适用法律法规、服务协议、组织制度和数据保护要求。禁止将本项目用于未授权访问、监控、数据抓取、权限绕过、垃圾信息、欺诈或其他违法违规用途。
3. **操作风险：** 发送消息或邮件、修改或删除文档、日程、待办及其他写操作，可能对本人或第三方产生实际影响，部分操作可能不可逆。即使插件提供确认机制，使用者仍应在执行前自行核对收件人、目标资源、内容、附件、权限和影响范围。
4. **账号与数据安全：** 使用者应自行保护本机、Codex 环境和登录账号安全，不应在对话、日志、Issue 或公开渠道泄露 Cookie、Token、验证码、二维码、企业内部标识或敏感数据。因终端失陷、错误配置、第三方插件冲突或凭证泄露造成的风险由使用者自行承担。
5. **第三方服务：** 本项目依赖 Codex、MCP 服务和腾讯相关服务。第三方可能调整接口、授权方式、权限范围、费用、限额或服务可用性，本项目不保证持续兼容、稳定运行或满足特定用途。
6. **无担保：** 本软件按“现状”和“可用状态”提供，不提供任何明示或默示担保，包括但不限于准确性、可靠性、适销性、适用于特定目的、不侵权或数据不丢失。
7. **责任限制：** 在适用法律允许的最大范围内，项目作者和贡献者不对因安装、使用、误用、无法使用本项目，或因第三方服务变化所导致的账号限制、数据丢失、业务中断、声誉损失、间接损失或其他损害承担责任。
8. **风险接受：** 下载、安装或使用本项目，即表示使用者已阅读并理解上述内容，并同意自行承担相关风险。如果不同意，请不要安装或使用本项目。

## 开源许可

本项目使用 [MIT License](LICENSE)。内置的官方 WeCom CLI 仍适用其自身的 MIT License，详见[第三方声明](THIRD_PARTY_NOTICES.md)。
