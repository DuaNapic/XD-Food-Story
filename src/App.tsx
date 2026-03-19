import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { atom, useAtom } from "jotai";
import {
  Area,
  AreaChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  Clock,
  Droplets,
  Flame,
  Heart,
  HeartCrack,
  Home,
  Leaf,
  LoaderCircle,
  MapPin,
  Search,
  Sparkles,
  Soup,
  Store,
  Utensils,
  Wheat,
  X,
} from "lucide-react";
import XiaoD from "./components/XiaoD";
import ErrorBoundary from "./components/ErrorBoundary";
import { cn } from "./lib/utils";

const favoritesAtom = atom<string[]>([]);
const viewAtom = atom<"discover" | "favorites" | "shops">("discover");
const searchQueryAtom = atom<string>("");
const isAiModeAtom = atom<boolean>(false);

type ShopGroup = { name: string; canteen: string; items: MenuItem[]; images: string[] };
const selectedShopAtom = atom<ShopGroup | null>(null);

// MASTER-CLASS: Centralized Animation Variants
const ANIM_VARIANTS = {
  fadeInUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { type: "spring", stiffness: 260, damping: 24 },
  },
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
  stagger: {
    animate: {
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  },
};

type FilterState = {
  canteen: string;
  priceRange: string | null;
  maxCalories: number | null;
  minHealth: number | null;
};
const filtersAtom = atom<FilterState>({
  canteen: "all",
  priceRange: null,
  maxCalories: null,
  minHealth: null,
});

const shopCanteenFiltersAtom = atom<string[]>([]);

const FILTER_OPTIONS = {
  canteens: [
    { id: "all", label: "全部" },
    { id: "海棠", label: "海棠" },
    { id: "丁香", label: "丁香" },
    { id: "竹园", label: "竹园" },
  ],
  prices: [
    { id: null, label: "不限" },
    { id: "0-10", label: "0-10元" },
    { id: "10-15", label: "10-15元" },
    { id: "15-25", label: "15-25元" },
    { id: "25-999", label: "25元以上" },
  ],
  calories: [
    { id: null, label: "不限热量" },
    { id: 400, label: "轻食低卡(≤400)" },
    { id: 600, label: "常规(≤600)" },
  ],
  health: [
    { id: null, label: "不限健康度" },
    { id: 80, label: "健康优选(≥80分)" },
  ],
};

type MealTime = "早餐" | "午餐" | "晚餐";
type Spiciness = "不辣" | "微辣" | "中辣" | "特辣" | "可选辣";
type RobotMode = "idle" | "thinking" | "talking" | "smiling";

interface RadarScores {
  taste: number;
  value: number;
  satiety: number;
  health: number;
  wait_time?: number;
  aesthetic?: number;
}

interface MenuItem {
  id: string;
  title: string;
  shop_text: string;
  location_text: string;
  stall_text: string;
  price: number;
  badge: string;
  category: string;
  meal_time: MealTime[];
  flavor_options: string[];
  spiciness: Spiciness;
  image_key: string;
  wait_time_text: string;
  form_label: string | null;
  price_rule_note: string | null;
  ai_insight: string;
  radar: RadarScores;
}

interface RankedMenuItem {
  item: MenuItem;
  score: number;
  matched_reasons: string[];
}

interface MenusResponse {
  success: boolean;
  data: {
    items: MenuItem[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  };
}

interface MenuDetailResponse {
  success: boolean;
  data: {
    item: MenuItem;
  };
}

interface MetaResponse {
  success: boolean;
  data: {
    menu_count: number;
  };
}

interface MacroEstimate {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

interface CrowdPoint {
  time: string;
  level: number;
}

interface ReferenceCard {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  accentClassName: string;
}

const imageMap: Record<string, string> = {
  dumplings:
    "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=80",
  "hot-dish":
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80",
  noodles:
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80",
  pot: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80",
  rice: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
  "rice-noodles":
    "https://images.unsplash.com/photo-1555126634-323283e090fa?auto=format&fit=crop&w=1200&q=80",
  snack:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  "soup-drink":
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80",
};

const DISCOVER_PAGE_SIZE = 24;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getImageUrl(imageKey: string) {
  return imageMap[imageKey] || imageMap.snack;
}

function normalizeRadarScore(value: number | undefined) {
  if (value === undefined || value === null) return 0;
  if (value <= 5) {
    return clamp(Math.round(value * 20), 0, 100);
  }
  return clamp(Math.round(value), 0, 100);
}

function averageWaitMinutes(waitTimeText: string) {
  const numbers = waitTimeText.match(/\d+/g)?.map(Number) || [];
  if (numbers.length === 0) {
    return 10;
  }
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function getSatietyLabel(item: MenuItem) {
  const satietyScore = normalizeRadarScore(item.radar.satiety);
  if (satietyScore >= 88) {
    return "十分顶饱";
  }
  if (satietyScore >= 76) {
    return "极强饱腹感";
  }
  if (satietyScore >= 60) {
    return "适中饱腹感";
  }
  return "汤水多易消化";
}

function buildMacroEstimate(item: MenuItem): MacroEstimate {
  const satiety = normalizeRadarScore(item.radar.satiety);
  const health = normalizeRadarScore(item.radar.health);
  const taste = normalizeRadarScore(item.radar.taste);
  const spicyBoost =
    item.spiciness === "特辣"
      ? 10
      : item.spiciness === "中辣"
        ? 6
        : item.spiciness === "微辣"
          ? 3
          : 0;

  return {
    protein: Math.round(12 + health * 0.12 + taste * 0.05 + item.price * 0.8),
    carbs: Math.round(18 + satiety * 0.35 + item.price * 1.4),
    fat: Math.round(
      6 + (100 - health) * 0.08 + taste * 0.05 + spicyBoost * 0.4,
    ),
    calories: Math.round(
      220 + item.price * 13 + satiety * 2 + taste * 0.6 + spicyBoost,
    ),
  };
}

function buildCrowdTrend(item: MenuItem): CrowdPoint[] {
  const waitBase = clamp(
    Math.round(averageWaitMinutes(item.wait_time_text) * 4),
    20,
    80,
  );
  const hash = item.id
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const factors = [0.42, 0.76, 1, 0.84, 0.57, 0.34];
  const times = ["11:00", "11:30", "12:00", "12:30", "13:00", "13:30"];

  return times.map((time, index) => ({
    time,
    level: clamp(
      Math.round(waitBase * factors[index] + ((hash + index * 11) % 12) - 6),
      12,
      100,
    ),
  }));
}

function buildReferenceCards(item: MenuItem): ReferenceCard[] {
  const mealText = item.meal_time.join(" / ");
  const flavorText = item.flavor_options.length
    ? item.flavor_options.join(" / ")
    : "暂无补充口味";

  return [
    {
      id: "meal",
      title: "就餐时段",
      subtitle: mealText,
      body: `当前数据标注为${mealText}，更适合按这个餐段筛选。`,
      accentClassName: "from-orange-400 to-rose-400",
    },
    {
      id: "window",
      title: "档口位置",
      subtitle: `${item.location_text} · ${item.stall_text}`,
      body: `店铺为${item.shop_text}，适合到对应楼层后直接找窗口。`,
      accentClassName: "from-blue-400 to-indigo-400",
    },
    {
      id: "flavor",
      title: "口味标签",
      subtitle: flavorText,
      body: `分类属于${item.category}，辣度为${item.spiciness}。`,
      accentClassName: "from-emerald-400 to-teal-400",
    },
    {
      id: "pricing",
      title: "规格与计价",
      subtitle: item.form_label || "暂无规格说明",
      body: item.price_rule_note || "当前没有额外计价规则说明。",
      accentClassName: "from-amber-400 to-yellow-500",
    },
  ];
}

function buildWarningText(item: MenuItem) {
  const parts = [`辣度偏${item.spiciness}`, `高峰等待约${item.wait_time_text}`];
  if (item.price_rule_note) {
    parts.push(item.price_rule_note);
  }
  return `${parts.join("，")}。`;
}

function buildPairingText(item: MenuItem) {
  const flavorText = item.flavor_options.length
    ? `口味关键词是${item.flavor_options.join("、")}`
    : "口味标签比较简洁";
  const formText = item.form_label ? `，${item.form_label}更方便判断份量` : "";
  return `推荐在${item.meal_time.join(" / ")}时段尝试，${flavorText}${formText}。`;
}

async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type");

  if (!contentType || !contentType.includes("application/json")) {
    throw new Error(`服务器响应异常 (${response.status})`);
  }

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data?.error?.message || "请求失败");
  }
  return data as T;
}

function generateSessionSeed() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function mergeMenus(existing: MenuItem[], incoming: MenuItem[]) {
  const merged = new Map(existing.map((item) => [item.id, item]));

  if (!Array.isArray(incoming)) {
    return [...merged.values()];
  }

  incoming.forEach((item) => {
    merged.set(item.id, item);
  });

  return [...merged.values()];
}

function filterItems(items: MenuItem[], keyword: string, filters: FilterState) {
  let filtered = items;

  // Keyword filter
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (normalizedKeyword) {
    filtered = filtered.filter((item) =>
      [
        item.title,
        item.shop_text,
        item.location_text,
        item.stall_text,
        item.category,
        ...item.flavor_options,
      ].some((field) => field.toLowerCase().includes(normalizedKeyword)),
    );
  }

  // Canteen filter
  if (filters.canteen !== "all") {
    filtered = filtered.filter((item) =>
      item.location_text.includes(filters.canteen),
    );
  }

  // Price filter
  if (filters.priceRange !== null) {
    const [minStr, maxStr] = filters.priceRange.split('-');
    const min = Number(minStr);
    const max = Number(maxStr);
    filtered = filtered.filter(
      (item) => item.price >= min && item.price <= max,
    );
  }

  // Calories filter (estimated)
  if (filters.maxCalories !== null) {
    filtered = filtered.filter((item) => {
      const estimate = buildMacroEstimate(item);
      return estimate.calories <= (filters.maxCalories ?? 2000);
    });
  }

  // Health filter (radar based)
  if (filters.minHealth !== null) {
    filtered = filtered.filter((item) => {
      const healthScore = normalizeRadarScore(item.radar.health);
      return healthScore >= (filters.minHealth ?? 0);
    });
  }

  return filtered;
}

function buildDiscoverRequestUrl({
  page,
  keyword,
  seed,
}: {
  page: number;
  keyword: string;
  seed: string;
}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(DISCOVER_PAGE_SIZE),
  });

  if (keyword) {
    params.set("keyword", keyword);
  } else {
    params.set("sort_by", "random");
    params.set("seed", seed);
    params.set("diversify_shop", "true");
  }

  return `/api/menus?${params.toString()}`;
}

const Sidebar = React.memo(() => {
  const [currentView, setView] = useAtom(viewAtom);
  const [favorites] = useAtom(favoritesAtom);

  return (
    <>
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-20 lg:w-64 bg-white/70 backdrop-blur-xl border-r border-stone-100 z-40 transition-all duration-300">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-stone-100">
          <img
            src="/logo.png"
            alt="XD Food Story Logo"
            className="w-8 h-8 lg:w-9 lg:h-9 object-contain flex-shrink-0"
          />
          <span className="ml-3 font-semibold text-lg tracking-tight text-stone-800 hidden lg:block font-serif">
            XD Foodie
          </span>
        </div>
        <nav className="flex-1 py-8 px-4 flex flex-col gap-3">
          <button
            onClick={() => setView("discover")}
            className={cn(
              "flex items-center justify-center lg:justify-start lg:px-4 py-3.5 rounded-2xl transition-all duration-300",
              currentView === "discover"
                ? "bg-stone-800 text-white shadow-lg shadow-stone-800/10"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-800",
            )}
          >
            <Sparkles
              className="w-5 h-5 flex-shrink-0"
              strokeWidth={currentView === "discover" ? 2 : 1.5}
            />
            <span className="ml-3 font-medium hidden lg:block">
              发现 (Discover)
            </span>
          </button>
          <button
            onClick={() => setView("favorites")}
            className={cn(
              "flex items-center justify-center lg:justify-start lg:px-4 py-3.5 rounded-2xl transition-all duration-300",
              currentView === "favorites"
                ? "bg-stone-800 text-white shadow-lg shadow-stone-800/10"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-800",
            )}
          >
            <div className="relative">
              <Heart
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  currentView === "favorites" ? "fill-white" : "",
                )}
                strokeWidth={currentView === "favorites" ? 2 : 1.5}
              />
              {favorites.length > 0 && (
                <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white lg:border-transparent">
                  {favorites.length}
                </span>
              )}
            </div>
            <span className="ml-3 font-medium hidden lg:block">我的收藏</span>
            {favorites.length > 0 && (
              <span
                className={cn(
                  "ml-auto text-xs font-semibold px-2 py-0.5 rounded-full hidden lg:block",
                  currentView === "favorites"
                    ? "bg-stone-700 text-stone-200"
                    : "bg-stone-100 text-stone-500",
                )}
              >
                {favorites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setView("shops")}
            className={cn(
              "flex items-center justify-center lg:justify-start lg:px-4 py-3.5 rounded-2xl transition-all duration-300",
              currentView === "shops"
                ? "bg-stone-800 text-white shadow-lg shadow-stone-800/10"
                : "text-stone-500 hover:bg-stone-100 hover:text-stone-800",
            )}
          >
            <Store
              className="w-5 h-5 flex-shrink-0"
              strokeWidth={currentView === "shops" ? 2 : 1.5}
            />
            <span className="ml-3 font-medium hidden lg:block">店铺/窗口</span>
          </button>
        </nav>
      </aside>
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 px-6 pb-[max(env(safe-area-inset-bottom),24px)] pointer-events-none">
        <div className="bg-stone-800/90 backdrop-blur-md p-2 rounded-full shadow-2xl flex items-center justify-around pointer-events-auto border border-stone-700/50">
          <button
            onClick={() => setView("discover")}
            className={cn(
              "p-4 rounded-full transition-colors flex-1 flex justify-center",
              currentView === "discover" ? "bg-white/10" : "hover:bg-white/5",
            )}
          >
            <Home
              className={cn(
                "w-6 h-6",
                currentView === "discover" ? "text-white" : "text-stone-400",
              )}
              strokeWidth={currentView === "discover" ? 2 : 1.5}
            />
          </button>
          <button
            onClick={() => setView("favorites")}
            className={cn(
              "p-4 rounded-full transition-colors relative flex-1 flex justify-center",
              currentView === "favorites" ? "bg-white/10" : "hover:bg-white/5",
            )}
          >
            <Heart
              className={cn(
                "w-6 h-6",
                currentView === "favorites"
                  ? "text-rose-500 fill-rose-500"
                  : "text-stone-400",
              )}
              strokeWidth={currentView === "favorites" ? 2 : 1.5}
            />
            {favorites.length > 0 && (
              <span className="absolute top-2 right-[calc(50%-14px)] w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-stone-800">
                {favorites.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setView("shops")}
            className={cn(
              "p-4 rounded-full transition-colors relative flex-1 flex justify-center",
              currentView === "shops" ? "bg-white/10" : "hover:bg-white/5",
            )}
          >
            <Store
              className={cn(
                "w-6 h-6",
                currentView === "shops" ? "text-white" : "text-stone-400",
              )}
              strokeWidth={currentView === "shops" ? 2 : 1.5}
            />
          </button>
        </div>
      </div>
    </>
  );
});

const FilterSection = React.memo(() => {
  const [filters, setFilters] = useAtom(filtersAtom);
  const [currentView] = useAtom(viewAtom);

  const filterGroups = [
    {
      label: "食堂",
      key: "canteen" as const,
      options: FILTER_OPTIONS.canteens,
    },
    {
      label: "价格",
      key: "priceRange" as const,
      options: FILTER_OPTIONS.prices,
    },
    {
      label: "热量",
      key: "maxCalories" as const,
      options: FILTER_OPTIONS.calories,
    },
    {
      label: "健康",
      key: "minHealth" as const,
      options: FILTER_OPTIONS.health,
    },
  ];

  const activeGroups = currentView === "shops"
    ? filterGroups.filter((g) => g.key !== "canteen")
    : filterGroups;

  /* ── 手机端：整体折叠为单行横向滚动芯片条；桌面端保持竖排分组 ── */

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 mb-4 sm:mb-8">
      {/* ── 统一竖排分组，移动端仅通过 class 收紧 ── */}
      <div className="flex flex-col gap-2 sm:gap-4 p-3 sm:p-5 bg-white/95 backdrop-blur-md md:backdrop-blur-2xl md:bg-white/50 rounded-[20px] sm:rounded-[32px] border border-stone-200/40 shadow-[0_4px_16px_rgb(0,0,0,0.03)] sm:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-500 md:hover:shadow-[0_20px_40px_rgb(0,0,0,0.04)]">
        {activeGroups.map((group) => (
          <div
            key={group.label}
            className="flex flex-row items-center gap-2 sm:gap-6"
          >
            <div className="flex items-center gap-1.5 shrink-0 w-[36px] sm:w-[64px]">
              <div className="w-1 h-3 sm:h-3.5 bg-orange-400/40 rounded-full" />
              <span className="text-[10px] sm:text-[12px] font-bold text-stone-400 uppercase tracking-[0.08em]">
                {group.label}
              </span>
            </div>
            <div
              className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-visible"
              style={{ scrollbarWidth: "none" }}
            >
              {group.options.map((option) => {
                const isActive = filters[group.key] === option.id;
                return (
                  <button
                    key={String(option.id)}
                    onClick={() =>
                      setFilters({ ...filters, [group.key]: option.id })
                    }
                  className={cn(
                      "group relative shrink-0 px-2.5 py-0.5 sm:px-4 sm:py-1.5 rounded-full text-[11.5px] sm:text-[13.5px] font-medium transition-all duration-300 active:scale-95",
                      isActive
                        ? "bg-stone-800 text-white shadow-md shadow-stone-800/15"
                        : "bg-white/40 text-stone-500 border border-stone-100/50 hover:bg-stone-100 hover:text-stone-800 hover:border-stone-200",
                    )}
                  >
                    {option.label}
                    {isActive && (
                      <motion.div
                        layoutId={`active-pill-desktop-${group.label}`}
                        className="absolute inset-0 rounded-full ring-2 ring-stone-800/10 pointer-events-none"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const Hero = React.memo(({ menuCount }: { menuCount: number }) => {
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // 同步外部清除操作
  useEffect(() => {
    if (searchQuery === "") {
      setLocalQuery("");
    }
  }, [searchQuery]);

  // 防抖更新 Atom 狀態
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localQuery, setSearchQuery]);

  return (
    <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center relative z-20">
      <motion.div
        variants={ANIM_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        exit="exit"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 backdrop-blur-md border border-stone-200/60 shadow-sm mb-8 relative"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-sm font-medium text-stone-600 tracking-wide pr-1">
          {menuCount > 0 ? `已收录 ${menuCount} 道菜品` : "Campus Menu Live"}
        </span>
        <motion.div
          animate={{ y: [0, -4, 0], opacity: [0.5, 1, 0.5] }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="absolute top-8 -left-6 w-2 h-2 bg-stone-200 rounded-full blur-[1px]"
        />
        <motion.div
          animate={{
            y: [0, 6, 0],
            opacity: [0.2, 0.6, 0.2],
            rotate: [-10, 5, -10],
          }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
          className="absolute -top-4 -right-8"
        >
          <Leaf className="w-5 h-5" strokeWidth={1} />
        </motion.div>
      </motion.div>

      <div className="relative inline-block mb-6">
        <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-[#1A365D] to-stone-500 pb-2 relative z-10">
          XD食物语
        </h1>
        <motion.div
          initial={{ opacity: 0, rotate: -15, scale: 0.8 }}
          animate={{ opacity: 1, rotate: [10, -5, 10], scale: 1 }}
          transition={{
            opacity: { delay: 0.3, duration: 0.8 },
            rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute -top-10 -right-8 md:-top-12 md:-right-10 z-20"
        >
          <img
            src="/logo.png"
            alt="Logo Icon"
            className="w-12 h-12 md:w-16 md:h-16 object-contain drop-shadow-md"
          />
        </motion.div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-[3px] bg-gradient-to-r from-transparent via-stone-200 to-transparent rounded-full" />
      </div>

      <motion.p
        variants={ANIM_VARIANTS.fadeInUp}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ ...ANIM_VARIANTS.fadeInUp.transition, delay: 0.1 } as any}
        className="text-lg md:text-xl text-stone-500 max-w-xl mx-auto mb-10 font-light leading-relaxed"
      >
        发现校园最佳美食，或点击右下角的
        <span className="text-blue-500 font-medium">西小电</span>让 AI
        帮你决定今天吃什么 ✨
      </motion.p>

      <motion.div
        variants={ANIM_VARIANTS.fadeInScale}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={
          { ...ANIM_VARIANTS.fadeInScale.transition, delay: 0.2 } as any
        }
        className="relative max-w-xl mx-auto group/search"
      >
        <div className="flex items-center bg-white/95 backdrop-blur-md md:backdrop-blur-2xl md:bg-white/70 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-stone-900/5 md:hover:ring-stone-900/10 focus-within:ring-stone-900/15 focus-within:bg-white/90 focus-within:shadow-lg transition-all duration-300 px-5 py-3.5">
          <Search
            className="w-5 h-5 text-stone-400 group-focus-within/search:text-stone-700 transition-colors shrink-0"
            strokeWidth={2}
          />
          <input
            ref={inputRef}
            type="text"
            value={localQuery}
            onChange={(event) => setLocalQuery(event.target.value)}
            placeholder="搜索菜名、食堂..."
            className="flex-1 ml-3 bg-transparent border-none focus:ring-0 text-stone-800 placeholder-stone-400 font-medium outline-none text-[16px]"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setLocalQuery("");
                setSearchQuery("");
                inputRef.current?.focus();
              }}
              className="text-stone-300 md:hover:text-stone-500 active:text-stone-600 transition-colors ml-2 p-2"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>
        {searchQuery && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-7 left-0 right-0 text-[13px] text-stone-400 text-center"
          >
            按菜名或食堂过滤中...想用 AI 推荐？点右下角的西小电
          </motion.p>
        )}
      </motion.div>
    </section>
  );
});

const FoodCard = React.memo(
  ({ item, onClick }: { item: MenuItem; onClick: (id: string) => void }) => {
    const [favorites, setFavorites] = useAtom(favoritesAtom);
    const isFavorite = favorites.includes(item.id);
    const satietyLabel = getSatietyLabel(item);

    const toggleFavorite = (event: React.MouseEvent) => {
      event.stopPropagation();
      setFavorites(
        isFavorite
          ? favorites.filter((id) => id !== item.id)
          : [...favorites, item.id],
      );
    };

    return (
      <motion.div
        variants={ANIM_VARIANTS.fadeInScale}
        initial="initial"
        animate="animate"
        whileHover={{ y: -8, scale: 1.02 }}
        transition={
          {
            ...ANIM_VARIANTS.fadeInScale.transition,
            type: "spring",
            stiffness: 300,
            damping: 25,
          } as any
        }
        onClick={() => onClick(item.id)}
        style={{ willChange: "transform, opacity" }}
        className="bg-white/95 md:bg-white/90 backdrop-blur-md md:backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] cursor-pointer flex flex-col group relative ring-1 ring-stone-900/5 md:hover:ring-stone-900/10 transition-all duration-300 active:scale-[0.98]"
      >
        <div className="relative h-48 sm:h-56 overflow-hidden">
          <motion.img
            src={getImageUrl(item.image_key)}
            alt={item.title}
            loading="lazy"
            decoding="async"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
            className="w-full h-full object-cover origin-center"
          />
          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[13px] font-medium text-stone-700 shadow-sm flex items-center gap-1.5 z-10">
            <Utensils className="w-3.5 h-3.5 text-orange-500" strokeWidth={2} />
            {satietyLabel}
          </div>
          <button
            onClick={toggleFavorite}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/80 backdrop-blur-md shadow-sm z-10 md:hover:scale-110 active:scale-95 transition-transform"
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-colors",
                isFavorite ? "text-rose-500 fill-rose-500" : "text-stone-500",
              )}
              strokeWidth={isFavorite ? 2 : 1.5}
            />
          </button>
        </div>
        <div className="p-5 flex flex-col flex-grow bg-white">
          <div className="flex justify-between items-start mb-2.5 gap-3">
            <h3 className="text-[19px] font-semibold text-stone-800 tracking-tight line-clamp-1">
              {item.title}
            </h3>
            <span className="text-lg font-medium text-stone-800 whitespace-nowrap">
              ¥{item.price.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center text-[14px] text-stone-500 mt-auto">
            <MapPin
              className="w-4 h-4 mr-1.5 flex-shrink-0 text-stone-400"
              strokeWidth={1.5}
            />
            <span className="truncate">{item.location_text}</span>
          </div>
        </div>
      </motion.div>
    );
  },
);

const DetailDrawer = React.memo(
  ({
    item,
    isOpen,
    onClose,
    onExpand,
  }: {
    item: MenuItem | null;
    isOpen: boolean;
    onClose: () => void;
    onExpand: (item: MenuItem) => void;
  }) => {
    const chartData = useMemo(() => {
      if (!item) return [];
      return [
        {
          subject: "味道",
          A: normalizeRadarScore(item.radar?.taste),
          fullMark: 100,
        },
        {
          subject: "性价比",
          A: normalizeRadarScore(item.radar?.value),
          fullMark: 100,
        },
        {
          subject: "饱腹感",
          A: normalizeRadarScore(item.radar?.satiety),
          fullMark: 100,
        },
        {
          subject: "健康度",
          A: normalizeRadarScore(item.radar?.health),
          fullMark: 100,
        },
        {
          subject: "出餐速度",
          A: normalizeRadarScore(item.radar?.wait_time),
          fullMark: 100,
        },
        {
          subject: "颜值",
          A: normalizeRadarScore(item.radar?.aesthetic),
          fullMark: 100,
        },
      ];
    }, [item]);

    return (
      <AnimatePresence>
        {isOpen && item && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onClose}
              className="fixed inset-0 bg-stone-900/10 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{
                x: "100%",
                transition: { type: "tween", duration: 0.3, ease: "easeInOut" },
              }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 250,
                mass: 0.8,
              }}
              className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-[#FDFDFD] shadow-2xl z-50 overflow-y-auto flex flex-col pb-[max(env(safe-area-inset-bottom),0px)]"
            >
              <div className="sticky top-0 z-10 bg-[#FDFDFD]/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center">
                <button
                  onClick={onClose}
                  className="p-3 -ml-2 rounded-full md:hover:bg-stone-100 active:bg-stone-200 transition-colors text-stone-500 md:hover:text-stone-800 bg-white shadow-sm border border-stone-100"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <span className="text-sm font-medium text-stone-400 tracking-widest uppercase">
                  Quick Glance
                </span>
                <div className="w-10" />
              </div>
              <div className="px-6 py-4 flex-grow">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="relative h-64 rounded-[28px] overflow-hidden mb-6 shadow-sm"
                >
                  <img
                    src={getImageUrl(item.image_key)}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg">
                    <span className="text-xl font-bold text-stone-800 tracking-tight">
                      ¥{item.price.toFixed(1)}
                    </span>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.4 }}
                  className="mb-8"
                >
                  <div className="inline-flex items-center px-3 py-1.5 bg-orange-50 text-orange-700 rounded-xl shadow-sm text-[13.5px] font-bold border border-orange-100/50 mb-3">
                    <MapPin className="w-4 h-4 mr-1.5" strokeWidth={2} />
                    {item.location_text} · {item.shop_text} · {item.stall_text}
                  </div>

                  <h2 className="text-[28px] font-bold text-stone-800 mb-4 tracking-tight font-serif leading-tight">
                    {item.title}
                  </h2>

                  <div className="flex items-center px-3 py-1.5 bg-white rounded-xl shadow-sm text-[13.5px] font-medium text-stone-600 border border-stone-100 w-fit">
                    <Clock
                      className="w-4 h-4 mr-1.5 text-stone-400"
                      strokeWidth={1.5}
                    />
                    建议等待时间：{item.wait_time_text}
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 20,
                    delay: 0.2,
                  }}
                  className="h-[220px] w-full -ml-3 mb-4 mix-blend-multiply"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="60%"
                      data={chartData}
                    >
                      <PolarGrid stroke="#f5f5f4" strokeWidth={1} />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#a8a29e", fontSize: 12 }}
                      />
                      <PolarRadiusAxis
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                      />
                      <Radar
                        name="Metrics"
                        dataKey="A"
                        stroke="#7dd3fc"
                        strokeWidth={1.5}
                        fill="#bae6fd"
                        fillOpacity={0.4}
                        isAnimationActive={true}
                        animationDuration={1500}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </motion.div>
                <p className="text-[14px] text-stone-500 text-center px-4 leading-relaxed font-light italic">
                  "{item.ai_insight}"
                </p>
              </div>
              <div className="p-6 bg-gradient-to-t from-[#FDFDFD] via-[#FDFDFD] to-transparent pt-10 sticky bottom-0">
                <button
                  onClick={() => onExpand(item)}
                  className="w-full flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 text-white rounded-[20px] py-4 font-medium transition-transform active:scale-95 shadow-xl shadow-stone-800/20"
                >
                  <Sparkles
                    className="w-4 h-4 text-amber-300"
                    strokeWidth={2}
                  />
                  查看完整数据分析和评价
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  },
);

const FullScreenDetail = React.memo(
  ({
    item,
    isOpen,
    onClose,
  }: {
    item: MenuItem | null;
    isOpen: boolean;
    onClose: () => void;
  }) => {
    const [favorites, setFavorites] = useAtom(favoritesAtom);
    const isFavorite = item ? favorites.includes(item.id) : false;

    const chartData = useMemo(() => {
      if (!item) return [];
      return [
        {
          subject: "味道",
          A: normalizeRadarScore(item.radar?.taste),
          fullMark: 100,
        },
        {
          subject: "性价比",
          A: normalizeRadarScore(item.radar?.value),
          fullMark: 100,
        },
        {
          subject: "饱腹感",
          A: normalizeRadarScore(item.radar?.satiety),
          fullMark: 100,
        },
        {
          subject: "健康度",
          A: normalizeRadarScore(item.radar?.health),
          fullMark: 100,
        },
        {
          subject: "出餐速度",
          A: normalizeRadarScore(item.radar?.wait_time),
          fullMark: 100,
        },
        {
          subject: "颜值",
          A: normalizeRadarScore(item.radar?.aesthetic),
          fullMark: 100,
        },
      ];
    }, [item]);

    const toggleFavorite = useCallback(() => {
      if (!item) return;
      setFavorites((previous) =>
        previous.includes(item.id)
          ? previous.filter((fav) => fav !== item.id)
          : [...previous, item.id],
      );
    }, [item, setFavorites]);

    if (!item) {
      return null;
    }

    const macroEstimate = buildMacroEstimate(item);
    const crowdTrend = buildCrowdTrend(item);
    const referenceCards = buildReferenceCards(item);

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{
              y: "100%",
              opacity: 0,
              transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] },
            }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 250,
              mass: 0.8,
            }}
            className="fixed inset-0 bg-[#FDFDFD] z-[60] overflow-y-auto overflow-x-hidden pb-32"
          >
            <div className="sticky top-0 z-20 w-full px-6 py-4 flex justify-between items-center bg-gradient-to-b from-[#FDFDFD]/90 to-transparent backdrop-blur-[2px]">
              <button
                onClick={onClose}
                className="p-4 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-stone-100/50 md:hover:bg-stone-50 active:bg-stone-100 transition-colors text-stone-600 focus:outline-none"
              >
                <X className="w-6 h-6" strokeWidth={1.5} />
              </button>
              <button
                onClick={toggleFavorite}
                className="p-4 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-stone-100/50 md:hover:bg-rose-50 active:bg-rose-100 transition-all text-stone-600 md:hover:scale-105 active:scale-95 focus:outline-none"
              >
                <Heart
                  className={cn(
                    "w-6 h-6 transition-colors duration-300",
                    isFavorite
                      ? "text-rose-500 fill-rose-500 scale-110"
                      : "hover:text-rose-500",
                  )}
                  strokeWidth={isFavorite ? 2 : 1.5}
                />
              </button>
            </div>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
                className="relative h-[400px] rounded-[40px] overflow-hidden shadow-2xl shadow-stone-200/50 mb-10 mt-6"
              >
                <img
                  src={getImageUrl(item.image_key)}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/10 to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <div className="flex justify-between items-end gap-6">
                    <div className="flex-1">
                      <div className="inline-flex items-center px-4 py-2 bg-orange-500/90 backdrop-blur-md rounded-2xl text-[14px] font-bold text-white border border-orange-400/30 mb-4 shadow-lg">
                        <MapPin className="w-4 h-4 mr-2" strokeWidth={2.5} />
                        {item.location_text} · {item.shop_text} ·{" "}
                        {item.stall_text}
                      </div>

                      <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight font-serif drop-shadow-md leading-tight">
                        {item.title}
                      </h1>

                      <div className="flex items-center px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl text-[13px] font-medium text-white border border-white/10 w-fit">
                        <Clock
                          className="w-3.5 h-3.5 mr-2 opacity-80"
                          strokeWidth={1.5}
                        />
                        高峰预计等待：{item.wait_time_text}
                      </div>
                    </div>

                    <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-xl border border-white/20 transform translate-y-2">
                      <span className="text-3xl font-bold text-stone-800 tracking-tight">
                        ¥{item.price.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-7 space-y-10">
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.5 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-amber-100 p-2.5 rounded-2xl">
                        <Sparkles
                          className="w-5 h-5 text-amber-600"
                          strokeWidth={2}
                        />
                      </div>
                      <h3 className="text-2xl font-bold text-stone-800 tracking-tight">
                        AI 美食档案
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white rounded-[28px] p-6 shadow-sm border border-stone-100 hover:shadow-md transition-shadow">
                        <h4 className="text-sm font-medium text-stone-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <Flame className="w-4 h-4" />
                          AI 推荐理由
                        </h4>
                        <p className="text-[15.5px] leading-relaxed text-stone-700">
                          {item.ai_insight}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-rose-50/50 rounded-[28px] p-6 border border-rose-100">
                          <h4 className="text-sm font-medium text-rose-400 uppercase tracking-widest mb-2">
                            点单提醒
                          </h4>
                          <p className="text-[14px] leading-relaxed text-stone-600">
                            {buildWarningText(item)}
                          </p>
                        </div>
                        <div className="bg-emerald-50/50 rounded-[28px] p-6 border border-emerald-100">
                          <h4 className="text-sm font-medium text-emerald-500 uppercase tracking-widest mb-2">
                            推荐场景
                          </h4>
                          <p className="text-[14px] leading-relaxed text-stone-600">
                            {buildPairingText(item)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.section>
                  <hr className="border-stone-100" />
                  <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                  >
                    <div className="flex justify-between items-end mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-stone-800 tracking-tight mb-1">
                          点餐参考
                        </h3>
                        <p className="text-sm text-stone-500">
                          基于真实菜单字段整理出的速览卡片
                        </p>
                      </div>
                    </div>
                    <div className="flex overflow-x-auto pb-8 -mx-4 px-4 sm:-mx-8 sm:px-8 snap-x snap-mandatory hide-scrollbar gap-5">
                      {referenceCards.map((card) => (
                        <div
                          key={card.id}
                          className="min-w-[280px] sm:min-w-[320px] bg-white rounded-[32px] p-6 shadow-xl shadow-stone-200/30 snap-center border border-stone-50"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-3 items-center">
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-full bg-gradient-to-tr",
                                  card.accentClassName,
                                )}
                              />
                              <div>
                                <div className="font-semibold text-[15px] text-stone-800">
                                  {card.title}
                                </div>
                                <div className="text-xs text-stone-400">
                                  {card.subtitle}
                                </div>
                              </div>
                            </div>
                            <div className="bg-stone-50 px-3 py-1 rounded-full text-xs font-medium text-stone-600 border border-stone-100">
                              Live
                            </div>
                          </div>
                          <p className="text-[15px] text-stone-600 leading-relaxed font-light">
                            {card.body}
                          </p>
                        </div>
                      ))}
                      <motion.button
                        whileHover={{ scale: 0.98, backgroundColor: "#f5f5f4" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        className="min-w-[280px] sm:min-w-[320px] bg-stone-50/50 rounded-[32px] p-6 snap-center border-2 border-dashed border-stone-200 flex flex-col items-center justify-center transition-colors group"
                      >
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                          <Home className="w-5 h-5 text-stone-400 group-hover:text-stone-600" />
                        </div>
                        <span className="font-medium text-stone-500 group-hover:text-stone-700">
                          继续从首页或 AI 面板里挑下一道
                        </span>
                      </motion.button>
                    </div>
                  </motion.section>
                </div>
                <div className="lg:col-span-5 space-y-6">
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="bg-white rounded-[32px] p-7 shadow-xl shadow-stone-200/30 border border-stone-50"
                  >
                    <h4 className="font-bold text-[18px] text-stone-800 mb-6">
                      多维评测
                    </h4>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 120,
                        damping: 20,
                        delay: 0.5,
                      }}
                      className="h-[240px] w-full -ml-3"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart
                          cx="50%"
                          cy="50%"
                          outerRadius="65%"
                          data={chartData}
                        >
                          <PolarGrid stroke="#f5f5f4" strokeWidth={1.5} />
                          <PolarAngleAxis
                            dataKey="subject"
                            tick={{
                              fill: "#78716c",
                              fontSize: 13,
                              fontWeight: 500,
                            }}
                          />
                          <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={false}
                            axisLine={false}
                          />
                          <Radar
                            name="Metrics"
                            dataKey="A"
                            stroke="#7dd3fc"
                            strokeWidth={2}
                            fill="#bae6fd"
                            fillOpacity={0.4}
                            isAnimationActive={true}
                            animationDuration={1500}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="bg-white rounded-[32px] p-7 shadow-xl shadow-stone-200/30 border border-stone-50"
                  >
                    <div className="flex justify-between items-end mb-6">
                      <h4 className="font-bold text-[18px] text-stone-800">
                        减脂与宏量预估
                      </h4>
                      <div className="text-right">
                        <span className="text-2xl font-black text-stone-800">
                          {macroEstimate.calories}
                        </span>
                        <span className="text-sm font-medium text-stone-400 ml-1">
                          kcal
                        </span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        {
                          label: "蛋白质 (Protein)",
                          value: macroEstimate.protein,
                          max: 55,
                          color: "bg-blue-400",
                          icon: (
                            <Droplets className="w-3.5 h-3.5 text-blue-400" />
                          ),
                        },
                        {
                          label: "碳水化合物 (Carbs)",
                          value: macroEstimate.carbs,
                          max: 110,
                          color: "bg-amber-400",
                          icon: (
                            <Wheat className="w-3.5 h-3.5 text-amber-400" />
                          ),
                        },
                        {
                          label: "脂肪 (Fat)",
                          value: macroEstimate.fat,
                          max: 45,
                          color: "bg-rose-400",
                          icon: (
                            <Droplets className="w-3.5 h-3.5 text-rose-400" />
                          ),
                        },
                      ].map((macro, index) => (
                        <div key={macro.label}>
                          <div className="flex justify-between text-[13px] font-medium mb-1.5">
                            <span className="text-stone-500 flex items-center gap-1.5">
                              {macro.icon}
                              {macro.label}
                            </span>
                            <span className="text-stone-800">
                              {macro.value}g
                            </span>
                          </div>
                          <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${clamp((macro.value / macro.max) * 100, 0, 100)}%`,
                              }}
                              transition={{
                                delay: 0.8 + index * 0.1,
                                duration: 1,
                                type: "spring",
                              }}
                              className={cn("h-full rounded-full", macro.color)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="bg-white rounded-[32px] p-7 shadow-xl shadow-stone-200/30 border border-stone-50"
                  >
                    <h4 className="font-bold text-[18px] text-stone-800 mb-6">
                      窗口人流预测
                    </h4>
                    <div className="h-[100px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={crowdTrend}
                          margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorCrowd"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#d1d5db"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#d1d5db"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "#9ca3af", fontSize: 11 }}
                            dy={10}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "16px",
                              border: "none",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                              fontSize: "12px",
                            }}
                            formatter={(value) => [
                              `${String(value ?? 0)}% 拥挤`,
                              "排队指数",
                            ]}
                            labelStyle={{
                              color: "#6b7280",
                              marginBottom: "4px",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="level"
                            stroke="#9ca3af"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorCrowd)"
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  },
);

const LoadingState = React.memo(() => {
  return (
    <div className="py-24 text-center text-stone-500 flex flex-col items-center gap-3">
      <LoaderCircle className="w-8 h-8 animate-spin text-stone-400" />
      <p>正在从后端加载菜单数据...</p>
    </div>
  );
});

const EmptyState = React.memo(({ text }: { text: string }) => {
  return (
    <div className="py-20 text-center text-stone-500">
      <p>{text}</p>
    </div>
  );
});

const XiaoDIcon = React.memo(({ size = 48 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="24" cy="24" r="20" fill="url(#headGrad)" />
    <circle cx="24" cy="24" r="20" fill="url(#headGloss)" opacity="0.35" />
    <line
      x1="15"
      y1="6"
      x2="13"
      y2="0.5"
      stroke="#8ec8f5"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="13" cy="0.5" r="2.2" fill="url(#antGrad)" />
    <line
      x1="33"
      y1="6"
      x2="35"
      y2="0.5"
      stroke="#8ec8f5"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="35" cy="0.5" r="2.2" fill="url(#antGrad)" />
    <circle cx="24" cy="25" r="13" fill="#060f1e" />
    <circle
      cx="24"
      cy="25"
      r="13"
      stroke="#2a7ab8"
      strokeWidth="1.2"
      fill="none"
      opacity="0.8"
    />
    <circle
      cx="19.5"
      cy="24"
      r="4"
      fill="none"
      stroke="#050d18"
      strokeWidth="0.5"
    />
    <circle cx="19.5" cy="24" r="3.3" fill="url(#eyeGrad)" />
    <circle cx="20.8" cy="22.7" r="1" fill="white" opacity="0.9" />
    <circle
      cx="28.5"
      cy="24"
      r="4"
      fill="none"
      stroke="#050d18"
      strokeWidth="0.5"
    />
    <circle cx="28.5" cy="24" r="3.3" fill="url(#eyeGrad)" />
    <circle cx="29.8" cy="22.7" r="1" fill="white" opacity="0.9" />
    <defs>
      <radialGradient id="headGrad" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#f0f8ff" />
        <stop offset="60%" stopColor="#d0e8f8" />
        <stop offset="100%" stopColor="#a8d0f0" />
      </radialGradient>
      <radialGradient id="headGloss" cx="35%" cy="25%" r="50%">
        <stop offset="0%" stopColor="white" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="eyeGrad" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#60c8ff" />
        <stop offset="100%" stopColor="#1a6ab8" />
      </radialGradient>
      <radialGradient id="antGrad" cx="40%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#90d8ff" />
        <stop offset="100%" stopColor="#38a8ff" />
      </radialGradient>
    </defs>
  </svg>
));

const AIMagicIsland = React.memo(
  ({ onOpen, isHidden }: { onOpen: () => void; isHidden: boolean }) => {
    return (
      <AnimatePresence>
        {!isHidden && (
          <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none px-4 pb-[calc(max(env(safe-area-inset-bottom),24px)+88px)]">
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.8 }}
              whileHover={{ y: -4 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 24,
                mass: 0.8,
              }}
              style={{ willChange: "transform, opacity" }}
              className="pointer-events-auto group relative"
            >
              {/* Aura Glow Effect - Optimized for Performance */}
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{ willChange: "opacity" }}
                className="absolute -inset-2 bg-gradient-to-r from-orange-400/20 via-amber-400/20 to-rose-400/20 rounded-[32px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
              />

              <button
                onClick={onOpen}
                className="relative flex items-center gap-4 bg-white/95 md:bg-white/70 backdrop-blur-md md:backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.1)] md:hover:shadow-[0_12px_48px_rgba(0,120,255,0.15)] px-6 py-3.5 rounded-[28px] transition-all active:scale-95 group"
              >
                <div className="relative">
                  <XiaoDIcon size={36} />
                  <img
                    src="/logo.png"
                    alt=""
                    className="absolute -top-3 -right-2 w-6 h-6 object-contain -rotate-12 drop-shadow-sm"
                  />
                  <div className="absolute top-0 -right-4 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                  </div>
                </div>

                <div className="flex flex-col items-start pr-2">
                  <span className="text-[14px] font-bold bg-gradient-to-r from-stone-800 to-stone-500 bg-clip-text text-transparent">
                    准备好遇见美味了吗？
                  </span>
                  <span className="text-[11px] text-stone-400 font-medium tracking-wide">
                    ASK XIAOD · 点击开启 AI 寻味
                  </span>
                </div>

                <div className="ml-2 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-orange-50 transition-colors">
                  <Sparkles
                    className="w-4 h-4 text-stone-400 group-hover:text-orange-500 transition-colors"
                    strokeWidth={2.5}
                  />
                </div>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  },
);

const XiaoDFloatingChat = React.memo(
  ({
    menus,
    onPickItem,
  }: {
    menus: MenuItem[];
    onPickItem: (item: MenuItem) => void;
  }) => {
    const [isAiOpen, setIsAiOpen] = useAtom(isAiModeAtom);
    const [aiInput, setAiInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [messages, setMessages] = useState<
      Array<{ role: "user" | "ai"; text: string; items?: RankedMenuItem[] }>
    >([]);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [isTalking, setIsTalking] = useState(false);
    const [isJustReplied, setIsJustReplied] = useState(false);
    const prevTalkingRef = useRef(false);

    // isTalking false => true => false 过渡时触发表情
    useEffect(() => {
      if (prevTalkingRef.current && !isTalking && messages.length > 0) {
        setIsJustReplied(true);
        const t = setTimeout(() => setIsJustReplied(false), 2600);
        return () => clearTimeout(t);
      }
      prevTalkingRef.current = isTalking;
    }, [isTalking, messages.length]);

    const robotMode: RobotMode = isThinking
      ? "thinking"
      : isTalking
        ? "talking"
        : messages.length > 0
          ? "smiling"
          : "idle";

    async function sendMessage() {
      const query = aiInput.trim();
      if (!query || isThinking) {
        return;
      }

      const conversationHistory = [...messages.slice(-6)];

      setAiInput("");
      setMessages((previous) => [...previous, { role: "user", text: query }]);
      setIsThinking(true);
      setTimeout(
        () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        120,
      );

      try {
        const response = await fetch("/api/recommend/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            conversation_history: conversationHistory,
            top_k: 4,
          }),
        });

        if (!response.ok) throw new Error("Failed to connect to stream");
        if (!response.body) throw new Error("No response body");

        setIsThinking(false);
        setIsTalking(true);

        // Add a placeholder AI message
        setMessages((prev) => [...prev, { role: "ai", text: "" }]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;

            if (trimmed.startsWith("data: ")) {
              try {
                const chunk = JSON.parse(trimmed.slice(6));

                if (chunk.type === "text") {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (lastIndex >= 0 && updated[lastIndex].role === "ai") {
                      // Immutable update: create new object for the last message
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        text: updated[lastIndex].text + chunk.text,
                      };
                    }
                    return updated;
                  });
                  chatEndRef.current?.scrollIntoView({ behavior: "auto" });
                } else if (chunk.type === "final") {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastIndex = updated.length - 1;
                    if (lastIndex >= 0 && updated[lastIndex].role === "ai") {
                      updated[lastIndex] = {
                        ...updated[lastIndex],
                        items: chunk.data.items,
                      };
                      if (chunk.data.reply_text) {
                        updated[lastIndex].text = chunk.data.reply_text;
                      }
                    }
                    return updated;
                  });
                } else if (chunk.type === "error") {
                  throw new Error(chunk.message);
                }
              } catch (e) {
                console.error("Chunk parse error:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("AI Chat Error:", error);
        const isFetchError =
          error instanceof TypeError && error.message.includes("fetch");
        setMessages((previous) => [
          ...previous,
          {
            role: "ai",
            text: isFetchError
              ? "糟了，西小电暂时连不上大脑（后端服务未启动或网络错误）。请确保你已经运行了 `npm run server` 哦！"
              : error instanceof Error
                ? error.message
                : "推荐接口暂时不可用。",
          },
        ]);
      } finally {
        setIsThinking(false);
        setIsTalking(false);
        setTimeout(
          () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
          120,
        );
      }
    }

    useEffect(() => {
      if (isAiOpen) {
        setTimeout(() => inputRef.current?.focus(), 600);
      }
    }, [isAiOpen]);

    return (
      <>
        <AIMagicIsland onOpen={() => setIsAiOpen(true)} isHidden={isAiOpen} />

        <AnimatePresence>
          {isAiOpen && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setIsAiOpen(false)}
                className="fixed inset-0 z-40"
                style={{
                  background:
                    "radial-gradient(ellipse at bottom right, rgba(200,100,50,0.15) 0%, rgba(0,0,0,0.25) 100%)",
                  backdropFilter: "blur(4px)",
                }}
              />

              <motion.div
                key="panel"
                initial={{
                  opacity: 0,
                  scale: 0.15,
                  x: 120,
                  y: 200,
                  borderRadius: "50%",
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  y: 0,
                  borderRadius: "28px",
                }}
                exit={{
                  opacity: 0,
                  scale: 0.12,
                  x: 120,
                  y: 200,
                  borderRadius: "50%",
                }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 26,
                  mass: 0.9,
                }}
                className="fixed inset-x-3 bottom-0 md:right-6 md:left-auto md:w-[400px] z-50 overflow-hidden flex flex-col mb-[calc(env(safe-area-inset-bottom,12px)+88px)] md:mb-[env(safe-area-inset-bottom,12px)]"
                style={{
                  top: "max(env(safe-area-inset-top, 12px), 12px)",
                  maxHeight:
                    "calc(100vh - env(safe-area-inset-bottom, 12px) - 110px)",
                  background:
                    "linear-gradient(160deg, #fdfbf7 0%, #fffaf0 40%, #fefcfb 100%)",
                  boxShadow:
                    "0 32px 80px rgba(0,10,20,0.15), 0 0 0 1px rgba(200,100,50,0.05) inset",
                  willChange: "transform, opacity",
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0"
                >
                  <div>
                    <p className="text-stone-800 font-bold text-[16px] tracking-wide flex items-center gap-1.5">
                      <img src="/logo.png" alt="" className="w-5 h-5 object-contain" />
                      西小电
                    </p>
                    <p className="text-stone-500 text-[12px] pl-6">
                      你的赛博大厨
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAiOpen(false)}
                    className="w-8 h-8 rounded-full bg-stone-200/50 hover:bg-stone-200 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-stone-500" strokeWidth={2} />
                  </button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.7, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 180,
                    damping: 22,
                    delay: 0.18,
                  }}
                  className="relative shrink-0"
                  style={{ height: "220px" }}
                >
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-12 rounded-full bg-orange-400/20 blur-2xl" />
                  <div
                    className="absolute inset-0 opacity-[0.15]"
                    style={{
                      backgroundImage:
                        "linear-gradient(rgba(240,150,50,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(240,150,50,0.5) 1px, transparent 1px)",
                      backgroundSize: "28px 28px",
                    }}
                  />
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                    <ErrorBoundary>
                      <XiaoD mode={robotMode} showSmile={isJustReplied} />
                    </ErrorBoundary>
                  </div>

                  <motion.div
                    key={robotMode}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full border border-stone-200/50 shadow-sm"
                  >
                    <motion.div
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full bg-orange-400"
                    />
                    <span className="text-stone-600 text-[12px] font-medium">
                      {robotMode === "idle"
                        ? "等待中"
                        : robotMode === "thinking"
                          ? "思考中..."
                          : robotMode === "talking"
                            ? "回复中..."
                            : "已准备好"}
                    </span>
                  </motion.div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                  className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
                  style={{ scrollbarWidth: "none" }}
                >
                  {messages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                      className="text-center py-4"
                    >
                      <p className="text-stone-500 text-[14px] mb-4 font-medium">
                        嗨！告诉我你现在想吃什么 👋
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {["🌶️ 来点辣的", "💰 实惠的", "🥗 清淡健康"].map(
                          (sample) => (
                            <button
                              key={sample}
                              onClick={() => {
                                setAiInput(sample.slice(3));
                                inputRef.current?.focus();
                              }}
                              className="bg-orange-50 hover:bg-orange-100 text-orange-700 text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-colors border border-orange-200/60 shadow-sm"
                            >
                              {sample}
                            </button>
                          ),
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    messages.map((message, index) => {
                      const showRecommendations =
                        message.role === "ai" &&
                        message.items &&
                        message.items.length > 0;

                      return (
                        <div
                          key={`${message.role}-${index}`}
                          className="space-y-4"
                        >
                          {showRecommendations && (
                            <motion.div
                              initial="hidden"
                              animate="show"
                              variants={{
                                hidden: { opacity: 0 },
                                show: {
                                  opacity: 1,
                                  transition: {
                                    staggerChildren: 0.08,
                                    delayChildren: 0.1,
                                  },
                                },
                              }}
                              className="space-y-2 pt-2"
                            >
                              <motion.div
                                variants={{
                                  hidden: { opacity: 0, x: -5 },
                                  show: { opacity: 1, x: 0 },
                                }}
                                className="text-[12px] uppercase tracking-widest text-orange-600/60 ml-1 font-bold"
                              >
                                为你精选
                              </motion.div>
                              {message.items!.map(
                                ({ item, matched_reasons }) => {
                                  const fullItem =
                                    menus.find((m) => m.id === item.id) || item;
                                  return (
                                    <motion.button
                                      key={item.id}
                                      variants={{
                                        hidden: {
                                          opacity: 0,
                                          y: 12,
                                          scale: 0.96,
                                        },
                                        show: {
                                          opacity: 1,
                                          y: 0,
                                          scale: 1,
                                          transition: {
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 22,
                                          },
                                        },
                                      }}
                                      whileHover={{
                                        scale: 1.02,
                                        backgroundColor:
                                          "#fffcf5",
                                      }}
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => {
                                        onPickItem(fullItem);
                                        setIsAiOpen(false);
                                      }}
                                      style={{
                                        willChange: "transform, opacity",
                                      }}
                                      className="w-full text-left bg-white border border-orange-100/60 rounded-2xl px-4 py-3 transition-colors shadow-sm shadow-orange-900/5 hover:border-orange-200/80 hover:shadow-md"
                                    >
                                      <div className="flex items-center justify-between gap-3 mb-1">
                                        <span className="text-stone-800 font-bold line-clamp-1">
                                          {item.title}
                                        </span>
                                        <span className="text-orange-600 font-black text-sm">
                                          ¥{item.price.toFixed(1)}
                                        </span>
                                      </div>
                                      <div className="text-stone-500 text-[12px] line-clamp-1">
                                        {item.location_text} · {item.shop_text}
                                      </div>
                                      <div className="text-stone-500 text-[12px] mt-1 line-clamp-1">
                                        {matched_reasons.length
                                          ? matched_reasons.join(" / ")
                                          : item.badge}
                                      </div>
                                    </motion.button>
                                  );
                                },
                              )}
                            </motion.div>
                          )}
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 300,
                              damping: 24,
                            }}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start gap-2"}`}
                          >
                            {message.role === "ai" && (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shrink-0 flex items-center justify-center shadow-md mt-0.5">
                                <Soup className="w-4 h-4 text-white" strokeWidth={2.5} />
                              </div>
                            )}
                            <div
                              className={cn(
                                "max-w-[78%] text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-2xl",
                                message.role === "user"
                                  ? "bg-orange-500 text-white rounded-br-sm shadow-md"
                                  : "bg-white text-stone-700 rounded-bl-sm border border-orange-100/60 shadow-sm",
                              )}
                            >
                              {message.text}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.4,
                    type: "spring",
                    stiffness: 260,
                    damping: 24,
                  }}
                  className="px-4 pb-5 pt-2 shrink-0"
                >
                  <div className="flex gap-2 bg-white/90 backdrop-blur-md rounded-2xl p-1.5 border border-stone-200/60 shadow-sm">
                    <input
                      ref={inputRef}
                      type="text"
                      value={aiInput}
                      onChange={(event) => setAiInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void sendMessage();
                        }
                      }}
                      placeholder="说说你想吃什么..."
                      className="flex-1 bg-transparent border-none outline-none text-[14px] text-stone-800 placeholder-stone-400 px-2"
                    />
                    <button
                      onClick={() => void sendMessage()}
                      disabled={!aiInput.trim() || isThinking}
                      className="disabled:opacity-30 bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-90 flex items-center gap-1.5 shadow-sm shadow-orange-500/20"
                    >
                      {isThinking ? (
                        <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Flame className="w-4 h-4" strokeWidth={2.5} />
                      )}
                      发送
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  },
);

export default function App() {
  const [menuCache, setMenuCache] = useState<MenuItem[]>([]);
  const [fullMenuCatalog, setFullMenuCatalog] = useState<MenuItem[]>([]);
  const [isCatalogReady, setIsCatalogReady] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [discoverItems, setDiscoverItems] = useState<MenuItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [expandedItem, setExpandedItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [catalogCount, setCatalogCount] = useState(0);
  const [discoverTotal, setDiscoverTotal] = useState(0);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [hasMoreDiscover, setHasMoreDiscover] = useState(true);

  const [currentView] = useAtom(viewAtom);
  const [selectedShop, setSelectedShop] = useAtom(selectedShopAtom);
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [isAiMode] = useAtom(isAiModeAtom);
  const [filters] = useAtom(filtersAtom);
  const [shopCanteenFilters, setShopCanteenFilters] = useAtom(shopCanteenFiltersAtom);

  const shopsData = useMemo(() => {
    const map = new Map<string, ShopGroup>();
    fullMenuCatalog.forEach((item) => {
      const key = `${item.location_text}-${item.shop_text}`;
      if (!map.has(key)) {
        map.set(key, { name: item.shop_text, canteen: item.location_text, items: [], images: [] });
      }
      const group = map.get(key)!;
      group.items.push(item);
      if (group.images.length < 3 && item.image_key) {
        group.images.push(getImageUrl(item.image_key));
      }
    });
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [fullMenuCatalog]);

  const filteredShops = useMemo(() => {
    if (shopCanteenFilters.length === 0) return shopsData;
    return shopsData.filter(shop =>
      shopCanteenFilters.some(f => shop.canteen.includes(f))
    );
  }, [shopsData, shopCanteenFilters]);

  useEffect(() => {
    if (currentView !== "shops") {
      setSelectedShop(null);
    }
  }, [currentView, setSelectedShop]);

  const filteredShopItems = useMemo(() => {
    if (!selectedShop) return [];
    return filterItems(selectedShop.items, "", filters);
  }, [selectedShop, filters]);

  const discoverSeedRef = useRef(generateSessionSeed());
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const requestVersionRef = useRef(0);
  const prefetchedPageRef = useRef<{
    page: number;
    keyword: string;
    data: MenusResponse["data"];
  } | null>(null);
  const prefetchingPageRef = useRef<number | null>(null);
  const observerRequestedPageRef = useRef<number | null>(null);
  const fullCatalogPromiseRef = useRef<Promise<MenuItem[]> | null>(null);
  const discoverPageRef = useRef(discoverPage);
  const isLoadingRef = useRef(isLoading);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const isSearchMode =
    Boolean(deferredSearchQuery) ||
    filters.canteen !== "all" ||
    filters.priceRange !== null ||
    filters.maxCalories !== null ||
    filters.minHealth !== null;

  discoverPageRef.current = discoverPage;
  isLoadingRef.current = isLoading;
  isLoadingMoreRef.current = isLoadingMore;

  const ensureFullMenuCatalog = useCallback(async () => {
    if (isCatalogReady) {
      return fullMenuCatalog;
    }

    if (fullCatalogPromiseRef.current) {
      return fullCatalogPromiseRef.current;
    }

    setIsCatalogLoading(true);
    const task = (async () => {
      const firstPage = await fetchJson<MenusResponse>(
        `/api/menus?page=1&page_size=100`,
      );
      let allItems = [...firstPage.data.items];

      for (
        let page = 2;
        page <= firstPage.data.pagination.total_pages;
        page++
      ) {
        const response = await fetchJson<MenusResponse>(
          `/api/menus?page=${page}&page_size=100`,
        );
        allItems = mergeMenus(allItems, response.data.items);
      }

      return allItems;
    })();

    fullCatalogPromiseRef.current = task;

    try {
      const allItems = await task;
      setFullMenuCatalog(allItems);
      setIsCatalogReady(true);
      setMenuCache((previous) => mergeMenus(previous, allItems));
      setCatalogCount((previous) => previous || allItems.length);
      return allItems;
    } finally {
      fullCatalogPromiseRef.current = null;
      setIsCatalogLoading(false);
    }
  }, [fullMenuCatalog, isCatalogReady]);

  // Session ID Management
  useEffect(() => {
    let sid = window.localStorage.getItem("xd-food-session-id");
    if (!sid) {
      sid = `sid-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      window.localStorage.setItem("xd-food-session-id", sid);
    }
  }, []);

  const getSessionHeaders = () => {
    const sid =
      window.localStorage.getItem("xd-food-session-id") || "anonymous";
    return {
      "Content-Type": "application/json",
      "X-Session-ID": sid,
    };
  };

  useEffect(() => {
    const syncFavorites = async () => {
      try {
        const sid = window.localStorage.getItem("xd-food-session-id");
        if (!sid) return;

        const response = await fetch("/api/favorites", {
          headers: { "X-Session-ID": sid },
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setFavorites(data.data);
        } else {
          // Fallback
          const saved = window.localStorage.getItem("xd-food-favorites");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setFavorites(
                parsed.filter((v): v is string => typeof v === "string"),
              );
            }
          }
        }
      } catch (error) {
        console.error("Failed to sync favorites from backend:", error);
      }
    };
    syncFavorites();
  }, [setFavorites]);

  useEffect(() => {
    window.localStorage.setItem("xd-food-favorites", JSON.stringify(favorites));

    // Sync to backend
    const timeoutId = setTimeout(async () => {
      const sid = window.localStorage.getItem("xd-food-session-id");
      if (!sid) return;

      try {
        await fetch("/api/favorites", {
          method: "POST",
          headers: getSessionHeaders(),
          body: JSON.stringify({ favorites }),
        });
      } catch (error) {
        console.error("Failed to save favorites to backend:", error);
      }
    }, 1000); // Debounce

    return () => clearTimeout(timeoutId);
  }, [favorites]);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      try {
        const response = await fetchJson<MetaResponse>("/api/meta");
        if (!cancelled) {
          setCatalogCount(response.data.menu_count);
        }
      } catch {
        // Ignore meta failures here; list loading still provides a fallback total.
      }
    }

    void loadMeta();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void ensureFullMenuCatalog().catch(() => {
        // Ignore prewarm failures; discover fallback remains available.
      });
    }, 600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [ensureFullMenuCatalog]);

  useEffect(() => {
    setDiscoverPage(1);
    setDiscoverItems([]);
    setHasMoreDiscover(true);
    prefetchedPageRef.current = null;
    prefetchingPageRef.current = null;
    observerRequestedPageRef.current = null;
  }, [
    deferredSearchQuery,
    filters.canteen,
    filters.priceRange,
    filters.maxCalories,
    filters.minHealth,
  ]);

  useEffect(() => {
    if (!isSearchMode) {
      return;
    }

    let cancelled = false;

    async function applyLocalSearch() {
      if (discoverPage === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const sourceItems = isCatalogReady
          ? fullMenuCatalog
          : await ensureFullMenuCatalog();
        if (cancelled) {
          return;
        }

        const filteredItems = filterItems(
          sourceItems,
          deferredSearchQuery,
          filters,
        );
        const renderCount = discoverPage * DISCOVER_PAGE_SIZE;

        setDiscoverItems(filteredItems.slice(0, renderCount));
        setDiscoverTotal(filteredItems.length);
        setHasMoreDiscover(renderCount < filteredItems.length);
        setErrorMessage(null);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "搜索加载失败",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }

    void applyLocalSearch();

    return () => {
      cancelled = true;
    };
  }, [
    deferredSearchQuery,
    discoverPage,
    ensureFullMenuCatalog,
    fullMenuCatalog,
    isCatalogReady,
    isSearchMode,
    filters,
  ]);

  useEffect(() => {
    if (isSearchMode) {
      return;
    }

    const requestVersion = ++requestVersionRef.current;
    let cancelled = false;

    function applyDiscoverResponse(data: MenusResponse["data"]) {
      const incomingItems = data.items;
      observerRequestedPageRef.current = null;
      setDiscoverItems((previous) =>
        discoverPage === 1
          ? incomingItems
          : mergeMenus(previous, incomingItems),
      );
      setMenuCache((previous) => mergeMenus(previous, incomingItems));
      setDiscoverTotal(data.pagination.total);
      setCatalogCount((previous) => previous || data.pagination.total);
      setHasMoreDiscover(data.pagination.page < data.pagination.total_pages);
      setErrorMessage(null);

      const nextPage = data.pagination.page + 1;
      const canPrefetch = nextPage <= data.pagination.total_pages;
      if (
        canPrefetch &&
        prefetchingPageRef.current !== nextPage &&
        !(
          prefetchedPageRef.current?.page === nextPage &&
          prefetchedPageRef.current?.keyword === deferredSearchQuery
        )
      ) {
        prefetchingPageRef.current = nextPage;
        void fetchJson<MenusResponse>(
          buildDiscoverRequestUrl({
            page: nextPage,
            keyword: deferredSearchQuery,
            seed: discoverSeedRef.current,
          }),
        )
          .then((response) => {
            if (cancelled || requestVersion !== requestVersionRef.current) {
              return;
            }

            prefetchedPageRef.current = {
              page: nextPage,
              keyword: deferredSearchQuery,
              data: response.data,
            };
          })
          .catch(() => {
            prefetchedPageRef.current = null;
          })
          .finally(() => {
            if (prefetchingPageRef.current === nextPage) {
              prefetchingPageRef.current = null;
            }
          });
      }
    }

    async function loadDiscoverPage() {
      if (discoverPage === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const prefetched = prefetchedPageRef.current;
        if (
          prefetched &&
          prefetched.page === discoverPage &&
          prefetched.keyword === deferredSearchQuery
        ) {
          prefetchedPageRef.current = null;
          if (cancelled || requestVersion !== requestVersionRef.current) {
            return;
          }

          applyDiscoverResponse(prefetched.data);
          return;
        }

        const response = await fetchJson<MenusResponse>(
          buildDiscoverRequestUrl({
            page: discoverPage,
            keyword: deferredSearchQuery,
            seed: discoverSeedRef.current,
          }),
        );
        if (cancelled || requestVersion !== requestVersionRef.current) {
          return;
        }

        applyDiscoverResponse(response.data);
      } catch (error) {
        if (!cancelled && requestVersion === requestVersionRef.current) {
          setErrorMessage(
            error instanceof Error ? error.message : "加载菜单失败",
          );
        }
      } finally {
        if (!cancelled && requestVersion === requestVersionRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }

    void loadDiscoverPage();

    return () => {
      cancelled = true;
    };
  }, [discoverPage, deferredSearchQuery, isSearchMode]);

  useEffect(() => {
    if (!favorites.length) {
      setFavoriteItems([]);
      return;
    }

    let cancelled = false;

    async function loadFavoriteItems() {
      const cacheMap = new Map(menuCache.map((item) => [item.id, item]));
      const cachedItems = favorites
        .map((id) => cacheMap.get(id) || null)
        .filter((item): item is MenuItem => Boolean(item));
      const missingIds = favorites.filter((id) => !cacheMap.has(id));

      try {
        const fetchedItems = (
          await Promise.all(
            missingIds.map(async (id) => {
              try {
                const response = await fetchJson<MenuDetailResponse>(
                  `/api/menus/${id}`,
                );
                return response.data.item;
              } catch {
                return null;
              }
            }),
          )
        ).filter((item): item is MenuItem => Boolean(item));

        if (cancelled) {
          return;
        }

        if (fetchedItems.length) {
          setMenuCache((previous) => mergeMenus(previous, fetchedItems));
        }

        const mergedMap = new Map(
          [...cachedItems, ...fetchedItems].map((item) => [item.id, item]),
        );
        setFavoriteItems(
          favorites
            .map((id) => mergedMap.get(id) || null)
            .filter((item): item is MenuItem => Boolean(item)),
        );
      } catch {
        if (!cancelled) {
          setFavoriteItems(cachedItems);
        }
      }
    }

    void loadFavoriteItems();

    return () => {
      cancelled = true;
    };
  }, [favorites, menuCache]);

  useEffect(() => {
    if (
      currentView !== "discover" ||
      !hasMoreDiscover ||
      isLoading ||
      isLoadingMore
    ) {
      return;
    }

    const target = loadMoreRef.current;
    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          const nextPage = discoverPageRef.current + 1;
          if (
            observerRequestedPageRef.current === nextPage ||
            isLoadingRef.current ||
            isLoadingMoreRef.current
          ) {
            return;
          }

          observerRequestedPageRef.current = nextPage;
          setDiscoverPage((previous) =>
            previous >= nextPage ? previous : nextPage,
          );
        }
      },
      { rootMargin: "1200px 0px", threshold: 0.01 },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [currentView, hasMoreDiscover, isLoading, isLoadingMore]);

  const openDetail = useCallback(
    async (id: string) => {
      const cachedItem = menuCache.find((item) => item.id === id) || null;

      setExpandedItem(null);
      if (cachedItem) {
        setSelectedItem(cachedItem);
      }

      try {
        const response = await fetchJson<MenuDetailResponse>(
          `/api/menus/${id}`,
        );
        setSelectedItem(response.data.item);
        setMenuCache((previous) => mergeMenus(previous, [response.data.item]));
        setErrorMessage(null);
      } catch (error) {
        if (!cachedItem) {
          setErrorMessage(
            error instanceof Error ? error.message : "加载详情失败",
          );
        }
      }
    },
    [menuCache],
  );

  const filteredFavoriteItems = useMemo(() => {
    return filterItems(favoriteItems, "", filters);
  }, [favoriteItems, filters]);

  const itemsToRender =
    currentView === "discover" ? discoverItems : filteredFavoriteItems;
  const visibleCountText = isSearchMode
    ? `匹配 ${discoverTotal} 条`
    : `已展示 ${discoverItems.length} / ${discoverTotal || catalogCount} 条`;

  return (
    <MotionConfig reducedMotion="always">
      <div className="min-h-screen bg-[#FDFDFD] text-stone-800 selection:bg-stone-200 flex relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-sky-200/20 rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/3 z-0" />
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-orange-200/20 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 -translate-y-1/4 z-0" />

        <Sidebar />
        <main className="flex-1 lg:ml-64 md:ml-20 pb-32 transition-all duration-300 relative z-10">
          <AnimatePresence mode="wait">
            {/* Remove the misplaced global FilterSection */}

            {currentView === "discover" ? (
              <motion.div
                key="discover"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Hero menuCount={catalogCount} />
                <FilterSection />
                <motion.section
                  className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
                  animate={{
                    y: isAiMode ? 200 : 0,
                    opacity: isAiMode ? 0.3 : 1,
                    filter: isAiMode ? "blur(4px)" : "blur(0px)",
                    scale: isAiMode ? 0.98 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 150, damping: 25 }}
                  style={{ pointerEvents: isAiMode ? "none" : "auto" }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                    className="flex items-center justify-between mb-8"
                  >
                    <h2 className="text-[22px] font-semibold tracking-tight text-stone-800">
                      {isSearchMode
                        ? `搜索 "${searchQuery.trim()}" 的结果`
                        : "Today's Picks"}
                    </h2>
                    <div className="text-[15px] text-stone-500 flex gap-5 items-center">
                      <span className="text-stone-800 font-medium tracking-wide">
                        {isSearchMode
                          ? `本地即时筛选${isCatalogLoading ? "（预加载中）" : ""}`
                          : "随机推荐 · 分散同店内容"}
                      </span>
                      <span className="tracking-wide">{visibleCountText}</span>
                    </div>
                  </motion.div>
                  {errorMessage ? (
                    <EmptyState text={errorMessage} />
                  ) : isLoading ? (
                    <LoadingState />
                  ) : itemsToRender.length === 0 ? (
                    <EmptyState text="未找到匹配的美食，换个关键词试试？" />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 xl:gap-8">
                      {itemsToRender.map((item, index) => (
                        <motion.div
                          key={item.id}
                          variants={ANIM_VARIANTS.fadeInUp}
                          initial="initial"
                          animate="animate"
                          exit="exit"
                          transition={
                            {
                              ...ANIM_VARIANTS.fadeInUp.transition,
                              delay:
                                index <
                                (typeof DISCOVER_PAGE_SIZE === "number"
                                  ? DISCOVER_PAGE_SIZE
                                  : 20)
                                  ? index * 0.03
                                  : 0,
                              ease: "easeOut",
                            } as any
                          }
                        >
                          <FoodCard item={item} onClick={openDetail} />
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {!errorMessage && !isLoading && itemsToRender.length > 0 && (
                    <div className="flex flex-col items-center gap-4 pt-10 pb-[max(env(safe-area-inset-bottom),40px)]">
                      {hasMoreDiscover ? (
                        <button
                          onClick={() =>
                            setDiscoverPage((previous) => previous + 1)
                          }
                          disabled={isLoadingMore}
                          className="px-6 py-3 rounded-full bg-white border border-stone-200 text-stone-700 shadow-sm md:hover:bg-stone-50 active:bg-stone-100 transition-colors disabled:opacity-60 active:scale-95"
                        >
                          {isLoadingMore ? "加载中..." : "加载更多菜品"}
                        </button>
                      ) : (
                        <p className="text-sm text-stone-400">
                          这一轮推荐已经看完了
                        </p>
                      )}
                      <div ref={loadMoreRef} className="h-6 w-full" />
                    </div>
                  )}
                </motion.section>
              </motion.div>
            ) : currentView === "favorites" ? (
              <motion.div
                key="favorites"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
              >
                <div className="mb-12">
                  <h1 className="text-4xl font-serif font-bold text-stone-800 tracking-tight flex items-center gap-4">
                    我的收藏夹
                    <span className="text-xl font-sans font-medium text-rose-500 bg-rose-50 px-3 py-1 rounded-full">
                      {favorites.length}
                    </span>
                  </h1>
                  <p className="text-stone-500 mt-3 text-lg">
                    Your curated collection of campus flavors.
                  </p>
                </div>
                
                <FilterSection />

                {itemsToRender.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center bg-stone-50/50 rounded-[40px] border border-stone-100 border-dashed">
                    <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                      <HeartCrack
                        className="w-10 h-10 text-stone-300"
                        strokeWidth={1}
                      />
                    </div>
                    <h3 className="text-xl font-semibold text-stone-800 mb-2">
                      好像什么都没有
                    </h3>
                    <p className="text-stone-500 max-w-sm">
                      去发现页面逛逛吧，遇到想吃的美食点个红心就会出现在这里。
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 xl:gap-8">
                    {itemsToRender.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, type: "spring" }}
                      >
                        <FoodCard item={item} onClick={openDetail} />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : currentView === "shops" ? (
              <motion.div
                key="shops"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32"
              >
                {!selectedShop ? (
                  <>
                    <div className="mb-10">
                      <h1 className="text-4xl font-serif font-bold text-stone-800 tracking-tight">
                        店铺 / 窗口
                      </h1>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-6">
                        {FILTER_OPTIONS.canteens.filter(c => c.id !== "all").map(c => {
                          const isActive = shopCanteenFilters.includes(c.id as string);
                          return (
                            <button
                              key={c.id}
                              onClick={() => {
                                setShopCanteenFilters(prev => 
                                  isActive ? prev.filter(v => v !== c.id) : [...prev, c.id as string]
                                );
                              }}
                              className={cn(
                                "px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-300 border active:scale-95",
                                isActive 
                                  ? "bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20" 
                                  : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                              )}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                        {shopCanteenFilters.length > 0 && (
                          <button
                            onClick={() => setShopCanteenFilters([])}
                            className="ml-2 text-[12px] text-stone-400 hover:text-orange-500 transition-colors font-medium border-b border-dashed border-stone-300 hover:border-orange-300"
                          >
                            重置全部
                          </button>
                        )}
                      </div>

                      <p className="text-stone-400 mt-6 text-sm font-medium tracking-wide">
                        已为您筛选出 {filteredShops.length} 家精选美味窗口
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                      {filteredShops.map((shop) => (
                        <motion.button
                          key={`${shop.canteen}-${shop.name}`}
                          whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.06)" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedShop(shop)}
                          className="flex flex-col text-left bg-white rounded-[24px] p-6 border border-stone-200/60 shadow-sm transition-all group overflow-hidden relative"
                        >
                          <div className="flex justify-between items-start mb-6 z-10 w-full">
                            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                              <Store className="w-6 h-6" strokeWidth={2} />
                            </div>
                            <span className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-[11px] font-bold uppercase tracking-wider tabular-nums">
                              {shop.items.length} 款菜品
                            </span>
                          </div>
                          <div className="z-10 relative">
                            <h3 className="text-xl font-bold text-stone-800 mb-2 group-hover:text-orange-600 transition-colors">
                              {shop.name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-stone-500 text-[13px] font-medium">
                              <MapPin className="w-3.5 h-3.5 opacity-70" />
                              {shop.canteen}
                            </div>
                          </div>
                          
                          {/* Aesthetic Visual Hint via CSS instead of heavy images */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100/40 to-rose-50/10 rounded-bl-full translate-x-8 -translate-y-8 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                        </motion.button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setSelectedShop(null)}
                      className="group flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors mb-8"
                    >
                      <div className="w-8 h-8 rounded-full bg-stone-100 group-hover:bg-stone-200 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-sm">返回导览页</span>
                    </button>
                    
                    <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-stone-100">
                      <div>
                        <div className="flex items-center gap-2 text-orange-600 font-bold text-[13px] tracking-widest mb-3 uppercase">
                          <Store className="w-4 h-4" />
                          {selectedShop.canteen}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-black text-stone-800 tracking-tight">
                          {selectedShop.name}
                        </h1>
                      </div>
                      
                      {selectedShop.images.length > 0 && (
                        <div className="flex items-center justify-end -space-x-4 opacity-90">
                          {selectedShop.images.map((img, i) => (
                            <div key={i} className="w-16 h-16 rounded-full border-4 border-[#FDFDFD] shadow-sm overflow-hidden bg-stone-100 relative z-10 hover:z-20 transition-all hover:scale-105">
                              <img src={img} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <FilterSection />

                    {filteredShopItems.length === 0 ? (
                      <EmptyState text="这家店里没有找到符合筛选条件的菜品哦" />
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 xl:gap-8">
                        {filteredShopItems.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <FoodCard item={item} onClick={openDetail} />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>

        <DetailDrawer
          item={selectedItem}
          isOpen={!!selectedItem && !expandedItem}
          onClose={() => setSelectedItem(null)}
          onExpand={(item) => {
            setSelectedItem(null);
            setExpandedItem(item);
          }}
        />
        <FullScreenDetail
          item={expandedItem}
          isOpen={!!expandedItem}
          onClose={() => setExpandedItem(null)}
        />
        <XiaoDFloatingChat
          menus={menuCache}
          onPickItem={(item) => void openDetail(item.id)}
        />

        {/* ── 3D Preloader: 预热三维上下文，防止开启对话时冷启动卡顿 ── */}
        <div className="sr-only p-0 m-0 w-0 h-0 overflow-hidden pointer-events-none opacity-0 invisible" aria-hidden="true">
          <ErrorBoundary>
            <XiaoD mode="idle" />
          </ErrorBoundary>
        </div>
      </div>
    </MotionConfig>
  );
}
