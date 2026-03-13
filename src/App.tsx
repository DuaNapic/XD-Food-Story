import React, { useDeferredValue, useEffect, useRef, useState } from "react";
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
  ChefHat,
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
  Utensils,
  Wheat,
  X,
} from "lucide-react";
import XiaoD from "./components/XiaoD";
import { cn } from "./lib/utils";

const favoritesAtom = atom<string[]>([]);
const viewAtom = atom<"discover" | "favorites">("discover");
const searchQueryAtom = atom<string>("");
const isAiModeAtom = atom<boolean>(false);

type MealTime = "早餐" | "午餐" | "晚餐";
type Spiciness = "不辣" | "微辣" | "中辣" | "特辣" | "可选辣";
type RobotMode = "idle" | "thinking" | "talking" | "smiling";

interface RadarScores {
  taste: number;
  value: number;
  satiety: number;
  health: number;
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

interface RecommendQueryResponse {
  success: boolean;
  data: {
    reply_text: string;
    items: RankedMenuItem[];
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

function normalizeRadarScore(value: number) {
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

  incoming.forEach((item) => {
    merged.set(item.id, item);
  });

  return [...merged.values()];
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

const Sidebar = () => {
  const [currentView, setView] = useAtom(viewAtom);
  const [favorites] = useAtom(favoritesAtom);

  return (
    <>
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-20 lg:w-64 bg-white/50 backdrop-blur-xl border-r border-stone-100 z-40 transition-all duration-300">
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-stone-100">
          <ChefHat
            className="w-7 h-7 text-stone-800 flex-shrink-0"
            strokeWidth={1.5}
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
        </nav>
      </aside>
      <div className="md:hidden fixed bottom-6 inset-x-0 z-40 px-6 pointer-events-none">
        <div className="bg-stone-800/90 backdrop-blur-xl p-2 rounded-full shadow-2xl flex items-center justify-around pointer-events-auto border border-stone-700/50">
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
                  ? "text-rose-400 fill-rose-400"
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
        </div>
      </div>
    </>
  );
};

const Hero = ({ menuCount }: { menuCount: number }) => {
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center relative z-20">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
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
        <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-stone-800 to-stone-400 pb-2 relative z-10">
          XD食物语
        </h1>
        <motion.div
          initial={{ opacity: 0, rotate: -15, scale: 0.8 }}
          animate={{ opacity: 1, rotate: [10, -5, 10], scale: 1 }}
          transition={{
            opacity: { delay: 0.3, duration: 0.8 },
            rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute -top-6 -right-5 md:-top-7 md:-right-6 text-orange-400/80 drop-shadow-sm z-20"
        >
          <ChefHat className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
        </motion.div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-[3px] bg-gradient-to-r from-transparent via-stone-200 to-transparent rounded-full" />
      </div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
        className="text-lg md:text-xl text-stone-500 max-w-xl mx-auto mb-10 font-light leading-relaxed"
      >
        发现校园最佳美食，或点击右下角的
        <span className="text-blue-500 font-medium">西小电</span>让 AI
        帮你决定今天吃什么 ✨
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 20, delay: 0.2 }}
        className="relative max-w-xl mx-auto group/search"
      >
        <div className="flex items-center bg-white/70 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-stone-900/5 hover:ring-stone-900/10 focus-within:ring-stone-900/15 focus-within:bg-white/90 focus-within:shadow-lg transition-all duration-300 px-5 py-3.5">
          <Search
            className="w-5 h-5 text-stone-400 group-focus-within/search:text-stone-700 transition-colors shrink-0"
            strokeWidth={2}
          />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="搜索菜名、食堂..."
            className="flex-1 ml-3 bg-transparent border-none focus:ring-0 text-stone-800 placeholder-stone-400 font-medium outline-none text-[16px]"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                inputRef.current?.focus();
              }}
              className="text-stone-300 hover:text-stone-500 transition-colors ml-2"
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
};

const FoodCard = ({
  item,
  onClick,
}: {
  item: MenuItem;
  onClick: () => void;
}) => {
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
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      onClick={onClick}
      className="bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] cursor-pointer flex flex-col group relative ring-1 ring-stone-900/5 hover:ring-stone-900/10 transition-all duration-300"
    >
      <div className="relative h-48 sm:h-56 overflow-hidden">
        <motion.img
          src={getImageUrl(item.image_key)}
          alt={item.title}
          loading="lazy"
          decoding="async"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[13px] font-medium text-stone-700 shadow-sm flex items-center gap-1.5 z-10">
          <Utensils className="w-3.5 h-3.5 text-orange-500" strokeWidth={2} />
          {satietyLabel}
        </div>
        <button
          onClick={toggleFavorite}
          className="absolute top-4 right-4 p-2.5 rounded-full bg-white/80 backdrop-blur-md shadow-sm z-10 hover:scale-110 active:scale-95 transition-transform"
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
};

const DetailDrawer = ({
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
  const chartData = item
    ? [
        {
          subject: "味道",
          A: normalizeRadarScore(item.radar.taste),
          fullMark: 100,
        },
        {
          subject: "性价比",
          A: normalizeRadarScore(item.radar.value),
          fullMark: 100,
        },
        {
          subject: "饱腹感",
          A: normalizeRadarScore(item.radar.satiety),
          fullMark: 100,
        },
        {
          subject: "健康度",
          A: normalizeRadarScore(item.radar.health),
          fullMark: 100,
        },
      ]
    : [];

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
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-[#FDFDFD] shadow-2xl z-50 overflow-y-auto flex flex-col"
          >
            <div className="sticky top-0 z-10 bg-[#FDFDFD]/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center">
              <button
                onClick={onClose}
                className="p-2.5 -ml-2 rounded-full hover:bg-stone-100 transition-colors text-stone-500 hover:text-stone-800 bg-white shadow-sm border border-stone-100"
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
                <h2 className="text-[28px] font-bold text-stone-800 mb-3 tracking-tight font-serif">
                  {item.title}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center px-3 py-1.5 bg-white rounded-xl shadow-sm text-[13.5px] font-medium text-stone-600 border border-stone-100">
                    <MapPin
                      className="w-4 h-4 mr-1.5 text-stone-400"
                      strokeWidth={1.5}
                    />
                    {item.location_text} · {item.stall_text}
                  </div>
                  <div className="flex items-center px-3 py-1.5 bg-white rounded-xl shadow-sm text-[13.5px] font-medium text-stone-600 border border-stone-100">
                    <Clock
                      className="w-4 h-4 mr-1.5 text-stone-400"
                      strokeWidth={1.5}
                    />
                    等待 {item.wait_time_text}
                  </div>
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
                      isAnimationActive={false}
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
                <Sparkles className="w-4 h-4 text-amber-300" strokeWidth={2} />
                查看完整数据分析和评价
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const FullScreenDetail = ({
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

  if (!item) {
    return null;
  }

  const chartData = [
    {
      subject: "味道",
      A: normalizeRadarScore(item.radar.taste),
      fullMark: 100,
    },
    {
      subject: "性价比",
      A: normalizeRadarScore(item.radar.value),
      fullMark: 100,
    },
    {
      subject: "饱腹感",
      A: normalizeRadarScore(item.radar.satiety),
      fullMark: 100,
    },
    {
      subject: "健康度",
      A: normalizeRadarScore(item.radar.health),
      fullMark: 100,
    },
  ];
  const macroEstimate = buildMacroEstimate(item);
  const crowdTrend = buildCrowdTrend(item);
  const referenceCards = buildReferenceCards(item);

  const toggleFavorite = () => {
    setFavorites(
      isFavorite
        ? favorites.filter((id) => id !== item.id)
        : [...favorites, item.id],
    );
  };

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
              className="p-3 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-stone-100/50 hover:bg-stone-50 transition-colors text-stone-600 focus:outline-none"
            >
              <X className="w-6 h-6" strokeWidth={1.5} />
            </button>
            <button
              onClick={toggleFavorite}
              className="p-3 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-stone-100/50 hover:bg-rose-50 transition-all text-stone-600 hover:scale-105 active:scale-95 focus:outline-none"
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
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/10 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex justify-between items-end gap-6">
                  <div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight font-serif">
                      {item.title}
                    </h1>
                    <div className="flex flex-wrap gap-2.5">
                      <div className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-md rounded-2xl text-sm font-medium text-white border border-white/10">
                        <MapPin
                          className="w-4 h-4 mr-2 opacity-80"
                          strokeWidth={1.5}
                        />
                        {item.location_text} · {item.stall_text}
                      </div>
                      <div className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-md rounded-2xl text-sm font-medium text-white border border-white/10">
                        <Clock
                          className="w-4 h-4 mr-2 opacity-80"
                          strokeWidth={1.5}
                        />
                        高峰 {item.wait_time_text}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-3xl shadow-lg">
                    <span className="text-3xl font-bold text-stone-800">
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
                    <button className="text-[14px] font-medium text-stone-800 hover:text-stone-500 transition-colors">
                      实时接口数据
                    </button>
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
                    <div className="min-w-[280px] sm:min-w-[320px] bg-stone-50/50 rounded-[32px] p-6 snap-center border-2 border-dashed border-stone-200 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        <Leaf className="w-5 h-5 text-stone-400" />
                      </div>
                      <span className="font-medium text-stone-500">
                        继续从首页或 AI 面板里挑下一道
                      </span>
                    </div>
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
                          isAnimationActive={false}
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
                        icon: <Wheat className="w-3.5 h-3.5 text-amber-400" />,
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
                          <span className="text-stone-800">{macro.value}g</span>
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
                          labelStyle={{ color: "#6b7280", marginBottom: "4px" }}
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
};

function LoadingState() {
  return (
    <div className="py-24 text-center text-stone-500 flex flex-col items-center gap-3">
      <LoaderCircle className="w-8 h-8 animate-spin text-stone-400" />
      <p>正在从后端加载菜单数据...</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-20 text-center text-stone-500">
      <p>{text}</p>
    </div>
  );
}

const XiaoDIcon = ({ size = 48 }: { size?: number }) => (
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
);

const XiaoDFloatingChat = ({
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
    Array<{ role: "user" | "ai"; text: string }>
  >([]);
  const [recommendations, setRecommendations] = useState<RankedMenuItem[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const robotMode: RobotMode = isThinking
    ? "thinking"
    : messages.length > 0
      ? aiInput
        ? "talking"
        : "smiling"
      : "idle";

  async function sendMessage() {
    const query = aiInput.trim();
    if (!query || isThinking) {
      return;
    }

    setAiInput("");
    setRecommendations([]);
    setMessages((previous) => [...previous, { role: "user", text: query }]);
    setIsThinking(true);
    setTimeout(
      () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      120,
    );

    try {
      const response = await fetchJson<RecommendQueryResponse>(
        "/api/recommend/query",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            top_k: 4,
            include_explanations: true,
            debug: false,
          }),
        },
      );

      setMessages((previous) => [
        ...previous,
        { role: "ai", text: response.data.reply_text },
      ]);
      setRecommendations(response.data.items);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: "ai",
          text: error instanceof Error ? error.message : "推荐接口暂时不可用。",
        },
      ]);
    } finally {
      setIsThinking(false);
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
      <AnimatePresence>
        {!isAiOpen && (
          <motion.button
            key="fab"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            whileHover={{ scale: 1.1, y: -3 }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: "spring", stiffness: 350, damping: 22 }}
            onClick={() => setIsAiOpen(true)}
            className="fixed bottom-24 md:bottom-8 right-5 md:right-8 z-50 w-[68px] h-[68px] rounded-full bg-white shadow-2xl shadow-blue-300/50 border-2 border-blue-100 flex items-center justify-center"
            title="和西小电聊聊"
          >
            <XiaoDIcon size={52} />
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-blue-400/20"
            />
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.5 }}
              className="absolute -top-1 -left-16 bg-stone-800 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap"
            >
              问我吃什么 ✨
              <span className="absolute -right-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-l-stone-800" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

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
                  "radial-gradient(ellipse at bottom right, rgba(30,60,120,0.35) 0%, rgba(0,0,0,0.45) 100%)",
                backdropFilter: "blur(8px)",
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
              className="fixed inset-x-3 bottom-3 md:right-6 md:left-auto md:w-[400px] z-50 overflow-hidden flex flex-col"
              style={{
                top: "max(env(safe-area-inset-top, 12px), 12px)",
                maxHeight: "calc(100vh - 24px)",
                background:
                  "linear-gradient(160deg, #0d1b2e 0%, #0a2240 40%, #0e1f38 100%)",
                boxShadow:
                  "0 32px 80px rgba(0,30,80,0.6), 0 0 0 1px rgba(80,160,255,0.15) inset",
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0"
              >
                <div>
                  <p className="text-white font-bold text-[16px] tracking-wide">
                    西小电
                  </p>
                  <p className="text-blue-300/80 text-[12px]">
                    西电美食 AI 助手
                  </p>
                </div>
                <button
                  onClick={() => setIsAiOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white/70" strokeWidth={2} />
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
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-12 rounded-full bg-blue-500/20 blur-2xl" />
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(100,180,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100,180,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                  <XiaoD mode={robotMode} />
                </div>

                <motion.div
                  key={robotMode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/8 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10"
                >
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-blue-400"
                  />
                  <span className="text-blue-200 text-[12px] font-medium">
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
                    <p className="text-blue-200/70 text-[14px] mb-4">
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
                            className="bg-white/10 hover:bg-white/18 text-blue-100 text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-colors border border-white/15 backdrop-blur-sm"
                          >
                            {sample}
                          </button>
                        ),
                      )}
                    </div>
                  </motion.div>
                ) : (
                  messages.map((message, index) => (
                    <motion.div
                      key={`${message.role}-${index}`}
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
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shrink-0 flex items-center justify-center text-white font-black text-[10px] shadow-md mt-0.5">
                          D
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[78%] text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-2xl",
                          message.role === "user"
                            ? "bg-blue-500 text-white rounded-br-sm shadow-md"
                            : "bg-white/12 text-blue-50 rounded-bl-sm border border-white/10",
                        )}
                      >
                        {message.text}
                      </div>
                    </motion.div>
                  ))
                )}
                {recommendations.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-[12px] uppercase tracking-widest text-blue-200/60">
                      Top Picks
                    </div>
                    {recommendations.map(({ item, matched_reasons }) => {
                      const fullItem =
                        menus.find((menu) => menu.id === item.id) || item;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onPickItem(fullItem);
                            setIsAiOpen(false);
                          }}
                          className="w-full text-left bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl px-4 py-3 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span className="text-white font-medium line-clamp-1">
                              {item.title}
                            </span>
                            <span className="text-blue-200 text-sm">
                              ¥{item.price.toFixed(1)}
                            </span>
                          </div>
                          <div className="text-blue-100/70 text-[12px] line-clamp-1">
                            {item.location_text} · {item.shop_text}
                          </div>
                          <div className="text-blue-100/70 text-[12px] mt-1 line-clamp-1">
                            {matched_reasons.length
                              ? matched_reasons.join(" / ")
                              : item.badge}
                          </div>
                        </button>
                      );
                    })}
                  </div>
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
                <div className="flex gap-2 bg-white/10 backdrop-blur-md rounded-2xl p-1.5 border border-white/15">
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
                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-white placeholder-white/40 px-2"
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={!aiInput.trim() || isThinking}
                    className="disabled:opacity-30 bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-90 flex items-center gap-1.5"
                  >
                    {isThinking ? (
                      <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
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
};

export default function App() {
  const [menuCache, setMenuCache] = useState<MenuItem[]>([]);
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
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [isAiMode] = useAtom(isAiModeAtom);

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
  const discoverPageRef = useRef(discoverPage);
  const isLoadingRef = useRef(isLoading);
  const isLoadingMoreRef = useRef(isLoadingMore);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const isSearchMode = Boolean(deferredSearchQuery);

  discoverPageRef.current = discoverPage;
  isLoadingRef.current = isLoading;
  isLoadingMoreRef.current = isLoadingMore;

  useEffect(() => {
    const saved = window.localStorage.getItem("xd-food-favorites");
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setFavorites(
          parsed.filter((value): value is string => typeof value === "string"),
        );
      } else {
        window.localStorage.removeItem("xd-food-favorites");
      }
    } catch {
      window.localStorage.removeItem("xd-food-favorites");
    }
  }, [setFavorites]);

  useEffect(() => {
    window.localStorage.setItem("xd-food-favorites", JSON.stringify(favorites));
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
    setDiscoverPage(1);
    setDiscoverItems([]);
    setHasMoreDiscover(true);
    prefetchedPageRef.current = null;
    prefetchingPageRef.current = null;
    observerRequestedPageRef.current = null;
  }, [deferredSearchQuery]);

  useEffect(() => {
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
  }, [discoverPage, deferredSearchQuery]);

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

  async function openDetail(id: string) {
    const cachedItem = menuCache.find((item) => item.id === id) || null;

    setExpandedItem(null);
    if (cachedItem) {
      setSelectedItem(cachedItem);
    }

    try {
      const response = await fetchJson<MenuDetailResponse>(`/api/menus/${id}`);
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
  }

  const displayedData =
    currentView === "discover" ? discoverItems : favoriteItems;
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
            {currentView === "discover" ? (
              <motion.div
                key="discover"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Hero menuCount={catalogCount} />
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
                          ? "后端筛选结果"
                          : "随机推荐 · 分散同店内容"}
                      </span>
                      <span className="tracking-wide">{visibleCountText}</span>
                    </div>
                  </motion.div>
                  {errorMessage ? (
                    <EmptyState text={errorMessage} />
                  ) : isLoading ? (
                    <LoadingState />
                  ) : displayedData.length === 0 ? (
                    <EmptyState text="未找到匹配的美食，换个关键词试试？" />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                      {displayedData.map((item, index) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.5,
                            delay:
                              index < DISCOVER_PAGE_SIZE ? index * 0.03 : 0,
                            ease: "easeOut",
                          }}
                        >
                          <FoodCard
                            item={item}
                            onClick={() => void openDetail(item.id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                  {!errorMessage && !isLoading && displayedData.length > 0 && (
                    <div className="flex flex-col items-center gap-4 pt-10">
                      {hasMoreDiscover ? (
                        <button
                          onClick={() =>
                            setDiscoverPage((previous) => previous + 1)
                          }
                          disabled={isLoadingMore}
                          className="px-5 py-2.5 rounded-full bg-white border border-stone-200 text-stone-700 shadow-sm hover:bg-stone-50 transition-colors disabled:opacity-60"
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
            ) : (
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
                {favoriteItems.length === 0 ? (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                    {favoriteItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, type: "spring" }}
                      >
                        <FoodCard
                          item={item}
                          onClick={() => void openDetail(item.id)}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
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
      </div>
    </MotionConfig>
  );
}
