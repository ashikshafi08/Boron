import { existsSync } from "fs";
import { join, resolve } from "path";
import { createGit, createGh } from "./git.js";
import type { CLIRunner } from "./git.js";
import type {
  CreateStackArgs,
  SubmitStackArgs,
  NavigateStackArgs,
  ModifyCommitArgs,
  MergeStackArgs,
  CallToolResult,
} from "./types.js";

export class StackHandlers {
  private git: CLIRunner;
  private gh: CLIRunner;
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
    this.git = createGit(cwd);
    this.gh = createGh(cwd);
  }

  private result(text: string): CallToolResult {
    return { content: [{ type: "text" as const, text }] };
  }

  private validateFilePaths(files: string[]): void {
    for (const file of files) {
      const resolved = resolve(this.cwd, file);
      if (!resolved.startsWith(this.cwd)) {
        throw new Error(`Path traversal blocked: ${file}`);
      }
    }
  }

  private validateRepository(): void {
    if (!existsSync(join(this.cwd, ".git"))) {
      throw new Error("Not in a git repository");
    }
    if (!existsSync(join(this.cwd, ".git", "branchless"))) {
      throw new Error(
        "git-branchless not initialized. Run: git branchless init"
      );
    }
  }

  private commitFiles(
    commit: { branch_name: string; commit_message: string; files: string[] },
    linearIssue?: string
  ): string[] {
    const { branch_name, commit_message, files } = commit;
    const lines: string[] = [];

    this.git.run(["checkout", "-b", branch_name]);
    lines.push(`\nCreated branch: ${branch_name}`);

    const existing = files.filter((f) => existsSync(join(this.cwd, f)));

    if (existing.length === 0) {
      throw new Error(`No files found: ${files.join(", ")}`);
    }

    if (existing.length < files.length) {
      const missing = files.filter((f) => !existing.includes(f));
      lines.push(`Warning — files not found: ${missing.join(", ")}`);
    }

    this.git.run(["add", ...existing]);

    const fullMessage = linearIssue
      ? `${commit_message}\n\nRelated: ${linearIssue}`
      : commit_message;

    this.git.run(["commit", "-m", fullMessage]);
    lines.push(`Committed: ${commit_message}`);
    lines.push(`  Files: ${existing.join(", ")}`);

    return lines;
  }

  private pushBranch(branch: string): void {
    try {
      this.git.run(["push", "-u", "origin", branch]);
    } catch {
      this.git.run(["push", "--force-with-lease", "-u", "origin", branch]);
    }
  }

  private buildPrBody(
    branch: string,
    allBranches: string[],
    linearIssue?: string
  ): string {
    let body = `Part of stacked PR chain.\n\n**Stack:**\n`;
    allBranches.forEach((b, idx) => {
      const indicator = b === branch ? ">" : " ";
      body += `${indicator} ${idx + 1}. \`${b}\`\n`;
    });

    if (linearIssue) {
      body += `\n**Linear Issue:** ${linearIssue}\n`;
    }

    body += `\nGenerated with [Boron](https://github.com/ashikshafi08/Boron)`;
    return body;
  }

  private ensurePullRequest(
    branch: string,
    base: string,
    allBranches: string[],
    options: { draft: boolean; linearIssue?: string }
  ): string {
    // Check if PR already exists
    try {
      return this.gh.run([
        "pr",
        "view",
        branch,
        "--json",
        "url",
        "-q",
        ".url",
      ]);
    } catch {
      // No existing PR — create one
    }

    const commitMsg = this.git.run([
      "log",
      "-1",
      "--pretty=%s",
      branch,
    ]);

    const prBody = this.buildPrBody(branch, allBranches, options.linearIssue);

    const ghArgs = [
      "pr",
      "create",
      "--base",
      base,
      "--head",
      branch,
      "--title",
      commitMsg,
      "--body",
      prBody,
    ];

    if (options.draft) {
      ghArgs.push("--draft");
    }

    return this.gh.run(ghArgs);
  }

  async createStack(args: CreateStackArgs): Promise<CallToolResult> {
    const { commits, base_branch = "main", linear_issue } = args;
    const lines: string[] = [];

    // Validate all file paths before any git operations
    for (const commit of commits) {
      this.validateFilePaths(commit.files);
    }

    this.validateRepository();

    this.git.run(["checkout", base_branch]);
    lines.push(`Starting from ${base_branch}`);

    for (const commit of commits) {
      try {
        lines.push(...this.commitFiles(commit, linear_issue));
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        lines.push(`Failed on ${commit.branch_name}: ${msg}`);
        break;
      }
    }

    lines.push("\nStack created. Current state:");
    try {
      lines.push(this.git.run(["sl"]));
    } catch {
      lines.push(this.git.run(["log", "--oneline", "--graph", "-10"]));
    }

    return this.result(lines.join("\n"));
  }

  async submitStack(args: SubmitStackArgs): Promise<CallToolResult> {
    const { draft = false, linear_issue } = args;
    const lines: string[] = [];

    const stackBranchesRaw = this.git.run([
      "branchless",
      "query",
      "stack()",
      "--branches",
    ]);
    const stackBranches = stackBranchesRaw
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    if (stackBranches.length === 0) {
      return this.result(
        "No stack branches found. Create a stack first with create_stack."
      );
    }

    lines.push(
      `Submitting ${stackBranches.length} branches as stacked PRs...\n`
    );

    let previousBranch = "main";

    for (const branch of stackBranches) {
      try {
        // Always push (updates existing PR if any)
        this.pushBranch(branch);

        // Create PR if needed, or get existing PR URL
        const prUrl = this.ensurePullRequest(branch, previousBranch, stackBranches, {
          draft,
          linearIssue: linear_issue,
        });

        lines.push(`${branch}`);
        lines.push(`  ${prUrl}\n`);

        previousBranch = branch;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        lines.push(`Failed on ${branch}: ${msg}`);
      }
    }

    lines.push("Stack submitted.");

    try {
      const repo = this.gh.run([
        "repo",
        "view",
        "--json",
        "nameWithOwner",
        "-q",
        ".nameWithOwner",
      ]);
      lines.push(`View PRs: https://github.com/${repo}/pulls`);
    } catch {
      // Non-critical
    }

    return this.result(lines.join("\n"));
  }

  async restack(): Promise<CallToolResult> {
    const output = this.git.run(["restack"]);
    return this.result(`Stack rebased.\n\n${output}`);
  }

  async viewStack(): Promise<CallToolResult> {
    try {
      const output = this.git.run(["sl"]);
      return this.result(`Current stack:\n\n${output}`);
    } catch {
      const output = this.git.run([
        "log",
        "--oneline",
        "--graph",
        "--all",
        "-20",
      ]);
      return this.result(
        `Smartlog unavailable, falling back to git log:\n\n${output}`
      );
    }
  }

  async syncStack(): Promise<CallToolResult> {
    const lines: string[] = [];

    lines.push("Fetching from remote...");
    this.git.run(["fetch", "origin"]);

    lines.push("Syncing stacks with main...");
    const syncOutput = this.git.run(["sync", "--pull"]);
    lines.push(syncOutput);

    lines.push("\nStack synced.");
    return this.result(lines.join("\n"));
  }

  async navigateStack(args: NavigateStackArgs): Promise<CallToolResult> {
    const { direction, distance = 1 } = args;

    const gitArgs =
      distance > 1 ? [direction, String(distance)] : [direction];

    this.git.run(gitArgs);

    const currentBranch = this.git.run(["branch", "--show-current"]);
    const commitMsg = this.git.run(["log", "-1", "--pretty=%s"]);

    return this.result(
      `Moved ${direction} ${distance} commit(s)\n\nCurrent: ${currentBranch || "detached HEAD"}\nCommit: ${commitMsg}`
    );
  }

  async modifyCommit(args: ModifyCommitArgs): Promise<CallToolResult> {
    const { files, message, auto_restack = true } = args;
    const lines: string[] = [];

    if (files) {
      this.validateFilePaths(files);
      this.git.run(["add", ...files]);
      this.git.run(["commit", "--amend", "--no-edit"]);
      lines.push(`Amended commit with files: ${files.join(", ")}`);
    }

    if (message) {
      this.git.run(["commit", "--amend", "-m", message]);
      lines.push(`Updated commit message: ${message}`);
    }

    if (auto_restack) {
      const restackOutput = this.git.run(["restack"]);
      lines.push(`\nRestacked:\n${restackOutput}`);
    }

    const currentCommit = this.git.run(["log", "-1", "--pretty=%h %s"]);
    lines.push(`\nCurrent commit: ${currentCommit}`);

    return this.result(lines.join("\n"));
  }

  async mergeStack(args: MergeStackArgs): Promise<CallToolResult> {
    const { method = "squash", delete_branches = true } = args;
    const lines: string[] = [];

    const stackBranchesRaw = this.git.run([
      "branchless",
      "query",
      "stack()",
      "--branches",
    ]);
    const stackBranches = stackBranchesRaw
      .split("\n")
      .map((b) => b.trim())
      .filter(Boolean);

    if (stackBranches.length === 0) {
      return this.result("No stack branches found to merge.");
    }

    lines.push(
      `Merging ${stackBranches.length} PRs using ${method} method...\n`
    );

    for (const branch of stackBranches) {
      try {
        const mergeOutput = this.gh.run([
          "pr",
          "merge",
          branch,
          `--${method}`,
          "--delete-branch",
        ]);
        lines.push(`Merged: ${branch}`);
        lines.push(`  ${mergeOutput}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        lines.push(`Failed to merge ${branch}: ${msg}`);
        break;
      }
    }

    if (delete_branches) {
      for (const branch of stackBranches) {
        try {
          this.git.run(["branch", "-D", branch]);
        } catch {
          // Branch may already be deleted by --delete-branch
        }
      }
      lines.push("\nCleaned up local branches.");
    }

    lines.push("\nStack merged.");
    return this.result(lines.join("\n"));
  }

  async undoLast(): Promise<CallToolResult> {
    const output = this.git.run(["undo", "--yes"]);
    return this.result(`Undo complete:\n\n${output}`);
  }
}
