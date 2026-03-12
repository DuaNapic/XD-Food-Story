import {
  loadMenus,
  getMenuById,
  getMetaFromMenus,
} from "../data/menuRepository.js";

function parseCsvParam(value) {
  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBooleanParam(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

function normalizeSeed(value) {
  const seed = String(value || "").trim();
  return seed || "default-seed";
}

function hashString(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function shuffleMenus(items, seed) {
  return [...items].sort((left, right) => {
    const leftHash = hashString(`${seed}:${left.id}`);
    const rightHash = hashString(`${seed}:${right.id}`);

    if (leftHash === rightHash) {
      return left.id.localeCompare(right.id, "zh-CN");
    }

    return leftHash - rightHash;
  });
}

function diversifyByShop(items) {
  const buckets = new Map();

  items.forEach((item) => {
    if (!buckets.has(item.shop_text)) {
      buckets.set(item.shop_text, []);
    }

    buckets.get(item.shop_text).push(item);
  });

  const orderedShops = [...buckets.keys()];
  const diversified = [];

  while (orderedShops.length > 0) {
    const nextRound = [];

    orderedShops.forEach((shop) => {
      const bucket = buckets.get(shop);
      if (!bucket?.length) {
        return;
      }

      diversified.push(bucket.shift());

      if (bucket.length > 0) {
        nextRound.push(shop);
      }
    });

    orderedShops.splice(0, orderedShops.length, ...nextRound);
  }

  return diversified;
}

function includesIgnoreCase(source, target) {
  return source.toLowerCase().includes(target.toLowerCase());
}

function sortMenus(items, sortBy, options = {}) {
  const { seed = "default-seed", diversifyShop = false } = options;
  const sorted = [...items];

  switch (sortBy) {
    case "price_asc":
      sorted.sort((left, right) => left.price - right.price);
      break;
    case "price_desc":
      sorted.sort((left, right) => right.price - left.price);
      break;
    case "taste_desc":
      sorted.sort((left, right) => right.radar.taste - left.radar.taste);
      break;
    case "value_desc":
      sorted.sort((left, right) => right.radar.value - left.radar.value);
      break;
    case "satiety_desc":
      sorted.sort((left, right) => right.radar.satiety - left.radar.satiety);
      break;
    case "health_desc":
      sorted.sort((left, right) => right.radar.health - left.radar.health);
      break;
    case "random":
      return diversifyShop
        ? diversifyByShop(shuffleMenus(sorted, seed))
        : shuffleMenus(sorted, seed);
    default:
      break;
  }

  return diversifyShop ? diversifyByShop(sorted) : sorted;
}

export async function getMeta() {
  return getMetaFromMenus();
}

export async function listMenus(query) {
  const menus = await loadMenus();

  const filters = {
    keyword: query.keyword?.trim() || null,
    categories: parseCsvParam(query.categories),
    meal_times: parseCsvParam(query.meal_times),
    flavor_options: parseCsvParam(query.flavor_options),
    spiciness: parseCsvParam(query.spiciness),
    location_text: query.location_text?.trim() || null,
    shop_text: query.shop_text?.trim() || null,
    price_min: query.price_min ? Number(query.price_min) : null,
    price_max: query.price_max ? Number(query.price_max) : null,
    sort_by: query.sort_by || "default",
    seed: normalizeSeed(query.seed),
    diversify_shop: parseBooleanParam(query.diversify_shop),
    page: Math.max(Number(query.page || 1), 1),
    page_size: Math.min(Math.max(Number(query.page_size || 20), 1), 100),
  };

  let filtered = menus.filter((item) => {
    if (filters.keyword) {
      const hit = [item.title, item.shop_text, item.location_text].some(
        (field) => includesIgnoreCase(field, filters.keyword),
      );
      if (!hit) {
        return false;
      }
    }

    if (
      filters.categories.length &&
      !filters.categories.includes(item.category)
    ) {
      return false;
    }

    if (
      filters.meal_times.length &&
      !item.meal_time.some((mealTime) => filters.meal_times.includes(mealTime))
    ) {
      return false;
    }

    if (
      filters.flavor_options.length &&
      !item.flavor_options.some((flavor) =>
        filters.flavor_options.includes(flavor),
      )
    ) {
      return false;
    }

    if (
      filters.spiciness.length &&
      !filters.spiciness.includes(item.spiciness)
    ) {
      return false;
    }

    if (
      filters.location_text &&
      !includesIgnoreCase(item.location_text, filters.location_text)
    ) {
      return false;
    }

    if (
      filters.shop_text &&
      !includesIgnoreCase(item.shop_text, filters.shop_text)
    ) {
      return false;
    }

    if (filters.price_min !== null && item.price < filters.price_min) {
      return false;
    }

    if (filters.price_max !== null && item.price > filters.price_max) {
      return false;
    }

    return true;
  });

  filtered = sortMenus(filtered, filters.sort_by, {
    seed: filters.seed,
    diversifyShop: filters.diversify_shop,
  });

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / filters.page_size), 1);
  const start = (filters.page - 1) * filters.page_size;
  const items = filtered.slice(start, start + filters.page_size);

  return {
    items,
    pagination: {
      page: filters.page,
      page_size: filters.page_size,
      total,
      total_pages: totalPages,
    },
    applied_filters: {
      keyword: filters.keyword,
      categories: filters.categories,
      meal_times: filters.meal_times,
      flavor_options: filters.flavor_options,
      spiciness: filters.spiciness,
      location_text: filters.location_text,
      shop_text: filters.shop_text,
      price_min: filters.price_min,
      price_max: filters.price_max,
      sort_by: filters.sort_by,
      seed: filters.seed,
      diversify_shop: filters.diversify_shop,
    },
  };
}

export async function getMenuDetail(id) {
  return getMenuById(id);
}
