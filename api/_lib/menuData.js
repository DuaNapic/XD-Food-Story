import fs from "fs";
import path from "path";

function readJsonFile(filePath) {
  const fileData = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileData);
}

export function loadMenuData() {
  const primaryPath = path.join(process.cwd(), "api", "data.json");
  if (fs.existsSync(primaryPath)) {
    const data = readJsonFile(primaryPath);
    if (!Array.isArray(data)) {
      throw new Error("Menu data must be an array");
    }
    return data;
  }

  const fallbackPath = path.join(
    process.cwd(),
    "server",
    "data",
    "recommended_menus_frontend_ui.json",
  );
  if (fs.existsSync(fallbackPath)) {
    const data = readJsonFile(fallbackPath);
    if (!Array.isArray(data)) {
      throw new Error("Menu data must be an array");
    }
    return data;
  }

  throw new Error("Menu data file not found");
}

export function uniqueSorted(values) {
  return [...new Set(values)]
    .filter(Boolean)
    .sort((left, right) => String(left).localeCompare(String(right), "zh-CN"));
}
