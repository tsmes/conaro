---
name: logical-commit
description: Create logically atomic git commits with surgical staging and conventional commit messages, grouping changes by purpose rather than file structure.
version: 1.0.0
---

# Logical Atomic Commits

You are an expert at creating logically atomic commits following the principles from https://benmatselby.dev/post/logical-commits/. A logically atomic commit is "the smallest, most meaningful change you can make to the software. It's big enough to add value, but small enough to be manageable."

## Your Task

1. **Analyze all unstaged changes** using `git diff` to understand what has been modified
2. **Identify and group logically distinct changes** - even within the same file, different logical changes should be separate commits
3. **Determine the ideal commit order** - commits with dependencies should come first (e.g., new utilities before features using them, core changes before dependent changes)
4. **Stage changes surgically** and create meaningful commits

## Logical Grouping Principles

- Group by **purpose/feature**, not by file or technical layer
- If a backend API only serves one UI feature, they belong together
- If an API has broader applicability, commit it separately from its first consumer
- Separate refactoring from new features
- Keep bug fixes isolated from new features
- Group related test changes with the code they test
- Documentation updates can be bundled with the feature they document, unless the docs are substantial standalone improvements

## Tool Reference: extract-hunks.sh

The following is a reference manual for the `extract-hunks.sh` helper script. Consult this section when you need to use the tool for surgical staging.

### The Iterative Staging Workflow

**Key Principle**: Stage one hunk at a time. Changes accumulate in staging area. Commit once when all hunks for a logical group are staged.

```bash
# 1. List all unstaged hunks in a file
.claude/skills/logical-commit/extract-hunks.sh list install.js

# Output:
# Hunk 1: Lines 14+ (adds configuration)
#   +    hasLanguageSpecificClaude: false,
# Hunk 2: Lines 152+ (adds error handling)
# Hunk 3: Lines 167+ (tracks created files)
# Hunk 4: Lines 310+ (refactors cleanup)

# 2. Identify logical groups
# Say hunks 2 and 3 belong together (both about file tracking)

# 3. Extract and stage hunk 2
.claude/skills/logical-commit/extract-hunks.sh extract install.js 2 | git apply --cached

# 4. List again - hunks renumber! What was 3 is now 2
.claude/skills/logical-commit/extract-hunks.sh list install.js

# Output now shows:
# Hunk 1: Lines 14+ (adds configuration)
# Hunk 2: Lines 167+ (tracks created files) ← This was hunk 3!
# Hunk 3: Lines 310+ (refactors cleanup)    ← This was hunk 4!

# 5. Extract what's now hunk 2 (original hunk 3)
.claude/skills/logical-commit/extract-hunks.sh extract install.js 2 | git apply --cached

# 6. Verify everything staged for this logical commit
git diff --cached

# 7. Commit with both hunks together
git commit -m "feat: track created files during installation"

# 8. Continue with remaining hunks...
.claude/skills/logical-commit/extract-hunks.sh list install.js
# Now shows hunks 1 and 2 (original hunks 1 and 4)
```

### Why One Hunk at a Time?

- **Staging doesn't modify working directory**: After `git apply --cached`, your working files still have all original changes
- **Hunks renumber**: After staging, `git diff` shows remaining changes with renumbered hunks
- **Accumulation**: Each staged hunk adds to the staging area; commit once when complete
- **Simplicity**: No need to calculate adjusted line numbers for multiple hunks

## Alternative: Manual Patch Files

For complex cases, you can create patch files manually:

```bash
# Create a patch file with only the desired changes
cat > /tmp/logical-change-1.patch << 'EOF'
diff --git a/src/app.js b/src/app.js
index 1234567..abcdefg 100644
--- a/src/app.js
+++ b/src/app.js
@@ -10,6 +10,9 @@ function authenticate(user) {
+  // Validate JWT token
+  if (!validateToken(user.token)) {
+    throw new Error('Invalid token');
+  }
   return user;
 }
EOF

# Apply the patch to staging area only (doesn't modify working directory)
git apply --cached /tmp/logical-change-1.patch

# Verify what's staged
git diff --cached
```

### Method 2: Stage All Then Reset Unwanted Parts

```bash
# Stage the entire file
git add src/app.js

# Create a patch of what we DON'T want staged
cat > /tmp/unwanted.patch << 'EOF'
diff --git a/src/app.js b/src/app.js
index abcdefg..7890xyz 100644
--- a/src/app.js
+++ b/src/app.js
@@ -50,3 +50,5 @@ function processData(data) {
+  // This is unrelated debugging code
+  console.log('debug:', data);
 }
EOF

# Remove those changes from staging (reverse apply)
git apply --cached --reverse /tmp/unwanted.patch
```

### Method 3: Stage Entire Files (Simplest)

```bash
# When entire files represent one logical change
git add src/components/LoginForm.jsx src/utils/auth.js

# Or single files
git add package.json
```

### Complete Example

**Scenario**: `install.js` has 4 hunks, hunks 2 and 3 belong to "file tracking" feature

```bash
# Step 1: Understand all changes
.claude/skills/logical-commit/extract-hunks.sh list install.js

# Step 2: Stage first hunk of logical group
.claude/skills/logical-commit/extract-hunks.sh extract install.js 2 | git apply --cached

# Step 3: List again (hunks renumbered)
.claude/skills/logical-commit/extract-hunks.sh list install.js

# Step 4: Stage what's now hunk 2 (was hunk 3)
.claude/skills/logical-commit/extract-hunks.sh extract install.js 2 | git apply --cached

# Step 5: Review staging
git diff --cached

# Step 6: Commit together
git commit -m "feat: track created files during installation

Adds tracking for directories and files created during install.
Enables proper cleanup on installation failure."

# Step 7: Continue with next logical group
.claude/skills/logical-commit/extract-hunks.sh list install.js
```

## Commit Message Format

Use conventional commit prefixes:

- **feat:** New feature
- **fix:** Bug fix
- **refactor:** Code restructuring without behavior change
- **perf:** Performance improvement
- **style:** Code style/formatting changes
- **docs:** Documentation only
- **test:** Adding or updating tests
- **chore:** Maintenance tasks
- **ci:** CI/CD configuration
- **dx:** Developer experience improvements
- **build:** Build system or dependencies

### Message Structure

```
<type>: <concise description>

[optional body explaining why and what]
[optional footer with breaking changes or issue refs]
```

### Examples

```bash
# Simple feature
git commit -m "feat: add user logout functionality"

# Bug fix with context
git commit -m "fix: prevent race condition in session refresh

Previously, concurrent API calls could trigger multiple refresh
attempts. Added mutex to ensure only one refresh at a time."

# Refactoring
git commit -m "refactor: extract validation logic to separate module"

# Performance improvement
git commit -m "perf: memoize expensive render calculations"

# Documentation
git commit -m "docs: add API authentication examples"

# Multiple related changes
git commit -m "feat: implement user profile editing

- Add PUT /api/users/:id endpoint
- Create ProfileEditor component
- Add form validation
- Update user context on save"
```

## Your Workflow

1. **Get overview of all changes:**

   ```bash
   git diff --stat  # See which files changed
   git diff         # See all changes
   ```

2. **For each modified file, list hunks:**

   ```bash
   .claude/skills/logical-commit/extract-hunks.sh list <file>
   ```

3. **Analyze and categorize** hunks into logical groups across all files

4. **Determine commit order** (dependencies first)

5. **For each logical group:**
   - Explain what this group represents and why it's logically atomic
   - If entire file(s) belong to this group:
     ```bash
     git add <files>
     ```
   - If only specific hunks from a file:

     ```bash
     # Extract and stage hunk N
     .claude/skills/logical-commit/extract-hunks.sh extract <file> N | git apply --cached

     # List again to see renumbered hunks
     .claude/skills/logical-commit/extract-hunks.sh list <file>

     # Continue staging hunks for same logical commit
     .claude/skills/logical-commit/extract-hunks.sh extract <file> M | git apply --cached
     ```

   - Review staging:
     ```bash
     git diff --cached
     ```
   - Commit with appropriate conventional commit message
   - Show the exact commands executed

6. **Verify completion:**
   ```bash
   git log --oneline -5  # See commits created
   git diff              # Should be empty
   git status            # Confirm working directory clean
   ```

## Important Notes

- **Use the helper script**: `extract-hunks.sh` handles hunk extraction correctly
- **One hunk at a time**: Stage incrementally, hunks renumber after each staging
- **List frequently**: Run `list` after each `extract` to see updated hunk numbers
- **Review before committing**: Always check `git diff --cached` before commit
- **Commit messages**: Explain **why** and **what**, not just **how**
- **Goal**: Each commit should be independently revertible without breaking the codebase
- **When in doubt**: Prefer smaller commits over larger ones
- **Cross-file commits**: You can mix `git add` for whole files and `extract-hunks.sh` for partial files in same commit

Now analyze the current unstaged changes and create logical atomic commits.
