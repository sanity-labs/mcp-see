/**
 * Simple K-Means clustering implementation for color analysis
 * Works in LAB color space for perceptual uniformity
 */

import { rgbToLab, labToRgb, labDistance } from "./color.js";

export interface KMeansResult {
  centroids: [number, number, number][]; // RGB values
  labels: number[];
  counts: number[];
  variance: number;
}

/**
 * K-Means clustering on pixel data
 *
 * @param pixels - Raw RGB pixel data (Uint8Array, 3 bytes per pixel)
 * @param k - Number of clusters
 * @param maxIterations - Maximum iterations (default 20)
 * @param sampleSize - Max pixels to sample for performance (default 50000)
 */
export function kmeansCluster(
  pixels: Uint8Array,
  k: number,
  maxIterations = 20,
  sampleSize = 50000
): KMeansResult {
  const totalPixels = pixels.length / 3;

  // Sample pixels if too many
  let sampleIndices: number[];
  if (totalPixels > sampleSize) {
    sampleIndices = [];
    const step = totalPixels / sampleSize;
    for (let i = 0; i < sampleSize; i++) {
      sampleIndices.push(Math.floor(i * step));
    }
  } else {
    sampleIndices = Array.from({ length: totalPixels }, (_, i) => i);
  }

  // Convert sampled pixels to LAB
  const labPixels: [number, number, number][] = sampleIndices.map((idx) => {
    const r = pixels[idx * 3];
    const g = pixels[idx * 3 + 1];
    const b = pixels[idx * 3 + 2];
    return rgbToLab(r, g, b);
  });

  // Get unique colors to determine actual k
  const uniqueColors = new Set(labPixels.map((lab) => lab.join(",")));
  const actualK = Math.min(k, uniqueColors.size);

  if (actualK < 2) {
    // Single color region
    const [r, g, b] = [pixels[0], pixels[1], pixels[2]];
    return {
      centroids: [[r, g, b]],
      labels: new Array(labPixels.length).fill(0),
      counts: [labPixels.length],
      variance: 0,
    };
  }

  // Initialize centroids using k-means++ strategy
  const centroids = initializeCentroids(labPixels, actualK);

  // Iterate
  let labels = new Array(labPixels.length).fill(0);
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign each pixel to nearest centroid
    const newLabels = labPixels.map((lab) => {
      let minDist = Infinity;
      let nearest = 0;
      for (let c = 0; c < centroids.length; c++) {
        const dist = labDistance(lab, centroids[c]);
        if (dist < minDist) {
          minDist = dist;
          nearest = c;
        }
      }
      return nearest;
    });

    // Check convergence
    if (newLabels.every((l, i) => l === labels[i])) {
      labels = newLabels;
      break;
    }
    labels = newLabels;

    // Update centroids
    for (let c = 0; c < centroids.length; c++) {
      const clusterPixels = labPixels.filter((_, i) => labels[i] === c);
      if (clusterPixels.length > 0) {
        centroids[c] = [
          clusterPixels.reduce((sum, p) => sum + p[0], 0) / clusterPixels.length,
          clusterPixels.reduce((sum, p) => sum + p[1], 0) / clusterPixels.length,
          clusterPixels.reduce((sum, p) => sum + p[2], 0) / clusterPixels.length,
        ];
      }
    }
  }

  // Calculate cluster counts and variance
  const counts = new Array(actualK).fill(0);
  let totalVariance = 0;

  for (let c = 0; c < actualK; c++) {
    const clusterPixels = labPixels.filter((_, i) => labels[i] === c);
    counts[c] = clusterPixels.length;

    if (clusterPixels.length > 0) {
      const centroid = centroids[c];
      const variance =
        clusterPixels.reduce((sum, p) => sum + labDistance(p, centroid) ** 2, 0) /
        clusterPixels.length;
      totalVariance += variance;
    }
  }

  const avgVariance = totalVariance / actualK;

  // Convert centroids back to RGB
  const rgbCentroids = centroids.map((lab) =>
    labToRgb(lab[0], lab[1], lab[2])
  );

  return {
    centroids: rgbCentroids,
    labels,
    counts,
    variance: avgVariance,
  };
}

/**
 * Initialize centroids using k-means++ strategy
 */
function initializeCentroids(
  pixels: [number, number, number][],
  k: number
): [number, number, number][] {
  const centroids: [number, number, number][] = [];

  // First centroid: random pixel
  const firstIdx = Math.floor(Math.random() * pixels.length);
  centroids.push([...pixels[firstIdx]]);

  // Remaining centroids: weighted by distance to nearest existing centroid
  for (let c = 1; c < k; c++) {
    const distances = pixels.map((p) => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = labDistance(p, centroid);
        if (dist < minDist) minDist = dist;
      }
      return minDist ** 2;
    });

    const totalDist = distances.reduce((sum, d) => sum + d, 0);
    let threshold = Math.random() * totalDist;

    for (let i = 0; i < pixels.length; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        centroids.push([...pixels[i]]);
        break;
      }
    }

    // Fallback if we didn't select one
    if (centroids.length === c) {
      centroids.push([...pixels[Math.floor(Math.random() * pixels.length)]]);
    }
  }

  return centroids;
}
