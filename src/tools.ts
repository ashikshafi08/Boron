import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const TOOLS = [
  {
    name: "create_stack",
    description:
      "Create a stack of git branches from staged/unstaged changes. Each entry becomes a branch with an atomic commit. Branches chain sequentially — each builds on the previous one. Requires git-branchless to be initialized.",
    inputSchema: {
      type: "object" as const,
      properties: {
        commits: {
          type: "array",
          description: "Commits to create in stack order (bottom to top)",
          items: {
            type: "object",
            properties: {
              branch_name: {
                type: "string",
                description:
                  "Branch name, e.g. 'feat/tm-161-01-migrations'",
              },
              commit_message: {
                type: "string",
                description:
                  "Conventional commit message, e.g. 'feat: add authorization tables'",
              },
              files: {
                type: "array",
                items: { type: "string" },
                description: "File paths to include in this commit",
              },
            },
            required: ["branch_name", "commit_message", "files"],
          },
        },
        base_branch: {
          type: "string",
          description: "Base branch to stack on (default: 'main')",
          default: "main",
        },
        linear_issue: {
          type: "string",
          description: "Linear issue ID to link in commits, e.g. 'TM-161'",
        },
      },
      required: ["commits"],
    },
  },
  {
    name: "submit_stack",
    description:
      "Push all stack branches and create chained GitHub PRs. Each PR targets the previous branch as its base, forming a reviewable dependency chain. Updates existing PRs by force-pushing.",
    inputSchema: {
      type: "object" as const,
      properties: {
        draft: {
          type: "boolean",
          description: "Create as draft PRs",
          default: false,
        },
        linear_issue: {
          type: "string",
          description: "Linear issue ID to link in PR bodies",
        },
      },
    },
  },
  {
    name: "restack",
    description:
      "Rebase all descendant branches after amending a mid-stack commit. Powered by git-branchless — automatically detects orphaned commits and rebases the entire chain.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "view_stack",
    description:
      "Display the current commit stack as a visual graph using git-branchless smartlog. Shows branches, commit messages, and parent-child relationships.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "sync_stack",
    description:
      "Pull remote changes and rebase all local stacks on top of the updated main branch. Equivalent to git fetch + git sync --pull.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "navigate_stack",
    description:
      "Move between commits in the stack. Uses git-branchless next/prev to traverse the commit graph.",
    inputSchema: {
      type: "object" as const,
      properties: {
        direction: {
          type: "string",
          enum: ["next", "prev"],
          description: "'next' moves toward tip, 'prev' moves toward base",
        },
        distance: {
          type: "integer",
          description: "Number of commits to move (default: 1)",
          default: 1,
        },
      },
      required: ["direction"],
    },
  },
  {
    name: "modify_commit",
    description:
      "Amend the current commit with new file changes and/or a new message. Automatically restacks descendant branches unless disabled.",
    inputSchema: {
      type: "object" as const,
      properties: {
        files: {
          type: "array",
          items: { type: "string" },
          description: "File paths to stage and amend into the current commit",
        },
        message: {
          type: "string",
          description: "New commit message (replaces the existing one)",
        },
        auto_restack: {
          type: "boolean",
          description: "Automatically restack after amending (default: true)",
          default: true,
        },
      },
    },
  },
  {
    name: "merge_stack",
    description:
      "Merge all PRs in the current stack from bottom to top. Uses the specified merge method and optionally cleans up local branches afterward.",
    inputSchema: {
      type: "object" as const,
      properties: {
        method: {
          type: "string",
          enum: ["squash", "merge", "rebase"],
          description: "Merge method for PRs (default: 'squash')",
          default: "squash",
        },
        delete_branches: {
          type: "boolean",
          description: "Delete local branches after merging (default: true)",
          default: true,
        },
      },
    },
  },
  {
    name: "undo_last",
    description:
      "Undo the last git-branchless operation. Uses git undo to revert the most recent action (commit, restack, checkout, etc.).",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
] as const satisfies readonly Tool[];
