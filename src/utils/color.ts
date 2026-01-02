/**
 * Color utilities - RGB/LAB conversion, color naming
 */

import chroma from "chroma-js";

// Cache for color.pizza API lookups
const colorNameCache = new Map<string, string>();

/**
 * Convert RGB to LAB color space (perceptually uniform)
 */
export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const color = chroma(r, g, b);
  return color.lab() as [number, number, number];
}

/**
 * Convert LAB to RGB
 */
export function labToRgb(l: number, a: number, b: number): [number, number, number] {
  const color = chroma.lab(l, a, b);
  const [r, g, b_] = color.rgb();
  // Clamp to valid range
  return [
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b_))),
  ];
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const color = chroma(r, g, b);
  const [h, s, l] = color.hsl();
  return {
    h: Math.round(isNaN(h) ? 0 : h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert RGB to hex string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return chroma(r, g, b).hex();
}

/**
 * Get color name from color.pizza API
 */
async function fetchColorName(hex: string): Promise<string | null> {
  try {
    const hexCode = hex.replace("#", "");
    const response = await fetch(`https://api.color.pizza/v1/${hexCode}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.colors?.[0]?.name) {
      return data.colors[0].name;
    }
  } catch {
    // API unavailable, fall through to basic names
  }
  return null;
}

/**
 * Basic color name lookup (fallback)
 */
function getBasicColorName(r: number, g: number, b: number): string {
  const colors: Record<string, [number, number, number]> = {
    black: [0, 0, 0],
    white: [255, 255, 255],
    red: [255, 0, 0],
    green: [0, 128, 0],
    blue: [0, 0, 255],
    yellow: [255, 255, 0],
    cyan: [0, 255, 255],
    magenta: [255, 0, 255],
    orange: [255, 165, 0],
    purple: [128, 0, 128],
    pink: [255, 192, 203],
    brown: [139, 69, 19],
    gray: [128, 128, 128],
    navy: [0, 0, 128],
    teal: [0, 128, 128],
    lime: [0, 255, 0],
  };

  let nearest = "unknown";
  let minDist = Infinity;

  for (const [name, [cr, cg, cb]] of Object.entries(colors)) {
    const dist = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (dist < minDist) {
      minDist = dist;
      nearest = name;
    }
  }

  return nearest;
}

/**
 * Get human-readable color name
 * Uses color.pizza API with fallback to basic names
 */
export async function getColorName(
  r: number,
  g: number,
  b: number,
  useApi = true
): Promise<string> {
  const hex = rgbToHex(r, g, b);

  // Check cache
  if (colorNameCache.has(hex)) {
    return colorNameCache.get(hex)!;
  }

  // Try color.pizza API
  if (useApi) {
    const apiName = await fetchColorName(hex);
    if (apiName) {
      colorNameCache.set(hex, apiName);
      return apiName;
    }
  }

  // Fallback to basic color name
  const basicName = getBasicColorName(r, g, b);
  colorNameCache.set(hex, basicName);
  return basicName;
}

/**
 * Euclidean distance in LAB space
 */
export function labDistance(
  lab1: [number, number, number],
  lab2: [number, number, number]
): number {
  return Math.sqrt(
    (lab1[0] - lab2[0]) ** 2 +
    (lab1[1] - lab2[1]) ** 2 +
    (lab1[2] - lab2[2]) ** 2
  );
}
