import { loadMenus } from "../data/menuRepository.js";

const DEFAULT_WEIGHTS = {
  meal_time: 0.3,
  category: 0.2,
  spiciness: 0.15,
  flavor_options: 0.05,
  price_fit: 0.15,
  location: 0.1,
  keyword: 0.05,
};

function includesIgnoreCase(source, target) {
  return source.toLowerCase().includes(target.toLowerCase());
}

function clampScore(value) {
  return Math.max(0, Math.min(1, value));
}

function applyHardFilters(items, intent) {
  return items.filter((item) => {
    if (
      intent.meal_times.length &&
      !item.meal_time.some((mealTime) => intent.meal_times.includes(mealTime))
    ) {
      return false;
    }

    if (
      intent.categories.length &&
      !intent.categories.includes(item.category)
    ) {
      return false;
    }

    if (
      intent.location_texts.length &&
      !intent.location_texts.some((value) =>
        includesIgnoreCase(item.location_text, value),
      )
    ) {
      return false;
    }

    if (
      intent.shop_texts.length &&
      !intent.shop_texts.some((value) =>
        includesIgnoreCase(item.shop_text, value),
      )
    ) {
      return false;
    }

    if (intent.price_min !== null && item.price < intent.price_min) {
      return false;
    }

    if (intent.price_max !== null && item.price > intent.price_max) {
      return false;
    }

    return true;
  });
}

function applyFilteredSearch(items, intent, options = {}) {
  return items.filter((item) => {
    if (
      !options.ignoreMealTime &&
      intent.meal_times.length &&
      !item.meal_time.some((mealTime) => intent.meal_times.includes(mealTime))
    ) {
      return false;
    }

    if (
      !options.ignoreCategory &&
      intent.categories.length &&
      !intent.categories.includes(item.category)
    ) {
      return false;
    }

    if (
      !options.ignoreLocation &&
      intent.location_texts.length &&
      !intent.location_texts.some((value) =>
        includesIgnoreCase(item.location_text, value),
      )
    ) {
      return false;
    }

    if (
      !options.ignoreShop &&
      intent.shop_texts.length &&
      !intent.shop_texts.some((value) =>
        includesIgnoreCase(item.shop_text, value),
      )
    ) {
      return false;
    }

    if (
      !options.ignorePrice &&
      intent.price_min !== null &&
      item.price < intent.price_min
    ) {
      return false;
    }

    if (
      !options.ignorePrice &&
      intent.price_max !== null &&
      item.price > intent.price_max
    ) {
      return false;
    }

    return true;
  });
}

function getPriceFitScore(item, intent) {
  if (intent.price_max === null && intent.price_min === null) {
    return 0.5;
  }

  if (intent.price_max !== null) {
    return clampScore(1 - item.price / Math.max(intent.price_max, 1));
  }

  return 0.5;
}

function scoreItem(item, intent) {
  let score = 0;
  const matchedReasons = [];

  const mealTimeHit =
    intent.meal_times.length === 0 ||
    item.meal_time.some((mealTime) => intent.meal_times.includes(mealTime));
  if (mealTimeHit) {
    score += DEFAULT_WEIGHTS.meal_time;
    if (intent.meal_times.length) {
      matchedReasons.push("餐段匹配");
    }
  }

  const categoryHit =
    intent.categories.length === 0 || intent.categories.includes(item.category);
  if (categoryHit) {
    score += DEFAULT_WEIGHTS.category;
    if (intent.categories.length) {
      matchedReasons.push("品类匹配");
    }
  }

  const spicyHit =
    intent.spiciness.length === 0 || intent.spiciness.includes(item.spiciness);
  if (spicyHit) {
    score += DEFAULT_WEIGHTS.spiciness;
    if (intent.spiciness.length) {
      matchedReasons.push("辣度匹配");
    }
  }

  if (intent.flavor_options.length) {
    const flavorHit = item.flavor_options.some((value) =>
      intent.flavor_options.includes(value),
    );
    if (flavorHit) {
      score += DEFAULT_WEIGHTS.flavor_options;
      matchedReasons.push("口味匹配");
    }
  } else {
    score += DEFAULT_WEIGHTS.flavor_options;
  }

  const priceFitScore = getPriceFitScore(item, intent);
  score += DEFAULT_WEIGHTS.price_fit * priceFitScore;
  if (intent.price_max !== null || intent.price_min !== null) {
    matchedReasons.push("价格贴合");
  }

  if (intent.location_texts.length) {
    const locationHit = intent.location_texts.some((value) =>
      includesIgnoreCase(item.location_text, value),
    );
    if (locationHit) {
      score += DEFAULT_WEIGHTS.location;
      matchedReasons.push("位置匹配");
    }
  } else {
    score += DEFAULT_WEIGHTS.location;
  }

  if (intent.keywords.length) {
    const keywordHit = intent.keywords.some((keyword) =>
      [
        item.title,
        item.shop_text,
        item.location_text,
        ...item.flavor_options,
      ].some((field) => includesIgnoreCase(field, keyword)),
    );
    if (keywordHit) {
      score += DEFAULT_WEIGHTS.keyword;
      matchedReasons.push("关键词命中");
    }
  } else {
    score += DEFAULT_WEIGHTS.keyword;
  }

  if (intent.sort_preference === "cheaper") {
    score += clampScore((30 - item.price) / 30) * 0.08;
  } else if (intent.sort_preference === "tastier") {
    score += (item.radar.taste / 5) * 0.08;
  } else if (intent.sort_preference === "healthier") {
    score += (item.radar.health / 5) * 0.08;
  } else if (intent.sort_preference === "more_filling") {
    score += (item.radar.satiety / 5) * 0.08;
  }

  return {
    item,
    score: Number(clampScore(score).toFixed(4)),
    matched_reasons: matchedReasons,
  };
}

export async function searchRecommendations(intent, { debug = false } = {}) {
  const menus = await loadMenus();
  let candidates = applyHardFilters(menus, intent);
  const relaxationsApplied = [];

  if (!candidates.length && intent.location_texts.length) {
    candidates = applyFilteredSearch(menus, intent, { ignoreLocation: true });
    if (candidates.length) {
      relaxationsApplied.push("location_texts");
    }
  }

  if (
    !candidates.length &&
    (intent.price_min !== null || intent.price_max !== null)
  ) {
    candidates = applyFilteredSearch(menus, intent, {
      ignoreLocation: true,
      ignorePrice: true,
    });
    if (candidates.length) {
      relaxationsApplied.push("price_range");
    }
  }

  if (!candidates.length && intent.categories.length) {
    candidates = applyFilteredSearch(menus, intent, {
      ignoreLocation: true,
      ignorePrice: true,
      ignoreCategory: true,
    });
    if (candidates.length) {
      relaxationsApplied.push("categories");
    }
  }

  if (!candidates.length) {
    candidates = menus;
    relaxationsApplied.push("fallback_all");
  }

  const ranked = candidates
    .map((item) => scoreItem(item, intent))
    .sort((left, right) => right.score - left.score);
  const items = ranked.slice(0, intent.top_k || 5);

  const response = {
    total_candidates: candidates.length,
    returned_count: items.length,
    items,
    filters_used: intent,
    relaxations_applied: relaxationsApplied,
  };

  if (!debug) {
    return { data: response };
  }

  return {
    data: response,
    debug: {
      hard_filter_summary: [
        `meal_times=${intent.meal_times.length ? intent.meal_times.join("|") : "ANY"}`,
        `categories=${intent.categories.length ? intent.categories.join("|") : "ANY"}`,
        `location_texts=${intent.location_texts.length ? intent.location_texts.join("|") : "ANY"}`,
        `price_max=${intent.price_max ?? "ANY"}`,
        `relaxations=${relaxationsApplied.length ? relaxationsApplied.join("|") : "NONE"}`,
      ],
      score_weights: DEFAULT_WEIGHTS,
    },
  };
}
