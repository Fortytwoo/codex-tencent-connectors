const READ_OPERATIONS: Record<string, Set<string>> = {
  contact: new Set(["get_userlist"]),
  doc: new Set([
    "get_doc_content",
    "sheet_get_info",
    "smartsheet_get_sheet",
    "smartsheet_get_fields",
    "smartsheet_get_records",
    "smartpage_export_task",
    "smartpage_get_export_result"
  ]),
  meeting: new Set(["list_user_meetings", "get_meeting_info"]),
  msg: new Set(["get_msg_chat_list", "get_message", "get_msg_media"]),
  schedule: new Set(["get_schedule_list_by_range", "get_schedule_detail", "check_availability"]),
  todo: new Set(["search_todo_userid", "get_todo_list", "get_todo_detail"]),
  cache: new Set(["status"])
};

const WRITE_OPERATIONS: Record<string, Set<string>> = {
  doc: new Set([
    "create_doc",
    "edit_doc_content",
    "sheet_add_sub",
    "sheet_delete_sub",
    "sheet_append_data",
    "sheet_update_range_data",
    "smartsheet_add_sheet",
    "smartsheet_update_sheet",
    "smartsheet_delete_sheet",
    "smartsheet_add_fields",
    "smartsheet_update_fields",
    "smartsheet_delete_fields",
    "smartsheet_add_records",
    "smartsheet_update_records",
    "smartsheet_delete_records"
  ]),
  meeting: new Set(["create_meeting", "cancel_meeting", "set_invite_meeting_members"]),
  msg: new Set(["send_message"]),
  schedule: new Set([
    "create_schedule",
    "update_schedule",
    "cancel_schedule",
    "add_schedule_attendees",
    "del_schedule_attendees"
  ]),
  todo: new Set(["create_todo", "update_todo", "change_todo_user_status", "delete_todo"]),
  cache: new Set(["clear"])
};

export function isAllowedRead(category: string, operation: string): boolean {
  return READ_OPERATIONS[category]?.has(operation) ?? false;
}

export function isAllowedWrite(category: string, operation: string): boolean {
  return WRITE_OPERATIONS[category]?.has(operation) ?? false;
}

export function listPolicy(): Record<string, { read: string[]; write: string[] }> {
  const categories = new Set([...Object.keys(READ_OPERATIONS), ...Object.keys(WRITE_OPERATIONS)]);
  return Object.fromEntries(
    [...categories].sort().map((category) => [
      category,
      {
        read: [...(READ_OPERATIONS[category] ?? [])].sort(),
        write: [...(WRITE_OPERATIONS[category] ?? [])].sort()
      }
    ])
  );
}
