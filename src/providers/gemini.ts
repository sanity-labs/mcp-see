/**
 * Gemini provider - supports both:
 * 1. Gemini Developer API (simple API key) - GEMINI_API_KEY
 * 2. Vertex AI (GCP project + ADC) - GOOGLE_CLOUD_PROJECT
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAuth } from "google-auth-library";

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID;
const LOCATION = "us-central1";
const MODEL = "gemini-2.0-flash-001";

// Determine which backend to use
const useGeminiApi = !!GEMINI_API_KEY;

// Gemini Developer API client (lazy init)
let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not set");
    }
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

// Vertex AI auth client (lazy init)
let authClient: GoogleAuth | null = null;

async function getAuthClient(): Promise<GoogleAuth> {
  if (!authClient) {
    authClient = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }
  return authClient;
}

export interface GeminiResponse {
  text: string;
  boundingBoxes?: Array<{
    label: string;
    bbox: [number, number, number, number];
  }>;
}

/**
 * Send request via Gemini Developer API
 */
async function geminiApiRequest(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<GeminiResponse> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: MODEL });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
    { text: prompt },
  ]);

  const response = await result.response;
  const text = response.text() || "No response from Gemini";

  const boundingBoxes = parseBoundingBoxes(text);
  return { text, boundingBoxes };
}

/**
 * Send request via Vertex AI
 */
async function vertexAiRequest(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<GeminiResponse> {
  if (!PROJECT_ID) {
    throw new Error("GOOGLE_CLOUD_PROJECT not set");
  }

  const auth = await getAuthClient();
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vertex AI error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini";

  const boundingBoxes = parseBoundingBoxes(text);
  return { text, boundingBoxes };
}

/**
 * Send request to Gemini (auto-selects backend)
 */
export async function geminiRequest(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<GeminiResponse> {
  if (useGeminiApi) {
    return geminiApiRequest(imageBase64, mimeType, prompt);
  } else if (PROJECT_ID) {
    return vertexAiRequest(imageBase64, mimeType, prompt);
  } else {
    throw new Error(
      "Gemini not configured. Set GEMINI_API_KEY for the simple path, or GOOGLE_CLOUD_PROJECT for Vertex AI."
    );
  }
}

/**
 * Parse bounding boxes from Gemini response
 * Handles multiple formats:
 * 1. JSON array with box_2d: [{"box_2d": [y,x,y,x], "label": "..."}]
 * 2. Text format: "label [y, x, y, x]"
 */
function parseBoundingBoxes(
  text: string
): Array<{ label: string; bbox: [number, number, number, number] }> | undefined {
  const boxes: Array<{ label: string; bbox: [number, number, number, number] }> = [];

  // Try to parse JSON format first (Gemini often returns this)
  // Look for JSON array in the response
  const jsonMatch = text.match(/\[[\s\S]*\{[\s\S]*"box_2d"[\s\S]*\}[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.box_2d && Array.isArray(item.box_2d) && item.label) {
            boxes.push({
              label: item.label,
              bbox: item.box_2d as [number, number, number, number],
            });
          }
        }
      }
      if (boxes.length > 0) {
        return boxes;
      }
    } catch {
      // JSON parse failed, try text patterns
    }
  }

  // Try text pattern: label [y, x, y, x]
  let match;
  const pattern1 = /([a-zA-Z][a-zA-Z0-9\s_-]*?)\s*\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]/g;
  while ((match = pattern1.exec(text)) !== null) {
    boxes.push({
      label: match[1].trim(),
      bbox: [
        parseInt(match[2]),
        parseInt(match[3]),
        parseInt(match[4]),
        parseInt(match[5]),
      ],
    });
  }

  // Try reverse pattern: [y, x, y, x] label
  if (boxes.length === 0) {
    const pattern2 = /\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]\s*([a-zA-Z][a-zA-Z0-9\s_-]*)/g;
    while ((match = pattern2.exec(text)) !== null) {
      boxes.push({
        label: match[5].trim(),
        bbox: [
          parseInt(match[1]),
          parseInt(match[2]),
          parseInt(match[3]),
          parseInt(match[4]),
        ],
      });
    }
  }

  return boxes.length > 0 ? boxes : undefined;
}

/**
 * Describe an image
 */
export async function geminiDescribe(
  imageBase64: string,
  mimeType: string,
  prompt?: string,
  detail: "brief" | "detailed" = "detailed"
): Promise<string> {
  const systemPrompt =
    detail === "brief"
      ? "Provide a brief, concise description."
      : "Provide a detailed description.";

  const fullPrompt = prompt
    ? `${systemPrompt}\n\n${prompt}`
    : `${systemPrompt}\n\nDescribe this image in detail.`;

  const response = await geminiRequest(imageBase64, mimeType, fullPrompt);
  return response.text;
}

/**
 * Detect objects with bounding boxes
 */
export async function geminiDetect(
  imageBase64: string,
  mimeType: string,
  prompt?: string
): Promise<Array<{ label: string; bbox: [number, number, number, number] }>> {
  const detectionPrompt = prompt
    ? `Detect and locate: ${prompt}. For each object found, provide its label and bounding box coordinates in the format: label [ymin, xmin, ymax, xmax] where coordinates are normalized 0-1000.`
    : `Detect all notable objects in this image. For each object, provide its label and bounding box coordinates in the format: label [ymin, xmin, ymax, xmax] where coordinates are normalized 0-1000.`;

  const response = await geminiRequest(imageBase64, mimeType, detectionPrompt);

  if (!response.boundingBoxes || response.boundingBoxes.length === 0) {
    // Return empty array if no boxes detected
    return [];
  }

  return response.boundingBoxes;
}
