import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export interface CommitSpec {
  branch_name: string;
  commit_message: string;
  files: string[];
}

export interface CreateStackArgs {
  commits: CommitSpec[];
  base_branch?: string;
  linear_issue?: string;
}

export interface SubmitStackArgs {
  draft?: boolean;
  linear_issue?: string;
}

export interface NavigateStackArgs {
  direction: "next" | "prev";
  distance?: number;
}

export interface ModifyCommitArgs {
  files?: string[];
  message?: string;
  auto_restack?: boolean;
}

export interface MergeStackArgs {
  method?: "squash" | "merge" | "rebase";
  delete_branches?: boolean;
}

export type { CallToolResult };
