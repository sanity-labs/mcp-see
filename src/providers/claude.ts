/**
 * Claude/Anthropic Vision provider
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * Describe an image using Claude Vision
 */
export async function claudeDescribe(
  imageBase64: string,
  mimeType: string,
  prompt?: string,
  detail: "brief" | "detailed" = "detailed"
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable not set");
  }

  const systemPrompt =
    detail === "brief"
      ? "Provide a brief, concise description."
      : "Provide a detailed description.";

  const userPrompt = prompt || "Describe this image in detail.";

  // Claude uses specific media types
  const mediaType = mimeType === "image/png" ? "image/png" : "image/jpeg";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const textContent = data.content?.find(
    (c: { type: string }) => c.type === "text"
  );
  return textContent?.text || "No response from Claude";
}
