import type {
  CreateStackArgs,
  SubmitStackArgs,
  NavigateStackArgs,
  ModifyCommitArgs,
  MergeStackArgs,
} from "./types.js";

function assertObject(
  value: unknown,
  name: string
): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error(`${name}: expected an object`);
  }
}

const BRANCH_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._\/-]*$/;
const MAX_COMMITS = 50;

function assertBranchName(name: unknown, label: string): asserts name is string {
  if (typeof name !== "string") {
    throw new Error(`${label} must be a string`);
  }
  if (!BRANCH_NAME_RE.test(name)) {
    throw new Error(
      `${label} contains invalid characters. Must start with alphanumeric and contain only alphanumeric, '.', '_', '/', '-'.`
    );
  }
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  for (const [i, item] of value.entries()) {
    if (typeof item !== "string") {
      throw new Error(`${label}[${i}] must be a string`);
    }
    if (item.includes("\0")) {
      throw new Error(`${label}[${i}] contains null bytes`);
    }
  }
}

export function assertCreateStackArgs(value: unknown): CreateStackArgs {
  assertObject(value, "create_stack");
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.commits) || obj.commits.length === 0) {
    throw new Error("create_stack: 'commits' must be a non-empty array");
  }
  if (obj.commits.length > MAX_COMMITS) {
    throw new Error(`create_stack: maximum ${MAX_COMMITS} commits per stack`);
  }

  for (const [i, c] of obj.commits.entries()) {
    assertObject(c, `commits[${i}]`);
    const commit = c as Record<string, unknown>;
    assertBranchName(commit.branch_name, `commits[${i}].branch_name`);
    if (typeof commit.commit_message !== "string") {
      throw new Error(`commits[${i}].commit_message must be a string`);
    }
    assertStringArray(commit.files, `commits[${i}].files`);
  }

  if (obj.base_branch !== undefined) {
    assertBranchName(obj.base_branch, "create_stack: base_branch");
  }

  return value as unknown as CreateStackArgs;
}

export function assertSubmitStackArgs(value: unknown): SubmitStackArgs {
  assertObject(value, "submit_stack");
  const obj = value as Record<string, unknown>;

  if (obj.draft !== undefined && typeof obj.draft !== "boolean") {
    throw new Error("submit_stack: 'draft' must be a boolean");
  }
  if (obj.linear_issue !== undefined && typeof obj.linear_issue !== "string") {
    throw new Error("submit_stack: 'linear_issue' must be a string");
  }

  return value as SubmitStackArgs;
}

export function assertNavigateStackArgs(value: unknown): NavigateStackArgs {
  assertObject(value, "navigate_stack");
  const obj = value as Record<string, unknown>;

  if (obj.direction !== "next" && obj.direction !== "prev") {
    throw new Error(
      "navigate_stack: 'direction' must be 'next' or 'prev'"
    );
  }
  if (obj.distance !== undefined) {
    if (
      typeof obj.distance !== "number" ||
      !Number.isInteger(obj.distance) ||
      obj.distance < 1 ||
      obj.distance > 100
    ) {
      throw new Error(
        "navigate_stack: 'distance' must be an integer between 1 and 100"
      );
    }
  }

  return value as unknown as NavigateStackArgs;
}

export function assertModifyCommitArgs(value: unknown): ModifyCommitArgs {
  assertObject(value, "modify_commit");
  const obj = value as Record<string, unknown>;

  if (obj.files !== undefined) {
    assertStringArray(obj.files, "modify_commit: files");
  }
  if (obj.message !== undefined && typeof obj.message !== "string") {
    throw new Error("modify_commit: 'message' must be a string");
  }
  if (obj.auto_restack !== undefined && typeof obj.auto_restack !== "boolean") {
    throw new Error("modify_commit: 'auto_restack' must be a boolean");
  }
  if (!obj.files && !obj.message) {
    throw new Error(
      "modify_commit: at least one of 'files' or 'message' must be provided"
    );
  }

  return value as ModifyCommitArgs;
}

export function assertMergeStackArgs(value: unknown): MergeStackArgs {
  assertObject(value, "merge_stack");
  const obj = value as Record<string, unknown>;

  const validMethods = ["squash", "merge", "rebase"];
  if (obj.method !== undefined) {
    if (typeof obj.method !== "string" || !validMethods.includes(obj.method)) {
      throw new Error(
        `merge_stack: 'method' must be one of: ${validMethods.join(", ")}`
      );
    }
  }
  if (
    obj.delete_branches !== undefined &&
    typeof obj.delete_branches !== "boolean"
  ) {
    throw new Error("merge_stack: 'delete_branches' must be a boolean");
  }

  return value as MergeStackArgs;
}
