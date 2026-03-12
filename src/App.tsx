import React, { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { atom, useAtom } from "jotai";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Search,
  MapPin,
  Clock,
  ChefHat,
  Sparkles,
  X,
  Heart,
  Utensils,
  Leaf,
  Flame,
  Droplets,
  Wheat,
  Home,
  HeartCrack,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "./lib/utils";
import XiaoD from "./components/XiaoD";
// --- State ---
const favoritesAtom = atom<string[]>([]);
const viewAtom = atom<"discover" | "favorites">("discover");
const searchQueryAtom = atom<string>("");
const isAiModeAtom = atom<boolean>(false);
// --- Types ---
interface FoodMetrics {
  taste: number;
  value: number;
  satiety: number;
  health: number;
}
interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}
interface CrowdData {
  time: string;
  level: number;
}
interface Review {
  id: string;
  author: string;
  avatarColor: string;
  rating: string;
  date: Date;
  content: string;
}
interface FoodItem {
  id: string;
  name: string;
  price: number;
  canteen: string;
  floor: string;
  window_no: string;
  peak_wait: string;
  satietyLevel: string;
  imageUrl: string;
  metrics: FoodMetrics;
  macros: Macros;
  crowdTrend: CrowdData[];
  aiNotes: { firstBite: string; warning: string; pairing: string };
  reviews: Review[];
}

const generateCrowdTrend = () => [
  { time: "11:00", level: 20 },
  { time: "11:30", level: 45 },
  { time: "12:00", level: 90 },
  { time: "12:30", level: 100 },
  { time: "13:00", level: 60 },
  { time: "13:30", level: 30 },
];
const mockData: FoodItem[] = [
  {
    id: "f1",
    name: "招牌热干面",
    price: 8.5,
    canteen: "海棠餐厅",
    floor: "一层",
    window_no: "12号窗口",
    peak_wait: "10-15 min",
    satietyLevel: "极强饱腹感",
    imageUrl:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=800&h=600",
    metrics: { taste: 85, value: 95, satiety: 90, health: 60 },
    macros: { protein: 15, carbs: 65, fat: 20, calories: 480 },
    crowdTrend: generateCrowdTrend(),
    aiNotes: {
      firstBite: "芝麻酱的醇厚与碱水面的劲道完美融合，咸香热力瞬间拉满。",
      warning: "碳水爆炸，较干，需要搭配饮品。",
      pairing: "海棠一层的现磨豆浆，解腻解渴绝佳。",
    },
    reviews: [
      {
        id: "r1",
        author: "碳水爱好者",
        avatarColor: "from-orange-400 to-rose-400",
        rating: "强烈推荐",
        date: new Date(Date.now() - 1000 * 60 * 30),
        content: "西电最好吃的热干面，没有之一！阿姨给的麻酱超多。",
      },
      {
        id: "r2",
        author: "早八人",
        avatarColor: "from-blue-400 to-indigo-400",
        rating: "值得一试",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        content: "每次前两节没课都会来吃，饱腹感太强了，中午都不饿。",
      },
    ],
  },
  {
    id: "f2",
    name: "减脂轻食碗",
    price: 18.0,
    canteen: "竹园餐厅",
    floor: "二层",
    window_no: "05号窗口",
    peak_wait: "5-10 min",
    satietyLevel: "适中饱腹感",
    imageUrl:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800&h=600",
    metrics: { taste: 75, value: 70, satiety: 65, health: 95 },
    macros: { protein: 35, carbs: 20, fat: 12, calories: 320 },
    crowdTrend: generateCrowdTrend(),
    aiNotes: {
      firstBite: "清爽解腻，鸡胸肉不柴，低卡烘焙芝麻酱是灵魂。",
      warning: "性价比一般，男生可能吃不饱。",
      pairing: "无糖乌龙茶或黑咖啡，减脂效果翻倍。",
    },
    reviews: [
      {
        id: "r3",
        author: "健身区UP主",
        avatarColor: "from-emerald-400 to-teal-400",
        rating: "强烈推荐",
        date: new Date(Date.now() - 1000 * 60 * 60 * 5),
        content: "宏量营养素配比很棒，蛋白质给得足，减脂期闭眼冲。",
      },
      {
        id: "r4",
        author: "匿名草食系",
        avatarColor: "from-lime-400 to-green-500",
        rating: "一般般",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        content: "菜叶子有点老，希望紫甘蓝能切细一点。",
      },
    ],
  },
  {
    id: "f3",
    name: "铁板黑椒鸡排饭",
    price: 15.0,
    canteen: "丁香餐厅",
    floor: "一层",
    window_no: "22号窗口",
    peak_wait: "15-20 min",
    satietyLevel: "十分顶饱",
    imageUrl:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=800&h=600",
    metrics: { taste: 90, value: 85, satiety: 95, health: 50 },
    macros: { protein: 28, carbs: 70, fat: 25, calories: 650 },
    crowdTrend: generateCrowdTrend(),
    aiNotes: {
      firstBite: "铁板滋啦啦的热气扑面而来，黑椒汁浓郁得能下两碗米饭。",
      warning: "饭点排队时间极长！且吃完衣服上会有较重的味道。",
      pairing: "随便配个清汤，重点是米饭一定要让阿姨多加点。",
    },
    reviews: [
      {
        id: "r5",
        author: "丁香干饭王",
        avatarColor: "from-amber-400 to-yellow-500",
        rating: "强烈推荐",
        date: new Date(Date.now() - 1000 * 60 * 60 * 12),
        content: "肉量真的很顶，15块钱在西安高校里算性价比天花板了。",
      },
    ],
  },
  {
    id: "f4",
    name: "特色小锅米线",
    price: 12.0,
    canteen: "海棠餐厅",
    floor: "二层",
    window_no: "08号窗口",
    peak_wait: "8-12 min",
    satietyLevel: "汤水多易消化",
    imageUrl:
      "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&q=80&w=800&h=600",
    metrics: { taste: 88, value: 80, satiety: 75, health: 70 },
    macros: { protein: 18, carbs: 55, fat: 15, calories: 410 },
    crowdTrend: generateCrowdTrend(),
    aiNotes: {
      firstBite: "酸辣开胃，肉酱很香，米线顺滑，一口汤下去整个胃都暖了。",
      warning: "微辣其实也挺辣，不能吃辣的同学一定要提前说清汤！",
      pairing: "搭配窗口旁边卖的2块钱酥饼，泡在汤里简直一绝。",
    },
    reviews: [
      {
        id: "r6",
        author: "养生少女",
        avatarColor: "from-pink-400 to-rose-400",
        rating: "值得一试",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24),
        content: "冬天晚上去吃一碗绝了，喝汤能喝到流汗，很舒服。",
      },
      {
        id: "r7",
        author: "辣不怕",
        avatarColor: "from-red-400 to-orange-500",
        rating: "强烈推荐",
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        content: "加辣加醋！无敌！",
      },
    ],
  },
];
// --- Components ---

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
const Hero = () => {
  const [searchQuery, setSearchQuery] = useAtom(searchQueryAtom);
  const inputRef = React.useRef<HTMLInputElement>(null);

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
          12 Canteens Open
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

      {/* Pure search bar */}
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
            onChange={(e) => setSearchQuery(e.target.value)}
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
  item: FoodItem;
  onClick: () => void;
}) => {
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const isFavorite = favorites.includes(item.id);
  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
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
          src={item.imageUrl}
          alt={item.name}
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.7, ease: [0.33, 1, 0.68, 1] }}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[13px] font-medium text-stone-700 shadow-sm flex items-center gap-1.5 z-10">
          <Utensils className="w-3.5 h-3.5 text-orange-500" strokeWidth={2} />
          {item.satietyLevel}
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
        <div className="flex justify-between items-start mb-2.5">
          <h3 className="text-[19px] font-semibold text-stone-800 tracking-tight line-clamp-1">
            {item.name}
          </h3>
          <span className="text-lg font-medium text-stone-800">
            ¥{item.price.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center text-[14px] text-stone-500 mt-auto">
          <MapPin
            className="w-4 h-4 mr-1.5 flex-shrink-0 text-stone-400"
            strokeWidth={1.5}
          />
          <span className="truncate">
            {item.canteen} {item.floor}
          </span>
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
  item: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
  onExpand: (item: FoodItem) => void;
}) => {
  const chartData = item
    ? [
        { subject: "味道", A: item.metrics.taste, fullMark: 100 },
        { subject: "性价比", A: item.metrics.value, fullMark: 100 },
        { subject: "饱腹感", A: item.metrics.satiety, fullMark: 100 },
        { subject: "健康度", A: item.metrics.health, fullMark: 100 },
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
                  src={item.imageUrl}
                  alt={item.name}
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
                  {item.name}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center px-3 py-1.5 bg-white rounded-xl shadow-sm text-[13.5px] font-medium text-stone-600 border border-stone-100">
                    <MapPin
                      className="w-4 h-4 mr-1.5 text-stone-400"
                      strokeWidth={1.5}
                    />
                    {item.canteen} · {item.floor}
                  </div>
                  <div className="flex items-center px-3 py-1.5 bg-white rounded-xl shadow-sm text-[13.5px] font-medium text-stone-600 border border-stone-100">
                    <Clock
                      className="w-4 h-4 mr-1.5 text-stone-400"
                      strokeWidth={1.5}
                    />
                    等待 {item.peak_wait}
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
                    <Radar
                      name="Metrics"
                      dataKey="A"
                      stroke="#7dd3fc"
                      strokeWidth={1.5}
                      fill="#bae6fd"
                      fillOpacity={0.4}
                      isAnimationActive={true}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </motion.div>
              <p className="text-[14px] text-stone-500 text-center px-4 leading-relaxed font-light italic">
                "{item.aiNotes.firstBite}"
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
  item: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [favorites, setFavorites] = useAtom(favoritesAtom);
  const isFavorite = item ? favorites.includes(item.id) : false;
  const toggleFavorite = () => {
    if (!item) return;
    setFavorites(
      isFavorite
        ? favorites.filter((id) => id !== item.id)
        : [...favorites, item.id],
    );
  };
  const chartData = item
    ? [
        { subject: "味道", A: item.metrics.taste, fullMark: 100 },
        { subject: "性价比", A: item.metrics.value, fullMark: 100 },
        { subject: "饱腹感", A: item.metrics.satiety, fullMark: 100 },
        { subject: "健康度", A: item.metrics.health, fullMark: 100 },
      ]
    : [];
  return (
    <AnimatePresence>
      {isOpen && item && (
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
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/10 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight font-serif">
                      {item.name}
                    </h1>
                    <div className="flex flex-wrap gap-2.5">
                      <div className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-md rounded-2xl text-sm font-medium text-white border border-white/10">
                        <MapPin
                          className="w-4 h-4 mr-2 opacity-80"
                          strokeWidth={1.5}
                        />
                        {item.canteen} · {item.floor}
                      </div>
                      <div className="flex items-center px-4 py-2 bg-white/20 backdrop-blur-md rounded-2xl text-sm font-medium text-white border border-white/10">
                        <Clock
                          className="w-4 h-4 mr-2 opacity-80"
                          strokeWidth={1.5}
                        />
                        高峰 {item.peak_wait}
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
                        <Flame className="w-4 h-4" /> 一口入魂
                      </h4>
                      <p className="text-[15.5px] leading-relaxed text-stone-700">
                        {item.aiNotes.firstBite}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-rose-50/50 rounded-[28px] p-6 border border-rose-100">
                        <h4 className="text-sm font-medium text-rose-400 uppercase tracking-widest mb-2">
                          避坑指南
                        </h4>
                        <p className="text-[14px] leading-relaxed text-stone-600">
                          {item.aiNotes.warning}
                        </p>
                      </div>
                      <div className="bg-emerald-50/50 rounded-[28px] p-6 border border-emerald-100">
                        <h4 className="text-sm font-medium text-emerald-500 uppercase tracking-widest mb-2">
                          绝佳搭配
                        </h4>
                        <p className="text-[14px] leading-relaxed text-stone-600">
                          {item.aiNotes.pairing}
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
                        食客笔记
                      </h3>
                      <p className="text-sm text-stone-500">
                        看看其他人怎么评价
                      </p>
                    </div>
                    <button className="text-[14px] font-medium text-stone-800 hover:text-stone-500 transition-colors">
                      查看全部
                    </button>
                  </div>
                  <div className="flex overflow-x-auto pb-8 -mx-4 px-4 sm:-mx-8 sm:px-8 snap-x snap-mandatory hide-scrollbar gap-5">
                    {item.reviews.map((review) => (
                      <div
                        key={review.id}
                        className="min-w-[280px] sm:min-w-[320px] bg-white rounded-[32px] p-6 shadow-xl shadow-stone-200/30 snap-center border border-stone-50"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-3 items-center">
                            <div
                              className={cn(
                                "w-10 h-10 rounded-full bg-gradient-to-tr",
                                review.avatarColor,
                              )}
                            />
                            <div>
                              <div className="font-semibold text-[15px] text-stone-800">
                                {review.author}
                              </div>
                              <div className="text-xs text-stone-400">
                                {formatDistanceToNow(review.date, {
                                  locale: zhCN,
                                  addSuffix: true,
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="bg-stone-50 px-3 py-1 rounded-full text-xs font-medium text-stone-600 border border-stone-100">
                            {review.rating}
                          </div>
                        </div>
                        <p className="text-[15px] text-stone-600 leading-relaxed font-light">
                          {review.content}
                        </p>
                      </div>
                    ))}
                    <div className="min-w-[280px] sm:min-w-[320px] bg-stone-50/50 rounded-[32px] p-6 snap-center border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors group">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Leaf className="w-5 h-5 text-stone-400" />
                      </div>
                      <span className="font-medium text-stone-500">
                        我也吃过，写条评价
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
                          isAnimationActive={true}
                          animationBegin={600}
                          animationDuration={1500}
                          animationEasing="ease-out"
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
                        {item.macros.calories}
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
                        value: item.macros.protein,
                        max: 50,
                        color: "bg-blue-400",
                        icon: (
                          <Droplets className="w-3.5 h-3.5 text-blue-400" />
                        ),
                      },
                      {
                        label: "碳水化合物 (Carbs)",
                        value: item.macros.carbs,
                        max: 100,
                        color: "bg-amber-400",
                        icon: <Wheat className="w-3.5 h-3.5 text-amber-400" />,
                      },
                      {
                        label: "脂肪 (Fat)",
                        value: item.macros.fat,
                        max: 40,
                        color: "bg-rose-400",
                        icon: (
                          <Droplets className="w-3.5 h-3.5 text-rose-400" />
                        ),
                      },
                    ].map((macro, i) => (
                      <div key={macro.label}>
                        <div className="flex justify-between text-[13px] font-medium mb-1.5">
                          <span className="text-stone-500 flex items-center gap-1.5">
                            {macro.icon} {macro.label}
                          </span>
                          <span className="text-stone-800">{macro.value}g</span>
                        </div>
                        <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(macro.value / macro.max) * 100}%`,
                            }}
                            transition={{
                              delay: 0.8 + i * 0.1,
                              duration: 1,
                              type: "spring",
                            }}
                            className={`h-full ${macro.color} rounded-full`}
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
                        data={item.crowdTrend}
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
                          formatter={(value: any) => [
                            `${value}% 拥挤`,
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
                          isAnimationActive={true}
                          animationBegin={800}
                          animationDuration={1500}
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
export default function App() {
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [expandedItem, setExpandedItem] = useState<FoodItem | null>(null);

  const [currentView] = useAtom(viewAtom);
  const [favorites] = useAtom(favoritesAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [isAiMode] = useAtom(isAiModeAtom);

  let displayedData =
    currentView === "discover"
      ? mockData
      : mockData.filter((item) => favorites.includes(item.id));

  if (searchQuery.trim() && !isAiMode && currentView === "discover") {
    displayedData = displayedData.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.canteen.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-stone-800 selection:bg-stone-200 flex relative overflow-hidden">
      {/* Background Depth Orbs */}
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
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                  className="flex items-center justify-between mb-8"
                >
                  <h2 className="text-[22px] font-semibold tracking-tight text-stone-800">
                    {searchQuery.trim() && !isAiMode
                      ? `搜索 "${searchQuery}" 的结果`
                      : "Today's Picks"}
                  </h2>
                  <div className="text-[15px] text-stone-500 flex gap-5">
                    <button className="text-stone-800 font-medium tracking-wide">
                      Newest
                    </button>
                    <button className="hover:text-stone-800 transition-colors tracking-wide hover:scale-105 active:scale-95 duration-200">
                      Popular
                    </button>
                  </div>
                </motion.div>
                {displayedData.length === 0 ? (
                  <div className="py-20 text-center text-stone-500">
                    <p>未找到匹配的美食，换个关键词试试？</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 xl:gap-8">
                    {displayedData.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.5,
                          delay: index * 0.05,
                          ease: "easeOut",
                        }}
                      >
                        <FoodCard
                          item={item}
                          onClick={() => setSelectedItem(item)}
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
                <p className="text-stone-500 mt-3 text-lg">
                  Your curated collection of campus flavors.
                </p>
              </div>
              {favorites.length === 0 ? (
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
                  {displayedData.map((item, index) => (
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
                        onClick={() => setSelectedItem(item)}
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
        onExpand={(i) => setExpandedItem(i)}
      />
      <FullScreenDetail
        item={expandedItem}
        isOpen={!!expandedItem}
        onClose={() => setExpandedItem(null)}
      />

      {/* ---- 西小电 Floating AI Button + Chat Panel ---- */}
      <XiaoDFloatingChat />
    </div>
  );
}

// ── 2D 西小电 SVG 图案 (纯 CSS, 不需要 WebGL) ─────────────────────────
const XiaoDIcon = ({ size = 48 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* 头部圆球 */}
    <circle cx="24" cy="24" r="20" fill="url(#headGrad)" />
    {/* 头部光泽 */}
    <circle cx="24" cy="24" r="20" fill="url(#headGloss)" opacity="0.35" />
    {/* 左天线 */}
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
    {/* 右天线 */}
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
    {/* 显示屏 */}
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
    {/* 左眼豆豆 */}
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
    {/* 右眼豆豆 */}
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
    {/* 隐藏的四肢（圆形按钮里只展示头） */}
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

const XiaoDFloatingChat = () => {
  const [isAiOpen, setIsAiOpen] = useAtom(isAiModeAtom);
  const [aiInput, setAiInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; text: string }[]
  >([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const robotMode = isThinking
    ? "thinking"
    : messages.length > 0
      ? aiInput
        ? "talking"
        : "smiling"
      : "idle";

  // 预留庞大数据集位置，防止阻塞 Prompt
  const KNOWLEDGE_BASE = {};

  const sendMessage = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    setAiInput("");

    const newMessages = [...messages, { role: "user" as const, text: userMsg }];
    setMessages(newMessages);
    setIsThinking(true);
    setTimeout(
      () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      120,
    );

    try {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer sk-f0d9ef5960b144d1b91e7e44c20df8c0",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `你叫西小电(XD-Foodie)，西电校园美食助手。基于以下数据回答：${JSON.stringify(KNOWLEDGE_BASE)}。要求：活泼拟人、极其简练、直接给出建议。`,
            },
            ...newMessages.map((m) => ({
              role: m.role === "ai" ? "assistant" : "user",
              content: m.text,
            })),
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "服务繁忙，稍后再试";

      setIsThinking(false);
      setMessages((prev) => [...prev, { role: "ai", text: reply }]);
      setTimeout(
        () => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        120,
      );
    } catch (e) {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "网络拥塞，请稍后。" },
      ]);
    }
  };

  // 打开时自动聚焦
  React.useEffect(() => {
    if (isAiOpen) setTimeout(() => inputRef.current?.focus(), 600);
  }, [isAiOpen]);

  return (
    <>
      {/* ── 悬浮 2D 图标按钮 ─────────────────────────────────────────── */}
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
            {/* 脉冲圆圈 */}
            <motion.div
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
              className="absolute inset-0 rounded-full bg-blue-400/20"
            />
            {/* 提示标签 */}
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

      {/* ── AI 聊天全屏面板 ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isAiOpen && (
          <>
            {/* 背景遮罩 */}
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

            {/* 面板主体 - 从右下角弹出，类似展开手机 */}
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
              {/* 顶部控制栏 */}
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

              {/* 3D 西小电展示区 - 悬浮于面板上半部分 */}
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
                {/* 发光底光 */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-12 rounded-full bg-blue-500/20 blur-2xl" />
                {/* 网格背景 */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(100,180,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100,180,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "28px 28px",
                  }}
                />
                {/* 3D 西小电 */}
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                  <XiaoD mode={robotMode} />
                </div>

                {/* 状态文字 */}
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
                          : ""}
                  </span>
                </motion.div>
              </motion.div>

              {/* 消息区 */}
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
                      {["🌶️ 来点辣的", "💰 实惠的", "🥗 清淡健康"].map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            setAiInput(q.slice(2));
                            inputRef.current?.focus();
                          }}
                          className="bg-white/10 hover:bg-white/18 text-blue-100 text-[13px] font-medium px-3.5 py-1.5 rounded-full transition-colors border border-white/15 backdrop-blur-sm"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 24,
                      }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2"}`}
                    >
                      {msg.role === "ai" && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shrink-0 flex items-center justify-center text-white font-black text-[10px] shadow-md mt-0.5">
                          D
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[78%] text-[13.5px] leading-relaxed px-3.5 py-2.5 rounded-2xl",
                          msg.role === "user"
                            ? "bg-blue-500 text-white rounded-br-sm shadow-md"
                            : "bg-white/12 text-blue-50 rounded-bl-sm border border-white/10",
                        )}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={chatEndRef} />
              </motion.div>
              {/* 输入框 */}
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
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="说说你想吃什么..."
                    className="flex-1 bg-transparent border-none outline-none text-[14px] text-white placeholder-white/40 px-2"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!aiInput.trim()}
                    className="disabled:opacity-30 bg-blue-500 hover:bg-blue-400 text-white px-4 py-2 rounded-xl text-[13px] font-semibold transition-all active:scale-90 flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
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
