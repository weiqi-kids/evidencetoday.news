#!/bin/bash
# Reminds the AI to sync README.md / docs/playbooks/ when functional code is edited.
# Triggered as a PostToolUse hook on Edit|Write.
# Injects a system reminder via stdout JSON when the edited file is functional code.

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')

# No path → nothing to check
[ -z "$file_path" ] && exit 0

# Convert to repo-relative path (strip cwd if present)
repo_root="$(pwd)"
rel_path="${file_path#"$repo_root"/}"

# Exclude: content files, policies, public assets, docs, any .md
if echo "$rel_path" | grep -qE '^(src/content/|src/data/policies/|public/|docs/|README\.md$|.*\.md$)'; then
  exit 0
fi

# Functional paths trigger the reminder
if echo "$rel_path" | grep -qE '^(src/(components|layouts|styles|lib|utils)/|src/pages/.*\.(astro|ts|svelte)$|scripts/|\.github/workflows/|astro\.config\.mjs$|src/content\.config\.ts$|package\.json$)'; then
  cat <<'JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "[修改紀律] 你動到功能程式碼。請確認同步更新 README.md 或對應的 docs/playbooks/*.md 檔案，否則 CI docs-sync-check 會擋 PR。判斷規則：改 src/components|layouts|styles|lib|utils、src/pages/*.astro|.ts|.svelte、scripts、.github/workflows、astro.config.mjs、src/content.config.ts、package.json 都必須同步 docs。例外請在 PR body 加 [skip docs]。"
  }
}
JSON
fi

exit 0
