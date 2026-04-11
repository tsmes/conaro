#!/usr/bin/env bash
set -euo pipefail

# PostToolUse hook: TypeScript type checking + linting
# Runs tsc project-wide and eslint per-file on edited .ts/.tsx files
# Usage: typescript.sh [target-dir]
#   target-dir: subfolder to run from (relative to project root). Default: project root.

TARGET_DIR="${1:-.}"

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

# Exit early if no file path or not a TypeScript file
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# If targeting a subfolder, only process files under that directory
if [ "$TARGET_DIR" != "." ]; then
  ABSOLUTE_TARGET="$(cd "$CLAUDE_PROJECT_DIR/$TARGET_DIR" 2>/dev/null && pwd)" || exit 0
  case "$FILE_PATH" in
    "$ABSOLUTE_TARGET"/*) ;;
    *) exit 0 ;;
  esac
fi

EXIT_CODE=0
cd "$CLAUDE_PROJECT_DIR/$TARGET_DIR" || exit 0

# Type checking with tsc (project-wide, from target dir)
if command -v npx >/dev/null 2>&1; then
  if ! npx tsc --noEmit 2>&1 >&2; then
    EXIT_CODE=1
  fi
fi

# Linting with eslint (per-file)
if command -v npx >/dev/null 2>&1; then
  if ! npx eslint "$FILE_PATH" 2>&1 >&2; then
    EXIT_CODE=1
  fi
fi

exit $EXIT_CODE
