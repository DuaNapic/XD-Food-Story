import {
  LLM_API_KEY,
  LLM_BASE_URL,
  LLM_ENABLED,
  LLM_ENABLE_THINKING,
  LLM_MODEL,
  LLM_TIMEOUT_MS,
} from "../config.js";

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

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error?.message || "LLM request failed.");
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Empty model response.");
    }

    return JSON.parse(extractJsonBlock(content));
  } finally {
    clearTimeout(timeoutId);
  }
}
