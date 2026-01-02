/**
 * OpenAI Vision provider
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Describe an image using OpenAI Vision
 */
export async function openaiDescribe(
  imageBase64: string,
  mimeType: string,
  prompt?: string,
  detail: "brief" | "detailed" = "detailed"
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable not set");
  }

  const systemPrompt =
    detail === "brief"
      ? "Provide a brief, concise description."
      : "Provide a detailed description.";

  const userPrompt = prompt || "Describe this image in detail.";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: detail === "brief" ? "low" : "high",
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "No response from OpenAI";
}
