import fs from 'fs';

const jsonPath = 'c:/Users/duan/Desktop/挑战杯/test version/XD-Food-Story/server/data/recommended_menus_frontend_ui.json';
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const updatedItems = data.map(item => {
  let changed = false;
  
  // 1. 识别预制/即点即得项目
  const isDrinkOrPorridge = item.category === '汤粥饮品类' || /豆浆|牛奶|粥|饮料|可乐|雪碧|芬达|咖啡/.test(item.title);
  const isSnack = item.category === '小吃点心类';

  if (isDrinkOrPorridge) {
    item.wait_time_text = "0-2 min";
    changed = true;
  } else if (isSnack && parseInt(item.wait_time_text?.match(/(\d+)/)?.[1] || '5') > 3) {
    // 小吃如果超过3分钟，通常也是预制的或者很快，调低到 1-3 min
    item.wait_time_text = "1-3 min";
    changed = true;
  }

  // 2. 兜底逻辑：任何超过 10 分钟的普通饭菜（非大餐）都显得不合理，封顶 8-10
  const firstWaitNum = parseInt(item.wait_time_text?.match(/(\d+)/)?.[1] || '5', 10);
  if (firstWaitNum > 10) {
    item.wait_time_text = "8-10 min";
    changed = true;
  }

  // 3. 更新雷达图中的出餐速度分数 (wait_time 维度)
  // 越快分数越高
  const currentFirstNum = parseInt(item.wait_time_text?.match(/(\d+)/)?.[1] || '5', 10);
  let waitScore = 0;
  if (currentFirstNum <= 1) waitScore = 98;
  else if (currentFirstNum <= 3) waitScore = 92;
  else if (currentFirstNum <= 5) waitScore = 85;
  else if (currentFirstNum <= 8) waitScore = 75;
  else if (currentFirstNum <= 10) waitScore = 65;
  else waitScore = 50;

  // 加上一点随机抖动使数据看起来更真实
  item.radar.wait_time = Math.min(99, waitScore + Math.floor(Math.random() * 5));

  return item;
});

fs.writeFileSync(jsonPath, JSON.stringify(updatedItems, null, 2), 'utf8');
console.log(`专项优化完成。已针对饮品、小吃和长等待项进行精细化调整。`);
