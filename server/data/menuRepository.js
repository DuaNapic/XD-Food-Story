import fs from "node:fs/promises";
import { DATA_FILE_PATH } from "../config.js";

let cache = null;

function uniqueSorted(values) {
  return [...new Set(values)]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function validateMenuItem(item) {
  const requiredStringFields = [
    "id",
    "title",
    "shop_text",
    "location_text",
    "stall_text",
    "badge",
    "category",
    "spiciness",
    "image_key",
    "wait_time_text",
    "ai_insight",
  ];

  return (
    requiredStringFields.every(
      (field) => typeof item[field] === "string" && item[field].trim(),
    ) &&
    typeof item.price === "number" &&
    Array.isArray(item.meal_time) &&
    Array.isArray(item.flavor_options) &&
    item.radar &&
    typeof item.radar.taste === "number" &&
    typeof item.radar.value === "number" &&
    typeof item.radar.satiety === "number" &&
    typeof item.radar.health === "number"
  );
}

export async function loadMenus({ force = false } = {}) {
  if (cache && !force) {
    return cache;
  }

  const raw = await fs.readFile(DATA_FILE_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Menu data source must be an array.");
  }

  const validItems = parsed.filter(validateMenuItem);

  if (validItems.length === 0) {
    throw new Error("No valid menu items found in data source.");
  }

  cache = validItems;
  return cache;
}

export async function getMenuById(id) {
  const menus = await loadMenus();
  return menus.find((item) => item.id === id) || null;
}

export async function getMetaFromMenus() {
  const menus = await loadMenus();

  return {
    menu_count: menus.length,
    categories: uniqueSorted(menus.map((item) => item.category)),
    meal_times: uniqueSorted(menus.flatMap((item) => item.meal_time)),
    spiciness_options: uniqueSorted(menus.map((item) => item.spiciness)),
    image_keys: uniqueSorted(menus.map((item) => item.image_key)),
  };
}

export async function getIntentReferenceData() {
  const menus = await loadMenus();

  return {
    categories: uniqueSorted(menus.map((item) => item.category)),
    meal_times: uniqueSorted(menus.flatMap((item) => item.meal_time)),
    spiciness_options: uniqueSorted(menus.map((item) => item.spiciness)),
    location_texts: uniqueSorted(menus.map((item) => item.location_text)),
    shop_texts: uniqueSorted(menus.map((item) => item.shop_text)),
    flavor_options: uniqueSorted(menus.flatMap((item) => item.flavor_options)),
  };
}
