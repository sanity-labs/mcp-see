#!/usr/bin/env node
/**
 * mcp-see - MCP server for AI-powered image analysis
 *
 * Tools:
 * - describe: Get AI description of an image (multi-provider)
 * - detect: Detect objects with bounding boxes (Gemini)
 * - describe_region: Analyze a specific region of an image
 * - analyze_colors: Extract dominant colors from a region (K-Means LAB)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { describeTool, handleDescribe } from "./tools/describe.js";
import { detectTool, handleDetect } from "./tools/detect.js";
import { describeRegionTool, handleDescribeRegion } from "./tools/describe-region.js";
import { analyzeColorsTool, handleAnalyzeColors } from "./tools/analyze-colors.js";

const server = new Server(
  {
    name: "mcp-see",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      describeTool,
      detectTool,
      describeRegionTool,
      analyzeColorsTool,
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "describe":
        return await handleDescribe(args);
      case "detect":
        return await handleDetect(args);
      case "describe_region":
        return await handleDescribeRegion(args);
      case "analyze_colors":
        return await handleAnalyzeColors(args);
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-see server running on stdio");
}

main().catch(console.error);
