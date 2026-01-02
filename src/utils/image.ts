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
 * Load image and get metadata
 */
export async function loadImage(imagePath: string): Promise<{
  image: sharp.Sharp;
  metadata: ImageMetadata;
}> {
  const absolutePath = path.resolve(imagePath);
  const buffer = await fs.readFile(absolutePath);
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
export async function imageToBase64(imagePath: string): Promise<{
  base64: string;
  mimeType: string;
}> {
  const absolutePath = path.resolve(imagePath);
  const buffer = await fs.readFile(absolutePath);
  const image = sharp(buffer);
  const meta = await image.metadata();

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
  imagePath: string,
  bbox: [number, number, number, number]
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { image, metadata } = await loadImage(imagePath);
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
  imagePath: string,
  bbox: [number, number, number, number]
): Promise<{ pixels: Uint8Array; width: number; height: number }> {
  const { buffer, width, height } = await cropToRegion(imagePath, bbox);

  const { data } = await sharp(buffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { pixels: new Uint8Array(data), width, height };
}

/**
 * Get single pixel color at coordinates
 */
export async function getPixelColor(
  imagePath: string,
  x: number,
  y: number
): Promise<{ r: number; g: number; b: number }> {
  const { image, metadata } = await loadImage(imagePath);

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
