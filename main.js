// 手機選單切換
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');

menuBtn.addEventListener('click', () => {
	mobileMenu.classList.toggle('hidden');
});

// 平滑滾動
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
	anchor.addEventListener('click', function (e) {
		e.preventDefault();
		const target = document.querySelector(this.getAttribute('href'));
		if (target) {
			target.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
			// 關閉手機選單
			mobileMenu.classList.add('hidden');
		}
	});
});

// 滾動時導航欄效果
window.addEventListener('scroll', () => {
	const nav = document.querySelector('nav');
	if (window.scrollY > 100) {
		nav.classList.add('shadow-sm');
	} else {
		nav.classList.remove('shadow-sm');
	}
});

// 滾動動畫
const observerOptions = {
	threshold: 0.1,
	rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
	entries.forEach(entry => {
		if (entry.isIntersecting) {
			entry.target.classList.add('fade-in');
		}
	});
}, observerOptions);

// 觀察所有區塊
document.querySelectorAll('section').forEach(section => {
	observer.observe(section);
});

// 圖片輪播功能
let currentSlide = 0;
const totalSlides = 3;
const slider = document.getElementById('slider');
const indicators = document.querySelectorAll('.indicator');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

function updateSlider() {
	slider.style.transform = `translateX(-${currentSlide * 100}%)`;
	
	// 更新指示點
	indicators.forEach((indicator, index) => {
		if (index === currentSlide) {
			indicator.classList.remove('bg-pink-200');
			indicator.classList.add('bg-pink-400');
		} else {
			indicator.classList.remove('bg-pink-400');
			indicator.classList.add('bg-pink-200');
		}
	});
}

function nextSlide() {
	currentSlide = (currentSlide + 1) % totalSlides;
	updateSlider();
}

function prevSlide() {
	currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
	updateSlider();
}

// 事件監聽器
nextBtn.addEventListener('click', nextSlide);
prevBtn.addEventListener('click', prevSlide);

// 指示點點擊
indicators.forEach((indicator, index) => {
	indicator.addEventListener('click', () => {
		currentSlide = index;
		updateSlider();
	});
});

// 自動輪播
setInterval(nextSlide, 4000);

const RandomMedia = (() => {
  // 簡單 in-memory 快取
  const _cache = new Map();

  // 工具：今天字串、哈希
  const _today = () => new Date().toISOString().slice(0,10);
  const _hash = (s) => [...s].reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0)|0,0) >>> 0;

  // 工具：取儲存
  const _store = (scope) => scope === 'local' ? localStorage
                        : scope === 'session' ? sessionStorage
                        : null;

  async function _loadList(jsonUrl) {
    if (_cache.has(jsonUrl)) return _cache.get(jsonUrl);
    const res = await fetch(jsonUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Fetch JSON failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('JSON must be an array of URLs');
    _cache.set(jsonUrl, data);
    return data;
  }

  // 從清單選一個：策略 random / daily / cycle
  function _pickOne(list, { strategy='random', jsonUrl, scope='none', storageKey, pick }) {
    if (typeof pick === 'function') return pick(list);

    const st = _store(scope);
    const poolKey = storageKey || `randPool:${jsonUrl}`;
    const chosenKey = `randChosen:${jsonUrl}:${strategy}`;

    // 每日固定：同一天同一張
    if (strategy === 'daily') {
      const k = `${chosenKey}:${_today()}`;
      const cached = st?.getItem(k);
      if (cached) return cached;
      const idx = _hash(_today()+jsonUrl) % list.length;
      const url = list[idx];
      st?.setItem(k, url);
      return url;
    }

    // 循環不重覆：把清單洗牌存在 storage，一次拿一張
    if (strategy === 'cycle') {
      let pool = st?.getItem(poolKey);
      let arr = pool ? JSON.parse(pool) : [...list];
      if (!arr.length) arr = [...list]; // 用完就重置
      // 取第一張當選擇，並移除
      const url = arr.shift();
      st?.setItem(poolKey, JSON.stringify(arr));
      return url;
    }

    // 預設隨機
    return list[Math.floor(Math.random() * list.length)];
  }

  // 指派到元素
  async function assign(opts) {
    const {
      jsonUrl,
      target,
      mode='img',
      strategy='random',
      scope='none',
      storageKey,
      fallback,
      alt,
      filter,
      pick
    } = opts;

    if (!jsonUrl || !target) throw new Error('jsonUrl & target are required');

    // 取得元素
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) throw new Error('target element not found');

    // 讀清單
    let list = await _loadList(jsonUrl);
    if (typeof filter === 'function') list = list.filter(filter);
    if (!list.length) throw new Error('list is empty after filtering');
	
	if (opts.basePath) {
	  const base = opts.basePath.replace(/\/+$/, '');
	  list = list.map(x => /^https?:/.test(x) ? x : `${base}/${x}`);
	}

    // 挑一張
    const url = _pickOne(list, { strategy, jsonUrl, scope, storageKey, pick });

    // 指派
    if (mode === 'bg') {
      el.style.backgroundImage = `url("${url}")`;
      el.style.backgroundSize = el.style.backgroundSize || 'cover';
      el.style.backgroundPosition = el.style.backgroundPosition || 'center';
    } else {
      if (el.tagName !== 'IMG') {
        console.warn('mode=img but target is not <img>, switching to bg');
        el.style.backgroundImage = `url("${url}")`;
      } else {
        if (alt) el.alt = alt;
        // 設定 onerror 後備
        if (fallback) {
          el.onerror = () => { el.onerror = null; el.src = fallback; };
        }
        el.src = url;
      }
    }

    return url;
  }

  return { assign };
})();

RandomMedia.assign({
  jsonUrl: './images/my/my.json', // 這裡是從 index.html 出發去找
  basePath: './images/my',            // 把 JSON 裡的檔名補成完整路徑
  target: '#avatar',
  mode: 'img',                         // 設成背景圖
  strategy: 'random',                 // 隨機抽一張
  scope: 'session',                   // 這次造訪盡量不重複
  storageKey: 'pool:my-avatars'
});

// 從同一份清單抽 3 張，塞到 #slider 的三個框
async function fillStartSlidesFromOnePool({ jsonUrl, basePath }) {
  // 1) 讀清單
  let list = await (await fetch(jsonUrl, { cache: 'no-store' })).json();
  if (basePath) {
    const base = basePath.replace(/\/+$/, '');
    list = list.map(x => /^https?:\/\//.test(x) ? x : `${base}/${x}`);
  }

  // 2) 洗牌後取前三張
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  const picks = list.slice(0, 3);

  // 3) 取得三個框（就是 #slider 底下的三個子 div）
  const slides = document.querySelectorAll('#slider > div');
  const alts = ['讀檔失敗', '讀檔失敗', '讀檔失敗'];

  slides.forEach((slide, idx) => {
    // 找既有 <img>；沒有就新建
    let img = slide.querySelector('img.rand-start') || slide.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'rand-start w-120 h-full object-cover rounded-xl relative z-10';
      slide.appendChild(img);
    } else {
      // 確保尺寸/層級一致
      img.classList.add('rand-start','w-120','h-full','object-cover','rounded-xl','relative','z-10');
    }
    img.alt = alts[idx] || `slide ${idx + 1}`;
    img.src = picks[idx];
  });
}

// 呼叫（JSON 放檔名就帶 basePath；若 JSON 已是完整路徑就拿掉 basePath）
document.addEventListener('DOMContentLoaded', () => {
  fillStartSlidesFromOnePool({
    jsonUrl: './images/start/start.json',
    basePath: './images/start'
  });
});

// 點擊翻轉
document.addEventListener('click', (e) => {
  const wrap = e.target.closest('.flip-wrap');
  if (!wrap) return;
  console.log('flip click on', wrap);
  const card = wrap.querySelector('.flip-3d');
  card.classList.toggle('is-flipped');
});

// 鍵盤可用性（Enter/Space 也能翻）
document.querySelectorAll('.flip-wrap').forEach(w => {
  w.setAttribute('aria-label', '翻轉卡片');
  w.setAttribute('title', '點擊可翻轉');
});

// 讓 root 裡所有 .jump-btn 都能用（root 預設整個 document）
function bindJump(root = document) {
  root.querySelectorAll('.jump-btn[data-url]').forEach(btn => {
    // 避免重複綁多次
    if (btn.__jumpBound) return;
    btn.__jumpBound = true;

    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (!url) return;
      // 你原本的寫法：同頁跳轉
      window.location.href = url;
      // 如果要新分頁就改成：window.open(url, '_blank', 'noopener');
    });
  });
}

// 首次載入先綁「頁面上已存在」的 .jump-btn
document.addEventListener('DOMContentLoaded', () => bindJump());

// ====== Popup：角色「頁面準備中」對話框 ======
const RolePopup = (() => {
  let cache = null;           // JSON 快取
  let lastFocus = null;       // 關掉後把焦點還給原按鈕

  async function loadMap(jsonUrl) {
    if (cache) return cache;
    const res = await fetch(jsonUrl, { cache: 'no-store' });
    cache = await res.json();
    return cache;
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function preload(src) { const img = new Image(); img.src = src; }

  function open({ name, photo, line, previewUrl }) {
    lastFocus = document.activeElement;

    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');

	wrap.innerHTML = `
	  <div class="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-[92%] text-center relative">
		<button class="abs-close absolute -top-3 -right-3 bg-white/90 rounded-full shadow p-2" aria-label="關閉">
		  ✕
		</button>

		<img src="${photo}" alt="${name}"
			 class="mx-auto w-24 h-24 object-cover rounded-lg mb-4 bounce-slow select-none pointer-events-none">

		<h2 class="text-xl font-bold text-gray-800 mb-2">${name}&nbsp路過</h2>

		<!-- 兩行文字 -->
		<p class="text-gray-600 mb-1">頁面仍製作中…</p>
		<p class="text-gray-600">${line}</p>

		<!-- 兩顆按鈕 -->
		<div class="mt-5 flex items-center justify-center gap-3">
		  <button class="ok-btn px-4 py-2 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-xl hover:scale-105 transition">
			好吧
		  </button>
		${
		  previewUrl
			? `<button class="preview-btn jump-btn px-4 py-2 bg-gradient-to-r from-purple-400 to-indigo-400 text-white rounded-xl hover:scale-105 transition" data-url="${previewUrl}" type="button">75預覽</button>`
			: `<button class="preview-btn px-4 py-2 bg-gray-300 text-white rounded-xl opacity-60 cursor-not-allowed" type="button">暫無預覽</button>`
		}
		</div>
	  </div>
	`;

    function close() {
      wrap.remove();
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
      document.removeEventListener('keydown', onKey);
      wrap.removeEventListener('click', onClick);
    }

    function onKey(e) { if (e.key === 'Escape') close(); }
    function onClick(e) {
      if (e.target.classList.contains('ok-btn') ||
          e.target.classList.contains('abs-close') ||
          e.target === wrap) close();
    }

    document.body.appendChild(wrap);
	bindJump(wrap);
    document.addEventListener('keydown', onKey);
    wrap.addEventListener('click', onClick);

    // 把焦點移到主要按鈕，方便鍵盤使用者
    wrap.querySelector('.ok-btn').focus();
  }

  async function setup(opts = {}) {
    const {
      jsonUrl = './data/roles.json',
      selector = '.prepare-btn'
    } = opts;

    const map = await loadMap(jsonUrl);

    // 先預載每個角色的頭像，避免彈出時閃爍
    Object.values(map).forEach(r => preload(r.photo));

    document.querySelectorAll(selector).forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const role = map[key];
        if (!role) {
          open({ name: '這位神秘角色', photo: 'https://placehold.co/200', line: '我暫時還躲著～' });
          return;
        }
        open({ name: role.name, photo: role.photo, line: pick(role.lines), previewUrl: role.previewUrl});
      });
    });
  }

  return { setup };
})();

// 啟動：在 DOM 準備好後跑一次
window.addEventListener('DOMContentLoaded', () => {
  RolePopup.setup({
    jsonUrl: './prepare_btn.json',   // 依你的實際路徑調整
    selector: '.prepare-btn'
  });
});

function slideTo(cardEl, index) {
  // cardEl 是那張貼文卡片裡「含輪播的那個 .relative」
  const track = cardEl.querySelector('.carousel-container');
  const dots  = cardEl.querySelectorAll('.dot');
  const total = dots.length || track.children.length;

  // 修正 index 範圍
  index = (index % total + total) % total;

  // 位移（你如果是像素位移就改這行）
  track.style.transform = `translateX(-${index * 100}%)`;
  track.dataset.current = index;

  // 同步點點
  dots.forEach((dot, i) => {
    const isActive = i === index;
    dot.classList.toggle('bg-white/70', isActive);
    dot.classList.toggle('bg-white/50', !isActive);
    dot.classList.toggle('scale-110', isActive); // 小放大效果（可刪）
  });
}

function nextImage(btn){
  const card = btn.closest('.relative');
  const track = card.querySelector('.carousel-container');
  const current = parseInt(track.dataset.current || '0', 10);
  slideTo(card, current + 1);
}

function previousImage(btn){
  const card = btn.closest('.relative');
  const track = card.querySelector('.carousel-container');
  const current = parseInt(track.dataset.current || '0', 10);
  slideTo(card, current - 1);
}

document.addEventListener('click', (e) => {
  const dot = e.target.closest('.dot');
  if (!dot) return;
  const card = dot.closest('.relative');                 // 該貼文卡
  const dots = [...card.querySelectorAll('.dot')];
  slideTo(card, dots.indexOf(dot));
});

// 按讚（切換樣式 + 小動畫）
function toggleLike(button){
  const likeBtn = button;
  const heartIcon = likeBtn.querySelector('svg');
  const likeCount = likeBtn.querySelector('.like-count');
  let current = parseInt(likeCount.textContent);

  if(likeBtn.classList.contains('liked')){
    likeBtn.classList.remove('liked','text-rose-500');
    likeBtn.classList.add('text-gray-600');
    heartIcon.setAttribute('fill','none');              // 變回空心
    likeCount.textContent = current - 1;
  }else{
    likeBtn.classList.remove('text-gray-600');
    likeBtn.classList.add('liked','text-rose-500');
    heartIcon.setAttribute('fill','currentColor');      // 變成實心
    likeCount.textContent = current + 1;
    heartIcon.classList.add('heart-animation');         // 你已有的跳動動畫
    setTimeout(()=>heartIcon.classList.remove('heart-animation'),300);
  }
}


// 分享（使用 Web Share 或複製文字）
function sharePost(button){
  const post = button.closest('.bg-white');
  const postText = post.querySelector('.text-gray-800').textContent;
  if(navigator.share){
    navigator.share({ title:'分享貼文', text:postText, url:window.location.href });
  }else{
    navigator.clipboard.writeText(postText+' - '+window.location.href)
      .then(()=>alert('貼文連結已複製到剪貼板！'))
      .catch(()=>alert('分享功能：'+postText));
  }
}

document.querySelectorAll('.bg-white').forEach(post=>{
  post.addEventListener('mouseenter',()=> post.style.transform='translateY(-2px)');
  post.addEventListener('mouseleave',()=> post.style.transform='translateY(0)');
});

(function(){function c(){var b=a.contentDocument||a.contentWindow.document;if(b){var d=b.createElement('script');d.innerHTML="window.__CF$cv$params={r:'9716420c747c4a8d',t:'MTc1NTU3MDkzMS4wMDAwMDA='};var a=document.createElement('script');a.nonce='';a.src='/cdn-cgi/challenge-platform/scripts/jsd/main.js';document.getElementsByTagName('head')[0].appendChild(a);";b.getElementsByTagName('head')[0].appendChild(d)}}if(document.body){var a=document.createElement('iframe');a.height=1;a.width=1;a.style.position='absolute';a.style.top=0;a.style.left=0;a.style.border='none';a.style.visibility='hidden';document.body.appendChild(a);if('loading'!==document.readyState)c();else if(window.addEventListener)document.addEventListener('DOMContentLoaded',c);else{var e=document.onreadystatechange||function(){};document.onreadystatechange=function(b){e(b);'loading'!==document.readyState&&(document.onreadystatechange=e,c())}}}})();

