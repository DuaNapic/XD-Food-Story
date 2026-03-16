import fs from "node:fs/promises";
import path from "node:path";
import { PROJECT_ROOT } from "../config.js";

const FAVORITES_FILE = path.join(PROJECT_ROOT, "server", "data", "favorites.json");

// Data structure: { "sessionId": ["itemId1", "itemId2"], ... }
async function readData() {
  try {
    const data = await fs.readFile(FAVORITES_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    return {};
  }
}

async function writeData(data) {
  await fs.writeFile(FAVORITES_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function getUserFavorites(sessionId) {
  if (!sessionId) return [];
  const data = await readData();
  return data[sessionId] || [];
}

export async function saveUserFavorites(sessionId, favorites) {
  if (!sessionId) throw new Error("Session ID is required");
  if (!Array.isArray(favorites)) throw new Error("Favorites must be an array");
  
  const data = await readData();
  data[sessionId] = favorites;
  await writeData(data);
  return favorites;
}
