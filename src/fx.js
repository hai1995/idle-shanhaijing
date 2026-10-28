// ===== 视觉动效层：浮动文字 / 震动 / 闪光 / 粒子 =====
// 所有特效都挂在独立的 #fxLayer 覆盖层上（position:fixed），
// 不依赖页面 DOM 结构，页面重渲染不会打断正在播放的动画。
// 无头环境（测试）下缺少 DOM 时全部安全降级为无操作。

const FX = {
  layer: null,

  // 获取/创建覆盖层；无 document.body 时返回 null（测试环境）
  ensureLayer(){
    if (this.layer && document.body && typeof document.body.contains === 'function' && document.body.contains(this.layer)) return this.layer;
    if (typeof document === 'undefined' || !document.body || typeof document.body.appendChild !== 'function') return null;
    const d = document.createElement('div');
    d.id = 'fxLayer';
    document.body.appendChild(d);
    this.layer = d;
    return d;
  },

  // 在视口坐标 (x,y) 处漂浮一段文字
  float(x, y, text, color, big, html){
    const layer = this.ensureLayer();
    if (!layer) return;
    const d = document.createElement('div');
    d.className = 'fx-float' + (big ? ' big' : '');
    if (html) d.innerHTML = text; else d.textContent = text;
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    if (color) d.style.color = color;
    layer.appendChild(d);
    setTimeout(()=>d.remove(), big ? 1500 : 1000);
  },

  // 以某个元素为锚点漂浮文字（元素不可见/不存在时自动跳过）
  floatAtEl(el, text, color, big, html){
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    this.float(r.left + r.width/2, r.top + r.height*0.35, text, color, big, html);
  },

  // 粒子爆开（Boss 击杀、升级等）
  // 粒子字符走 markHtml（v1.31.191）：原先直接 textContent = emoji，缺 emoji 字体的环境
  // （无头容器、精简 Linux）里，一簇粒子就是一簇 ☒ 豆腐块——图上那团「方框带叉」正是它。
  // markHtml 把认得的 emoji 换成矢量小图，不认得的仍原样印出（与 toast / 日志同一套口径）。
  burst(x, y, emoji, count){
    const layer = this.ensureLayer();
    if (!layer) return;
    const n = count || 8;
    const glyph = emoji || '✨';
    const html = (typeof markHtml === 'function') ? markHtml(glyph, 13) : null;
    for (let i=0; i<n; i++){
      const p = document.createElement('div');
      p.className = 'fx-particle';
      if (html) p.innerHTML = html; else p.textContent = glyph;
      const a = Math.random()*Math.PI*2, dist = 30 + Math.random()*45;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.setProperty('--dx', (Math.cos(a)*dist).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(a)*dist).toFixed(1) + 'px');
      layer.appendChild(p);
      setTimeout(()=>p.remove(), 750);
    }
  },

  burstAtEl(el, emoji, count){
    if (!el || typeof el.getBoundingClientRect !== 'function') return;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    this.burst(r.left + r.width/2, r.top + r.height/2, emoji, count);
  },

  // 红白闪光（受击）
  flash(el){
    if (!el || !el.classList) return;
    el.classList.remove('hitflash');
    void el.offsetWidth;
    el.classList.add('hitflash');
    setTimeout(()=>el.classList.remove('hitflash'), 320);
  },

  // 火花（锻造用）：从锚点向上扇形喷出
  sparks(el, color, count){
    const layer = this.ensureLayer();
    if (!layer) return;
    let cx = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth/2 : 0;
    let cy = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight/2 : 0;
    if (el && typeof el.getBoundingClientRect === 'function'){
      const r = el.getBoundingClientRect();
      if (r.width || r.height){ cx = r.left + r.width/2; cy = r.top + r.height/2; }
    }
    const n = count || 10;
    for (let i=0; i<n; i++){
      const p = document.createElement('div');
      p.className = 'fx-spark';
      const a = -Math.PI/2 + (Math.random()-0.5)*Math.PI*1.1;   // 主要朝上
      const dist = 40 + Math.random()*100;
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.setProperty('--dx', (Math.cos(a)*dist).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(a)*dist).toFixed(1) + 'px');
      if (color) p.style.background = color;
      layer.appendChild(p);
      setTimeout(()=>p.remove(), 700);
    }
  },

  // ---------- 打铁演出：抡锤 → 火星四溅 → 成品亮相 ----------
  // 只在具备 DOM 的环境播放；无头环境直接返回 false，逻辑层不受影响。
  forge(item, opts){
    if (this.forgeBusy) return false;                 // 连续锻造不叠加，避免刷屏
    const layer = this.ensureLayer();
    if (!layer) return false;
    const o = opts || {};
    const heavy = o.heavy !== false;
    const color = (typeof rarityColor === 'function' && item) ? rarityColor(item) : '#ffd166';
    const stage = document.createElement('div');
    stage.className = 'forge-stage' + (heavy ? ' heavy' : '');
    stage.style.setProperty('--r', color);
    const name = item ? String(item.name) : '';
    stage.innerHTML = `
      <div class="forge-glow"></div>
      <div class="forge-anvil">🛠️</div>
      <div class="forge-billet"><span>🔥</span></div>
      <div class="forge-hammer">${o.emoji || '🔨'}</div>
      <div class="forge-out"><span class="out-ring"></span><span class="out-ico">${(typeof itemIc==='function'&&item)?itemIc(item,34):(item?item.icon:'📦')}</span><span class="out-name">${name}</span></div>`;
    layer.appendChild(stage);
    this.forgeBusy = true;

    const hammer = stage.querySelector('.forge-hammer');
    const strike = ()=>{
      if (hammer && hammer.classList){
        hammer.classList.remove('swing'); void hammer.offsetWidth; hammer.classList.add('swing');
      }
      setTimeout(()=>{
        stage.classList.remove('impact'); void stage.offsetWidth; stage.classList.add('impact');
        this.sparks(stage, color, heavy ? 12 : 8);
        const app = document.getElementById && document.getElementById('app');
        this.shakeHard(app);
      }, 170);
    };
    const strikes = heavy ? 3 : 1;
    let i = 0;
    strike();
    const timer = setInterval(()=>{
      if (++i >= strikes){ clearInterval(timer); reveal(); return; }
      strike();
    }, 430);

    const self = this;
    function reveal(){
      setTimeout(()=>{
        stage.classList.add('done');
        const out = stage.querySelector('.forge-out');
        if (out) out.classList.add('show');
        if (heavy) self.sparks(stage, color, 16);
      }, 240);
      setTimeout(()=>{ stage.remove(); self.forgeBusy = false; }, 1150);
    }
    return true;
  },

  // 强震动（打铁命中 / 暴击）：大幅位移震荡
  shakeHard(el){
    if (!el || !el.classList) return;
    el.classList.remove('shake-hard');
    void el.offsetWidth;
    el.classList.add('shake-hard');
    setTimeout(()=>el.classList.remove('shake-hard'), 320);
  },

  // 弹跳（获得物品/升级）
  pop(el){
    if (!el || !el.classList) return;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    setTimeout(()=>el.classList.remove('pop'), 350);
  }
};

if (typeof window !== 'undefined') window.FX = FX;
