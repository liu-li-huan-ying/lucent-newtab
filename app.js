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
    theme: 'dark',                                 // 主题：dark 深色（白字） / light 浅色（深字）
    showSeconds: false,                            // 时钟是否显示秒（默认只到分，更安静）
    // 壁纸：style = 分类名 / 'custom' / 'bing'
    // idx 记住每个分类「当前第几张」，保证点同一个分类永远是同一张，不再随机跳变
    wallpaper: { style: 'nature', custom: null, idx: { nature: 0, city: 0, minimal: 0, abstract: 0 } },
    engine: 'bing',                               // 默认搜索引擎（必应）
    engines: {},                                 // 用户自定义引擎：{ key: { name, url(模板字符串，含 {q}) } }
    components: {                                  // 各组件是否显示
      clock: true, weather: true, search: true,
      quote: true, styles: true, todo: true,
      notes: true, ambient: true,                // 四期新增：便签 / 环境音
      pomodoro: true, calendar: true, countdown: true,  // D 系列新组件
    },
    collapsed: {},                                // 工具组件折叠态：{ pomodoro:true, ... }
    pomodoro: { work: 25, break: 5 },             // 番茄钟时长（分钟），仅记设置不记运行态
    events: [],                                    // D3 倒计时/纪念日：[{ name, date:'YYYY-MM-DD' }]
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
    extrasOrder: ['todo', 'notes', 'ambient', 'pomodoro', 'calendar', 'countdown'], // .extras 卡片顺序（含 D 系列新组件）
    todos: [
      { text: '回复客户邮件', done: true },
      { text: '完成主页原型', done: false },
      { text: '整理本周待办', done: false },
    ],
    notes: '',                                    // 四期：便签内容
    ambient: { type: '', volume: 0.5 },           // 四期：环境音设置
    zen: false,                                    // 禅模式：持久化配置——开启后新标签页自动进禅模式，直至主动解除
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
      // 兼容旧存档：wallpaper 是整体覆盖的，旧数据里没有 idx 字段，这里补齐
      d.wallpaper = Object.assign({ style: 'nature', custom: null, idx: {} }, d.wallpaper || {});
      if (!d.wallpaper.idx || typeof d.wallpaper.idx !== 'object') d.wallpaper.idx = {};
    }
  } catch (e) {}
  return d;
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }

let state = load();

/* ---------- 1. 壁纸：真实照片（每类存几张，按记住的位置取，不随机） ---------- */
/* 统一图标出口：id 与 index.html 里的 <symbol> 精灵一一对应。
   全站不再出现 emoji 图标，保证线宽 / 圆角 / 颜色一致。 */
function icon(id, cls) {
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"></use></svg>';
}
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
// 壁纸写进 .wall 层的 CSS 变量，由它统一做降饱和 / 压亮度处理，
// 让照片退为「氛围」而不是跟 UI 抢戏的「噪声」。兜底渐变在 style.css 的 --page-bg，图挂了也不会全黑。
//
// 双层交叉溶解：#wall-a / #wall-b 交替点亮。换图时把新图写进「当前不可见」的那层，
// 淡入后再让旧层退场 —— 取代过去的硬切。首帧直接落位，不播动画。
let wallSlot = 0;         // 当前点亮的是哪层（0 → #wall-a，1 → #wall-b）
let wallPainted = false;
function paintBg(url) {
  const a = document.getElementById('wall-a'), b = document.getElementById('wall-b');
  const img = 'url("' + url + '")';
  if (!wallPainted) {                       // 首帧：直接点亮 A 层
    a.style.setProperty('--wall-url', img);
    a.style.opacity = '1';
    wallPainted = true;
    return;
  }
  const incoming = wallSlot === 0 ? b : a;
  const outgoing = wallSlot === 0 ? a : b;
  incoming.style.setProperty('--wall-url', img);
  incoming.style.transition = 'none';       // 先把新层归到起点（避免带出上一轮过渡）
  incoming.style.opacity = '0';
  incoming.style.transform = 'scale(1.03)';
  void incoming.offsetHeight;               // 强制重排，让起点生效
  incoming.style.transition = '';           // 交还给 CSS 的溶解过渡
  incoming.style.opacity = '1';
  incoming.style.transform = 'scale(1)';
  setTimeout(() => { outgoing.style.opacity = '0'; }, 700);   // 新图盖住后再收旧层
  wallSlot = 1 - wallSlot;
}
const WALL_LABEL = { nature: '自然', city: '城市', minimal: '极简', abstract: '抽象' };

// 取「当前分类 + 记住的位置」那张图。确定性：同一个分类每次都返回同一张。
function pickOf(style) {
  const key = WALLPAPERS[style] ? style : 'nature';
  const arr = WALLPAPERS[key];
  let i = (state.wallpaper.idx || {})[key] || 0;
  if (i >= arr.length) i = 0;          // 存档下标越界（比如图删减过）时归零，避免取到 undefined
  return arr[i];
}
// 让色块缩略图显示「该分类当前这张」，做到缩略图所见 = 背景所得
function syncSwatchThumb(style) {
  const sw = document.querySelector('.swatch[data-style="' + style + '"]');
  if (!sw) return;
  const arr = WALLPAPERS[style];
  if (!arr) return;                    // 必应色块由 loadBingWallpaper 自己更新
  let i = (state.wallpaper.idx || {})[style] || 0;
  if (i >= arr.length) i = 0;
  sw.style.backgroundImage = 'url("' + arr[i] + '")';
  sw.title = WALL_LABEL[style] + '（第 ' + (i + 1) + '/' + arr.length + ' 张，按 W 或 🎲 换一张）';
}
// 显式「换一张」：位置 +1 循环。只有这个动作（🎲 按钮 / W 键）会换图，点分类色块不会。
function nextWallpaper() {
  const style = state.wallpaper.style;
  if (style === 'bing')   { toast('必应每日壁纸每天自动更新，无需手动换'); return; }
  if (style === 'custom') { toast('当前用的是自定义图片，换一张请先选个分类'); return; }
  const key = WALLPAPERS[style] ? style : 'nature';
  const arr = WALLPAPERS[key];
  state.wallpaper.idx = state.wallpaper.idx || {};
  state.wallpaper.idx[key] = ((state.wallpaper.idx[key] || 0) + 1) % arr.length;
  save(); applyBackground();
  toast(WALL_LABEL[key] + ' 第 ' + (state.wallpaper.idx[key] + 1) + '/' + arr.length + ' 张');
}

/* 必应每日壁纸：官方接口，按日期缓存一天，取不到就返回 null 交给调用方兜底。
   注意：作为浏览器扩展运行时可跨域；用本地 http 预览时会被 CORS 拦截，
   这是正常现象 —— 代码会自动回退到分类壁纸，装成扩展后就正常了。 */
const BING_CACHE_KEY = 'lucent-bing-cache';
async function loadBingWallpaper() {
  try {
    const cached = JSON.parse(localStorage.getItem(BING_CACHE_KEY) || 'null');
    const today = new Date().toDateString();
    if (cached && cached.date === today && cached.url) return cached.url;   // 当天已取过，直接用
    const r = await fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN');
    const d = await r.json();
    const img = d && d.images && d.images[0];
    if (!img || !img.url) return null;
    const url = img.url.startsWith('http') ? img.url : 'https://www.bing.com' + img.url;
    localStorage.setItem(BING_CACHE_KEY, JSON.stringify({ date: today, url, copyright: img.copyright || '' }));
    return url;
  } catch (e) { return null; }
}

async function applyBackground() {
  let url;
  if (state.wallpaper.style === 'custom' && state.wallpaper.custom) {
    url = state.wallpaper.custom;
  } else if (state.wallpaper.style === 'bing') {
    url = await loadBingWallpaper();
    if (url) {
      const sw = document.querySelector('.swatch[data-style="bing"]');   // 顺手把缩略图换成当日图
      if (sw) sw.style.backgroundImage = 'url("' + url + '")';
    } else {
      url = pickOf('nature');                     // 取不到就回退，绝不留白屏
      toast('必应壁纸没取到，先用了其他壁纸');
    }
  } else {
    url = pickOf(state.wallpaper.style);
    syncSwatchThumb(state.wallpaper.style);       // 缩略图与背景始终保持一致
  }
  paintBg(url);
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

/* 主题：深色是默认（CSS 里 :root 的默认值）；
   切到浅色时给 body 加 data-theme="light"，配色由 CSS 变量整体翻转。 */
function applyTheme() {
  document.body.dataset.theme = state.theme === 'light' ? 'light' : 'dark';
}
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  save(); applyTheme();
  toast('主题：' + (state.theme === 'light' ? '浅色' : '深色'));
}

/* 禅模式（Zen）：只留时钟 + 搜索，其余柔和淡出；再按恢复。
   不申请任何权限、不弹窗，是「打开即专注」的极简形态。 */
function toggleZen() {
  const on = document.body.classList.toggle('zen');
  const btn = document.getElementById('btn-zen');
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  state.zen = on; save();              // 持久化：首次开启后，之后新开的标签页也直接进禅模式
  if (sbxRefresh) sbxRefresh();        // 禅模式无滚动：让自绘滚动条立刻重新评估（随即隐去）
  if (on) {   // 进入时收掉所有浮层，并把视野平滑带回顶部（避免从滚动位置硬跳）
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelectorAll('.modal-mask.open, .weather-pop.open').forEach(m => animateOut(m));
  }
}
// 初始化时按持久状态恢复禅模式（不动画、不开/关浮层，避免首屏闪烁）
function applyZen() {
  if (!state.zen) return;
  document.body.classList.add('zen');
  document.getElementById('btn-zen').setAttribute('aria-pressed', 'true');
}
function bindZen() {
  document.getElementById('btn-zen').addEventListener('click', toggleZen);
}

/* ---------- 3. 时钟 ---------- */
function tick() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = state.showSeconds ? ':' + String(d.getSeconds()).padStart(2, '0') : '';
  document.getElementById('clock-time').textContent = hh + ':' + mm + ss;
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  document.getElementById('clock-date').textContent =
    days[d.getDay()] + ' · ' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
}

/* ---------- 4. 天气（Open-Meteo，免费免密钥，需联网） ---------- */
/* 值改存 symbol 名（见 index.html 的 i-w-*），由 weatherIconHtml 渲染成线性图标；
   彩色 emoji 会破坏整体质感，也压不住主题色。 */
const WMO = {
  0:['sun','晴'],1:['cloud-sun','大致晴朗'],2:['cloud-sun','局部多云'],3:['cloud','阴'],
  45:['fog','雾'],48:['fog','雾'],
  51:['rain','小毛毛雨'],53:['rain','毛毛雨'],55:['rain','毛毛雨'],
  61:['rain','小雨'],63:['rain','中雨'],65:['rain','大雨'],
  71:['snow','小雪'],73:['snow','中雪'],75:['snow','大雪'],
  80:['rain','阵雨'],81:['rain','阵雨'],82:['thunder','强阵雨'],
  95:['thunder','雷阵雨'],96:['thunder','雷阵雨'],99:['thunder','强雷暴'],
};
function weatherInfo(code) { const a = WMO[code] || ['thermo', '未知']; return { icon: a[0], text: a[1] }; }
function weatherIconHtml(name) { return icon('i-w-' + name); }

let lastAQI = null;   // 四期：缓存空气指数，弹窗里显示

/* ---------- IP 定位 ----------
   navigator.geolocation 会弹权限框，在扩展页 / 本地文件里还经常直接失败，
   所以改成按出口 IP 定位：不用授权，打开新标签页就是本地天气。
   多家免费服务依次尝试——任何一家抽风或不可达都自动换下一家。
   有的服务只给城市名（没有经纬度），这时交给地理编码补坐标。 */
const IP_GEO_PROVIDERS = [
  { url: 'https://ipwho.is/',
    pick: d => d && d.success !== false && d.latitude != null && { name: d.city || d.region, lat: d.latitude, lon: d.longitude } },
  { url: 'https://ipapi.co/json/',
    pick: d => d && d.latitude != null && { name: d.city || d.region, lat: d.latitude, lon: d.longitude } },
  { url: 'https://api.ip.sb/geoip',
    pick: d => d && d.latitude != null && { name: d.city || d.region, lat: d.latitude, lon: d.longitude } },
  { url: 'https://ip.useragentinfo.com/json',
    pick: d => d && (d.city || d.province) && { name: d.city || d.province } },   // 只给城市名，坐标另查
];

// 带超时的 JSON 请求：某个服务无响应时直接放弃，不让天气一直转圈
async function fetchJSON(url, ms) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms || 6000);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}

async function geoFromIP() {
  for (const p of IP_GEO_PROVIDERS) {
    try {
      const loc = p.pick(await fetchJSON(p.url, 4500));   // 单家最多等 4.5s
      if (!loc || !loc.name) continue;
      // IP 库给的城市名多是英文（Anyang），过一遍地理编码换成中文（安阳）。
      // 坐标仍以 IP 库为准——那是「设备实际在哪」，地理编码只是拿名字。
      const zh = await lookupCity(loc.name);
      if (loc.lat != null) return { name: zh ? zh.name : loc.name, lat: loc.lat, lon: loc.lon };
      if (zh) return zh;                                    // 只拿到城市名的那种，只能用地理编码的坐标
      continue;
    } catch (e) { /* 静默换下一家 */ }
  }
  return null;
}

//「安阳市」→「安阳」：天气标签上挂行政后缀显得笨重（只在保留 ≥2 字时才裁）
function shortCity(n) {
  const s = String(n || '').trim();
  return s.length > 2 && /[市省]$/.test(s) ? s.slice(0, -1) : s;
}

// 城市名 → 经纬度（Open-Meteo 免费地理编码）；查不到返回 null，由调用方决定怎么表达
async function lookupCity(name) {
  try {
    const url = 'https://geocoding-api.open-meteo.com/v1/search?name=' +
      encodeURIComponent(name) + '&count=1&language=zh&format=json';
    const d = await fetchJSON(url, 6000);
    if (d.results && d.results.length) {
      const c = d.results[0];
      return { name: shortCity(c.name), lat: c.latitude, lon: c.longitude };
    }
  } catch (e) {}
  return null;
}

// 弹窗里的状态提示行（查询中 / 查不到 / 已切换），默认空着不占视觉
function setWeatherStatus(msg, kind) {
  const el = document.getElementById('wp-city-status');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('bad', kind === 'bad');
}

// 天气弹窗里的城市搜索：结果就地反馈，不再用 alert 打断整页
async function geocode(name) {
  const go = document.getElementById('wp-go');
  setWeatherStatus('查询中…');
  if (go) go.disabled = true;
  const c = await lookupCity(name);
  if (go) go.disabled = false;
  if (!c) { setWeatherStatus('没找到「' + name + '」，换个写法试试', 'bad'); return; }
  state.weather = { name: c.name, lat: c.lat, lon: c.lon, manual: true };
  save();
  await loadWeather();            // 先重画（会清空状态行），再把结果写回去
  setWeatherStatus('已切换到 ' + c.name + '（不再跟随网络位置）');
}

// 改回自动定位：抹掉手选标记和缓存，下次重新按出口 IP 定位
function useAutoLocation() {
  if (state.weather) { delete state.weather.manual; delete state.weather.geoAt; }
  setWeatherStatus('正在按网络位置重新定位…');
  loadWeather().then(() => setWeatherStatus('已改回自动定位'));
}

/* 当前定位：用户手选的城市永远优先；否则按 IP 定位，结果缓存 12 小时
   （IP 不常变，没必要每开一个新标签就请求一次）。 */
const GEO_TTL = 12 * 3600 * 1000;
const GEO_FAIL_TTL = 10 * 60 * 1000;   // 定位失败只记 10 分钟，网一恢复就能自己改回来
const GEO_V = 2;      // 定位管线版本：升一版就让旧缓存失效（v1 的缓存里存的是英文城市名）
async function resolveLocation() {
  const w = state.weather;
  if (w && w.manual && w.lat) return w;                            // 手选优先，永不被覆盖
  // 缓存未过期（且是当前管线版本）才复用；上次失败的话只等很短一会儿
  if (w && w.lat && w.geoV === GEO_V && w.geoAt &&
      Date.now() - w.geoAt < (w.fallback ? GEO_FAIL_TTL : GEO_TTL)) return w;
  const loc = await geoFromIP();
  state.weather = loc
    ? { name: loc.name, lat: loc.lat, lon: loc.lon, manual: false, geoAt: Date.now(), geoV: GEO_V }
    : { name: '北京', lat: 39.9042, lon: 116.4074, manual: false, geoAt: Date.now(), geoV: GEO_V, fallback: true };
  save();
  return state.weather;
}

// 四期：空气指数（Open-Meteo 空气质控，免费免密钥）
async function loadAQI(lat, lon) {
  try {
    const url = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lon + '&current=european_aqi';
    const d = await fetchJSON(url, 8000);
    lastAQI = d.current.european_aqi;
    const el = document.getElementById('wp-aqi');
    if (el) el.textContent = '空气指数 AQI：' + lastAQI;
  } catch (e) {
    const el = document.getElementById('wp-aqi');
    if (el) el.textContent = '空气指数 暂不可用';
  }
}

// 主天气加载：先定位置（手选 > IP > 北京），再取当前天气 + 未来几天
async function loadWeather() {
  const loc = await resolveLocation();
  const lat = loc.lat, lon = loc.lon, name = loc.name;
  const cityEl = document.getElementById('weather-city');
  // 当前天气 + 未来几天（daily）
  const furl = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
    '&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto';
  try {
    const fd = await fetchJSON(furl, 8000);
    const c = fd.current_weather;
    document.getElementById('weather-temp').textContent = Math.round(c.temperature) + '°C';
    const info = weatherInfo(c.weathercode);
    document.getElementById('weather-ico').innerHTML = weatherIconHtml(info.icon);
    // 「定位失败」必须留下来，否则用户只看到「北京」，无从知道这不是他的位置
    cityEl.textContent = (loc.fallback ? '定位失败 · ' : '') + name + ' · ' + info.text;
    renderWeatherPop(name, fd.daily);
  } catch (e) { cityEl.textContent = '天气获取失败（需联网）'; }
  loadAQI(lat, lon);
}

// 四期：把多日预报画进天气弹窗（daily 为 null 时只画骨架，用于断网/加载中）
function renderWeatherPop(name, daily) {
  const pop = document.getElementById('weather-pop');
  if (!pop) return;
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const hasData = !!(daily && daily.time && daily.time.length);
  // 手选过城市才给「自动定位」出口，否则用户一旦切错就回不去了
  const manual = !!(state.weather && state.weather.manual);
  let html = '<div class="wp-head"><span>' + escapeHtml(name || '天气') + '</span>' +
    '<span class="wp-tools">' +
      (manual ? '<button id="wp-auto" class="wp-auto" title="改回按网络位置自动定位">' +
        icon('i-locate', 'ic-sm') + '自动定位</button>' : '') +
      '<button id="wp-close" class="x-btn" aria-label="关闭天气详情">' + icon('i-close') + '</button>' +
    '</span></div>' +
    '<div class="wp-search"><input id="wp-city" aria-label="切换城市" placeholder="切换城市，如 上海" />' +
    '<button id="wp-go">查询</button></div>' +
    '<div class="wp-status" id="wp-city-status"></div>' +
    '<div class="wp-aqi" id="wp-aqi">' +
      (lastAQI != null ? '空气指数 AQI：' + lastAQI : (hasData ? '空气指数 加载中…' : '天气暂不可用（需联网）')) +
    '</div>' +
    '<div class="wp-days">';
  if (hasData) {
    daily.time.forEach((t, i) => {
      if (i === 0) return;   // 今天已在顶栏，这里从第 2 天起
      const dt = new Date(t); const info = weatherInfo(daily.weathercode[i]);
      html += '<div class="wp-day"><div class="wd">' + days[dt.getDay()] + '</div>' +
        '<div class="wi">' + weatherIconHtml(info.icon) + '</div>' +
        '<div class="wt">' + Math.round(daily.temperature_2m_min[i]) + '°/' + Math.round(daily.temperature_2m_max[i]) + '°</div></div>';
    });
  } else {
    html += '<div class="wp-empty">暂时没有预报数据</div>';
  }
  html += '</div>';
  pop.innerHTML = html;
  document.getElementById('wp-close').addEventListener('click', () => animateOut(pop));
  const auto = document.getElementById('wp-auto');
  if (auto) auto.addEventListener('click', useAutoLocation);
  const go = () => { const v = document.getElementById('wp-city').value.trim(); if (v) geocode(v); };
  document.getElementById('wp-go').addEventListener('click', go);
  document.getElementById('wp-city').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
}
// 启动时先画一版骨架，避免断网时点开天气是个空框
function initWeatherPop() { renderWeatherPop((state.weather && state.weather.name) || '天气', null); }

/* ---------- 5. 搜索框：切换引擎 + 算式计算 + 快捷键切引擎 ---------- */
// 内置引擎（只读，不可删）。注意：自定义引擎存到 state.engines，二者合并后才是完整列表。
const DEFAULT_ENGINES = {
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
// 合并「内置 + 用户自定义」，返回 { key: { name, url } }；自定义引擎的 url 是带 {q} 的模板字符串
function allEngines() { return Object.assign({}, DEFAULT_ENGINES, state.engines || {}); }
// 统一取搜索链接：内置是函数，自定义是字符串模板（把 {q} 替换为编码后的查询词）
function engineUrl(key, q) {
  const e = allEngines()[key]; if (!e) return null;
  if (typeof e.url === 'function') return e.url(q);
  return e.url.replace(/\{q\}/g, encodeURIComponent(q));
}
// 更新当前引擎名，并让名字下的「墨痕」重画一次。
// 首帧不闪（只画静态墨痕），只有真正切换引擎时才播那一下展开。
let engineLabelReady = false;
function updateEngineLabel() {
  const el = document.getElementById('engine-label');
  el.querySelector('.eng-txt').textContent = allEngines()[state.engine].name;
  if (engineLabelReady) { el.classList.remove('mark'); void el.offsetWidth; el.classList.add('mark'); }
  engineLabelReady = true;
}
function doSearch() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  if (/^[0-9+\-*/().\s]+$/.test(q) && /[+\-*/]/.test(q)) {       // 纯算式 → 直接算
    try { const r = Function('return (' + q + ')')(); toast('= ' + r); return; } catch (e) {}
  }
  const url = engineUrl(state.engine, q);
  if (url) window.open(url, '_blank');
}
// 四期③：在搜索框聚焦时按 ↑/↓ 循环切换引擎
function cycleEngine(dir) {
  const keys = Object.keys(allEngines());
  let i = keys.indexOf(state.engine);
  if (i < 0) i = 0;
  i = (i + dir + keys.length) % keys.length;
  state.engine = keys[i]; save(); updateEngineLabel();
  document.getElementById('engine-menu').querySelectorAll('div').forEach(x => x.classList.toggle('on', x.dataset.key === keys[i]));
  toast('引擎：' + allEngines()[keys[i]].name);
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

/* ---------- 通用对话框：替代 prompt / confirm ----------
   原生弹窗被浏览器钉在窗口顶部、样式完全不可控，和整页质感割裂，
   而且一次只能问一个问题（加链接要弹两次）。这里统一走居中的玻璃面板：
   字段是结构化表单，必填项原地报错，危险操作用红色主按钮。

   用法：
     const v = await openDialog({ title, desc, icon, fields:[...], okText, danger });
       v 为 { 字段名: 值 }，取消则为 null
     const ok = await confirmDialog({ title, desc, okText, danger });
   desc 走 innerHTML（便于加粗关键词），调用方自行转义插值。
-------------------------------------------------------------- */
/* 统一「柔和退场」：加 .closing 播退场动画，动画结束（或兜底 360ms）再摘掉 .open。
   设置 / 快捷键 / 通用对话框 / 天气弹窗都走它 —— 弹层不再「啪一下消失」。 */
function animateOut(el) {
  if (!el || !el.classList.contains('open') || el.classList.contains('closing')) return;
  el.classList.add('closing');
  const done = () => { el.classList.remove('open', 'closing'); el.removeEventListener('animationend', done); };
  el.addEventListener('animationend', done);
  setTimeout(done, 360);      // 兜底：极端情况下 animationend 没触发也能收干净
}
/* 与 animateOut 配对：开之前先清掉残留的 .closing，保证「刚关又开」也能正常播入场动效 */
function openFloat(el) { el.classList.remove('closing'); el.classList.add('open'); }

function openDialog(opt) {
  const mask = document.getElementById('dialog-modal');
  const box = document.getElementById('dialog-box');
  const fields = opt.fields || [];
  const danger = !!opt.danger;
  const prevFocus = document.activeElement;

  box.className = 'glass modal dialog' + (danger ? ' is-danger' : '');
  box.innerHTML =
    '<div class="dlg-head">' +
      icon(danger ? 'i-alert' : (opt.icon || 'i-link')) +
      '<h2 id="dialog-title">' + escapeHtml(opt.title || '') + '</h2>' +
      '<button class="x-btn" data-act="cancel" aria-label="关闭">' + icon('i-close') + '</button>' +
    '</div>' +
    (opt.desc ? '<p class="dlg-desc">' + opt.desc + '</p>' : '') +
    (fields.length
      ? '<div class="dlg-fields">' + fields.map(f =>
          '<label class="dlg-field" data-key="' + f.key + '">' +
            '<span>' + escapeHtml(f.label) + '</span>' +
            '<input type="' + (f.type || 'text') + '" data-key="' + f.key + '" ' +
              'value="' + escapeHtml(f.value || '') + '" ' +
              'placeholder="' + escapeHtml(f.placeholder || '') + '" ' +
              'autocomplete="off" spellcheck="false" />' +
            '<em class="dlg-err"></em>' +
          '</label>').join('') + '</div>'
      : '') +
    '<div class="dlg-foot">' +
      (opt.footLeft || '') +
      '<button data-act="cancel">取消</button>' +
      '<button class="' + (danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok">' +
        escapeHtml(opt.okText || '确定') + '</button>' +
    '</div>';

  const inputs = [...box.querySelectorAll('input[data-key]')];
  const onMaskDown = e => { if (e.target === mask) finish(null); };

  function finish(result) {
    animateOut(mask);
    document.removeEventListener('keydown', onKey, true);
    mask.removeEventListener('mousedown', onMaskDown);
    if (prevFocus && prevFocus.focus) prevFocus.focus();   // 还原焦点，键盘用户不迷路
    resolve(result);
  }

  // 校验：必填为空或自定义规则不过，就地标红并把焦点送过去
  function submit() {
    const vals = {};
    inputs.forEach(i => { vals[i.dataset.key] = i.value.trim(); });
    let firstBad = null;
    fields.forEach(f => {
      const wrap = box.querySelector('.dlg-field[data-key="' + f.key + '"]');
      let msg = '';
      if (f.required && !vals[f.key]) msg = '这一项不能为空';
      else if (f.validate) msg = f.validate(vals[f.key], vals) || '';
      wrap.classList.toggle('bad', !!msg);
      wrap.querySelector('.dlg-err').textContent = msg;
      if (msg && !firstBad) firstBad = wrap.querySelector('input');
    });
    if (firstBad) { firstBad.focus(); return; }
    finish(vals);
  }

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(null); return; }
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); submit(); return; }
    if (e.key === 'Tab') {                    // 焦点锁在面板内，不跑到背后的页面上
      const f = [...box.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  let resolve;
  const p = new Promise(res => { resolve = res; });

  box.querySelectorAll('[data-act]').forEach(b => {
    b.addEventListener('click', () => {
      const act = b.dataset.act;
      if (act === 'ok') submit();
      else if (act === 'cancel') finish(null);
      else if (opt.onAction) opt.onAction(act, finish);   // 自定义动作，由调用方决定关不关
    });
  });
  mask.addEventListener('mousedown', onMaskDown);
  document.addEventListener('keydown', onKey, true);   // 捕获阶段：先于全局 Esc / 快捷键
  openFloat(mask);

  const auto = inputs.find(i => !i.value) || inputs[0];
  setTimeout(() => {
    if (auto) { auto.focus(); if (auto.select) auto.select(); }
    else box.querySelector('[data-act="ok"]').focus();
  }, 30);
  return p;
}

function confirmDialog(opt) {
  return openDialog(Object.assign({ icon: 'i-alert', okText: '确定' }, opt))
    .then(v => v !== null);
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
  const x = document.createElement('span'); x.className = 'x'; x.title = '删除'; x.innerHTML = icon('i-close', 'ic-sm');
  x.setAttribute('role', 'button'); x.setAttribute('tabindex', '0'); x.setAttribute('aria-label', '删除书签 ' + b.name); keyActivate(x);
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
    card.className = 'panel card draggable'; card.dataset.id = g;
    card.innerHTML =
      '<h3><span class="grp-name">' + escapeHtml(g) + '</span>' +
      '<span class="grp-tools">' +
        '<span class="add" data-group="' + g + '" title="添加链接">' + icon('i-plus', 'ic-sm') + '</span>' +
        '<span class="rename" data-group="' + g + '" title="改名">' + icon('i-pencil', 'ic-sm') + '</span>' +
        '<span class="del-group" data-group="' + g + '" title="删除分组">' + icon('i-trash', 'ic-sm') + '</span>' +
      '</span></h3>' +
      '<div class="chips" data-group="' + g + '"></div>';
    cards.appendChild(card);
    card.querySelectorAll('.grp-tools span').forEach(s => {
      s.setAttribute('role', 'button'); s.setAttribute('tabindex', '0');
      const lbl = s.classList.contains('add') ? '添加链接' : s.classList.contains('rename') ? '重命名分组' : '删除分组';
      s.setAttribute('aria-label', lbl); keyActivate(s);
    });
    const box = card.querySelector('.chips');
    if (state.bookmarks[g].length) {
      state.bookmarks[g].forEach((b, i) => box.appendChild(makeChip(g, b, i)));
    } else {
      box.innerHTML = '<span class="tip empty-hint">还没有链接，点 ＋ 添加</span>';
    }
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
  assignHotkeys();       // 给前 9 个书签分配数字快捷跳转键
}
// C2：给书签分配 1-9 快捷数字（按 DOM 顺序），并在角标显示；超过 9 个不再分配
function assignHotkeys() {
  const chips = [...document.querySelectorAll('.chip')];
  chips.forEach((chip, i) => {
    const old = chip.querySelector(':scope > .hot'); if (old) old.remove();
    if (i < 9) {
      chip.dataset.hot = String(i + 1);
      const b = document.createElement('span'); b.className = 'hot'; b.textContent = i + 1;
      chip.insertBefore(b, chip.firstChild);
    } else { delete chip.dataset.hot; }
  });
}
// 按下数字键时，直接打开对应书签
function jumpToBookmark(n) {
  const chip = document.querySelector('.chip[data-hot="' + n + '"]');
  if (chip && chip.dataset.url) window.open(chip.dataset.url, '_blank');
}
// 拖拽后按 DOM 顺序回写该分组的书签
function saveBookmarkOrder(g) {
  const box = document.querySelector('.chips[data-group="' + g + '"]');
  const arr = [];
  box.querySelectorAll('.chip').forEach(ch => arr.push({ name: ch.dataset.name, url: ch.dataset.url }));
  state.bookmarks[g] = arr; save(); assignHotkeys();
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
      openDialog({
        title: '添加链接', icon: 'i-link',
        fields: [
          { key: 'name', label: '名称', placeholder: '如 GitHub', required: true },
          { key: 'url', label: '网址', placeholder: 'https://github.com', required: true,
            validate: v => /\s/.test(v) ? '网址里不能有空格' : '' },
        ],
        okText: '添加',
      }).then(v => {
        if (!v) return;
        const url = /^https?:\/\//i.test(v.url) ? v.url : 'https://' + v.url;
        state.bookmarks[g].push({ name: v.name, url }); save(); renderGroups();
      });
    } else if (e.target.classList.contains('rename')) {       // 改名
      openDialog({
        title: '重命名分组', icon: 'i-pencil',
        fields: [{ key: 'name', label: '分组名称', value: g, required: true,
          validate: v => (v !== g && state.bookmarks[v]) ? '已经有同名分组了' : '' }],
        okText: '保存',
      }).then(v => {
        if (!v || v.name === g) return;
        state.bookmarks[v.name] = state.bookmarks[g]; delete state.bookmarks[g];
        state.cardOrder = state.cardOrder.map(id => id === g ? v.name : id);
        save(); renderGroups();
      });
    } else if (e.target.classList.contains('del-group')) {    // 删除分组
      confirmDialog({
        title: '删除分组',
        desc: '将删除 <strong>' + escapeHtml(g) + '</strong> 及其中的 ' +
              state.bookmarks[g].length + ' 个链接，无法撤销。',
        okText: '删除', danger: true,
      }).then(ok => {
        if (!ok) return;
        delete state.bookmarks[g];
        state.cardOrder = state.cardOrder.filter(id => id !== g);
        save(); renderGroups();
      });
    }
  });
  // 新增分组
  document.getElementById('btn-add-group').addEventListener('click', () => {
    openDialog({
      title: '新建分组', icon: 'i-plus',
      fields: [{ key: 'name', label: '分组名称', placeholder: '如 工作', required: true,
        validate: v => state.bookmarks[v] ? '已经有同名分组了' : '' }],
      okText: '创建',
    }).then(v => {
      if (!v) return;
      state.bookmarks[v.name] = []; state.cardOrder.push(v.name); save(); renderGroups();
    });
  });
}

/* ---------- 7. 待办清单 ---------- */
function renderTodos() {
  const list = document.getElementById('todo-list');
  list.innerHTML = '';
  if (!state.todos.length) { list.innerHTML = '<p class="tip empty-hint">还没有待办，添加一件小事吧 ✦</p>'; return; }
  state.todos.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = '<span class="box ' + (t.done ? 'on' : '') + '"></span>' +
      '<span class="text ' + (t.done ? 'done' : '') + '">' + escapeHtml(t.text) + '</span>' +
      '<span class="del" role="button" tabindex="0" title="删除" aria-label="删除待办">' + icon('i-close', 'ic-sm') + '</span>';
    const toggle = () => { state.todos[i].done = !state.todos[i].done; save(); renderTodos(); };
    div.querySelector('.box').addEventListener('click', toggle);
    div.querySelector('.text').addEventListener('click', toggle);
    const del = div.querySelector('.del');
    del.addEventListener('click', () => { state.todos.splice(i, 1); save(); renderTodos(); });
    keyActivate(del);
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
    syncSwatchThumb(sw.dataset.style);          // 缩略图显示该分类「当前这张」，不再固定第一张
    sw.addEventListener('click', () => {
      state.wallpaper.style = sw.dataset.style; state.wallpaper.custom = null;
      save(); applyBackground(); highlightSwatch();
    });
    keyActivate(sw);
  });
  // 必应缩略图：今天已取过就直接显示，避免第一眼是个空白蓝块
  try {
    const c = JSON.parse(localStorage.getItem(BING_CACHE_KEY) || 'null');
    const bingSw = document.querySelector('.swatch[data-style="bing"]');
    if (bingSw && c && c.date === new Date().toDateString() && c.url) bingSw.style.backgroundImage = 'url("' + c.url + '")';
  } catch (e) {}
  document.getElementById('btn-wallpaper').addEventListener('click', nextWallpaper);
  document.getElementById('btn-custom-wall').addEventListener('click', () => {
    openDialog({
      title: '自定义壁纸', icon: 'i-image',
      desc: '粘贴图片网址，或从本机选一张（本地图片会读成 dataURL 存在浏览器里，不联网）。',
      fields: [{ key: 'url', label: '图片网址', placeholder: 'https://…（留空则改用本机图片）' }],
      footLeft: '<button class="push" data-act="file">' + icon('i-image', 'ic-sm') + '从本机选择</button>',
      okText: '使用该网址',
      onAction: (act, close) => { if (act === 'file') { close(null); pickLocalImage(); } },
    }).then(v => {
      if (!v || !v.url) return;
      if (!/^https?:\/\//i.test(v.url)) { toast('图片地址要以 http(s):// 开头'); return; }
      setCustom(v.url);
    });
  });
}
// 从本机选图：读成 dataURL 直接存本地，不经过任何服务
function pickLocalImage() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    if (f.size > 4 * 1024 * 1024) toast('图片超过 4MB，可能存不下（本地存储有限）');
    const rd = new FileReader();
    rd.onload = () => setCustom(rd.result);
    rd.readAsDataURL(f);
  };
  inp.click();
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
  sel.innerHTML = '';
  Object.entries(allEngines()).forEach(([k, v]) => {
    const o = document.createElement('option'); o.value = k; o.textContent = v.name; sel.appendChild(o);
  });
}
// 自定义引擎管理：渲染列表 + 绑定增删。改动后刷新下拉/菜单/标签。
function renderEngineManager() {
  const box = document.getElementById('engine-list');
  if (!box) return;
  box.innerHTML = '';
  const custom = state.engines || {};
  const keys = Object.keys(custom);
  if (!keys.length) { box.innerHTML = '<p class="tip">暂无自定义引擎</p>'; return; }
  keys.forEach(k => {
    const e = custom[k];
    const row = document.createElement('div'); row.className = 'eng-item';
    row.innerHTML = '<span class="eng-name"></span><button class="eng-del" title="删除" aria-label="删除搜索引擎">' + icon('i-close', 'ic-sm') + '</button>';
    row.querySelector('.eng-name').textContent = e.name + '（' + k + '）';
    row.querySelector('.eng-del').addEventListener('click', () => {
      delete state.engines[k];
      if (state.engine === k) state.engine = 'bing';   // 删掉正在用的，回退到必应
      save(); renderEngineManager(); refreshEngines();
    });
    box.appendChild(row);
  });
}
// 改完引擎相关设置后，统一重建：下拉、搜索框菜单、当前标签
function refreshEngines() {
  populateEngineSelect();
  const sel = document.getElementById('set-engine'); if (sel) sel.value = state.engine;
  // 重建搜索框菜单
  const menu = document.getElementById('engine-menu'); menu.innerHTML = '';
  Object.entries(allEngines()).forEach(([k, v]) => {
    const d = document.createElement('div'); d.textContent = v.name; d.dataset.key = k; d.setAttribute('role', 'button'); d.setAttribute('tabindex', '0'); d.setAttribute('aria-label', '选择搜索引擎：' + v.name); keyActivate(d);
    if (k === state.engine) d.classList.add('on');
    d.addEventListener('click', () => {
      state.engine = k; save(); updateEngineLabel(); menu.classList.remove('open'); document.getElementById('engine-label').setAttribute('aria-expanded', 'false');
      menu.querySelectorAll('div').forEach(x => x.classList.remove('on')); d.classList.add('on');
    });
    menu.appendChild(d);
  });
  updateEngineLabel();
}
function addCustomEngine() {
  const name = document.getElementById('eng-name').value.trim();
  const url = document.getElementById('eng-url').value.trim();
  if (!name || !url) { toast('请填写名称和地址'); return; }
  if (url.indexOf('{q}') < 0) { toast('地址必须包含 {q} 占位符'); return; }
  // 生成 key：拼音/英文小写，冲突则加数字；避免与内置 key 撞
  let key = name.toLowerCase().replace(/[^a-z0-9]+/g, '') || ('e' + Date.now());
  while (DEFAULT_ENGINES[key] || (state.engines && state.engines[key])) key += '1';
  state.engines = state.engines || {};
  state.engines[key] = { name, url };
  save();
  document.getElementById('eng-name').value = '';
  document.getElementById('eng-url').value = '';
  renderEngineManager(); refreshEngines();
  toast('已添加引擎：' + name);
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
    document.getElementById('set-theme').value = state.theme === 'light' ? 'light' : 'dark';
    document.getElementById('set-seconds').checked = state.showSeconds;
    document.querySelectorAll('#settings-modal input[data-comp]').forEach(cb => { cb.checked = state.components[cb.dataset.comp]; });
    renderEngineManager();            // 打开时刷新自定义引擎列表
    openFloat(modal);
  };
  document.getElementById('btn-settings').addEventListener('click', open);
  document.getElementById('set-close').addEventListener('click', () => animateOut(modal));
  modal.addEventListener('click', e => { if (e.target === modal) animateOut(modal); });
  // 引擎
  document.getElementById('set-engine').addEventListener('change', e => { state.engine = e.target.value; save(); updateEngineLabel(); });
  // 壁纸分类
  document.getElementById('set-wall').addEventListener('change', e => { state.wallpaper.style = e.target.value; state.wallpaper.custom = null; save(); applyBackground(); highlightSwatch(); });
  // 蒙版浓度
  document.getElementById('set-veil').addEventListener('input', e => { state.veil = parseFloat(e.target.value); save(); applyVeil(); });
  // 主题（深色 / 浅色）
  document.getElementById('set-theme').addEventListener('change', e => { state.theme = e.target.value; save(); applyTheme(); });
  // 时钟显示秒
  document.getElementById('set-seconds').addEventListener('change', e => { state.showSeconds = e.target.checked; save(); tick(); });
  // 组件显隐
  document.querySelectorAll('#settings-modal input[data-comp]').forEach(cb => {
    cb.addEventListener('change', () => { state.components[cb.dataset.comp] = cb.checked; save(); applyComponents(); });
  });
  // 自定义搜索引擎：添加（按钮 + 回车）
  document.getElementById('eng-add').addEventListener('click', addCustomEngine);
  document.getElementById('eng-name').addEventListener('keydown', e => { if (e.key === 'Enter') addCustomEngine(); });
  document.getElementById('eng-url').addEventListener('keydown', e => { if (e.key === 'Enter') addCustomEngine(); });
  // 导出
  document.getElementById('set-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'homepage-backup.json'; a.click();
  });
  // 恢复默认：清空本地存档并重载，页面异常时的一键自救
  document.getElementById('set-reset').addEventListener('click', () => {
    confirmDialog({
      title: '恢复默认设置',
      desc: '分组、待办、便签、倒计时等<strong>全部本地数据都会被清空</strong>，无法撤销。建议先导出备份。',
      okText: '清空并恢复', danger: true,
    }).then(ok => { if (ok) { localStorage.removeItem(KEY); location.reload(); } });
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
      } catch (e) { toast('备份文件格式不正确，换一个试试'); }
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
  if (clear) {
    clear.addEventListener('click', () => {
    if (!ta.value.trim()) { toast('便签已经是空的'); return; }
    confirmDialog({
      title: '清空便签', desc: '便签里的内容会被清掉，无法撤销。',
      okText: '清空', danger: true,
    }).then(ok => { if (ok) { ta.value = ''; state.notes = ''; save(); } });
  });
    keyActivate(clear);
  }
}
// 环境音：用 Web Audio 实时生成噪音（无需任何外部文件）
let audioCtx = null, noiseNode = null, noiseGain = null, noiseLfo = null, noiseLfoGain = null;
function ensureAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

// 每种声音的「音色配方」：
//   filter / freq / q —— 决定音色骨架；
//   lfo               —— 用低频振荡器做缓慢起伏，让声音有呼吸感，而不是一条死的直线。
const AMB_CFG = {
  white: { filter: 'lowpass',  freq: 18000 },
  pink:  { filter: 'lowpass',  freq: 18000 },
  brown: { filter: 'lowpass',  freq: 800 },
  rain:  { filter: 'lowpass',  freq: 1200 },
  // 咖啡馆：人声嘈杂集中在中频 → 带通取中频，再配缓慢的音量起伏模拟人语声浪
  cafe:  { filter: 'bandpass', freq: 900, q: 0.7, lfo: { rate: 0.12, depth: 0.22, target: 'gain' } },
  // 海浪：让低通截止频率缓慢上下摆动，形成「哗——哗——」的涌动感
  waves: { filter: 'lowpass',  freq: 700,         lfo: { rate: 0.09, depth: 420,  target: 'freq' } },
  // 篝火：底噪 + 随机爆裂（爆裂在波形里加），音量轻微抖动
  fire:  { filter: 'lowpass',  freq: 1100,        lfo: { rate: 0.30, depth: 0.16, target: 'gain' } },
};

// 往缓冲区里填波形
function fillNoise(data, type) {
  const size = data.length;
  if (type === 'white') {
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return;
  }
  if (type === 'pink') {                                // 粉噪音：比白噪音柔和
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < size; i++) { const w = Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.96900*b2+w*0.1538520;
      b3=0.86650*b3+w*0.3104856; b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926; }
    return;
  }
  if (type === 'rain') {                                // 雨声：白噪音压低幅度再过低通
    for (let i = 0; i < size; i++) data[i] = (Math.random()*2-1) * 0.5;
    return;
  }
  // 棕噪音：低沉，作为 咖啡馆 / 海浪 / 篝火 三种声音的共同底噪
  let last = 0;
  for (let i = 0; i < size; i++) { const w = Math.random()*2-1; data[i] = (last + 0.02*w)/1.02; last = data[i]; data[i] *= 3.5; }
  if (type === 'fire') {                                // 篝火：叠上稀疏的「噼啪」爆裂
    for (let i = 0; i < size; i++) {
      if (Math.random() < 0.0009) {                     // 每隔一小段随机来一声
        const amp = Math.random() * 0.9 + 0.3;
        for (let j = 0; j < 60 && i + j < size; j++) data[i + j] += amp * (Math.random()*2-1) * Math.exp(-j/12);
      }
    }
  }
}

function startNoise(type) {
  ensureAudio();
  stopNoise();
  const ctx = audioCtx;
  const cfg = AMB_CFG[type] || AMB_CFG.white;
  const size = ctx.sampleRate * 2;                      // 2 秒缓冲，循环播放
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  fillNoise(buffer.getChannelData(0), type);

  noiseNode = ctx.createBufferSource(); noiseNode.buffer = buffer; noiseNode.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = cfg.filter; filter.frequency.value = cfg.freq;
  if (cfg.q) filter.Q.value = cfg.q;
  noiseGain = ctx.createGain(); noiseGain.gain.value = parseFloat(document.getElementById('amb-vol').value);
  noiseNode.connect(filter); filter.connect(noiseGain); noiseGain.connect(ctx.destination);

  // 起伏：把低频振荡器接到「音量」或「滤波频率」上
  if (cfg.lfo) {
    noiseLfo = ctx.createOscillator(); noiseLfo.frequency.value = cfg.lfo.rate;
    noiseLfoGain = ctx.createGain(); noiseLfoGain.gain.value = cfg.lfo.depth;
    noiseLfo.connect(noiseLfoGain);
    noiseLfoGain.connect(cfg.lfo.target === 'gain' ? noiseGain.gain : filter.frequency);
    noiseLfo.start();
  }
  noiseNode.start(0);
}
function stopNoise() {
  if (noiseLfo) { try { noiseLfo.stop(); } catch (e) {} try { noiseLfo.disconnect(); } catch (e) {} noiseLfo = null; }
  if (noiseLfoGain) { try { noiseLfoGain.disconnect(); } catch (e) {} noiseLfoGain = null; }
  if (noiseNode) { try { noiseNode.stop(); } catch (e) {} noiseNode.disconnect(); noiseNode = null; }
}
function bindAmbient() {
  const playBtn = document.getElementById('amb-play');
  const sel = document.getElementById('amb-type');
  const vol = document.getElementById('amb-vol');
  if (state.ambient.type) sel.value = state.ambient.type;
  if (state.ambient.volume != null) vol.value = state.ambient.volume;
  // 图标是 <use> 引用，要换 href 而不是写 textContent；文案在独立的 span 里
  const setPlaying = on => {
    playBtn.classList.toggle('on', on);
    const label = document.getElementById('amb-play-text');
    if (label) label.textContent = on ? '暂停' : '播放';
    const use = playBtn.querySelector('use');
    if (use) use.setAttribute('href', on ? '#i-pause' : '#i-play');
  };
  playBtn.addEventListener('click', () => {
    if (noiseNode) { stopNoise(); setPlaying(false); return; }
    const type = sel.value; if (!type) { toast('先从上面选一种声音'); return; }
    ensureAudio(); if (audioCtx.state === 'suspended') audioCtx.resume();
    startNoise(type); setPlaying(true);
  });
  sel.addEventListener('change', () => { state.ambient.type = sel.value; save(); if (noiseNode) startNoise(sel.value); });
  vol.addEventListener('input', () => { state.ambient.volume = parseFloat(vol.value); save(); if (noiseGain) noiseGain.gain.value = parseFloat(vol.value); });
}

/* ---------- 14. 四期③：键盘快捷键 ---------- */
function closeAll() {
  document.getElementById('engine-menu').classList.remove('open');   // 引擎菜单瞬时收起，不做退场动画
  animateOut(document.getElementById('settings-modal'));
  animateOut(document.getElementById('kbd-modal'));
  animateOut(document.getElementById('weather-pop'));
}
function toggleKbd() {
  const m = document.getElementById('kbd-modal');
  if (m.classList.contains('open')) animateOut(m); else openFloat(m);
}
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
    else if (e.key === 'w' || e.key === 'W') { nextWallpaper(); }
    else if (e.key === 't' || e.key === 'T') { toggleTheme(); }
    else if (e.key === 'z' || e.key === 'Z') { toggleZen(); }
    else if (e.key === '?') { toggleKbd(); }
    else if (/^[1-9]$/.test(e.key)) {                 // 数字键直达书签（弹窗开着时不响应）
      if (document.querySelector('.modal-mask.open')) return;
      jumpToBookmark(e.key);
    }
  });
}

/* ---------- 13b. D 系列组件：番茄钟 / 日历 / 倒计时 ---------- */

/* D1：番茄钟 / 专注计时（只记设置，运行态不持久化，刷新即重置） */
let pomoTimer = null, pomoLeft = 0, pomoIsBreak = false;
function pomoTotalSec() { return (pomoIsBreak ? state.pomodoro.break : state.pomodoro.work) * 60; }
function fmtMMSS(s) { const m = Math.floor(s / 60), x = s % 60; return String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0'); }
function renderPomodoro() {
  const total = pomoTotalSec();
  if (!pomoTimer) pomoLeft = total;                 // 未开始时，显示设定时长
  document.getElementById('pomo-time').textContent = fmtMMSS(pomoLeft);
  document.getElementById('pomo-mode').textContent = pomoIsBreak ? '休息' : '专注';
  const ring = document.getElementById('pomo-ring');
  const C = 2 * Math.PI * 52;
  ring.style.strokeDasharray = C;
  ring.style.strokeDashoffset = C * (1 - pomoLeft / total);
}
function pomoStart() {
  if (pomoTimer) { clearInterval(pomoTimer); pomoTimer = null; document.getElementById('pomo-start').textContent = '继续'; return; }
  if (!pomoLeft) pomoLeft = pomoTotalSec();
  document.getElementById('pomo-start').textContent = '暂停';
  // 计时是用户主动开启的「手势」，顺手把通知权限与音频上下文都准备好，
  // 这样结束时才能温柔提示（否则浏览器会拦声音、通知也发不出）
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
  ensureAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  pomoTimer = setInterval(() => {
    pomoLeft--;
    if (pomoLeft <= 0) {                            // 一段结束 → 切换专注/休息
      clearInterval(pomoTimer); pomoTimer = null;
      pomoIsBreak = !pomoIsBreak; pomoLeft = pomoTotalSec();
      toast(pomoIsBreak ? '休息一下 ☕' : '开始专注 💪');
      notifyPomodoro(pomoIsBreak);
    }
    renderPomodoro();
  }, 1000);
}
/* 一段结束的温柔提示：系统通知（已授权时）+ 一声短促正弦收尾音。
   不弹原生 alert —— 那会破坏整页质感，也打断心流。 */
function notifyPomodoro(isBreak) {
  const text = isBreak ? '休息结束，开始下一轮专注' : '专注完成，休息一下';
  // 轻柔收尾音：正弦音，快速起、缓慢落，不刺耳
  try {
    ensureAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = isBreak ? 659.25 : 523.25;
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(g).connect(audioCtx.destination);
    o.start(t); o.stop(t + 1.5);
  } catch (e) {}
  // 系统通知：仅已授权时发，未授权静默回落到 toast（不强制要权限）
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('番茄钟', { body: text }); } catch (e) {}
  }
}
function pomoReset() {
  if (pomoTimer) { clearInterval(pomoTimer); pomoTimer = null; }
  pomoIsBreak = false; pomoLeft = pomoTotalSec();
  document.getElementById('pomo-start').textContent = '开始';
  renderPomodoro();
}
function bindPomodoro() {
  document.getElementById('pomo-start').addEventListener('click', pomoStart);
  document.getElementById('pomo-reset').addEventListener('click', pomoReset);
  document.getElementById('pomo-work').addEventListener('change', e => { state.pomodoro.work = Math.max(1, +e.target.value || 25); save(); if (!pomoTimer) pomoReset(); });
  document.getElementById('pomo-break').addEventListener('change', e => { state.pomodoro.break = Math.max(1, +e.target.value || 5); save(); if (!pomoTimer) pomoReset(); });
  renderPomodoro();
}

/* D2：日历（月视图，高亮今天） */
let calView = new Date();
const WK = ['日', '一', '二', '三', '四', '五', '六'];
function renderCalendar() {
  const y = calView.getFullYear(), m = calView.getMonth();
  document.getElementById('cal-head').textContent = y + ' 年 ' + (m + 1) + ' 月';
  const grid = document.getElementById('cal-grid'); grid.innerHTML = '';
  WK.forEach(w => { const h = document.createElement('div'); h.className = 'cal-w'; h.textContent = w; grid.appendChild(h); });
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  for (let i = 0; i < first; i++) { const e = document.createElement('div'); e.className = 'cal-cell empty'; grid.appendChild(e); }
  for (let d = 1; d <= days; d++) {
    const e = document.createElement('div'); e.className = 'cal-cell'; e.textContent = d;
    if (d === today.getDate() && m === today.getMonth() && y === today.getFullYear()) e.classList.add('today');
    grid.appendChild(e);
  }
}
function bindCalendar() {
  document.getElementById('cal-prev').addEventListener('click', () => { calView.setMonth(calView.getMonth() - 1); renderCalendar(); });
  document.getElementById('cal-next').addEventListener('click', () => { calView.setMonth(calView.getMonth() + 1); renderCalendar(); });
  renderCalendar();
}

/* D3：倒计时 / 纪念日 */
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function renderCountdown() {
  const list = document.getElementById('cd-list'); list.innerHTML = '';
  const evs = state.events || [];
  if (!evs.length) { list.innerHTML = '<p class="tip">还没有目标，点 ＋ 添加</p>'; return; }
  const now = new Date(); now.setHours(0, 0, 0, 0);
  evs.forEach((ev, i) => {
    const target = new Date(ev.date + 'T00:00:00');
    const diff = daysBetween(now, target);
    const row = document.createElement('div'); row.className = 'cd-item';
    const txt = diff === 0 ? '就是今天 🎉' : (diff > 0 ? '还有 ' + diff + ' 天' : '已过 ' + (-diff) + ' 天');
    row.innerHTML = '<span class="cd-name"></span><span class="cd-days">' + txt + '</span><span class="cd-del" role="button" tabindex="0" title="删除" aria-label="删除倒计时">' + icon('i-close', 'ic-sm') + '</span>';
    row.querySelector('.cd-name').textContent = ev.name + '（' + ev.date + '）';
    const cdDel = row.querySelector('.cd-del');
    cdDel.addEventListener('click', () => { state.events.splice(i, 1); save(); renderCountdown(); });
    keyActivate(cdDel);
    list.appendChild(row);
  });
}
function bindCountdown() {
  const row = document.getElementById('cd-add-row');
  const cdAdd = document.getElementById('cd-add');
  cdAdd.addEventListener('click', () => { row.hidden = !row.hidden; });
  keyActivate(cdAdd);
  document.getElementById('cd-save').addEventListener('click', () => {
    const name = document.getElementById('cd-name').value.trim();
    const date = document.getElementById('cd-date').value;
    if (!name || !date) { toast('请填写名称和日期'); return; }
    state.events = state.events || []; state.events.push({ name, date }); save();
    document.getElementById('cd-name').value = ''; document.getElementById('cd-date').value = '';
    row.hidden = true; renderCountdown();
  });
  renderCountdown();
}

/* ---------- 15. 绑定所有交互 ---------- */
function bindEvents() {
  // 搜索引擎菜单
  const menu = document.getElementById('engine-menu');
  Object.entries(allEngines()).forEach(([k, v]) => {
    const d = document.createElement('div');
    d.textContent = v.name; d.dataset.key = k;
    d.setAttribute('role', 'button'); d.setAttribute('tabindex', '0'); d.setAttribute('aria-label', '选择搜索引擎：' + v.name); keyActivate(d);
    if (k === state.engine) d.classList.add('on');
    d.addEventListener('click', () => {
      state.engine = k; save(); updateEngineLabel(); menu.classList.remove('open'); document.getElementById('engine-label').setAttribute('aria-expanded', 'false');
      menu.querySelectorAll('div').forEach(x => x.classList.remove('on')); d.classList.add('on');
    });
    menu.appendChild(d);
  });
  const engLabel = document.getElementById('engine-label');
  const toggleEngMenu = () => { const open = menu.classList.toggle('open'); engLabel.setAttribute('aria-expanded', open ? 'true' : 'false'); };
  engLabel.addEventListener('click', toggleEngMenu);
  keyActivate(engLabel);
  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && !document.getElementById('engine-label').contains(e.target)) { menu.classList.remove('open'); engLabel.setAttribute('aria-expanded', 'false'); }
  });

  // 搜索
  const input = document.getElementById('search-input');
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
  const goBtn = document.getElementById('search-go');
  goBtn.addEventListener('click', doSearch);
  keyActivate(goBtn);

  // 待办
  const todoInput = document.getElementById('todo-input');
  todoInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
  document.getElementById('todo-add-btn').addEventListener('click', addTodo);
  const todoAdd = document.querySelector('.add-todo');
  todoAdd.addEventListener('click', () => todoInput.focus());
  keyActivate(todoAdd);

  bindGroupActions();
  bindTheme();
  bindWallpaper();
  bindDrag();
  bindSettings();
  bindNotes();
  bindAmbient();
  bindPomodoro();
  bindCalendar();
  bindCountdown();
  bindFolds();
  bindKeys();
  bindZen();

  // 四期④：天气弹窗开关 + 点击外部关闭
  const wp = document.getElementById('weather-pop');
  document.getElementById('comp-weather').addEventListener('click', () => {
    if (wp.classList.contains('open')) animateOut(wp); else openFloat(wp);
  });
  document.addEventListener('click', e => {
    if (wp.classList.contains('open') && !wp.contains(e.target) && !document.getElementById('comp-weather').contains(e.target)) animateOut(wp);
  });
  // 快捷键帮助弹窗关闭
  document.getElementById('kbd-close').addEventListener('click', () => animateOut(document.getElementById('kbd-modal')));
}

/* ---------- 16. 启动 ---------- */
/* ---------- 14.5 工具组件折叠（密度管理） ---------- */
function applyFolds() {
  ['pomodoro', 'calendar', 'countdown'].forEach(id => {
    const card = document.getElementById('comp-' + id); if (!card) return;
    const folded = !!(state.collapsed && state.collapsed[id]);
    card.classList.toggle('folded', folded);
    const btn = card.querySelector('.fold');
    if (btn) { btn.classList.toggle('folded', folded); btn.setAttribute('aria-expanded', folded ? 'false' : 'true'); }
  });
}
function bindFolds() {
  document.querySelectorAll('.fold').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.fold;
      state.collapsed = state.collapsed || {};
      state.collapsed[id] = !state.collapsed[id];
      save(); applyFolds();
    });
    keyActivate(btn);
  });
}

// 让 role=button 的 span 也能用键盘（Enter / 空格）激活，触发其已绑定的 click 逻辑
function keyActivate(el) {
  if (!el) return;
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
  });
}

/* ---------- 自绘浮层滚动条 ----------
   原生滚动条各浏览器宽窄/圆角/配色各不相同，且会预留一条空带（本页压在照片上，空带很扎眼）。
   这里用 position:fixed 的浮层来画：不占布局 → 无空带；样式全由 CSS 掌控 → Chrome / Edge / 火狐 一致；
   滚动时才淡入、闲置 1.2s 自动隐去；内容不满一屏或禅模式下压根不出现。
   原生滚动条已在 style.css 里对 html 隐藏，滚动本身仍走浏览器原生（滚轮 / 触控板 / 键盘都不受影响）。 */
let sbxRefresh = null;
function initScrollbar() {
  const bar = document.getElementById('sbx');
  if (!bar) return;
  const thumb = bar.querySelector('.sbx-thumb');
  const doc = document.documentElement;
  const INSET = 6;                 // 与 .sbx 的 top / bottom 内缩保持一致
  let hideTimer = 0, dragging = false, dragY = 0, dragTop = 0;

  const maxScroll = () => Math.max(0, doc.scrollHeight - doc.clientHeight);
  const blocked = () => maxScroll() <= 1 || !!document.querySelector('.modal-mask.open');

  // 只更新几何（高度 / 位移），不碰显隐
  function render() {
    if (maxScroll() <= 1) return;
    const trackH = window.innerHeight - INSET * 2;
    const thumbH = Math.max(36, Math.round(trackH * (doc.clientHeight / doc.scrollHeight)));
    const y = (doc.scrollTop / maxScroll()) * (trackH - thumbH);
    thumb.style.height = thumbH + 'px';
    thumb.style.transform = 'translateY(' + y + 'px)';   // .sbx 自身已有 top/bottom 内缩，这里从 0 起算
  }
  function show() {
    if (blocked()) { bar.classList.remove('on'); return; }
    render();
    bar.classList.add('on');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { if (!dragging) bar.classList.remove('on'); }, 1200);
  }
  sbxRefresh = () => { if (blocked()) bar.classList.remove('on'); else render(); };

  window.addEventListener('scroll', show, { passive: true });
  window.addEventListener('resize', () => { render(); show(); }, { passive: true });

  // 内容高度变化（增删待办 / 便签 / 折叠 / 字体载入）时同步几何
  if (window.ResizeObserver) new ResizeObserver(() => sbxRefresh()).observe(document.body);

  // 拖拽：跟手，拖拽期间临时关掉平滑滚动（配合 style.css 的 html.sb-drag）
  thumb.addEventListener('pointerdown', e => {
    if (maxScroll() <= 1) return;
    dragging = true; bar.classList.add('drag'); doc.classList.add('sb-drag');
    dragY = e.clientY; dragTop = doc.scrollTop;
    try { thumb.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  thumb.addEventListener('pointermove', e => {
    if (!dragging) return;
    const span = (window.innerHeight - INSET * 2) - thumb.offsetHeight;
    if (span <= 0) return;
    doc.scrollTop = dragTop + (e.clientY - dragY) * (maxScroll() / span);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false; bar.classList.remove('drag'); doc.classList.remove('sb-drag'); show();
  };
  thumb.addEventListener('pointerup', endDrag);
  thumb.addEventListener('pointercancel', endDrag);
  window.addEventListener('pointerup', endDrag);
  thumb.addEventListener('mouseenter', () => { clearTimeout(hideTimer); bar.classList.add('on'); });
  thumb.addEventListener('mouseleave', () => { if (!dragging) show(); });

  render();
}

function init() {
  // 每一步单独兜错：任何一步出错只影响它自己，不会让整页变空白
  const steps = [
    populateEngineSelect, renderGroups, renderTodos, updateEngineLabel,
    applyBackground, applyVeil, applyTheme, highlightSwatch, applyComponents, applyFolds, showQuote,
    applyZen, initWeatherPop, bindEvents, initScrollbar,
  ];
  steps.forEach(fn => {
    try { fn(); }
    catch (e) { console.error('[主页] ' + fn.name + ' 执行失败：', e); }
  });
  try { tick(); setInterval(tick, 1000); } catch (e) { console.error(e); }
  loadWeather();          // 内部已有 try/catch，联网失败也不影响其余功能
}
init();
