#!/usr/bin/env bash
set -euo pipefail

# PreToolUse hook: Block access to sensitive files via Bash commands
# Native tools (Read, Edit, Write, Grep) are also covered by deny rules in
# settings.json which cannot be overridden. This hook adds Bash coverage
# (e.g. cat .env, head .env.production) and provides helpful error messages.

INPUT=$(cat)

# Require jq to parse hook input
command -v jq &>/dev/null || exit 0

TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[[ -z "$TOOL_NAME" ]] && exit 0

# Check if a file path matches sensitive basename patterns
is_sensitive() {
    local filepath="$1"
    [[ -z "$filepath" ]] && return 1
    # Skip flag-like tokens (e.g. -c, --help)
    [[ "$filepath" == -* ]] && return 1

    local name
    name=$(basename "$filepath")

    case "$name" in
        .env|.env.*) return 0 ;;
        *.pem|*.key|*.p12|*.pfx|*.jks|*.keystore) return 0 ;;
        id_rsa|id_ed25519|id_ecdsa|id_dsa) return 0 ;;
        *.tfvars) return 0 ;;
        .npmrc|.pypirc|.netrc|.git-credentials|.htpasswd) return 0 ;;
    esac

    return 1
}

# Check if a command string contains sensitive path patterns (substring match)
has_sensitive_path() {
    local cmd="$1"
    case "$cmd" in
        *.docker/config.json*) return 0 ;;
        *.microsoft/usersecrets/*) return 0 ;;
        *.aws/credentials*) return 0 ;;
        *.azure/*) return 0 ;;
        *.gcloud/*) return 0 ;;
    esac
    return 1
}

deny() {
    jq -n --arg reason "$1" '{
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: $reason
        }
    }'
    exit 0
}

case "$TOOL_NAME" in
    Read|Edit|Write)
        FILEPATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
        if is_sensitive "$FILEPATH" || has_sensitive_path "$FILEPATH"; then
            deny "Blocked: '$(basename "$FILEPATH")' is a sensitive file (secrets, keys, credentials). Ask the user to provide the needed information instead."
        fi
        ;;
    Grep)
        # Block when Grep targets a specific sensitive file path
        FILEPATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.path // empty' 2>/dev/null)
        if is_sensitive "$FILEPATH" || has_sensitive_path "$FILEPATH"; then
            deny "Blocked: '$(basename "$FILEPATH")' is a sensitive file (secrets, keys, credentials). Ask the user to provide the needed information instead."
        fi
        ;;
    Bash)
        COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
        [[ -z "$COMMAND" ]] && exit 0

        # Check path patterns against the full command string (substring match
        # is fine — these patterns are specific enough to avoid false positives)
        if has_sensitive_path "$COMMAND"; then
            deny "Blocked: command references sensitive credentials path. Ask the user to provide the needed information instead."
        fi

        # Extract tokens and check each against is_sensitive() for basename
        # patterns. This avoids false positives from substring matching
        # (e.g. .keys() matching .key, dict.env matching .env).
        while IFS= read -r token; do
            [[ -z "$token" ]] && continue
            if is_sensitive "$token"; then
                deny "Blocked: command references sensitive file '$(basename "$token")'. Ask the user to provide the needed information instead."
            fi
        done <<< "$(printf '%s' "$COMMAND" | tr "\"'();" '\n' | tr ' \t' '\n')"
        ;;
esac
