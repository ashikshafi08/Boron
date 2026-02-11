# Boron

An MCP server for stacked pull requests, powered by [git-branchless](https://github.com/arxanas/git-branchless). A free, open-source alternative to Graphite.

Boron gives AI agents (Claude Code, Cursor, etc.) the ability to split large code changes into small, reviewable, dependent PRs — automatically.

## How it works

Stacked PRs break a large change into a chain of small, dependent pull requests. Each PR builds on the previous one, and each is small enough to review in minutes.

```
You write 3,000 lines of code
         ↓
Claude analyzes the changes
         ↓
Boron creates 6 atomic branches (max ~500 lines each)
         ↓
Boron submits 6 chained GitHub PRs
         ↓
Each PR is reviewable in ~5 minutes
```

**Without stacked PRs:** One massive PR that sits in review for days, accumulates merge conflicts, and reviewers rubber-stamp because it's too big to actually read.

**With stacked PRs:** Six focused PRs that each do one thing. Reviewer sees PR 1 (database migrations), approves it. PR 2 (API endpoints) builds on PR 1. Each is digestible. The chain merges bottom-to-top.

### The branch chain

```
main
 └── feat/tm-161-01-migrations      ← PR #1 (base: main)
      └── feat/tm-161-02-models     ← PR #2 (base: PR #1's branch)
           └── feat/tm-161-03-api   ← PR #3 (base: PR #2's branch)
```

Each PR targets the previous branch as its base, not `main`. This means reviewers only see the diff for *that specific layer*, not the cumulative changes.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [git-branchless](https://github.com/arxanas/git-branchless) — stack management engine
- [GitHub CLI](https://cli.github.com/) (`gh`) — PR creation and merging

```bash
# macOS
brew install git-branchless gh

# Verify
git branchless --help
gh auth status
```

## Installation

### Option 1: npm install (recommended)

```bash
npm install -g boron-mcp
```

### Option 2: npx (no install required)

No installation needed — use `npx boron-mcp` directly in your MCP config.

### Option 3: Clone and build (for development)

```bash
git clone https://github.com/ashikshafi08/Boron.git
cd Boron
npm install
npm run build
```

## Setup

### 1. Initialize git-branchless in your target repo

```bash
cd your-project
git branchless init
```

This is required once per repo. It sets up git-branchless's commit graph tracking in `.git/branchless/`.

### 2. Connect Boron to your AI agent

**Claude Code** — Add to `~/.claude/.mcp.json`:

**If you installed globally (Option 1):**
```json
{
  "mcpServers": {
    "boron": {
      "command": "boron"
    }
  }
}
```

**If using npx (Option 2):**
```json
{
  "mcpServers": {
    "boron": {
      "command": "npx",
      "args": ["boron-mcp"]
    }
  }
}
```

**If you cloned and built (Option 3):**
```json
{
  "mcpServers": {
    "boron": {
      "command": "node",
      "args": ["/absolute/path/to/Boron/dist/index.js"]
    }
  }
}
```

Restart Claude Code. Run `/mcp` to verify "boron" appears as connected.

**Cursor / Other MCP clients** — Use the same configuration format for your client's MCP settings file.

## Tools

Boron exposes 9 tools over MCP:

| Tool | Description |
|------|-------------|
| `create_stack` | Create a stack of branches from a list of atomic commits |
| `submit_stack` | Push branches and create chained GitHub PRs (updates existing PRs) |
| `view_stack` | Show the commit graph via smartlog |
| `navigate_stack` | Move between commits in the stack |
| `modify_commit` | Amend the current commit with new files or a new message, auto-restacks |
| `restack` | Rebase descendants after amending a mid-stack commit |
| `sync_stack` | Pull remote changes and rebase all stacks |
| `merge_stack` | Merge all stack PRs from bottom to top |
| `undo_last` | Undo the last git-branchless operation (commit, restack, checkout, etc.) |

## Usage

### With Claude Code

Just ask Claude to split your changes:

> "I just implemented the auth system. Split it into stacked PRs linked to TM-161."

Claude will:
1. Analyze your uncommitted changes
2. Group files into logical, atomic commits
3. Call `create_stack` to build the branch chain
4. Call `submit_stack` to create GitHub PRs

### Full workflow example

**Step 1: Create the stack**

```
create_stack({
  commits: [
    {
      branch_name: "feat/tm-161-01-migrations",
      commit_message: "feat: add authorization tables",
      files: ["migrations/001_auth.sql"]
    },
    {
      branch_name: "feat/tm-161-02-api",
      commit_message: "feat: add auth API endpoints",
      files: ["src/auth/routes.ts", "src/auth/middleware.ts"]
    },
    {
      branch_name: "feat/tm-161-03-tests",
      commit_message: "test: add auth integration tests",
      files: ["tests/auth.test.ts"]
    }
  ],
  base_branch: "main",
  linear_issue: "TM-161"
})
```

**Step 2: View the result**

```
view_stack()
```

Output:
```
O abc1234 (main)
|
o def5678 (feat/tm-161-01-migrations) feat: add authorization tables
|
o ghi9012 (feat/tm-161-02-api) feat: add auth API endpoints
|
@ jkl3456 (feat/tm-161-03-tests) test: add auth integration tests
```

**Step 3: Submit as chained PRs**

```
submit_stack({ draft: false, linear_issue: "TM-161" })
```

This pushes all branches and creates PRs: #1 → main, #2 → #1's branch, #3 → #2's branch.

**Step 4: Fix something mid-stack**

Reviewer wants a change in the migrations PR (the first one):

```
navigate_stack({ direction: "prev", distance: 2 })  // back to migrations
modify_commit({ files: ["migrations/001_auth.sql"] })  // amend + auto-restack
navigate_stack({ direction: "next", distance: 2 })  // back to tip
submit_stack({})  // re-push all branches (updates existing PRs)
```

**Step 5: Merge when approved**

```
merge_stack({ method: "squash" })
```

Merges all PRs bottom-to-top. Done.

### Other operations

```
sync_stack()   // fetch + rebase all stacks onto updated main
restack()      // manually rebase descendants (if auto_restack was disabled)
undo_last()    // revert the last git-branchless operation
```

## Branch naming convention

```
{type}/{issue-id}-{sequence}-{description}
```

Examples:
- `feat/tm-161-01-migrations`
- `feat/tm-161-02-models`
- `fix/tm-162-01-validation`

The sequence number (`01`, `02`, `03`) keeps branches ordered. The issue ID links back to your project tracker.

## How Boron compares

| | Boron | Graphite |
|---|---|---|
| **Cost** | Free | $32/user/month |
| **Stack management** | git-branchless (open source) | Proprietary |
| **AI integration** | MCP (works with any agent) | Graphite MCP only |
| **PR creation** | GitHub CLI | Native |
| **Open source** | Yes | No |
| **Vendor lock-in** | None | Yes |

## Architecture

```
MCP Client → index.ts (server) → handlers.ts (logic) → git.ts (CLI execution)
```

- All git operations use `execFileSync` — synchronous by design since they're sequential CLI commands
- Tool arguments are validated at the boundary via assertion functions (no unsafe casts)
- File paths are checked against path traversal before use
- Stack detection uses `git branchless query 'stack()' --branches`, not regex

See [CLAUDE.md](./CLAUDE.md) for detailed development guidance.

## Security

Boron runs `git` and `gh` commands using your local credentials. Here's what it does and doesn't have access to:

**Scope:**
- Operates only within the current working directory (path traversal is blocked)
- Uses `execFileSync` with argument arrays — no shell interpolation, no command injection
- Branch names validated against strict alphanumeric regex
- File paths checked for traversal, symlinks resolved before access
- All git commands use `--` separator to prevent flag injection

**What Boron does NOT do:**
- Read or write files outside the repository root
- Execute arbitrary shell commands
- Store credentials, tokens, or secrets
- Make network requests beyond `git push` and `gh` API calls

**For auditing:** Tool descriptions are static in [`src/tools.ts`](./src/tools.ts). Input validation is in [`src/validation.ts`](./src/validation.ts).

## License

MIT
