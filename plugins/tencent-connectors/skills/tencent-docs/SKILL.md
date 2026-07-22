---
name: tencent-docs
description: Use when the user asks to search, read, create, edit, or organize Tencent Docs documents, spreadsheets, slides, and related online files through the official Tencent Docs MCP server.
---

# Tencent Docs

Use tools exposed by the `tencent-docs` MCP server. Do not use local file tools to read a Tencent Docs URL.

## Document Resolution

- Prefer stable document or file IDs returned by MCP tools.
- When the user supplies a Tencent Docs URL, resolve it through the Tencent Docs tools before reading or editing.
- If multiple documents match a title, show candidates and ask the user to choose.

## Writes

Before creating, editing, moving, renaming, or deleting content, summarize the target and intended change. Ask for confirmation when the action is destructive, externally visible, or affects collaborators.

## Boundaries

- This plugin uses `https://docs.qq.com/openapi/mcp` for the personal edition.
- Do not use WorkBuddy private gateway endpoints or WorkBuddy credentials.
- Enterprise Tencent Docs/OneID is not configured by this plugin.
