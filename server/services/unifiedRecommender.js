import { searchRecommendations } from "./recommendationService.js";
import { parseIntent } from "./intentParser.js";
import { requestStream } from "./llmService.js";

function buildHistoryMessages(history = []) {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  return history.slice(-8).flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const content = String(entry.text || entry.content || "").trim();
    if (!content) {
      return [];
    }

    const role =
      entry.role === "ai" || entry.role === "assistant" ? "assistant" : "user";

    return [{ role, content }];
  });
}

function formatIntentSummary(intent) {
  const constraints = [];

  if (Array.isArray(intent?.meal_times) && intent.meal_times.length) {
    constraints.push(`餐段=${intent.meal_times.join("/")}`);
  }
  if (Array.isArray(intent?.categories) && intent.categories.length) {
    constraints.push(`品类=${intent.categories.join("/")}`);
  }
  if (Array.isArray(intent?.spiciness) && intent.spiciness.length) {
    constraints.push(`辣度=${intent.spiciness.join("/")}`);
  }
  if (
    Number.isFinite(intent?.price_min) ||
    Number.isFinite(intent?.price_max)
  ) {
    constraints.push(
      `预算=${intent?.price_min ?? "-"}~${intent?.price_max ?? "-"}`,
    );
  }
  if (Array.isArray(intent?.location_texts) && intent.location_texts.length) {
    constraints.push(`位置=${intent.location_texts.join("/")}`);
  }

  return constraints.length ? constraints.join("；") : "无显式约束";
}

function isRecapQuery(query) {
  const normalized = String(query || "").trim();
  return /上一句|上句|刚才说|总结|回顾|前文|之前聊|我说了什么/.test(normalized);
}

export async function* unifiedRecommendStream(query, history = []) {
  // 1. 意图解析
  const { intent } = await parseIntent(query, 5, history);
  const isFoodQuery = intent.intent_type === "food_search";
  const historyMessages = buildHistoryMessages(history);

  let items = [];
  if (isFoodQuery) {
    // 只有是食物相关查询时才进行搜索
    const { data: searchData } = await searchRecommendations(intent);
    items = searchData.items || [];

    // 2. 立即推送菜品卡片
    if (items.length > 0) {
      yield {
        type: "final",
        data: {
          items: items,
          reply_text: "",
        },
      };
    } else {
      yield {
        type: "text",
        text: "唔，这个需求有点难到我了，没找到完全匹配的菜品呢。要不换个说法？",
      };
      return;
    }
  }

  // 3. 生成更有温度、针对性的回复 (容灾处理)
  try {
    const recapMode = isRecapQuery(query);
    const systemPrompt = recapMode
      ? "你是校园食堂助手“西小电”。请仅依据对话历史回答用户的回顾问题，不要编造。如果历史不足就直接说信息不足。语气自然，30~80字。"
      : isFoodQuery
        ? "你是一个既专业又带点俏皮感的校园食堂助手“西小电”。\n" +
          "1. 语气：像学长学姐一样自然、亲切，带点幽默（比如：'饿坏了吧？'、'今天的胃口在呼唤什么？'）。\n" +
          "2. 针对性：结合当前问题和历史需求，保持约束继承（如餐段、预算、辣度），再给简短推荐语。\n" +
          "3. 限制：不要客套，不要谄媚。"
        : "你是一个既专业又带点俏皮感的校园食堂助手“西小电”。\n" +
          "1. 身份：你是西电（西安电子科技大学）食堂的活地图、美食达人。\n" +
          "2. 语气：随性、幽默、带点学长学姐的范儿。若用户是追问，请优先承接前文再回复。\n" +
          "3. 引导：如果话题完全无关，可以巧妙地引导用户问你关于吃的话题，但不要生硬。\n" +
          "4. 限制：字数控制在 30 字以内。";

    const messages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      {
        role: "user",
        content: recapMode
          ? `当前问题：${query}`
          : `当前问题：${query}\n意图约束：${formatIntentSummary(intent)}${
              isFoodQuery
                ? `\n候选菜品：${items.map((entry) => entry.item.title).join("、")}`
                : ""
            }`,
      },
    ];

    const greetingStream = requestStream({
      messages,
      temperature: 0.7,
      maxTokens: 100,
    });

    for await (const token of greetingStream) {
      yield { type: "text", text: token };
    }
  } catch (error) {
    console.error("[unifiedRecommend] Reply stream failed:", error.message);
  }
}
