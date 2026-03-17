import { loadMenuData } from "./_lib/menuData.js";

function parsePositiveInt(value, fallback) {
  const number = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function includesIgnoreCase(source, target) {
  return String(source || "")
    .toLowerCase()
    .includes(String(target || "").toLowerCase());
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

function sortMenus(items, sortBy, options = {}) {
  const { seed = "default-seed", diversifyShop = false } = options;
  let sorted = [...items];

  if (sortBy === "random") {
    sorted = shuffleMenus(sorted, seed);
  }

  return diversifyShop ? diversifyByShop(sorted) : sorted;
}

export default function handler(req, res) {
  // 允许跨域
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const jsonData = loadMenuData();

    const page = parsePositiveInt(req.query?.page, 1);
    const pageSize = Math.min(parsePositiveInt(req.query?.page_size, 20), 100);
    const keyword = String(req.query?.keyword || "").trim();
    const sortBy = String(req.query?.sort_by || "default").trim();
    const seed = normalizeSeed(req.query?.seed);
    const diversifyShop = parseBooleanParam(req.query?.diversify_shop);

    let filtered = jsonData;
    if (keyword) {
      filtered = jsonData.filter((item) =>
        [
          item?.title,
          item?.shop_text,
          item?.location_text,
          item?.stall_text,
          item?.category,
        ].some((field) => includesIgnoreCase(field, keyword)),
      );
    }

    filtered = sortMenus(filtered, sortBy, { seed, diversifyShop });

    const total = filtered.length;
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    res.status(200).json({
      success: true,
      data: {
        items,
        pagination: {
          page: safePage,
          page_size: pageSize,
          total,
          total_pages: totalPages,
        },
      },
    });
  } catch (error) {
    console.error("读取 JSON 失败:", error);
    res.status(500).json({
      success: false,
      error: {
        message: "找不到菜单数据，请检查 data.json 是否在 api 文件夹内",
        details: error.message,
      },
    });
  }
}
