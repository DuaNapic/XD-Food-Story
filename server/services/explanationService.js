import { isLlmConfigured, requestJsonFromLlm } from "./llmService.js";

function buildFallbackReplyText(query, rankedItems) {
  if (!rankedItems.length) {
    return "这次没有找到特别贴合你需求的菜，可以放宽一下价格、位置或口味条件再试试。";
  }

  const topItems = rankedItems
    .slice(0, 3)
    .map((entry) => entry.item.title)
    .join("、");
  return `结合你的需求，我先给你筛出了 ${topItems} 这几项。它们在餐段、价格或口味上更贴近当前场景，适合先从这几道里挑。`;
}

function buildFallbackItemExplanations(rankedItems, style) {
  return rankedItems.map(({ item, matched_reasons }) => ({
    id: item.id,
    explanation: `${item.title}更贴近你的需求，主要因为${matched_reasons.length ? matched_reasons.join("、") : "整体匹配度较高"}。${style === "brief" ? "" : item.ai_insight}`,
  }));
}

function buildExplanationPrompt(query, rankedItems, style) {
  const items = rankedItems.slice(0, 5).map(({ item, matched_reasons }) => ({
    id: item.id,
    title: item.title,
    shop_text: item.shop_text,
    location_text: item.location_text,
    price: item.price,
    category: item.category,
    meal_time: item.meal_time,
    spiciness: item.spiciness,
    flavor_options: item.flavor_options,
    ai_insight: item.ai_insight,
    matched_reasons,
  }));

  return `用户原始需求：${query}\n请基于候选菜品生成 JSON，字段必须为 reply_text 和 item_explanations。reply_text 需简洁、自然、校园场景化，40 到 140 字之间，不要编造营养、销量和排队人数。item_explanations 必须是数组，每项包含 id 和 explanation，说明为什么适合用户。风格要求：${style}。候选菜品：${JSON.stringify(items)}`;
}

export async function explainItems(query, rankedItems, style = "campus") {
  const fallback = {
    reply_text: buildFallbackReplyText(query, rankedItems),
    item_explanations: buildFallbackItemExplanations(rankedItems, style),
    meta: {
      explanation_source: "fallback",
    },
  };

  if (!rankedItems.length || !isLlmConfigured()) {
    return fallback;
  }

  try {
    const llmResult = await requestJsonFromLlm({
      systemPrompt:
        "你是校园食堂推荐解释生成器。你只能根据给定候选菜品解释推荐原因，禁止虚构数据。只输出 JSON。",
      userPrompt: buildExplanationPrompt(query, rankedItems, style),
      temperature: 0.4,
      maxTokens: 1200,
    });

    const itemExplanations = Array.isArray(llmResult?.item_explanations)
      ? rankedItems.map(({ item }) => {
          const matched = llmResult.item_explanations.find(
            (entry) => entry?.id === item.id,
          );
          return {
            id: item.id,
            explanation:
              typeof matched?.explanation === "string" &&
              matched.explanation.trim()
                ? matched.explanation.trim()
                : fallback.item_explanations.find(
                    (entry) => entry.id === item.id,
                  )?.explanation || item.ai_insight,
          };
        })
      : fallback.item_explanations;

    return {
      reply_text:
        typeof llmResult?.reply_text === "string" && llmResult.reply_text.trim()
          ? llmResult.reply_text.trim()
          : fallback.reply_text,
      item_explanations: itemExplanations,
      meta: {
        explanation_source: "llm",
      },
    };
  } catch {
    return fallback;
  }
}
