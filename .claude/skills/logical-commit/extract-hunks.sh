#!/bin/bash
# Helper script for extracting hunks from git diff for surgical staging
#
# WORKFLOW: Stage one hunk at a time, accumulating in staging area
#   1. List hunks to see what's available
#   2. Extract and stage ONE hunk
#   3. List again (hunks renumber after staging)
#   4. Repeat steps 2-3 until all hunks for logical commit are staged
#   5. Commit everything staged together
#
# Usage:
#   ./extract-hunks.sh list <file>        - List all unstaged hunks
#   ./extract-hunks.sh extract <file> <n> - Extract ONE specific hunk

set -euo pipefail

command="$1"
shift

list_hunks() {
    local file="$1"

    if ! git diff --quiet "$file" 2>/dev/null; then
        echo "=== Hunks in $file ===" >&2
        echo >&2

        # Get diff and parse hunks
        git diff "$file" | awk '
        BEGIN { hunk_num = 0; in_hunk = 0; }

        # Match hunk headers — use field parsing instead of gawk-only match() captures
        # Format: @@ -OLD,LEN +NEW,LEN @@ — $3 is always "+NEW,LEN"
        /^@@ / {
            hunk_num++
            in_hunk = 1
            header = $0
            new_start = $3
            sub(/^\+/, "", new_start)
            sub(/,.*/, "", new_start)
            print "Hunk " hunk_num ": Lines " new_start "+" " (" header ")" > "/dev/stderr"
            next
        }

        # Show preview of changes
        in_hunk && /^[+\-]/ && !/^(---|\+\+\+)/ {
            if (preview_lines < 3) {
                print "  " $0 > "/dev/stderr"
                preview_lines++
            }
        }

        # Reset preview counter on new hunk
        /^@@ / { preview_lines = 0 }

        # Blank line between hunks
        /^[^@+\- ]/ && in_hunk {
            print "" > "/dev/stderr"
            in_hunk = 0
        }
        ' || true

        echo >&2
        echo "Total hunks: $(git diff "$file" | grep -c '^@@ ')" >&2
    else
        echo "No changes in $file" >&2
        return 1
    fi
}

extract_hunks() {
    local file="$1"
    local hunk_number="$2"

    # Validate single hunk
    if [ $# -ne 2 ]; then
        echo "ERROR: extract only supports one hunk at a time" >&2
        echo "Usage: $0 extract <file> <hunk_number>" >&2
        exit 1
    fi

    # Get full diff with headers
    local diff_output
    diff_output=$(git diff "$file")

    # Extract header lines (diff --git, index, ---, +++)
    echo "$diff_output" | sed -n '1,/^@@/{ /^@@/!p; }'

    # Parse and extract the specified hunk
    echo "$diff_output" | awk -v wanted_hunk="$hunk_number" '
    BEGIN {
        hunk_num = 0
        in_wanted = 0
    }

    /^@@ / {
        hunk_num++
        if (hunk_num == wanted_hunk) {
            in_wanted = 1
            print $0
        } else if (hunk_num > wanted_hunk) {
            exit
        }
        next
    }

    in_wanted {
        # Stop at next hunk header
        if (/^@@ /) {
            exit
        }
        print $0
    }
    '
}

case "$command" in
    list)
        if [ $# -ne 1 ]; then
            echo "Usage: $0 list <file>" >&2
            exit 1
        fi
        list_hunks "$1"
        ;;
    extract)
        if [ $# -ne 2 ]; then
            echo "Usage: $0 extract <file> <hunk_number>" >&2
            echo "Note: Only one hunk at a time. Stage incrementally for same commit." >&2
            exit 1
        fi
        extract_hunks "$@"
        ;;
    *)
        echo "Unknown command: $command" >&2
        echo "Usage:" >&2
        echo "  $0 list <file>             - List all unstaged hunks" >&2
        echo "  $0 extract <file> <n>      - Extract ONE hunk" >&2
        echo "" >&2
        echo "Workflow: List → Extract hunk N → Stage → List again → Repeat → Commit" >&2
        exit 1
        ;;
esac
