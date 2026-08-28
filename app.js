/* =========================================================
   自定义主页 · 方向 D（真实照片壁纸 + 轻玻璃）行为脚本
   功能覆盖：
     一期：导航 / 搜索(可算算式) / 时钟 / 天气 / 待办 / 壁纸 / 每日一句
     二期②：动态分组 / 真实 favicon / 分组增删改名 / 书签拖拽 / 设置中心 / 导入导出
     二期③：手机适配 + 键盘快捷键（/ 聚焦、↑↓ 切引擎、W 换壁纸、? 帮助、Esc 关闭）
     二期④：天气城市搜索 + 多日预报 + AQI / 便签 / 环境音
   数据全部存在浏览器本地（localStorage）。每步带中文注释。
   ========================================================= */

/* ---------- 0. 本地存储 ---------- */
const KEY = 'my-homepage-v1';

function defaults() {
  return {
    veil: 0.40,                                    // 蒙版浓度（明暗）
    wallpaper: { style: 'nature', custom: null },  // 壁纸分类 或 'custom'
    engine: 'bing',                               // 默认搜索引擎（必应）
    components: {                                  // 各组件是否显示
      clock: true, weather: true, search: true,
      quote: true, styles: true, todo: true,
      notes: true, ambient: true,                // 四期新增：便签 / 环境音
    },
    weather: { name: '北京', lat: 39.9042, lon: 116.4074 }, // 四期：记住城市
    bookmarks: {                                   // 网站导航（动态分组）
      work:  [
        { name: '邮箱',   url: 'https://mail.qq.com' },
        { name: '日历',   url: 'https://calendar.google.com' },
        { name: '报表',   url: 'https://docs.qq.com' },
        { name: '协作',   url: 'https://www.feishu.cn' },
      ],
      fun:   [
        { name: '视频',   url: 'https://www.bilibili.com' },
        { name: '音乐',   url: 'https://music.163.com' },
        { name: '游戏',   url: 'https://www.taptap.cn' },
        { name: '购物',   url: 'https://www.taobao.com' },
      ],
      study: [
        { name: '文档',   url: 'https://docs.qq.com' },
        { name: '工具',   url: 'https://www.processon.com' },
        { name: '收藏',   url: 'https://www.inoreader.com' },
        { name: '设置',   url: 'https://www.bing.com' },
      ],
    },
    cardOrder: ['work', 'fun', 'study'],           // #cards 区域内分组卡片的顺序
    extrasOrder: ['todo', 'notes', 'ambient'],    // .extras 区域内卡片的顺序（待办/便签/环境音）
    todos: [
      { text: '回复客户邮件', done: true },
      { text: '完成主页原型', done: false },
      { text: '整理本周待办', done: false },
    ],
    notes: '',                                    // 四期：便签内容
    ambient: { type: '', volume: 0.5 },           // 四期：环境音设置
  };
}

function load() {
  const d = defaults();
  const baseComponents = d.components;            // 先留一份「默认组件开关」
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s) {
      Object.keys(d).forEach(k => { if (s[k] !== undefined) d[k] = s[k]; });
      // 组件开关逐项合并：旧版本数据里没有的新组件按默认(显示)处理，
      // 否则升级后新增的组件会因为「没有这个开关」而被误判为隐藏。
      d.components = Object.assign({}, baseComponents, s.components || {});
    }
  } catch (e) {}
  return d;
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

let state = load();

/* ---------- 1. 壁纸：真实照片（按分类存几张，随机取） ---------- */
const FALLBACK = 'linear-gradient(150deg, #0a1020, #11183a 50%, #07131f)';
const WALLPAPERS = {
  nature: [
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=1600&q=80&auto=format&fit=crop',
  ],
  city: [
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1496588152823-86ff7695e6f7?w=1600&q=80&auto=format&fit=crop',
  ],
  minimal: [
    'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505765050516-f72dcac9c60e?w=1600&q=80&auto=format&fit=crop',
  ],
  abstract: [
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1557672172-298c7c7c3c0c?w=1600&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534796638898-225fd21397d4?w=1600&q=80&auto=format&fit=crop',
  ],
};
function applyBackground() {
  let url;
  if (state.wallpaper.style === 'custom' && state.wallpaper.custom) url = state.wallpaper.custom;
  else { const arr = WALLPAPERS[state.wallpaper.style] || WALLPAPERS.nature; url = arr[Math.floor(Math.random() * arr.length)]; }
  document.body.style.backgroundImage = 'url("' + url + '"), ' + FALLBACK;
  document.body.style.backgroundSize = 'cover, cover';
  document.body.style.backgroundPosition = 'center, center';
  document.body.style.backgroundRepeat = 'no-repeat, no-repeat';
  document.body.style.backgroundAttachment = 'fixed, fixed';
}
function highlightSwatch() {
  document.querySelectorAll('.swatch').forEach(x => x.classList.remove('on'));
  if (state.wallpaper.style !== 'custom') {
    const el = document.querySelector('.swatch[data-style="' + state.wallpaper.style + '"]');
    if (el) el.classList.add('on');
  }
}

/* ---------- 2. 蒙版浓度（明暗） ---------- */
const VEIL_PRESETS = [0.22, 0.40, 0.60];   // 明亮 / 标准 / 深沉
const VEIL_LABEL = ['明亮', '标准', '深沉'];
let veilIdx = VEIL_PRESETS.indexOf(state.veil) >= 0 ? VEIL_PRESETS.indexOf(state.veil) : 1;
function applyVeil() { document.querySelector('.veil').style.opacity = state.veil; }

/* ---------- 3. 时钟 ---------- */
function tick() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  document.getElementById('clock-time').textContent = hh + ':' + mm;
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  document.getElementById('clock-date').textContent =
    days[d.getDay()] + ' · ' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

/* ---------- 4. 天气（Open-Meteo，免费免密钥，需联网） ---------- */
const WMO = {
  0:['☀️','晴'],1:['🌤️','大致晴朗'],2:['⛅','局部多云'],3:['☁️','阴'],
  45:['🌫️','雾'],48:['🌫️','雾'],
  51:['🌦️','小毛毛雨'],53:['🌦️','毛毛雨'],55:['🌧️','毛毛雨'],
  61:['🌧️','小雨'],63:['🌧️','中雨'],65:['🌧️','大雨'],
  71:['🌨️','小雪'],73:['🌨️','中雪'],75:['❄️','大雪'],
  80:['🌦️','阵雨'],81:['🌧️','阵雨'],82:['⛈️','强阵雨'],
  95:['⛈️','雷阵雨'],96:['⛈️','雷阵雨'],99:['⛈️','强雷暴'],
};
function weatherInfo(code) { const a = WMO[code] || ['🌡️', '未知']; return { icon: a[0], text: a[1] }; }

let lastAQI = null;   // 四期：缓存空气指数，弹窗里显示

// 四期：城市名 → 经纬度（Open-Meteo 免费地理编码）
async function geocode(name) {
  const url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(name) + '&count=1&language=zh&format=json';
  try {
    const r = await fetch(url); const d = await r.json();
    if (d.results && d.results.length) {
      const res = d.results[0];
      state.weather = { name: res.name, lat: res.latitude, lon: res.longitude }; save();
      loadWeather();
    } else alert('未找到该城市，换个写法试试');
  } catch (e) { alert('城市查询失败（需联网）'); }
}

// 四期：空气指数（Open-Meteo 空气质控，免费免密钥）
async function loadAQI(lat, lon) {
  try {
    const url = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon + '&current=european_aqi';
    const r = await fetch(url); const d = await r.json();
    lastAQI = d.current.european_aqi;
    const el = document.getElementById('wp-aqi');
    if (el) el.textContent = '空气指数 AQI：' + lastAQI;
  } catch (e) {
    const el = document.getElementById('wp-aqi');
    if (el) el.textContent = '空气指数 暂不可用';
  }
}

// 主天气加载：优先用记住的城市；首次且允许定位时尝试定位
async function loadWeather() {
  let lat, lon, name;
  if (state.weather && state.weather.lat) {
    lat = state.weather.lat; lon = state.weather.lon; name = state.weather.name;
  } else {
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
      lat = pos.coords.latitude; lon = pos.coords.longitude; name = '我的位置';
      state.weather = { name, lat, lon }; save();
    } catch (e) {
      lat = 39.9042; lon = 116.4074; name = '北京';
      state.weather = { name, lat, lon }; save();
    }
  }
  // 当前天气 + 未来几天（daily）
  const furl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
    '&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto';
  try {
    const fr = await fetch(furl); const fd = await fr.json();
    const c = fd.current_weather;
    document.getElementById('weather-temp').textContent = Math.round(c.temperature) + '°C';
    const info = weatherInfo(c.weathercode);
    document.getElementById('weather-ico').textContent = info.icon;
    document.getElementById('weather-city').textContent = name + ' · ' + info.text;
    renderWeatherPop(name, fd.daily);
  } catch (e) { document.getElementById('weather-city').textContent = '天气获取失败（需联网）'; }
  loadAQI(lat, lon);
}

// 四期：把多日预报画进天气弹窗（daily 为 null 时只画骨架，用于断网/加载中）
function renderWeatherPop(name, daily) {
  const pop = document.getElementById('weather-pop');
  if (!pop) return;
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const hasData = !!(daily && daily.time && daily.time.length);
  let html = '<div class="wp-head"><span>' + escapeHtml(name || '天气') + '</span>' +
    '<button id="wp-close" class="x-btn">✕</button></div>' +
    '<div class="wp-search"><input id="wp-city" placeholder="切换城市，如 上海" />' +
    '<button id="wp-go">查询</button></div>' +
    '<div class="wp-aqi" id="wp-aqi">' +
      (lastAQI != null ? '空气指数 AQI：' + lastAQI : (hasData ? '空气指数 加载中…' : '天气暂不可用（需联网）')) +
    '</div>' +
    '<div class="wp-days">';
  if (hasData) {
    daily.time.forEach((t, i) => {
      if (i === 0) return;   // 今天已在顶栏，这里从第 2 天起
      const dt = new Date(t); const info = weatherInfo(daily.weathercode[i]);
      html += '<div class="wp-day"><div class="wd">' + days[dt.getDay()] + '</div>' +
        '<div class="wi">' + info.icon + '</div>' +
        '<div class="wt">' + Math.round(daily.temperature_2m_min[i]) + '°/' + Math.round(daily.temperature_2m_max[i]) + '°</div></div>';
    });
  } else {
    html += '<div class="wp-empty">暂时没有预报数据</div>';
  }
  html += '</div>';
  pop.innerHTML = html;
  document.getElementById('wp-close').addEventListener('click', () => pop.classList.remove('open'));
  const go = () => { const v = document.getElementById('wp-city').value.trim(); if (v) geocode(v); };
  document.getElementById('wp-go').addEventListener('click', go);
  document.getElementById('wp-city').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}
// 启动时先画一版骨架，避免断网时点开天气是个空框
function initWeatherPop() { renderWeatherPop((state.weather && state.weather.name) || '天气', null); }

/* ---------- 5. 搜索框：切换引擎 + 算式计算 + 快捷键切引擎 ---------- */
const ENGINES = {
  baidu:    { name: '百度',     url: q => 'https://www.baidu.com/s?wd=' + encodeURIComponent(q) },
  bing:     { name: '必应',     url: q => 'https://www.bing.com/search?q=' + encodeURIComponent(q) },
  google:   { name: 'Google',   url: q => 'https://www.google.com/search?q=' + encodeURIComponent(q) },
  sogou:    { name: '搜狗',     url: q => 'https://www.sogou.com/web?query=' + encodeURIComponent(q) },
  so360:    { name: '360',      url: q => 'https://www.so.com/s?q=' + encodeURIComponent(q) },
  zhihu:    { name: '知乎',     url: q => 'https://www.zhihu.com/search?type=content&q=' + encodeURIComponent(q) },
  weibo:    { name: '微博',     url: q => 'https://s.weibo.com/weibo?q=' + encodeURIComponent(q) },
  bilibili: { name: '哔哩哔哩', url: q => 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(q) },
  github:   { name: 'GitHub',   url: q => 'https://github.com/search?q=' + encodeURIComponent(q) },
  wiki:     { name: '维基百科', url: q => 'https://zh.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(q) },
  taobao:   { name: '淘宝',     url: q => 'https://s.taobao.com/search?q=' + encodeURIComponent(q) },
  youtube:  { name: 'YouTube',  url: q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q) },
};
function updateEngineLabel() { document.getElementById('engine-label').textContent = ENGINES[state.engine].name + ' ▾'; }
function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  if (/^[0-9+\-*/().\s]+$/.test(q) && /[+\-*/]/.test(q)) {       // 纯算式 → 直接算
    try { const r = Function('return (' + q + ')')(); toast('= ' + r); return; } catch (e) {}
  }
  window.open(ENGINES[state.engine].url(q), '_blank');
}
// 四期③：在搜索框聚焦时按 ↑/↓ 循环切换引擎
function cycleEngine(dir) {
  const keys = Object.keys(ENGINES);
  let i = keys.indexOf(state.engine);
  i = (i + dir + keys.length) % keys.length;
  state.engine = keys[i]; save(); updateEngineLabel();
  document.getElementById('engine-menu').querySelectorAll('div').forEach(x => x.classList.toggle('on', x.dataset.key === keys[i]));
  toast('引擎：' + ENGINES[keys[i]].name);
}
function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;left:50%;top:20px;transform:translateX(-50%);padding:10px 18px;border-radius:14px;background:rgba(20,24,40,.85);color:#fff;backdrop-filter:blur(10px);z-index:99;font-size:15px;';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

/* ---------- 6. 网站导航：动态分组 + favicon + 拖拽 ---------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// 生成单个书签（带真实网站图标）
function makeChip(g, b, i) {
  const a = document.createElement('a');
  a.className = 'chip'; a.href = b.url; a.target = '_blank'; a.rel = 'noopener';
  a.draggable = true;
  a.dataset.name = b.name; a.dataset.url = b.url;
  // favicon：用 Google 的图标服务，按域名取；失败则退化为小圆点
  const img = document.createElement('img');
  img.className = 'fav';
  try { img.src = 'https://www.google.com/s2/favicons?domain=' + new URL(b.url).hostname + '&sz=64'; }
  catch (e) { img.src = ''; }
  img.onerror = () => { const d = document.createElement('span'); d.className = 'dot'; img.replaceWith(d); };
  a.appendChild(img);
  const name = document.createElement('span'); name.textContent = b.name; a.appendChild(name);
  const x = document.createElement('span'); x.className = 'x'; x.title = '删除'; x.textContent = '✕';
  x.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); state.bookmarks[g].splice(i, 1); save(); renderGroups(); });
  a.appendChild(x);
  // 书签拖拽排序
  a.addEventListener('dragstart', () => a.classList.add('dragging'));
  a.addEventListener('dragend', () => { a.classList.remove('dragging'); saveBookmarkOrder(g); });
  return a;
}
function renderGroups() {
  const cards = document.getElementById('cards');
  cards.innerHTML = '';
  Object.keys(state.bookmarks).forEach(g => {
    const card = document.createElement('div');
    card.className = 'glass card draggable'; card.dataset.id = g;
    card.innerHTML =
      '<h3><span class="grp-name">' + escapeHtml(g) + '</span>' +
      '<span class="grp-tools">' +
        '<span class="add" data-group="' + g + '" title="添加链接">＋</span>' +
        '<span class="rename" data-group="' + g + '" title="改名">✎</span>' +
        '<span class="del-group" data-group="' + g + '" title="删除分组">🗑</span>' +
      '</span></h3>' +
      '<div class="chips" data-group="' + g + '"></div>';
    cards.appendChild(card);
    const box = card.querySelector('.chips');
    state.bookmarks[g].forEach((b, i) => box.appendChild(makeChip(g, b, i)));
    // 书签区内拖拽
    box.addEventListener('dragover', e => {
      e.preventDefault();
      const dragging = document.querySelector('.chip.dragging'); if (!dragging) return;
      const after = getDragAfterChip(box, e.clientY);
      if (after == null) box.appendChild(dragging); else box.insertBefore(dragging, after);
    });
  });
  refreshDraggables();   // 新生成的分组卡片也要具备拖拽能力
  applyCardOrder();
}
// 拖拽后按 DOM 顺序回写该分组的书签
function saveBookmarkOrder(g) {
  const box = document.querySelector('.chips[data-group="' + g + '"]');
  const arr = [];
  box.querySelectorAll('.chip').forEach(ch => arr.push({ name: ch.dataset.name, url: ch.dataset.url }));
  state.bookmarks[g] = arr; save();
}
function getDragAfterChip(container, y) {
  const els = [...container.querySelectorAll('.chip:not(.dragging)')];
  return els.reduce((closest, child) => {
    const b = child.getBoundingClientRect();
    const o = y - b.top - b.height / 2;
    if (o < 0 && o > closest.offset) return { offset: o, element: child };
    return closest;
  }, { offset: -Infinity, element: null }).element;
}
// 分组：添加链接 / 改名 / 删除
function bindGroupActions() {
  document.getElementById('cards').addEventListener('click', e => {
    const g = e.target.dataset.group;
    if (!g) return;
    if (e.target.classList.contains('add')) {                 // 加链接
      const name = prompt('网站名称：'); if (!name) return;
      let url = prompt('网址（含 http(s)://）：'); if (!url) return;
      if (!/^https?:\/\//.test(url)) url = 'https://' + url;
      state.bookmarks[g].push({ name, url }); save(); renderGroups();
    } else if (e.target.classList.contains('rename')) {       // 改名
      const n = prompt('分组新名称：', g); if (!n) return;
      if (n !== g && !state.bookmarks[n]) {
        state.bookmarks[n] = state.bookmarks[g]; delete state.bookmarks[g];
        state.cardOrder = state.cardOrder.map(id => id === g ? n : id);
        save(); renderGroups();
      }
    } else if (e.target.classList.contains('del-group')) {    // 删除分组
      if (confirm('删除分组“' + g + '”及其所有链接？')) {
        delete state.bookmarks[g];
        state.cardOrder = state.cardOrder.filter(id => id !== g);
        save(); renderGroups();
      }
    }
  });
  // 新增分组
  document.getElementById('btn-add-group').addEventListener('click', () => {
    const n = prompt('新分组名称：'); if (!n) return;
    if (!state.bookmarks[n]) { state.bookmarks[n] = []; state.cardOrder.push(n); save(); renderGroups(); }
  });
}

/* ---------- 7. 待办清单 ---------- */
function renderTodos() {
  const list = document.getElementById('todo-list');
  list.innerHTML = '';
  state.todos.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = '<span class="box ' + (t.done ? 'on' : '') + '"></span>' +
      '<span class="text ' + (t.done ? 'done' : '') + '">' + escapeHtml(t.text) + '</span>' +
      '<span class="del" title="删除">✕</span>';
    const toggle = () => { state.todos[i].done = !state.todos[i].done; save(); renderTodos(); };
    div.querySelector('.box').addEventListener('click', toggle);
    div.querySelector('.text').addEventListener('click', toggle);
    div.querySelector('.del').addEventListener('click', () => { state.todos.splice(i, 1); save(); renderTodos(); });
    list.appendChild(div);
  });
}
function addTodo() {
  const input = document.getElementById('todo-input');
  const text = input.value.trim(); if (!text) return;
  state.todos.push({ text, done: false }); save(); renderTodos(); input.value = '';
}

/* ---------- 8. 每日一句 ---------- */
const QUOTES = [
  '代码是写给人看的，顺便给机器运行。', '小而美的工具，胜过庞大的系统。',
  '今天也要好好对待自己的主页。', '少即是多。', '把时间花在喜欢的事情上。', '保持简单，保持专注。',
];
function showQuote() {
  const i = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % QUOTES.length;
  // 注意：这个元素的 id 是 comp-quote（组件显隐统一用 comp- 前缀），不能写成 quote
  const el = document.getElementById('comp-quote');
  if (el) el.textContent = '“' + QUOTES[i] + '”';
}

/* ---------- 9. 壁纸切换 + 自定义 ---------- */
function bindWallpaper() {
  document.querySelectorAll('.swatch').forEach(sw => {
    const arr = WALLPAPERS[sw.dataset.style];
    if (arr) sw.style.backgroundImage = 'url("' + arr[0] + '")';
    sw.addEventListener('click', () => {
      state.wallpaper.style = sw.dataset.style; state.wallpaper.custom = null;
      save(); applyBackground(); highlightSwatch();
    });
  });
  document.getElementById('btn-wallpaper').addEventListener('click', () => { state.wallpaper.custom = null; save(); applyBackground(); });
  document.getElementById('btn-custom-wall').addEventListener('click', () => {
    const url = prompt('粘贴图片网址（http(s)://…），留空则从本机选择图片文件：');
    if (url && /^https?:\/\//.test(url)) { setCustom(url); return; }
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => setCustom(rd.result); rd.readAsDataURL(f); };
    inp.click();
  });
}
function setCustom(url) { state.wallpaper.style = 'custom'; state.wallpaper.custom = url; save(); applyBackground(); highlightSwatch(); }

/* ---------- 10. 明暗（蒙版浓度）切换 ---------- */
function bindTheme() {
  const btn = document.getElementById('btn-theme');
  btn.addEventListener('click', () => {
    veilIdx = (veilIdx + 1) % VEIL_PRESETS.length;
    state.veil = VEIL_PRESETS[veilIdx]; save(); applyVeil();
    btn.title = '明暗：' + VEIL_LABEL[veilIdx] + '（点击切换）';
  });
}

/* ---------- 11. 卡片自由拖拽（可跨区域：分组卡片 ↔ 待办/便签/环境音） ---------- */
const CARD_ZONES = ['#cards', '.extras'];   // 两个可放置区域

// 让元素可拖拽。用 data-dragbound 打标记，避免重复绑定监听（分组重绘会反复调用）
function makeDraggable(el) {
  if (el.dataset.dragBound) return;
  el.dataset.dragBound = '1';
  el.setAttribute('draggable', 'true');
  el.addEventListener('dragstart', () => el.classList.add('dragging'));
  el.addEventListener('dragend', () => { el.classList.remove('dragging'); saveCardOrder(); });
}
// 每次重绘分组后都要跑一遍，否则新增的分组卡片不具拖拽能力
function refreshDraggables() { document.querySelectorAll('.draggable').forEach(makeDraggable); }

// 按记录的顺序重排容器内的卡片。
// 用 JS 比对 dataset.id 而不是属性选择器，分组名里带引号也不会出错。
function reorderZone(container, order) {
  if (!container || !order) return;
  order.forEach(id => {
    const el = Array.prototype.find.call(container.children, c => c.dataset.id === id);
    if (el) container.appendChild(el);
  });
}
function applyCardOrder() {
  reorderZone(document.getElementById('cards'), state.cardOrder);
  reorderZone(document.querySelector('.extras'), state.extrasOrder);
}
function saveCardOrder() {
  const ids = sel => Array.prototype.map.call(document.querySelectorAll(sel + ' .draggable'), el => el.dataset.id);
  state.cardOrder = ids('#cards');
  state.extrasOrder = ids('.extras');
  save();
}
// 网格是二维的，必须 X、Y 一起判断插入位置（原来只比 Y，多列布局时会插错位置）
function getDragAfter(container, x, y) {
  let closest = null, closestOffset = Infinity;
  container.querySelectorAll('.draggable:not(.dragging)').forEach(child => {
    const b = child.getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    if (x < cx && y < cy) {                        // 指针在元素中心的左上方 → 插到它前面
      const offset = (cx - x) + (cy - y);
      if (offset < closestOffset) { closestOffset = offset; closest = child; }
    }
  });
  return closest;
}
function bindDrag() {
  CARD_ZONES.forEach(sel => {
    const container = document.querySelector(sel);
    if (!container) return;
    container.addEventListener('dragover', e => {
      // 只处理"卡片"拖拽；书签是 .chip.dragging，交给书签自己的逻辑，这里不拦截
      const dragging = document.querySelector('.draggable.dragging');
      if (!dragging) return;
      e.preventDefault();
      const after = getDragAfter(container, e.clientX, e.clientY);
      if (after == null) container.appendChild(dragging); else container.insertBefore(dragging, after);
    });
  });
  refreshDraggables();
  applyCardOrder();
}

/* ---------- 12. 设置中心 ---------- */
function populateEngineSelect() {
  const sel = document.getElementById('set-engine');
  Object.entries(ENGINES).forEach(([k, v]) => {
    const o = document.createElement('option'); o.value = k; o.textContent = v.name; sel.appendChild(o);
  });
}
function applyComponents() {
  Object.keys(state.components).forEach(c => {
    const el = document.getElementById('comp-' + c);
    // 只有明确写成 false 才隐藏；开关缺失/undefined 一律按「显示」处理，
    // 这样即使存档数据不完整，也不会出现组件莫名消失。
    if (el) el.classList.toggle('hidden', state.components[c] === false);
  });
}
function bindSettings() {
  const modal = document.getElementById('settings-modal');
  const open = () => {
    document.getElementById('set-engine').value = state.engine;
    document.getElementById('set-wall').value = state.wallpaper.style === 'custom' ? 'nature' : state.wallpaper.style;
    document.getElementById('set-veil').value = state.veil;
    document.querySelectorAll('#settings-modal input[data-comp]').forEach(cb => { cb.checked = state.components[cb.dataset.comp]; });
    modal.classList.add('open');
  };
  document.getElementById('btn-settings').addEventListener('click', open);
  document.getElementById('set-close').addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  // 引擎
  document.getElementById('set-engine').addEventListener('change', e => { state.engine = e.target.value; save(); updateEngineLabel(); });
  // 壁纸分类
  document.getElementById('set-wall').addEventListener('change', e => { state.wallpaper.style = e.target.value; state.wallpaper.custom = null; save(); applyBackground(); highlightSwatch(); });
  // 蒙版浓度
  document.getElementById('set-veil').addEventListener('input', e => { state.veil = parseFloat(e.target.value); save(); applyVeil(); });
  // 组件显隐
  document.querySelectorAll('#settings-modal input[data-comp]').forEach(cb => {
    cb.addEventListener('change', () => { state.components[cb.dataset.comp] = cb.checked; save(); applyComponents(); });
  });
  // 导出
  document.getElementById('set-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'homepage-backup.json'; a.click();
  });
  // 恢复默认：清空本地存档并重载，页面异常时的一键自救
  document.getElementById('set-reset').addEventListener('click', () => {
    if (confirm('恢复默认设置？分组、待办、便签等本地数据会一并清空（可先导出备份）。')) {
      localStorage.removeItem(KEY); location.reload();
    }
  });
  // 导入
  const file = document.getElementById('import-file');
  document.getElementById('set-import').addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const f = file.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        Object.keys(data).forEach(k => { if (state[k] !== undefined) state[k] = data[k]; });
        save(); location.reload();
      } catch (e) { alert('备份文件格式不正确'); }
    };
    rd.readAsText(f);
  });
}

/* ---------- 13. 四期④：便签 / 环境音 ---------- */
function bindNotes() {
  const ta = document.getElementById('notes-area');
  if (state.notes) ta.value = state.notes;
  ta.addEventListener('input', () => { state.notes = ta.value; save(); });   // 实时保存
  const clear = document.querySelector('#comp-notes .add-todo');
  if (clear) clear.addEventListener('click', () => { if (confirm('清空便签？')) { ta.value = ''; state.notes = ''; save(); } });
}
// 环境音：用 Web Audio 实时生成噪音（无需任何外部文件）
let audioCtx = null, noiseNode = null, noiseGain = null;
function ensureAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function startNoise(type) {
  ensureAudio();
  stopNoise();
  const ctx = audioCtx;
  const size = ctx.sampleRate * 2;                       // 2 秒缓冲，循环播放
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  if (type === 'white') {
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === 'pink') {                          // 粉噪音：更柔和
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < size; i++) { const w = Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926; }
  } else if (type === 'brown') {                         // 棕噪音：更低沉
    let last = 0; for (let i = 0; i < size; i++) { const w = Math.random()*2-1; data[i] = (last + 0.02*w)/1.02; last = data[i]; data[i] *= 3.5; }
  } else if (type === 'rain') {                          // 雨声：白噪音过低通
    for (let i = 0; i < size; i++) data[i] = (Math.random()*2-1) * 0.5;
  }
  noiseNode = ctx.createBufferSource(); noiseNode.buffer = buffer; noiseNode.loop = true;
  const filter = ctx.createBiquadFilter(); filter.type = 'lowpass';
  filter.frequency.value = type === 'rain' ? 1200 : (type === 'brown' ? 800 : 18000);
  noiseGain = ctx.createGain(); noiseGain.gain.value = parseFloat(document.getElementById('amb-vol').value);
  noiseNode.connect(filter); filter.connect(noiseGain); noiseGain.connect(ctx.destination);
  noiseNode.start(0);
}
function stopNoise() { if (noiseNode) { try { noiseNode.stop(); } catch (e) {} noiseNode.disconnect(); noiseNode = null; } }
function bindAmbient() {
  const playBtn = document.getElementById('amb-play');
  const sel = document.getElementById('amb-type');
  const vol = document.getElementById('amb-vol');
  if (state.ambient.type) sel.value = state.ambient.type;
  if (state.ambient.volume != null) vol.value = state.ambient.volume;
  playBtn.addEventListener('click', () => {
    if (noiseNode) { stopNoise(); playBtn.textContent = '▶ 播放'; playBtn.classList.remove('on'); return; }
    const type = sel.value; if (!type) { alert('先选择一种声音'); return; }
    ensureAudio(); if (audioCtx.state === 'suspended') audioCtx.resume();
    startNoise(type); playBtn.textContent = '⏸ 暂停'; playBtn.classList.add('on');
  });
  sel.addEventListener('change', () => { state.ambient.type = sel.value; save(); if (noiseNode) startNoise(sel.value); });
  vol.addEventListener('input', () => { state.ambient.volume = parseFloat(vol.value); save(); if (noiseGain) noiseGain.gain.value = parseFloat(vol.value); });
}

/* ---------- 14. 四期③：键盘快捷键 ---------- */
function closeAll() {
  document.getElementById('engine-menu').classList.remove('open');
  document.getElementById('settings-modal').classList.remove('open');
  document.getElementById('kbd-modal').classList.remove('open');
  document.getElementById('weather-pop').classList.remove('open');
}
function toggleKbd() { document.getElementById('kbd-modal').classList.toggle('open'); }
function bindKeys() {
  document.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (e.key === 'Escape') { closeAll(); return; }      // 任何弹窗都能关
    if (typing) {                                        // 输入框内：仅处理搜索框切引擎
      if (e.target.id === 'search-input' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault(); cycleEngine(e.key === 'ArrowDown' ? 1 : -1);
      }
      return;
    }
    if (e.key === '/') { e.preventDefault(); document.getElementById('search-input').focus(); }
    else if (e.key === 'w' || e.key === 'W') { state.wallpaper.custom = null; save(); applyBackground(); }
    else if (e.key === '?') { toggleKbd(); }
  });
}

/* ---------- 15. 绑定所有交互 ---------- */
function bindEvents() {
  // 搜索引擎菜单
  const menu = document.getElementById('engine-menu');
  Object.entries(ENGINES).forEach(([k, v]) => {
    const d = document.createElement('div');
    d.textContent = v.name; d.dataset.key = k;
    if (k === state.engine) d.classList.add('on');
    d.addEventListener('click', () => {
      state.engine = k; save(); updateEngineLabel(); menu.classList.remove('open');
      menu.querySelectorAll('div').forEach(x => x.classList.remove('on')); d.classList.add('on');
    });
    menu.appendChild(d);
  });
  document.getElementById('engine-label').addEventListener('click', () => menu.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && !document.getElementById('engine-label').contains(e.target)) menu.classList.remove('open');
  });

  // 搜索
  const input = document.getElementById('search-input');
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  document.getElementById('search-go').addEventListener('click', doSearch);

  // 待办
  const todoInput = document.getElementById('todo-input');
  todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
  document.getElementById('todo-add-btn').addEventListener('click', addTodo);
  document.querySelector('.add-todo').addEventListener('click', () => todoInput.focus());

  bindGroupActions();
  bindTheme();
  bindWallpaper();
  bindDrag();
  bindSettings();
  bindNotes();
  bindAmbient();
  bindKeys();

  // 四期④：天气弹窗开关 + 点击外部关闭
  const wp = document.getElementById('weather-pop');
  document.getElementById('comp-weather').addEventListener('click', () => wp.classList.toggle('open'));
  document.addEventListener('click', e => {
    if (wp.classList.contains('open') && !wp.contains(e.target) && !document.getElementById('comp-weather').contains(e.target)) wp.classList.remove('open');
  });
  // 快捷键帮助弹窗关闭
  document.getElementById('kbd-close').addEventListener('click', () => document.getElementById('kbd-modal').classList.remove('open'));
}

/* ---------- 16. 启动 ---------- */
function init() {
  // 每一步单独兜错：任何一步出错只影响它自己，不会让整页变空白
  const steps = [
    populateEngineSelect, renderGroups, renderTodos, updateEngineLabel,
    applyBackground, applyVeil, highlightSwatch, applyComponents, showQuote,
    initWeatherPop, bindEvents,
  ];
  steps.forEach(fn => {
    try { fn(); }
    catch (e) { console.error('[主页] ' + fn.name + ' 执行失败：', e); }
  });
  try { tick(); setInterval(tick, 1000); } catch (e) { console.error(e); }
  loadWeather();          // 内部已有 try/catch，联网失败也不影响其余功能
}
init();
