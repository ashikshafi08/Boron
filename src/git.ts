import { execFileSync } from "child_process";

class CLIRunner {
  constructor(private binary: string, private cwd: string) {}

  run(args: string[]): string {
    try {
      return execFileSync(this.binary, args, {
        cwd: this.cwd,
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();
    } catch (error: unknown) {
      const stderr = extractStderr(error);
      throw new Error(`${this.binary} ${args.join(" ")} failed:\n${stderr}`);
    }
  }
}

function extractStderr(error: unknown): string {
  if (error instanceof Error) {
    const execError = error as { stderr?: Buffer | string };
    return execError.stderr?.toString().trim() || error.message;
  }
  return String(error);
}

export function createGit(cwd: string): CLIRunner {
  return new CLIRunner("git", cwd);
}

export function createGh(cwd: string): CLIRunner {
  return new CLIRunner("gh", cwd);
}

export type { CLIRunner };
