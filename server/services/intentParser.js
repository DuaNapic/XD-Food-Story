import { getIntentReferenceData } from "../data/menuRepository.js";
import { requestJsonFromLlm, isLlmConfigured } from "./llmService.js";
import { getCurrentTimeContext } from "./timeContext.js";

const SPICY_HINTS = ["辣", "麻辣", "香辣", "重口"];
const LIGHT_HINTS = ["清淡", "轻食", "不腻", "爽口"];

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
    .map((value) => String(value).trim())
    .filter((value) => value.length >= 2)
    .slice(0, 8);

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
  };

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

  if (/面/.test(normalizedQuery)) categories.push("面条类");
  if (/饭/.test(normalizedQuery)) categories.push("米饭类");
  if (/饺子|馄饨/.test(normalizedQuery)) categories.push("饺子馄饨类");
  if (/砂锅|煲/.test(normalizedQuery)) categories.push("砂锅煲类");
  if (/汤|粥|饮料|饮品/.test(normalizedQuery)) categories.push("汤粥饮品类");
  if (/米线|米粉/.test(normalizedQuery)) categories.push("米粉米线类");
  if (/小吃|炸鸡|汉堡|鸡柳/.test(normalizedQuery))
    categories.push("小吃点心类");

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
      keywords: trimmedQuery
        .split(/[，,。？！?！\s]+/)
        .filter((token) => token.length >= 2),
      sort_preference: sortPreference,
      top_k: clampTopK(topK),
      explanation_style: "campus",
      constraints,
    },
    { query, topK, timeContext, referenceData, parserSource: "rules" },
  );
}

function buildIntentPrompt(query, topK, timeContext, referenceData) {
  return `请把用户的餐饮需求解析为结构化 JSON。\n当前服务器时间信息：${timeContext.local_time_text} ${timeContext.weekday}，时区 ${timeContext.timezone}，当前推定餐段是 ${timeContext.inferred_meal_time}。如果用户没有明确说早餐/午餐/晚餐，你应默认使用当前推定餐段，而不是留空。\n\n允许的 category：${referenceData.categories.join("、")}\n允许的 meal_time：${referenceData.meal_times.join("、")}\n允许的 spiciness：${referenceData.spiciness_options.join("、")}\n可用 location_text：${referenceData.location_texts.join("、")}\n可用 shop_text：${referenceData.shop_texts.join("、")}\n可用 flavor_options 示例：${referenceData.flavor_options.slice(0, 40).join("、")}\n\n只返回 JSON，不要返回额外说明。JSON 字段必须是：raw_query, normalized_query, meal_times, categories, flavor_options, spiciness, location_texts, shop_texts, price_min, price_max, keywords, sort_preference, top_k, explanation_style, constraints。\n其中 sort_preference 只能是 default, cheaper, tastier, healthier, more_filling。explanation_style 固定返回 campus。top_k 固定使用 ${clampTopK(topK)}。\n用户输入：${query}`;
}

export async function parseIntent(query, topK = 5) {
  const timeContext = getCurrentTimeContext();
  const referenceData = await getIntentReferenceData();
  const ruleResult = buildRuleIntent(query, topK, timeContext, referenceData);

  if (!isLlmConfigured()) {
    return ruleResult;
  }

  try {
    const llmResult = await requestJsonFromLlm({
      systemPrompt:
        "你是食堂推荐系统的意图解析器。你只输出合法 JSON，不输出任何解释。不要编造不存在的店名、位置或类别。",
      userPrompt: buildIntentPrompt(query, topK, timeContext, referenceData),
      temperature: 0.1,
      maxTokens: 1000,
    });

    return sanitizeIntent(llmResult, {
      query,
      topK,
      timeContext,
      referenceData,
      parserSource: "llm",
    });
  } catch {
    return {
      ...ruleResult,
      meta: {
        ...ruleResult.meta,
        parser_source: "rules_fallback",
      },
    };
  }
}
