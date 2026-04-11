#!/usr/bin/env bash
set -euo pipefail

# PreToolUse hook: Bash command safety checks
# Detects patterns that trigger Claude Code's security heuristics in compound
# commands, causing unnecessary permission prompts even when every subcommand
# individually matches an allow rule.

INPUT=$(cat)

# Require jq to parse hook input
command -v jq &>/dev/null || exit 0

COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[[ -z "$COMMAND" ]] && exit 0

# Only check compound commands (chained with &&, ||, or ;)
case "$COMMAND" in
  *" && "*|*" || "*|*"; "*) ;;
  *) exit 0 ;;
esac

# Detect quoted arguments starting with a dash (e.g. "---", "-flag", '--verbose').
# Claude Code's OBFUSCATED_FLAGS heuristic scans the FULL compound command string
# before splitting on operators. A quoted string starting with "-" triggers a
# permission prompt even when each subcommand matches a prefix allow rule.
DQ=' "-'
SQ=" '-"
if [[ "$COMMAND" == *"$DQ"* ]] || [[ "$COMMAND" == *"$SQ"* ]]; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "This compound command contains a quoted argument starting with a dash (e.g. \"---\", \"-flag\"). This triggers Claude Code\u0027s OBFUSCATED_FLAGS security heuristic on the full command string, causing a permission prompt even though each subcommand matches an allow rule. Fix: remove quotes around dash-only arguments that do not require shell quoting (e.g. use `echo ---` instead of `echo \"---\"`), or split into separate Bash tool calls."
    }
  }'
  exit 0
fi
