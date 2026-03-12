import {
  LLM_API_KEY,
  LLM_BASE_URL,
  LLM_ENABLED,
  LLM_ENABLE_THINKING,
  LLM_MODEL,
  LLM_TIMEOUT_MS,
} from "../config.js";

function safeSnippet(text, maxLength = 240) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

async function readJsonSafely(response) {
  const rawText = await response.text();

  if (!rawText.trim()) {
    return { rawText, json: null };
  }

  try {
    return {
      rawText,
      json: JSON.parse(rawText),
    };
  } catch (error) {
    throw new Error(
      `LLM returned invalid JSON body: ${error.message}. body=${safeSnippet(rawText)}`,
    );
  }
}

function extractJsonBlock(text) {
  const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  throw new Error("No JSON object found in model response.");
}

export function isLlmConfigured() {
  return LLM_ENABLED;
}

export async function requestJsonFromLlm({
  systemPrompt,
  userPrompt,
  temperature = 0.2,
  maxTokens = 1200,
}) {
  if (!LLM_ENABLED) {
    throw new Error("LLM is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const body = {
      model: LLM_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    if (LLM_BASE_URL.includes("dashscope.aliyuncs.com")) {
      body.enable_thinking = LLM_ENABLE_THINKING;
    }

    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const { json: payload, rawText } = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(
        payload?.error?.message ||
          `LLM request failed with status ${response.status}. body=${safeSnippet(rawText)}`,
      );
    }

    if (!payload) {
      throw new Error("LLM returned an empty response body.");
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Empty model response.");
    }

    return JSON.parse(extractJsonBlock(content));
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`LLM request timed out after ${LLM_TIMEOUT_MS}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
