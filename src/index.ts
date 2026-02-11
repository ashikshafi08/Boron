#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS } from "./tools.js";
import { StackHandlers } from "./handlers.js";
import {
  assertCreateStackArgs,
  assertSubmitStackArgs,
  assertNavigateStackArgs,
  assertModifyCommitArgs,
  assertMergeStackArgs,
} from "./validation.js";

const server = new Server(
  { name: "boron", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const handlers = new StackHandlers(process.cwd());

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [...TOOLS],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_stack":
        return await handlers.createStack(assertCreateStackArgs(args));
      case "submit_stack":
        return await handlers.submitStack(assertSubmitStackArgs(args));
      case "restack":
        return await handlers.restack();
      case "view_stack":
        return await handlers.viewStack();
      case "sync_stack":
        return await handlers.syncStack();
      case "navigate_stack":
        return await handlers.navigateStack(assertNavigateStackArgs(args));
      case "modify_commit":
        return await handlers.modifyCommit(assertModifyCommitArgs(args));
      case "merge_stack":
        return await handlers.mergeStack(assertMergeStackArgs(args));
      case "undo_last":
        return await handlers.undoLast();
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `Error: ${message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = async () => {
    await server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch(console.error);
