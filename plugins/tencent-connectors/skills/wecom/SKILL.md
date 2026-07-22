---
name: wecom
description: Use when the user asks to read or manage enterprise WeChat/WeCom messages, contacts, documents, meetings, schedules, or to-dos through the Tencent Connectors plugin.
---

# WeCom

Use the `wecom` MCP tools. Do not construct or run `wecom-cli` shell commands directly.

## Authentication

1. Call `wecom_auth_status` before the first operation in a session.
2. If authorization is missing, call `wecom_start_auth` with `open_browser: true`. The default browser should open automatically; provide `authUrl` only as a fallback.
3. Call `wecom_auth_session` to monitor the browser authorization session, then recheck with `wecom_auth_status` after scanning.
4. Do not start duplicate authorization sessions while one is waiting for a scan.
5. Call `wecom_cancel_auth` if the user declines or wants to restart the authorization flow.

## Read Operations

- Call `wecom_policy` when the supported category or operation name is uncertain.
- Call `wecom_call_read` only with an operation listed under the policy's `read` collection.
- Use WeCom time format `YYYY-MM-DD HH:mm:ss` where required.
- Message history is normally limited to the most recent seven days.

## Write Operations

Never execute a state-changing operation without explicit confirmation.

1. Call `wecom_prepare_operation` with the exact final input and a complete human-readable summary.
2. Show the summary and ask the user to confirm.
3. Only after confirmation, call `wecom_confirm_operation` with the returned `operation_id`.
4. If declined, call `wecom_cancel_operation`.
5. Do not modify the operation arguments between prepare and confirm.

The operation expires after five minutes. If it expires, prepare it again.
