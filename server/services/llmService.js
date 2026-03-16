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
  messages,
  temperature = 0.2,
  maxTokens = 1200,
}) {
  if (!LLM_ENABLED) {
    throw new Error("LLM is not configured.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const finalMessages = messages || [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const body = {
      model: LLM_MODEL,
      messages: finalMessages,
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

export async function* requestJsonStream({
  systemPrompt,
  userPrompt,
  messages,
  temperature = 0.2,
  maxTokens = 1200,
}) {
  if (!LLM_ENABLED) {
    throw new Error("LLM is not configured.");
  }

  const finalMessages = messages || [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const body = {
    model: LLM_MODEL,
    messages: finalMessages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
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
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM stream request failed: ${response.status} ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;

        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta?.content || "";
            if (delta) {
              fullContent += delta;
              yield { type: "token", text: delta };
            }
          } catch (e) {
            console.error("Error parsing SSE chunk:", e, trimmed);
          }
        }
      }
    }

    const jsonStr = extractJsonBlock(fullContent);
    yield { type: "json", data: JSON.parse(jsonStr) };
  } finally {
    reader.releaseLock();
  }
}

export async function* requestStream({
  messages,
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  maxTokens = 1000,
}) {
  if (!LLM_ENABLED) return;

  const finalMessages = messages || [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  const body = {
    model: LLM_MODEL,
    messages: finalMessages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  };

  if (LLM_BASE_URL.includes("dashscope.aliyuncs.com")) {
    body.enable_thinking = LLM_ENABLE_THINKING;
  }

  console.log(`[llmService] requestStream fetching from ${LLM_BASE_URL}`);
  const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[llmService] Stream fetch failed: ${response.status}`, errorText);
    throw new Error(`LLM stream request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    console.log(`[llmService] Stream reader started`);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;

        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            const delta = data.choices?.[0]?.delta?.content || "";
            if (delta) {
              yield delta;
            }
          } catch (e) {
            console.error("Error parsing SSE chunk:", e, trimmed);
          }
        }
      }
    }
    console.log(`[llmService] Stream reader reached end`);
  } finally {
    reader.releaseLock();
  }
}

