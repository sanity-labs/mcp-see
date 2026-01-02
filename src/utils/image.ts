/**
 * Image utilities using sharp
 */

import sharp from "sharp";
import * as fs from "fs/promises";
import * as path from "path";

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
}

/**
 * Check if input is a URL
 */
function isUrl(input: string): boolean {
  return input.startsWith("http://") || input.startsWith("https://");
}

/**
 * Fetch image from URL and return buffer
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Get image buffer from path or URL
 */
export async function getImageBuffer(imageSource: string): Promise<Buffer> {
  if (isUrl(imageSource)) {
    return fetchImageBuffer(imageSource);
  }
  const absolutePath = path.resolve(imageSource);
  return fs.readFile(absolutePath);
}

/**
 * Load image and get metadata
 */
export async function loadImage(imageSource: string): Promise<{
  image: sharp.Sharp;
  metadata: ImageMetadata;
}> {
  const buffer = await getImageBuffer(imageSource);
  const image = sharp(buffer);
  const meta = await image.metadata();

  return {
    image,
    metadata: {
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      format: meta.format ?? "unknown",
    },
  };
}

/**
 * Get base64 encoded image for API requests
 */
export async function imageToBase64(imageSource: string): Promise<{
  base64: string;
  mimeType: string;
}> {
  const buffer = await getImageBuffer(imageSource);
  const image = sharp(buffer);

  // Convert to PNG for consistency across providers
  const pngBuffer = await image.png().toBuffer();

  return {
    base64: pngBuffer.toString("base64"),
    mimeType: "image/png",
  };
}

/**
 * Crop image to bounding box region
 * bbox: [ymin, xmin, ymax, xmax] normalized 0-1000
 */
export async function cropToRegion(
  imageSource: string,
  bbox: [number, number, number, number]
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { image, metadata } = await loadImage(imageSource);
  const [ymin, xmin, ymax, xmax] = bbox;

  const left = Math.round((xmin / 1000) * metadata.width);
  const top = Math.round((ymin / 1000) * metadata.height);
  const width = Math.round(((xmax - xmin) / 1000) * metadata.width);
  const height = Math.round(((ymax - ymin) / 1000) * metadata.height);

  const cropped = await image
    .extract({ left, top, width, height })
    .png()
    .toBuffer();

  return { buffer: cropped, width, height };
}

/**
 * Get raw pixel data from image region
 */
export async function getRegionPixels(
  imageSource: string,
  bbox: [number, number, number, number]
): Promise<{ pixels: Uint8Array; width: number; height: number }> {
  const { buffer, width, height } = await cropToRegion(imageSource, bbox);

  const { data } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { pixels: new Uint8Array(data), width, height };
}

/**
 * Get single pixel color at coordinates
 */
export async function getPixelColor(
  imageSource: string,
  x: number,
  y: number
): Promise<{ r: number; g: number; b: number }> {
  const { image, metadata } = await loadImage(imageSource);

  if (x < 0 || x >= metadata.width || y < 0 || y >= metadata.height) {
    throw new Error(
      `Coordinates (${x}, ${y}) out of bounds for image ${metadata.width}x${metadata.height}`
    );
  }

  const { data } = await image
    .extract({ left: x, top: y, width: 1, height: 1 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { r: data[0], g: data[1], b: data[2] };
}
