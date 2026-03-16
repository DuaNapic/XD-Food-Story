
import { searchRecommendations } from "./recommendationService.js";
import { parseIntent } from "./intentParser.js";
import { requestStream } from "./llmService.js";

export async function* unifiedRecommendStream(query, history = []) {
  // 1. 意图解析
  const { intent } = await parseIntent(query, 5, history);
  const isFoodQuery = intent.intent_type === "food_search";

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
        }
      };
    } else {
      yield { type: "text", text: "唔，这个需求有点难到我了，没找到完全匹配的菜品呢。要不换个说法？" };
      return;
    }
  }

  // 3. 生成更有温度、针对性的回复 (容灾处理)
  try {
    const systemPrompt = isFoodQuery 
      ? "你是一个既专业又带点俏皮感的校园食堂助手“西小电”。\n" +
        "1. 语气：像学长学姐一样自然、亲切，带点幽默（比如：'饿坏了吧？'、'今天的胃口在呼唤什么？'）。\n" +
        "2. 针对性：根据搜索出的推荐菜品，给一个 20 字以内的专业推荐语或安抚。\n" +
        "3. 限制：不要客套，不要谄媚。"
      : "你是一个既专业又带点俏皮感的校园食堂助手“西小电”。\n" +
        "1. 身份：你是西电（西安电子科技大学）食堂的活地图、美食达人。\n" +
        "2. 语气：随性、幽默、带点学长学姐的范儿。如果用户只是打招呼或闲聊，就自然地回撩一下。\n" +
        "3. 引导：如果话题完全无关，可以巧妙地引导用户问你关于吃的话题，但不要生硬。\n" +
        "4. 限制：字数控制在 30 字以内。";

    const greetingStream = requestStream({
      systemPrompt,
      userPrompt: `用户输入：${query}${isFoodQuery ? `\n推荐菜品：${items.map(i => i.item.title).join(", ")}` : ""}`,
      temperature: 0.7,
      maxTokens: 100
    });

    for await (const token of greetingStream) {
      yield { type: "text", text: token };
    }
  } catch (error) {
    console.error("[unifiedRecommend] Reply stream failed:", error.message);
  }
}
