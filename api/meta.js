import { loadMenuData, uniqueSorted } from "./_lib/menuData.js";

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
    const menus = loadMenuData();

    return res.status(200).json({
      success: true,
      data: {
        menu_count: menus.length,
        categories: uniqueSorted(menus.map((item) => item.category)),
        meal_times: uniqueSorted(menus.flatMap((item) => item.meal_time || [])),
        spiciness_options: uniqueSorted(menus.map((item) => item.spiciness)),
        image_keys: uniqueSorted(menus.map((item) => item.image_key)),
      },
    });
  } catch (error) {
    console.error("[api/meta] error:", error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || "Internal Server Error" },
    });
  }
}
