// ===== ui/map.js — 山海舆图（v1.31.52：真地图版式） =====
// 由 src/ui.js 拆分体系新增（v1.31.51）。加载顺序见 index.html，须在 core.js 之后。
//
// ⚠️ v1.31.51 曾做成「道里图」（一条经一行、横轴是里程），那是行程表，不是地图。
// v1.31.52 改回地图：**逐段积分**原文的「又东三百里」，得到每条经真实的走向——
//   南山经诸段全「东」→ 一条横脉；北山经诸段全「北」→ 一条竖脉；
//   北次三经先东北后东南 → 一条带拐弯的折脉（原文确实如此）。
// 形状由引擎的 regionGeometry 给出（数据导出，不是编的坐标）；
// 本文件只负责「把 26 条经按方位摆到一张图上」。
//
// 关于五系之间的位置：原文各经自首山起算、彼此不通，所以**经与经的相对位置**
// 是排布出来的（按《山海经》的实际方位：北经在上、南经在下、西经在左、东经在右、
// 中经居中）。这一点在页头如实写明，不假装是原文给的坐标。

const MAP_SERIES = {
  nanshan:  { label:'南山经', color:'#2E5269' },
  xishan:   { label:'西山经', color:'#6B6659' },
  beishan:  { label:'北山经', color:'#1F3D5C' },
  dongshan: { label:'东山经', color:'#566E4C' },
  zhongshan:{ label:'中山经', color:'#B03A2B' },
};
const MAP_ORDER = ['beishan','xishan','zhongshan','dongshan','nanshan'];

// 全图版式：五区按方位摆（虚拟坐标系，靠 viewBox 等比缩放到容器宽）
const MAP_ALL = {
  W: 1040, H: 1130,
  scale: 0.032,                       // 1 里 = 0.032 px（全图统一，故北次三经真的最长）
  area: {
    beishan:  { x:56,  y:62,  w:928, h:276, cols:3, rows:1 },
    xishan:   { x:32,  y:362, w:300, h:452, cols:1, rows:4 },
    zhongshan:{ x:376, y:362, w:288, h:452, cols:4, rows:3 },
    dongshan: { x:708, y:362, w:300, h:452, cols:2, rows:2 },
    nanshan:  { x:56,  y:846, w:928, h:252, cols:1, rows:3 },
  },
};
// 单系版式：只画一个山系，画布收窄、字号放大（窄屏才看得清）
const MAP_ONE = {
  xishan:   { W:520, H:300, scale:0.075, cols:1, rows:4 },
  beishan:  { W:520, H:360, scale:0.034, cols:3, rows:1 },
  nanshan:  { W:520, H:330, scale:0.062, cols:1, rows:3 },
  dongshan: { W:520, H:360, scale:0.050, cols:2, rows:2 },
  zhongshan:{ W:520, H:430, scale:0.150, cols:3, rows:4 },
};

// 每座山的三态：已涉 / 此刻所在 / 未涉（未涉再按是否开通分浓淡）
function _mapNodeState(nodeId){
  const visited = !!(Game.map || {})[nodeId];
  const here = (Game.node === nodeId);
  const nd = (typeof nodeOf === 'function') ? nodeOf(nodeId) : null;
  const unlocked = nd ? nodeUnlocked(nd) : false;
  return { visited, here, unlocked };
}

// 一条经的摆放：返回几何 + 绘制原点（形状包围盒左上角）
function _mapPlaceTrack(regionId, box, cols, rows, idx, globalScale){
  const g = (typeof regionGeometry === 'function') ? regionGeometry(regionId) : null;
  if (!g || !g.pts.length) return null;
  const cw = box.w / cols, ch = box.h / rows;
  const cx = box.x + (idx % cols) * cw + cw / 2;
  const cy = box.y + 18 + Math.floor(idx / cols) * ((box.h - 18) / rows) + ((box.h - 18) / rows) / 2;
  // 有里程的经用全局统一比例尺（长短可比）；未载里程的经填满本格（只表顺序，不表里程）
  let sc = globalScale;
  let bb = g.bb;
  if (!g.hasLegs){
    const span = Math.max(1, g.pts[g.pts.length - 1].x);
    sc = (cw * 0.78) / span;
    bb = { x0: 0, y0: 0, w: span, h: 1 };
  }
  return {
    regionId,
    name: ((WORLD.regions.find(r => r.regionId === regionId)) || {}).regionName || regionId,
    pts: g.pts, hasLegs: g.hasLegs, bb, sc,
    ox: cx - bb.w * sc / 2,
    oy: cy - bb.h * sc / 2,
  };
}

// 生成整张图（SVG 字符串）。onlySeries 为空时画全图。
function mapSvg(onlySeries){
  const only = (onlySeries && onlySeries !== 'all') ? onlySeries : null;
  const D = only ? (MAP_ONE[only] || MAP_ONE.nanshan) : MAP_ALL;
  const W = D.W, H = D.H;
  const scale = D.scale;
  const areas = only
    ? { [only]: { x:10, y:46, w:W - 20, h:H - 58, cols:D.cols, rows:D.rows } }
    : MAP_ALL.area;

  const body = [];
  let visitedAll = 0, totalAll = 0;

  // 区域底色 + 系名
  for (const s of MAP_ORDER){
    const a = areas[s];
    if (!a) continue;
    const c = (MAP_SERIES[s] || {}).color || '#4C473E';
    body.push(`<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${c}" fill-opacity=".028" stroke="${c}" stroke-opacity=".1" rx="8"/>`);
    body.push(`<text x="${a.x + 11}" y="${a.y + 17}" font-size="${only?15:13}" font-weight="700" fill="${c}" opacity=".6">${esc((MAP_SERIES[s]||{}).label||s)}</text>`);
  }

  // 逐经摆放并绘制
  for (const s of MAP_ORDER){
    const a = areas[s];
    if (!a) continue;
    const c = (MAP_SERIES[s] || {}).color || '#4C473E';
    const list = (WORLD.regions || []).filter(r => r.regionId.split('-')[0] === s);
    list.forEach((r, i) => {
      const t = _mapPlaceTrack(r.regionId, a, a.cols, a.rows, i, scale);
      if (!t) return;
      const pp = t.pts.map(p => ({
        id: p.id, name: p.name, lv: p.lv,
        x: t.ox + (p.x - t.bb.x0) * t.sc,
        y: t.oy + (p.y - t.bb.y0) * t.sc,
      }));
      // 径：有里程画实线、无里程画虚线（如实标示「原文未载此段里程」）
      const d = pp.map((p, k) => (k ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
      body.push(`<path d="${d}" fill="none" stroke="${c}" stroke-opacity="${t.hasLegs ? .3 : .13}" stroke-width="${only?1.5:1.2}" stroke-linejoin="round" stroke-linecap="round"${t.hasLegs ? '' : ' stroke-dasharray="2 3"'}/>`);
      // 峰形尺寸按「相邻山最小间距」自适应：47 山挤在 3px 间距时，固定尺寸会糊成一条粗线
      let minGap = 999;
      for (let k = 1; k < pp.length; k++){
        const g2 = Math.hypot(pp[k].x - pp[k-1].x, pp[k].y - pp[k-1].y);
        if (g2 > 0.01 && g2 < minGap) minGap = g2;
      }
      const cap = Math.max(1.8, Math.min(only ? 7.5 : 5.4, minGap * 0.52));
      for (const p of pp){
        const st = _mapNodeState(p.id);
        const lv = p.lv || 1;
        const sz = Math.min(cap, (only ? 4.6 : 3.2) + lv / 81 * 2.2);
        const title = `${p.name}${t.hasLegs ? '' : ' · 原文未载此段里程'} · 舆地 ${lv} 级${st.visited ? ' · 已涉' : (st.unlocked ? ' · 可往' : ' · 未开通')}`;
        const tri = `M${(p.x-sz).toFixed(1)} ${(p.y+sz*0.6).toFixed(1)} L${p.x.toFixed(1)} ${(p.y-sz).toFixed(1)} L${(p.x+sz).toFixed(1)} ${(p.y+sz*0.6).toFixed(1)} Z`;
        let art;
        if (st.here){
          art = `<path d="${tri}" fill="var(--zhu,#B03A2B)" fill-opacity=".95" stroke="var(--zhu,#B03A2B)" stroke-width=".8"/>
            <circle cx="${p.x.toFixed(1)}" cy="${(p.y+sz*0.1).toFixed(1)}" r="${(sz*1.9).toFixed(1)}" fill="none" stroke="var(--zhu,#B03A2B)" stroke-opacity=".45" stroke-width="1"/>`;
        } else if (st.visited){
          art = `<path d="${tri}" fill="${c}" fill-opacity=".88" stroke="${c}" stroke-width=".6"/>`;
        } else {
          art = `<path d="${tri}" fill="${c}" fill-opacity="${(0.1 + lv/81*0.3).toFixed(2)}" stroke="${c}" stroke-opacity="${(0.22 + lv/81*0.45).toFixed(2)}" stroke-width=".7"/>`;
        }
        body.push(`<g class="mp-node${st.visited?' on':''}${st.here?' here':''}" style="cursor:pointer"
          onclick="UI.mapPick('${p.id}')"><title>${esc(title)}</title>
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${only?11:9}" fill="transparent"/>${art}</g>`);
      }
      // 经名：写在首山上方（跟着形状走，窄屏滑动时不会丢失归属）
      const f = pp[0];
      body.push(`<text x="${f.x.toFixed(1)}" y="${(f.y - (only?10:8)).toFixed(1)}" font-size="${only?12:8.5}" fill="${c}" opacity=".55">${esc(t.name)}</text>`);
      visitedAll += pp.filter(p => (Game.map||{})[p.id]).length;
      totalAll += pp.length;
    });
  }

  const legend = '实心＝已涉 · 朱峰＝此刻所在 · 空心＝未涉';
  return `<div class="mp-head">
      <b>山海舆图</b>
      <span class="mp-sub">以原文「又东三百里」逐段积分成径：北经北上、南经东行、东经南下。五系各自起算、彼此不通，故按方位分区（位置为排布，形状取自原文）· ${legend}</span>
      <span class="mp-tally">已涉 <b>${visitedAll}</b>/${totalAll} 山</span>
    </div>
    <div class="mp-filters">
      ${['all', ...MAP_ORDER].map(k => {
        const on = ((UI.mapSeries || 'all') === k);
        const label = (k === 'all') ? '全图' : ((MAP_SERIES[k]||{}).label || k);
        return `<button class="chip-btn ${on?'on':''}" type="button" onclick="UI.mapSeries='${k}';UI.renderYudi()">${esc(label)}</button>`;
      }).join('')}
    </div>
    <div class="mp-scroll">
      <svg class="mp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
        aria-label="山海舆图：五系诸经按原文方位与里程积分成径">
        <defs><pattern id="mp-grid" width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M22 0H0V22" fill="none" stroke="#1F1D19" stroke-opacity=".026"/></pattern></defs>
        <rect width="${W}" height="${H}" fill="transparent"/>
        <rect width="${W}" height="${H}" fill="url(#mp-grid)"/>
        ${body.join('')}
      </svg>
    </div>`;
}

// 版面数据（供测试断言；也保留 v1.31.51 的返回形状以免旧断言失效）
function mapLayout(onlySeries){
  const only = (onlySeries && onlySeries !== 'all') ? onlySeries : null;
  const areas = only ? { [only]: true } : MAP_ALL.area;
  const out = {};
  for (const s of MAP_ORDER){
    if (!areas[s]) continue;
    out[s] = (WORLD.regions || []).filter(r => r.regionId.split('-')[0] === s).map(r => {
      const g = regionGeometry(r.regionId);
      return { regionId: r.regionId, name: r.regionName, pts: g.pts, hasLegs: g.hasLegs,
               maxD: Math.max(1, g.bb.w, g.bb.h), total: g.pts.length,
               claimed: g.pts.filter(p => (Game.map||{})[p.id]).length };
    });
  }
  let maxAll = 1;
  for (const s in out) for (const row of out[s]) if (row.maxD > maxAll) maxAll = row.maxD;
  return { bySeries: out, maxAll,
           scale: only ? (MAP_ONE[only]||MAP_ONE.nanshan).scale : MAP_ALL.scale,
           dims: only ? MAP_ONE[only] : MAP_ALL };
}

// 点一座山：选中它并回到「录」（列表）模式，玩家立刻看到该山详情与动作。
// 一期不改玩法——仍然瞬移（travelTo 由详情里的动作按钮触发），此处只做选中。
UI.mapPick = function(nodeId){
  const nod = (typeof nodeOf === 'function') ? nodeOf(nodeId) : null;
  if (!nod) return;
  const reg = (typeof regionOf === 'function') ? regionOf(nodeId) : null;
  if (reg) this.selRegion = reg.regionId;
  this.selNode = nodeId;
  this.mapMode = false;
  this.renderYudi();
  const box = (typeof $ === 'function') ? $('content') : null;
  if (box && box.scrollIntoView) box.scrollIntoView({ block:'start' });
};

window.mapLayout = mapLayout;
window.mapSvg = mapSvg;
window.MAP_ALL = MAP_ALL;
window.MAP_ONE = MAP_ONE;
