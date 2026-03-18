import { loadMenuData } from "./_lib/menuData.js";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: { message: "Method Not Allowed" },
    });
  }

  try {
    const id = String(req.query?.id || "").trim();
    if (!id) {
      return res.status(400).json({
        success: false,
        error: { message: "Menu id is required" },
      });
    }

    const menus = loadMenuData();
    const item = menus.find((entry) => entry.id === id) || null;

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { message: "Menu item not found." },
      });
    }

    return res.status(200).json({
      success: true,
      data: { item },
    });
  } catch (error) {
    console.error("[api/menu-detail] error:", error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || "Internal Server Error" },
    });
  }
}
