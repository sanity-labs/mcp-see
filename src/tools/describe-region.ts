/**
 * describe_region tool - Crop and describe a specific region
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { cropToRegion } from "../utils/image.js";
import {
  geminiDescribe,
  openaiDescribe,
  claudeDescribe,
  Provider,
} from "../providers/index.js";

export const describeRegionTool: Tool = {
  name: "describe_region",
  description:
    "Crop an image to a bounding box and describe that region in detail. Use this after detect() to zoom in on specific objects.",
  inputSchema: {
    type: "object",
    properties: {
      image: {
        type: "string",
        description: "Path to the image file or URL (http/https)",
      },
      bbox: {
        type: "array",
        items: { type: "number" },
        minItems: 4,
        maxItems: 4,
        description:
          "Bounding box as [ymin, xmin, ymax, xmax] normalized 0-1000",
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
    },
    required: ["image", "bbox"],
  },
};

export async function handleDescribeRegion(args: Record<string, unknown>) {
  const image = args.image as string;
  const bbox = args.bbox as [number, number, number, number];
  const prompt = args.prompt as string | undefined;
  const provider = (args.provider as Provider) || "gemini";

  // Crop to region
  const { buffer } = await cropToRegion(image, bbox);
  const base64 = buffer.toString("base64");
  const mimeType = "image/png";

  let description: string;

  switch (provider) {
    case "gemini":
      description = await geminiDescribe(base64, mimeType, prompt, "detailed");
      break;
    case "openai":
      description = await openaiDescribe(base64, mimeType, prompt, "detailed");
      break;
    case "claude":
      description = await claudeDescribe(base64, mimeType, prompt, "detailed");
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            bbox,
            description,
          },
          null,
          2
        ),
      },
    ],
  };
}
