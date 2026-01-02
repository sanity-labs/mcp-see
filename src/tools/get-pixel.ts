/**
 * get_pixel tool - Get exact color at pixel coordinates
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getPixelColor } from "../utils/image.js";
import { rgbToHex, rgbToHsl, getColorName } from "../utils/color.js";

export const getPixelTool: Tool = {
  name: "get_pixel",
  description:
    "Get the exact color at specific pixel coordinates. Returns hex, RGB, HSL, and human-readable color name.",
  inputSchema: {
    type: "object",
    properties: {
      image: {
        type: "string",
        description: "Path to the image file",
      },
      x: {
        type: "number",
        description: "X coordinate (pixel column, 0-indexed from left)",
      },
      y: {
        type: "number",
        description: "Y coordinate (pixel row, 0-indexed from top)",
      },
    },
    required: ["image", "x", "y"],
  },
};

export async function handleGetPixel(args: Record<string, unknown>) {
  const image = args.image as string;
  const x = args.x as number;
  const y = args.y as number;

  const { r, g, b } = await getPixelColor(image, x, y);
  const name = await getColorName(r, g, b);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            hex: rgbToHex(r, g, b),
            rgb: { r, g, b },
            hsl: rgbToHsl(r, g, b),
            name,
            coordinates: { x, y },
          },
          null,
          2
        ),
      },
    ],
  };
}
