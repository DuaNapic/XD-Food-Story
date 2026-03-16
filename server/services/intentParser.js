import { getIntentReferenceData } from "../data/menuRepository.js";
import { requestJsonFromLlm, isLlmConfigured } from "./llmService.js";
import { getCurrentTimeContext } from "./timeContext.js";

const SPICY_HINTS = ["辣", "麻辣", "香辣", "重口"];
const LIGHT_HINTS = ["清淡", "轻食", "不腻", "爽口", "解腻"];
const SWEET_HINTS = ["甜", "糖", "清甜", "点心"];
const CRISPY_HINTS = ["脆", "酥", "咔嚓", "香脆"];
const NOODLE_HINTS = ["面", "粉", "拉面", "意面"];
const RICE_HINTS = ["饭", "盖饭", "蛋炒饭", "糯米"];
const DRINK_HINTS = ["喝", "水", "饮料", "奶茶", "汤", "粥"];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function clampTopK(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 5;
  }
  return Math.min(Math.max(Math.round(parsed), 1), 10);
}

function parseBudget(query) {
  const budgetMatch = query.match(/(\d{1,2})(?:\s*[元块])/);
  if (budgetMatch) {
    return Number(budgetMatch[1]);
  }

  if (/别太贵|实惠|省钱|便宜/.test(query)) {
    return 20;
  }

  return null;
}

function sanitizeArray(values, allowedValues) {
  const allowed = new Set(allowedValues);
  return unique(Array.isArray(values) ? values : []).filter((value) =>
    allowed.has(value),
  );
}

function sanitizeIntent(
  rawIntent,
  { query, topK, timeContext, referenceData, parserSource },
) {
  const normalizedQuery =
    typeof rawIntent?.normalized_query === "string" &&
    rawIntent.normalized_query.trim()
      ? rawIntent.normalized_query.trim()
      : String(query || "").trim();

  const mealTimes = sanitizeArray(
    rawIntent?.meal_times,
    referenceData.meal_times,
  );
  const categories = sanitizeArray(
    rawIntent?.categories,
    referenceData.categories,
  );
  const spiciness = sanitizeArray(
    rawIntent?.spiciness,
    referenceData.spiciness_options,
  );
  const locationTexts = sanitizeArray(
    rawIntent?.location_texts,
    referenceData.location_texts,
  );
  const shopTexts = sanitizeArray(
    rawIntent?.shop_texts,
    referenceData.shop_texts,
  );
  const flavorOptions = unique(
    Array.isArray(rawIntent?.flavor_options) ? rawIntent.flavor_options : [],
  ).filter((value) => referenceData.flavor_options.includes(value));

  const constraints = unique(
    Array.isArray(rawIntent?.constraints) ? rawIntent.constraints : [],
  );
  const safeKeywords = unique(
    Array.isArray(rawIntent?.keywords) ? rawIntent.keywords : [],
  )
    .map((value) => {
      let k = String(value).trim();
      // 去除常见后缀如 "的", "个", "种" (例如 "甜的" -> "甜")
      if (k.length > 2 && /的$|个$|种$/.test(k)) {
        k = k.slice(0, -1);
      }
      return k;
    })
    .filter((value) => {
      // 针对中文，允许“甜”、“辣”、“脆”等核心单字
      if (value.length === 1 && (SWEET_HINTS.includes(value) || CRISPY_HINTS.includes(value) || SPICY_HINTS.includes(value) || LIGHT_HINTS.includes(value))) {
        return true;
      }
      return value.length >= 2;
    })
    .slice(0, 10);

  const intent = {
    raw_query: String(query || "").trim(),
    normalized_query: normalizedQuery,
    meal_times: mealTimes.length ? mealTimes : [timeContext.inferred_meal_time],
    categories,
    flavor_options: flavorOptions,
    spiciness,
    location_texts: locationTexts,
    shop_texts: shopTexts,
    price_min: Number.isFinite(rawIntent?.price_min)
      ? Number(rawIntent.price_min)
      : null,
    price_max: Number.isFinite(rawIntent?.price_max)
      ? Number(rawIntent.price_max)
      : null,
    keywords: safeKeywords,
    sort_preference: [
      "default",
      "cheaper",
      "tastier",
      "healthier",
      "more_filling",
    ].includes(rawIntent?.sort_preference)
      ? rawIntent.sort_preference
      : "default",
    top_k: clampTopK(rawIntent?.top_k ?? topK),
    explanation_style: ["brief", "warm", "campus"].includes(
      rawIntent?.explanation_style,
    )
      ? rawIntent.explanation_style
      : "campus",
    constraints,
    intent_type: ["food_search", "greeting", "general_chat"].includes(
      rawIntent?.intent_type,
    )
      ? rawIntent.intent_type
      : "food_search",
  };

  // 4. 重大意图冲突检测与纠偏 (例如：从辣转向甜)
  const queryWords = [query, normalizedQuery].join(" ");
  const mentionsSweet = SWEET_HINTS.some(h => queryWords.includes(h));
  const mentionsLight = LIGHT_HINTS.some(h => queryWords.includes(h));
  
  if (mentionsSweet || mentionsLight) {
    // 如果提到甜或清淡，通常意味着对之前“辣”的需求发生了漂移，清除之前的辣度约束
    intent.spiciness = []; 
  }

  // 5. 全局关键字强制注入 (确保无论是否使用 LLM 都能索引到关键特征)
  if (mentionsSweet) intent.keywords = unique([...intent.keywords, "甜"]);
  if (CRISPY_HINTS.some(h => queryWords.includes(h))) intent.keywords = unique([...intent.keywords, "脆"]);
  if (mentionsLight) intent.keywords = unique([...intent.keywords, "淡"]);

  if (!mealTimes.length) {
    intent.constraints = unique([
      ...intent.constraints,
      `未显式说明餐段，按当前系统时间推定为${timeContext.inferred_meal_time}`,
    ]);
  }

  return {
    intent,
    meta: {
      parser_source: parserSource,
      time_context: timeContext,
      raw_llm_result: rawIntent,
    },
  };
}

function buildRuleIntent(query, topK, timeContext, referenceData) {
  const trimmedQuery = String(query || "").trim();
  const normalizedQuery = trimmedQuery.replace(/\s+/g, " ");
  const mealTimes = [];
  const categories = [];
  const flavorOptions = [];
  const spiciness = [];
  const constraints = [];
  const keywords = [];

  if (/早|早餐/.test(normalizedQuery)) {
    mealTimes.push("早餐");
    constraints.push("早餐");
  }
  if (/午|中午|午餐/.test(normalizedQuery)) {
    mealTimes.push("午餐");
    constraints.push("午餐");
  }
  if (/晚|晚上|晚餐/.test(normalizedQuery)) {
    mealTimes.push("晚餐");
    constraints.push("晚餐");
  }

  const locationTexts = referenceData.location_texts.filter((value) =>
    normalizedQuery.includes(value),
  );
  const shopTexts = referenceData.shop_texts.filter((value) =>
    normalizedQuery.includes(value),
  );

  if (NOODLE_HINTS.some((hint) => normalizedQuery.includes(hint)))
    categories.push("面条类");
  if (RICE_HINTS.some((hint) => normalizedQuery.includes(hint)))
    categories.push("米饭类");
  if (/饺子|馄饨/.test(normalizedQuery)) categories.push("饺子馄饨类");
  if (/砂锅|煲/.test(normalizedQuery)) categories.push("砂锅煲类");
  if (DRINK_HINTS.some((hint) => normalizedQuery.includes(hint)))
    categories.push("汤粥饮品类");
  if (/米线|米粉/.test(normalizedQuery)) categories.push("米粉米线类");
  if (
    /小吃|炸鸡|汉堡|鸡柳/.test(normalizedQuery) ||
    CRISPY_HINTS.some((hint) => normalizedQuery.includes(hint))
  )
    categories.push("小吃点心类");

  if (SWEET_HINTS.some((hint) => normalizedQuery.includes(hint))) {
    constraints.push("甜味偏好");
    flavorOptions.push(
      ...referenceData.flavor_options.filter((v) => /甜|蜜|糖/.test(v)),
    );
  }

  if (CRISPY_HINTS.some((hint) => normalizedQuery.includes(hint))) {
    // 逻辑已移至 sanitizeIntent 统一处理
  }

  if (SPICY_HINTS.some((hint) => normalizedQuery.includes(hint))) {
    spiciness.push("微辣", "中辣", "可选辣");
    constraints.push("偏辣");
  }
  if (LIGHT_HINTS.some((hint) => normalizedQuery.includes(hint))) {
    spiciness.push("不辣", "微辣");
    constraints.push("清淡");
    flavorOptions.push(
      ...referenceData.flavor_options.filter((value) =>
        ["番茄", "三鲜", "原味"].includes(value),
      ),
    );
  }

  let sortPreference = "default";
  if (/便宜|实惠|省钱|别太贵/.test(normalizedQuery)) {
    sortPreference = "cheaper";
    constraints.push("预算敏感");
  } else if (/健康|减脂|轻负担/.test(normalizedQuery)) {
    sortPreference = "healthier";
    constraints.push("更健康");
  } else if (/顶饱|饱腹|管饱/.test(normalizedQuery)) {
    sortPreference = "more_filling";
    constraints.push("更顶饱");
  } else if (/好吃|香|想吃爽/.test(normalizedQuery)) {
    sortPreference = "tastier";
  }

  return sanitizeIntent(
    {
      raw_query: trimmedQuery,
      normalized_query: normalizedQuery,
      meal_times: mealTimes,
      categories,
      flavor_options: unique(flavorOptions),
      spiciness: unique(spiciness),
      location_texts: locationTexts,
      shop_texts: shopTexts,
      price_min: null,
      price_max: parseBudget(normalizedQuery),
      keywords: unique([
        ...keywords,
        ...trimmedQuery
          .split(/[，,。？！?！\s]+/)
          .filter((token) => token.length >= 2),
      ]),
      sort_preference: sortPreference,
      top_k: clampTopK(topK),
      explanation_style: "campus",
      constraints,
    },
    { query, topK, timeContext, referenceData, parserSource: "rules" },
  );
}

function buildIntentPrompt(query) {
  return query;
}

export async function parseIntent(query, topK = 5, history = []) {
  const timeContext = getCurrentTimeContext();
  const referenceData = await getIntentReferenceData();
  const ruleResult = buildRuleIntent(query, topK, timeContext, referenceData);

  if (!isLlmConfigured()) {
    return ruleResult;
  }

  try {
    const systemContent = [
      "你是食堂推荐系统的意图解析器。你负责将用户最新的需求结合对话上下文提取为结构化的 JSON。",
      `【当前状态】时间：${timeContext.local_time_text} ${timeContext.weekday}，推定餐段：${timeContext.inferred_meal_time}。`,
      "【解析规范】",
      `- 字段：intent_type (必填), raw_query, normalized_query, meal_times, categories, flavor_options, spiciness, location_texts, shop_texts, price_min, price_max, keywords, sort_preference, top_k, explanation_style, constraints。`,
      "- intent_type 取值规范：",
      "  * food_search: 明确想找吃的、问菜品、问食堂、问价格等与食物相关的意图。",
      "  * greeting: 简单的打招呼（如：你好、早上好、哈喽）。",
      "  * general_chat: 闲聊、倾诉心情、问非食堂相关的问题（如：今天天气、你是谁、我好累、考试挂了）。",
      `- 允许类别：${referenceData.categories.join("/")}。`,
      `- 允许餐段：${referenceData.meal_times.join("/")}。`,
      `- 允许辣度：${referenceData.spiciness_options.join("/")}。`,
      `- 可选位置：${referenceData.location_texts.join("/")}。`,
      `- 排序偏好：default, cheaper, tastier, healthier, more_filling。`,
      "【重要：意图继承】",
      "如果当前指令是追问（如“更辣点”、“再便宜点”、“又要米饭”），你必须继承之前的约束并合并。除非指令有冲突。",
      "例子：",
      "1. 用户：“我想吃辣的” -> spiciness: [“中辣”]",
      "2. 追问：“再便宜点” -> spiciness: [“中辣”], price_max: 20, sort_preference: “cheaper”",
      "【输出限制】",
      `- 只输出 JSON 块。`,
      `- top_k 固定为 ${clampTopK(topK)}。`,
      `- explanation_style 固定为 campus。`,
    ].join("\n");

    const messages = [
      { role: "system", content: systemContent },
    ];

    if (Array.isArray(history) && history.length > 0) {
      history.slice(-6).forEach((msg) => {
        messages.push({
          role: msg.role === "ai" ? "assistant" : "user",
          content: msg.text,
        });
      });
    }

    const userMsgContent = history.length > 0
      ? `【当前补充指令】：“${query}”\n请务必结合之前的上下文（如口味、餐段、地点等），生成合并后的完整 JSON。`
      : query;

    messages.push({
      role: "user",
      content: userMsgContent,
    });

    const llmResult = await requestJsonFromLlm({
      messages,
      temperature: 0.1,
      maxTokens: 1000,
    });

    console.log("[intentParser] Raw LLM result:", JSON.stringify(llmResult, null, 2));

    return sanitizeIntent(llmResult, {
      query,
      topK,
      timeContext,
      referenceData,
      parserSource: "llm",
    });
  } catch (error) {
    console.warn("[intentParser] LLM failed:", error.message);
    return {
      ...ruleResult,
      meta: {
        ...ruleResult.meta,
        parser_source: "rules_fallback",
      },
    };
  }
}
