import fs from "fs";
import path from "path";

function parsePositiveInt(value, fallback) {
  const number = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function includesIgnoreCase(source, target) {
  return String(source || "")
    .toLowerCase()
    .includes(String(target || "").toLowerCase());
}

export default function handler(req, res) {
  // 允许跨域
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 绝对路径定位：强制去项目根目录下的 api 文件夹里找 data.json
    // 使用 process.cwd() 配合 vercel.json 的 includeFiles
    const filePath = path.join(process.cwd(), "api", "data.json");
    if (!fs.existsSync(filePath)) {
      // 容灾处理：尝试从原本的 server 目录找
      const fallbackPath = path.join(
        process.cwd(),
        "server",
        "data",
        "recommended_menus_frontend_ui.json",
      );
      if (fs.existsSync(fallbackPath)) {
        const fileData = fs.readFileSync(fallbackPath, "utf8");
        return res
          .status(200)
          .json({ success: true, data: JSON.parse(fileData) });
      }
      throw new Error("File not found at " + filePath);
    }

    const fileData = fs.readFileSync(filePath, "utf8");
    const jsonData = JSON.parse(fileData);

    if (!Array.isArray(jsonData)) {
      throw new Error("Menu data must be an array");
    }

    const page = parsePositiveInt(req.query?.page, 1);
    const pageSize = Math.min(parsePositiveInt(req.query?.page_size, 20), 100);
    const keyword = String(req.query?.keyword || "").trim();

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
      error: "找不到菜单数据，请检查 data.json 是否在 api 文件夹内",
      details: error.message,
    });
  }
}
