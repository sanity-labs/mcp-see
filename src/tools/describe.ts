/**
 * describe tool - Get AI description of an image
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { imageToBase64 } from "../utils/image.js";
import {
  geminiDescribe,
  openaiDescribe,
  claudeDescribe,
  Provider,
} from "../providers/index.js";

export const describeTool: Tool = {
  name: "describe",
  description:
    "Get an AI-generated description of an image. Supports multiple providers (Gemini, OpenAI, Claude).",
  inputSchema: {
    type: "object",
    properties: {
      image: {
        type: "string",
        description: "Path to the image file",
      },
      prompt: {
        type: "string",
        description: "Optional question or instruction for the description",
      },
      provider: {
        type: "string",
        enum: ["gemini", "openai", "claude"],
        description: "Vision provider to use (default: gemini)",
      },
      detail: {
        type: "string",
        enum: ["brief", "detailed"],
        description: "Level of detail in the description (default: detailed)",
      },
    },
    required: ["image"],
  },
};

export async function handleDescribe(args: Record<string, unknown>) {
  const image = args.image as string;
  const prompt = args.prompt as string | undefined;
  const provider = (args.provider as Provider) || "gemini";
  const detail = (args.detail as "brief" | "detailed") || "detailed";

  const { base64, mimeType } = await imageToBase64(image);

  let description: string;

  switch (provider) {
    case "gemini":
      description = await geminiDescribe(base64, mimeType, prompt, detail);
      break;
    case "openai":
      description = await openaiDescribe(base64, mimeType, prompt, detail);
      break;
    case "claude":
      description = await claudeDescribe(base64, mimeType, prompt, detail);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  return {
    content: [
      {
        type: "text",
        text: description,
      },
    ],
  };
}
