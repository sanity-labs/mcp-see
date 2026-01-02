/**
 * analyze_colors tool - Extract dominant colors from a region
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { getRegionPixels, loadImage } from "../utils/image.js";
import { rgbToHex, rgbToHsl, getColorName } from "../utils/color.js";
import { kmeansCluster } from "../utils/kmeans.js";
import sharp from "sharp";

export const analyzeColorsTool: Tool = {
  name: "analyze_colors",
  description:
    "Extract dominant colors from an image region using K-Means clustering in LAB color space. Returns colors sorted by frequency with human-readable names from color.pizza.",
  inputSchema: {
    type: "object",
    properties: {
      image: {
        type: "string",
        description: "Path to the image file",
      },
      bbox: {
        type: "array",
        items: { type: "number" },
        minItems: 4,
        maxItems: 4,
        description:
          "Optional bounding box as [ymin, xmin, ymax, xmax] normalized 0-1000. Defaults to full image.",
      },
      top: {
        type: "number",
        description: "Number of dominant colors to return (default: 5)",
      },
    },
    required: ["image"],
  },
};

export async function handleAnalyzeColors(args: Record<string, unknown>) {
  const image = args.image as string;
  const bbox = args.bbox as [number, number, number, number] | undefined;
  const top = (args.top as number) || 5;

  let pixels: Uint8Array;
  let width: number;
  let height: number;

  if (bbox) {
    // Analyze specific region
    const region = await getRegionPixels(image, bbox);
    pixels = region.pixels;
    width = region.width;
    height = region.height;
  } else {
    // Analyze full image
    const { image: img, metadata } = await loadImage(image);
    const { data } = await img.raw().toBuffer({ resolveWithObject: true });
    pixels = new Uint8Array(data);
    width = metadata.width;
    height = metadata.height;
  }

  const totalPixels = pixels.length / 3;

  // Run K-Means clustering
  const result = kmeansCluster(pixels, top);

  // Calculate average color
  let avgR = 0,
    avgG = 0,
    avgB = 0;
  for (let i = 0; i < pixels.length; i += 3) {
    avgR += pixels[i];
    avgG += pixels[i + 1];
    avgB += pixels[i + 2];
  }
  avgR = Math.round(avgR / totalPixels);
  avgG = Math.round(avgG / totalPixels);
  avgB = Math.round(avgB / totalPixels);

  // Build dominant colors array sorted by count
  const sortedIndices = result.counts
    .map((count, idx) => ({ count, idx }))
    .sort((a, b) => b.count - a.count)
    .map((item) => item.idx);

  const dominant = await Promise.all(
    sortedIndices.map(async (idx) => {
      const [r, g, b] = result.centroids[idx];
      const percentage = (result.counts[idx] / result.labels.length) * 100;
      const name = await getColorName(r, g, b);

      return {
        hex: rgbToHex(r, g, b),
        rgb: [r, g, b],
        hsl: rgbToHsl(r, g, b),
        name,
        percentage: Math.round(percentage * 100) / 100,
      };
    })
  );

  // Determine confidence based on variance
  // Low variance = flat colors (UI), high variance = photo/gradient
  const confidence =
    result.variance < 50 ? "high" : result.variance < 200 ? "medium" : "low";

  const average = {
    hex: rgbToHex(avgR, avgG, avgB),
    rgb: [avgR, avgG, avgB],
    name: await getColorName(avgR, avgG, avgB),
  };

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            dominant,
            average,
            confidence,
            region: bbox
              ? {
                  bbox,
                  size: [width, height],
                  totalPixels,
                }
              : {
                  fullImage: true,
                  size: [width, height],
                  totalPixels,
                },
          },
          null,
          2
        ),
      },
    ],
  };
}
