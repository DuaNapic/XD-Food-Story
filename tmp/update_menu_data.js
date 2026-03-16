import fs from 'fs';
import path from 'path';

const jsonPath = 'c:/Users/duan/Desktop/挑战杯/test version/XD-Food-Story/server/data/recommended_menus_frontend_ui.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const updatedItems = data.map(item => {
  // 1. 等待时间下调 50%
  // 匹配数字，如 "8-15分钟" -> "4-8分钟"
  if (item.wait_time_text) {
    item.wait_time_text = item.wait_time_text.replace(/(\d+)/g, (match) => {
      const num = parseInt(match, 10);
      return Math.max(1, Math.round(num * 0.5));
    });
  }

  // 2. 初始化雷达图新增维度
  if (!item.radar) item.radar = {};
  
  // 基于排队时间推算等待评分 (越短分越高)
  // 获取 wait_time_text 中的第一个数字
  const firstWaitNum = parseInt(item.wait_time_text?.match(/(\d+)/)?.[1] || '10', 10);
  // 5分钟或以下 90+，15分钟 60左右
  const waitScore = Math.max(10, Math.min(95, 100 - (firstWaitNum * 3)));
  
  item.radar.wait_time = waitScore;
  
  // 随机生成一个不错的颜值分 (70-95)
  item.radar.aesthetic = Math.floor(Math.random() * (95 - 70 + 1)) + 70;

  return item;
});

fs.writeFileSync(jsonPath, JSON.stringify(updatedItems, null, 2), 'utf8');
console.log(`成功处理 ${updatedItems.length} 条数据。等待时间已下调 50%，雷达图维度已扩充。`);
