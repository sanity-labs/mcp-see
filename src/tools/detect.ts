/**
 * detect tool - Detect objects with bounding boxes (Gemini only)
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { imageToBase64 } from "../utils/image.js";
import { geminiDetect } from "../providers/index.js";

export const detectTool: Tool = {
  name: "detect",
  description:
    "Detect objects in an image and return bounding boxes. Uses Gemini for native bounding box support. Coordinates are normalized 0-1000 as [ymin, xmin, ymax, xmax].",
  inputSchema: {
    type: "object",
    properties: {
      image: {
        type: "string",
        description: "Path to the image file or URL (http/https)",
      },
      prompt: {
        type: "string",
        description:
          "Optional: what to detect (e.g., 'find all buttons', 'detect UI elements')",
      },
    },
    required: ["image"],
  },
};

export async function handleDetect(args: Record<string, unknown>) {
  const image = args.image as string;
  const prompt = args.prompt as string | undefined;

  const { base64, mimeType } = await imageToBase64(image);
  const detections = await geminiDetect(base64, mimeType, prompt);

  if (detections.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              count: 0,
              objects: [],
              note: "No objects detected. Try a more specific prompt.",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: detections.length,
            objects: detections.map((d, i) => ({
              id: i + 1,
              label: d.label,
              bbox: d.bbox,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
