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

export function assertCreateStackArgs(value: unknown): CreateStackArgs {
  assertObject(value, "create_stack");
  const obj = value as Record<string, unknown>;

  if (!Array.isArray(obj.commits) || obj.commits.length === 0) {
    throw new Error("create_stack: 'commits' must be a non-empty array");
  }

  for (const [i, c] of obj.commits.entries()) {
    assertObject(c, `commits[${i}]`);
    const commit = c as Record<string, unknown>;
    if (typeof commit.branch_name !== "string") {
      throw new Error(`commits[${i}].branch_name must be a string`);
    }
    if (typeof commit.commit_message !== "string") {
      throw new Error(`commits[${i}].commit_message must be a string`);
    }
    if (!Array.isArray(commit.files)) {
      throw new Error(`commits[${i}].files must be an array`);
    }
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
  if (obj.distance !== undefined && typeof obj.distance !== "number") {
    throw new Error("navigate_stack: 'distance' must be a number");
  }

  return value as unknown as NavigateStackArgs;
}

export function assertModifyCommitArgs(value: unknown): ModifyCommitArgs {
  assertObject(value, "modify_commit");
  const obj = value as Record<string, unknown>;

  if (obj.files !== undefined && !Array.isArray(obj.files)) {
    throw new Error("modify_commit: 'files' must be an array");
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
  if (obj.method !== undefined && !validMethods.includes(obj.method as string)) {
    throw new Error(
      `merge_stack: 'method' must be one of: ${validMethods.join(", ")}`
    );
  }
  if (
    obj.delete_branches !== undefined &&
    typeof obj.delete_branches !== "boolean"
  ) {
    throw new Error("merge_stack: 'delete_branches' must be a boolean");
  }

  return value as MergeStackArgs;
}
