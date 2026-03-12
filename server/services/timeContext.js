import { SERVER_TIMEZONE } from "../config.js";

function getZonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function inferMealTime(hour) {
  if (hour >= 5 && hour < 10) {
    return "早餐";
  }
  if (hour >= 10 && hour < 15) {
    return "午餐";
  }
  return "晚餐";
}

export function getCurrentTimeContext() {
  const now = new Date();
  const parts = getZonedParts(now, SERVER_TIMEZONE);
  const currentMealTime = inferMealTime(parts.hour);
  const isOffHours = parts.hour < 5 || parts.hour >= 21;

  return {
    timezone: SERVER_TIMEZONE,
    iso_time: now.toISOString(),
    local_time_text: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}`,
    weekday: parts.weekday,
    hour: parts.hour,
    minute: parts.minute,
    inferred_meal_time: currentMealTime,
    is_off_hours: isOffHours,
  };
}
