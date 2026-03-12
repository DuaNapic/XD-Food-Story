import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { atom, useAtom } from "jotai";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  ChefHat,
  Clock,
  Heart,
  HeartCrack,
  Home,
  LoaderCircle,
  MapPin,
  Search,
  Sparkles,
  Tags,
  Utensils,
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

function getImageUrl(imageKey: string) {
  return imageMap[imageKey] || imageMap.snack;
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
            <span className="ml-3 font-medium hidden lg:block">发现</span>
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
          </button>
        </div>
      </div>
    </>
  );
};

const Hero = () => {
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
          Server Mode Enabled
        </span>
      </motion.div>
      <div className="relative inline-block mb-6">
        <h1 className="text-5xl md:text-6xl font-serif font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-stone-800 to-stone-400 pb-2 relative z-10">
          XD食物语
        </h1>
      </div>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
        className="text-lg md:text-xl text-stone-500 max-w-xl mx-auto mb-10 font-light leading-relaxed"
      >
        首页卡片、详情页和 AI 推荐现在都由后端接口驱动，不再依赖本地 mock。
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
            placeholder="搜索菜名、店名、位置..."
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
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[13px] font-medium text-stone-700 shadow-sm flex items-center gap-1.5 z-10">
          <Utensils className="w-3.5 h-3.5 text-orange-500" strokeWidth={2} />
          {item.badge}
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
      <div className="p-5 flex flex-col flex-grow bg-white gap-3">
        <div className="flex justify-between items-start gap-3">
          <h3 className="text-[19px] font-semibold text-stone-800 tracking-tight line-clamp-2">
            {item.title}
          </h3>
          <span className="text-lg font-medium text-stone-800 whitespace-nowrap">
            ¥{item.price.toFixed(1)}
          </span>
        </div>
        <div className="space-y-2 mt-auto">
          <div className="flex items-center text-[14px] text-stone-500">
            <MapPin
              className="w-4 h-4 mr-1.5 flex-shrink-0 text-stone-400"
              strokeWidth={1.5}
            />
            <span className="truncate">{item.location_text}</span>
          </div>
          <div className="text-[13px] text-stone-500 line-clamp-1">
            {item.shop_text} · {item.stall_text}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const DetailDrawer = ({
  item,
  isOpen,
  onClose,
}: {
  item: MenuItem | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const chartData = item
    ? [
        { subject: "味道", value: item.radar.taste },
        { subject: "性价比", value: item.radar.value },
        { subject: "饱腹感", value: item.radar.satiety },
        { subject: "健康度", value: item.radar.health },
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
            className="fixed top-0 right-0 h-full w-full sm:w-[520px] bg-[#FDFDFD] shadow-2xl z-50 overflow-y-auto flex flex-col"
          >
            <div className="sticky top-0 z-10 bg-[#FDFDFD]/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-stone-100">
              <button
                onClick={onClose}
                className="p-2.5 -ml-2 rounded-full hover:bg-stone-100 transition-colors text-stone-500 hover:text-stone-800 bg-white shadow-sm border border-stone-100"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <span className="text-sm font-medium text-stone-400 tracking-widest uppercase">
                Detail
              </span>
              <div className="w-10" />
            </div>
            <div className="px-6 py-5 flex-grow">
              <div className="relative h-64 rounded-[28px] overflow-hidden mb-6 shadow-sm">
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
              </div>
              <div className="mb-8">
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
                  <div className="flex items-center px-3 py-1.5 bg-white rounded-xl shadow-sm text-[13.5px] font-medium text-stone-600 border border-stone-100">
                    <Tags
                      className="w-4 h-4 mr-1.5 text-stone-400"
                      strokeWidth={1.5}
                    />
                    {item.category}
                  </div>
                </div>
              </div>
              <div className="h-[220px] w-full -ml-3 mb-4 mix-blend-multiply">
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
                      domain={[0, 5]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      name="指标"
                      dataKey="value"
                      stroke="#7dd3fc"
                      strokeWidth={1.5}
                      fill="#bae6fd"
                      fillOpacity={0.4}
                      isAnimationActive
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-[24px] p-5 shadow-sm border border-stone-100">
                  <h4 className="text-sm font-medium text-stone-400 uppercase tracking-widest mb-2">
                    AI 推荐理由
                  </h4>
                  <p className="text-[15px] leading-relaxed text-stone-700">
                    {item.ai_insight}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-stone-50 rounded-[24px] p-5 border border-stone-100">
                    <h4 className="text-sm font-medium text-stone-400 uppercase tracking-widest mb-2">
                      基础信息
                    </h4>
                    <div className="space-y-1 text-sm text-stone-600">
                      <p>店名：{item.shop_text}</p>
                      <p>辣度：{item.spiciness}</p>
                      <p>餐段：{item.meal_time.join(" / ")}</p>
                    </div>
                  </div>
                  <div className="bg-stone-50 rounded-[24px] p-5 border border-stone-100">
                    <h4 className="text-sm font-medium text-stone-400 uppercase tracking-widest mb-2">
                      补充说明
                    </h4>
                    <div className="space-y-1 text-sm text-stone-600">
                      <p>
                        口味：
                        {item.flavor_options.length
                          ? item.flavor_options.join(" / ")
                          : "暂无"}
                      </p>
                      <p>规格：{item.form_label || "暂无"}</p>
                      <p>计价：{item.price_rule_note || "暂无"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
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
    if (!query) {
      return;
    }

    setAiInput("");
    setMessages((previous) => [...previous, { role: "user", text: query }]);
    setIsThinking(true);

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
      setTimeout(() => inputRef.current?.focus(), 500);
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
          >
            <XiaoDIcon size={52} />
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
              className="fixed inset-x-3 bottom-3 md:right-6 md:left-auto md:w-[420px] z-50 overflow-hidden flex flex-col"
              style={{
                top: "max(env(safe-area-inset-top, 12px), 12px)",
                maxHeight: "calc(100vh - 24px)",
                background:
                  "linear-gradient(160deg, #0d1b2e 0%, #0a2240 40%, #0e1f38 100%)",
                boxShadow:
                  "0 32px 80px rgba(0,30,80,0.6), 0 0 0 1px rgba(80,160,255,0.15) inset",
              }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
                <div>
                  <p className="text-white font-bold text-[16px] tracking-wide">
                    西小电
                  </p>
                  <p className="text-blue-300/80 text-[12px]">
                    后端推荐接口已接入
                  </p>
                </div>
                <button
                  onClick={() => setIsAiOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white/70" strokeWidth={2} />
                </button>
              </div>
              <div className="relative shrink-0" style={{ height: "220px" }}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-12 rounded-full bg-blue-500/20 blur-2xl" />
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                  <XiaoD mode={robotMode} />
                </div>
              </div>
              <div
                className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
                style={{ scrollbarWidth: "none" }}
              >
                {messages.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-blue-200/70 text-[14px] mb-4">
                      直接说你想吃什么，前端会通过后端推荐接口拿结果。
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        "来点辣的，别太贵",
                        "我早上赶课，想快一点",
                        "想吃清淡点，在海棠一楼",
                      ].map((sample) => (
                        <button
                          key={sample}
                          onClick={() => setAiInput(sample)}
                          className="bg-white/10 hover:bg-white/18 text-blue-100 text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-colors border border-white/15 backdrop-blur-sm"
                        >
                          {sample}
                        </button>
                      ))}
                    </div>
                  </div>
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
              </div>
              <div className="px-4 pb-5 pt-2 shrink-0">
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default function App() {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentView] = useAtom(viewAtom);
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [isAiMode] = useAtom(isAiModeAtom);

  useEffect(() => {
    const saved = window.localStorage.getItem("xd-food-favorites");
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem("xd-food-favorites");
      }
    }
  }, [setFavorites]);

  useEffect(() => {
    window.localStorage.setItem("xd-food-favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    let cancelled = false;

    async function loadMenus() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await fetchJson<MenusResponse>(
          "/api/menus?page=1&page_size=1000",
        );
        if (!cancelled) {
          setMenus(response.data.items);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "加载菜单失败",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMenus();
    return () => {
      cancelled = true;
    };
  }, []);

  const favoriteItems = menus.filter((item) => favorites.includes(item.id));
  const discoverItems = menus.filter((item) => {
    if (!searchQuery.trim()) {
      return true;
    }
    const keyword = searchQuery.toLowerCase();
    return [
      item.title,
      item.shop_text,
      item.location_text,
      item.category,
      ...item.flavor_options,
    ].some((field) => field.toLowerCase().includes(keyword));
  });

  const displayedItems =
    currentView === "discover" ? discoverItems : favoriteItems;

  async function openDetail(id: string) {
    try {
      const response = await fetchJson<MenuDetailResponse>(`/api/menus/${id}`);
      setSelectedItem(response.data.item);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "加载详情失败");
    }
  }

  return (
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
              <Hero />
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
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-[22px] font-semibold tracking-tight text-stone-800">
                    {searchQuery.trim()
                      ? `搜索 “${searchQuery}” 的结果`
                      : "Today's Picks"}
                  </h2>
                  <div className="text-[15px] text-stone-500">
                    接口数据共 {menus.length} 条
                  </div>
                </div>
                {errorMessage ? (
                  <EmptyState text={errorMessage} />
                ) : isLoading ? (
                  <LoadingState />
                ) : displayedItems.length === 0 ? (
                  <EmptyState text="未找到匹配的美食，换个关键词试试？" />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                    {displayedItems.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.5,
                          delay: index * 0.03,
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
                    收藏夹还是空的
                  </h3>
                  <p className="text-stone-500 max-w-sm">
                    去发现页面逛逛吧，点个红心就会保存在这里。
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                  {favoriteItems.map((item) => (
                    <FoodCard
                      key={item.id}
                      item={item}
                      onClick={() => void openDetail(item.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <DetailDrawer
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
      <XiaoDFloatingChat
        menus={menus}
        onPickItem={(item) => setSelectedItem(item)}
      />
    </div>
  );
}
