---
name: qq-mail
description: Use when the user asks to read, search, send, reply to, forward, delete, or download attachments from QQ Mail through the official QQ Mail MCP server.
---

# QQ Mail

Use the tools exposed by the `qq-mail` MCP server.

## Bootstrap

Call `GetMe` before other QQ Mail operations in each session. Use the primary alias unless the user selects another one. Check scopes and attachment limits from the response.

## Read Operations

- Use `ListMessages`, `GetMessage`, and `SearchMessages` for mail retrieval.
- Use `ListAttachments` before `DownloadAttachment` when attachment IDs are not already known.
- Save decoded attachments only to a user-approved or workspace-controlled path and report that path.

## Two-Phase Confirmation

`SendMessage`, `ReplyMessage`, `ForwardMessage`, and `DeleteMessage` require explicit user confirmation.

1. Make the first call without `confirmation_token`.
2. A response with business code `42801` contains `details.confirmation_token`, `expires_at`, and `operation_summary`.
3. Show the complete operation summary and ask the user to confirm.
4. Do not claim success and do not retry automatically.
5. After confirmation, repeat the exact same call with the returned `confirmation_token`.
6. If the token expires or the user declines, discard it.

Before deletion, verify that `GetMe.scopes` includes `mail:delete`.
