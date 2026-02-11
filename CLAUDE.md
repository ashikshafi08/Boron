# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Boron?

An MCP server that gives AI agents the ability to create stacked pull requests using git-branchless. It exposes 9 tools over stdio that orchestrate `git`, `git branchless`, and `gh` CLI commands.

## Build & Dev

```bash
npm run build        # tsc → dist/
npm run watch        # tsc --watch
npm start            # node dist/index.js (runs the MCP server over stdio)
```

There is no test suite or linter configured. Verification is: `npm run build` must produce zero errors.

## Architecture

All source is in `src/` (TypeScript, ESM, strict mode). The data flow is linear:

```
MCP Client → index.ts (server + routing) → handlers.ts (business logic) → git.ts (CLI execution)
```

**`types.ts`** — All interfaces for tool arguments (`CreateStackArgs`, `ModifyCommitArgs`, etc.). Re-exports `CallToolResult` from the MCP SDK. No custom result type — always use SDK's `CallToolResult`.

**`validation.ts`** — Assertion functions (`assertCreateStackArgs`, etc.) that validate `unknown` input at the system boundary. Every tool that takes arguments must go through its assertion function — no `as unknown as` casts in `index.ts`.

**`git.ts`** — Single `CLIRunner` class wrapping `execFileSync`. Factory functions `createGit(cwd)` and `createGh(cwd)` return instances for `git` and `gh` respectively. All CLI errors use `error: unknown` with a typed `extractStderr` helper.

**`tools.ts`** — Tool definitions array typed as `as const satisfies readonly Tool[]`. Schema-only, no logic. When adding a tool, add its definition here, its arg type in `types.ts`, its assertion in `validation.ts`, its handler in `handlers.ts`, and its case in the `index.ts` switch.

**`handlers.ts`** — `StackHandlers` class with all tool implementations. Key patterns:
- `result(text)` helper returns `CallToolResult` with text content
- `validateFilePaths(files)` blocks path traversal (resolve + startsWith check)
- `validateRepository()` checks `.git` and `.git/branchless` exist
- Stack detection uses `git branchless query 'stack()' --branches` (not regex)
- `submitStack` always pushes branches (updating existing PRs), only skips PR *creation* if one exists

**`index.ts`** — MCP server setup. Error responses include `isError: true`. Graceful shutdown on SIGINT/SIGTERM.

## Key Conventions

- All handler methods return `Promise<CallToolResult>` (SDK type, not a custom one)
- No `any` types anywhere — use `unknown` and narrow
- Tool arguments enter as `unknown` from the MCP SDK and must pass through assertion functions in `validation.ts`
- File paths from external input must be validated against path traversal before use
- `git.ts` uses `execFileSync` (not `exec` or `spawn`) — all git operations are synchronous by design since they're sequential CLI commands

## External Dependencies

- **git-branchless** — provides `git sl`, `git restack`, `git sync`, `git next/prev`, `git undo`, `git branchless query`
- **GitHub CLI** (`gh`) — provides `gh pr create`, `gh pr view`, `gh pr merge`, `gh repo view`
- **MCP SDK** (`@modelcontextprotocol/sdk`) — server framework, type definitions
