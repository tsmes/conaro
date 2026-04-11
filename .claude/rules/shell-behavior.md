# Shell Behavior

- **Shell state does not persist between commands**: Each Bash tool invocation runs in a fresh shell. Variables set with `export` in one call are gone by the next. If you need a variable across commands, chain them in a single call with `&&`.
- **Compound commands (`&&`, `||`, `;`) — each subcommand is checked independently**: Claude Code splits compound commands on shell operators and evaluates permission rules for each subcommand separately. All subcommands must match an allow rule or the command will prompt for approval. For example, `cd dir && npm run build` checks **both** `cd dir` and `npm run build` — if either one is not in the allow list, the whole command prompts.
- **Pipes (`|`) are part of the same command**: A pipeline like `curl ... | jq ...` is treated as a single command matching `curl`. The piped-to commands (`jq`, `sed`, etc.) do not need their own allow rules when used in a pipeline.
- **Inline environment variables**: A command like `MY_VAR=value curl http://...` will NOT match the `curl` allow rule because the string starts with `MY_VAR=`. **Always use one of these patterns instead:**
  - `env MY_VAR=value curl http://...` — the `env` command is in the allow list
  - `export MY_VAR=value && curl http://...` — both subcommands are in the allow list
- **Quoted dash arguments in compound commands**: A security heuristic flags quoted strings starting with `-` (e.g., `echo "---"`) as potential obfuscated flags — this triggers on the full compound command even if each subcommand individually matches allow rules. Avoid quoting dash-only arguments in chained commands (use `echo ---` not `echo "---"`).
