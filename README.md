# Boron

An MCP server for stacked pull requests, powered by [git-branchless](https://github.com/arxanas/git-branchless). A free, open-source alternative to Graphite.

Boron gives AI agents (Claude Code, etc.) the ability to split large code changes into small, reviewable, dependent PRs — automatically.

## How it works

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

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [git-branchless](https://github.com/arxanas/git-branchless) — stack management
- [GitHub CLI](https://cli.github.com/) (`gh`) — PR creation

```bash
brew install git-branchless gh
```

## Installation

### Option 1: Clone and build

```bash
git clone https://github.com/ashikshafi08/Boron.git
cd Boron
npm install
npm run build
```

### Option 2: npx (coming soon)

```bash
npx boron-mcp
```

## Setup

### 1. Initialize git-branchless in your repo

```bash
cd your-project
git branchless init
```

### 2. Add Boron to Claude Code

Add to `~/.claude/.mcp.json`:

```json
{
  "mcpServers": {
    "boron": {
      "command": "node",
      "args": ["/path/to/Boron/dist/index.js"]
    }
  }
}
```

Restart Claude Code. Run `/mcp` to verify "boron" appears as connected.

## Tools

| Tool | Description |
|------|-------------|
| `create_stack` | Create a stack of branches from a list of atomic commits |
| `submit_stack` | Push branches and create chained GitHub PRs |
| `restack` | Rebase descendants after amending a mid-stack commit |
| `view_stack` | Show the commit graph via smartlog |
| `sync_stack` | Pull remote changes and rebase all stacks |
| `navigate_stack` | Move between commits in the stack |

## Usage

### With Claude Code

Just ask Claude to split your changes:

> "I just implemented the auth system. Split it into stacked PRs linked to TM-161."

Claude will:
1. Analyze your uncommitted changes
2. Group files into logical, atomic commits
3. Call `create_stack` to build the branch chain
4. Call `submit_stack` to create GitHub PRs

### Manual (via MCP)

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
    }
  ],
  base_branch: "main",
  linear_issue: "TM-161"
})

submit_stack({ draft: false, linear_issue: "TM-161" })
```

### Mid-stack fixes

```
navigate_stack({ direction: "prev" })  // go back to the commit
// ... make your fix, amend the commit ...
restack()                               // rebase everything above
```

### Sync with main

```
sync_stack()  // fetch + rebase all stacks onto updated main
```

## Branch naming convention

```
{type}/{issue-id}-{sequence}-{description}
```

Examples:
- `feat/tm-161-01-migrations`
- `feat/tm-161-02-models`
- `fix/tm-162-01-validation`

## Why Boron?

| | Boron | Graphite |
|---|---|---|
| **Cost** | Free | $32/user/month |
| **Stack management** | git-branchless | Proprietary |
| **AI integration** | MCP (works with any agent) | GT MCP only |
| **PR creation** | GitHub CLI | Native |
| **Open source** | Yes | No |
| **Vendor lock-in** | None | Yes |

## License

MIT
