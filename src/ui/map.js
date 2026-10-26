// ===== ui/map.js — 山海舆图（道里总图，一期：只读 + 点亮 + 点击瞬移） =====
// 由 src/ui.js 拆分体系新增（v1.31.51）。加载顺序见 index.html，须在 core.js 之后。
//
// 这一页回答一个此前没有答案的问题：「我在整部山海经的什么位置，还有多少没走完」。
// 舆地页原先只有山系方块与诸山列表，玩家看得到「本经 9 座山」，看不到「本经有多长、
// 走完了多少、下一段还有多远」。
//
// ⚠️ 一期只做「看」，不改玩法：点击仍瞬移，没有路程成本。
// 里程数据的两处格式差异已在引擎的 regionRoad 里抹平，这里只负责画。
//
// 关于版式：原文里程是**路径长度**不是坐标——北山经诸段全是「北」，南山经全是「东」，
// 若按方位做二维投影，各系会各自竖直/水平，拼不成一张图（试过两版，都失真）。
// 所以这里用**道里图**：一条经一行，横轴就是真实里程，全图同一比例尺。
// 好处是「哪条经长、哪条经短、走到几成」一眼可见，且不做任何坐标上的虚构。

// 五大山系的显示名与色（与舆地页的山系分组一致，色取设计系统中的青 / 墨 / 苔 / 朱）
const MAP_SERIES = {
  nanshan:  { label:'南山经', color:'#2E5269' },
  xishan:   { label:'西山经', color:'#6B6659' },
  beishan:  { label:'北山经', color:'#1F3D5C' },
  dongshan: { label:'东山经', color:'#566E4C' },
  zhongshan:{ label:'中山经', color:'#B03A2B' },
};
// 顺序照原文：南、西、北、东、中（五藏山经的实际篇次）
const MAP_ORDER = ['nanshan','xishan','beishan','dongshan','zhongshan'];

// 版式常量（虚拟坐标系，靠 viewBox 等比缩放到容器宽）。
// ⚠️ 单系视图必须用**更窄**的虚拟画布：SVG 按 100% 宽等比缩放，
// 若仍用 820 宽，缩到 430px 手机屏就是 0.42 倍，10px 字变 4px——等于看不清。
// 窄画布（420）在同样容器里缩放比接近 0.8，字才有 9–10px 的实际大小。
const MAP_DIMS_ALL  = { W:820, PADL:30, PADR:76, TOPH:96, ROWH:38, GAPX:20, FS_NAME:10.5, FS_META:9.5,  FS_HEAD:14.5, SHOW_DIST:true };
const MAP_DIMS_ONE  = { W:430, PADL:14, PADR:64, TOPH:64, ROWH:52, GAPX:14, FS_NAME:12.5, FS_META:10.5, FS_HEAD:15, SHOW_DIST:false };
// 兼容旧的引用（全图默认值）
const MAP_W = MAP_DIMS_ALL.W, MAP_PADL = MAP_DIMS_ALL.PADL, MAP_PADR = MAP_DIMS_ALL.PADR,
      MAP_TOPH = MAP_DIMS_ALL.TOPH, MAP_ROWH = MAP_DIMS_ALL.ROWH, MAP_GAPX = MAP_DIMS_ALL.GAPX;

// 一条经的「行」数据：把引擎的 regionRoad 转成画图要的形状
function _mapRowOf(region){
  const road = (typeof regionRoad === 'function') ? regionRoad(region.regionId) : [];
  if (!road.length) return null;
  // 原文未载里程的经：按山序等距排布（横轴标注为「未载里程」，不冒充真实里数）
  const hasReal = road.some(r => typeof r.dist === 'number');
  let pts;
  if (hasReal){
    // 个别山缺里程时，用前一座的累计值补齐（不插值臆造，取「沿用上一点」）
    let last = 0;
    pts = road.map(r => {
      if (typeof r.dist === 'number') last = r.dist;
      return { id:r.id, name:r.name, d:last, lv:r.lv };
    });
  } else {
    pts = road.map((r, i) => ({ id:r.id, name:r.name, d:i * 300, lv:r.lv }));
  }
  const maxD = Math.max(...pts.map(p => p.d), 1);
  return { regionId:region.regionId, name:region.regionName, pts, maxD, hasReal,
           claimed: pts.filter(p => (Game.map||{})[p.id]).length, total: pts.length };
}

// 整张图的数据（按系分组）。抽出来是为了测试能直接断言，不用去解析 SVG 字符串。
// onlySeries 为 null 时给全图；指定某系时只算该系（比例尺随之放大，细节可读）。
// 为什么需要它：447 座山挤在 430px 手机屏上，一屏可见但字不可读——
// 这是物理限制，不是排版能解决的。故给「全图 / 单系」两档，玩家自己选要形态还是要细节。
function mapLayout(onlySeries){
  const regions = (typeof WORLD !== 'undefined' && WORLD.regions) || [];
  const bySeries = {};
  for (const r of regions){
    const row = _mapRowOf(r);
    if (!row) continue;
    const s = r.regionId.split('-')[0];
    (bySeries[s] = bySeries[s] || []).push(row);
  }
  if (onlySeries && bySeries[onlySeries]){
    const one = { [onlySeries]: bySeries[onlySeries] };
    const D = MAP_DIMS_ONE;
    let m1 = 1;
    for (const row of one[onlySeries]) if (row.maxD > m1) m1 = row.maxD;
    return { bySeries: one, maxAll: m1, scale: (D.W - D.PADL - D.PADR) / m1, dims: D };
  }
  // 全局同一比例尺：最长的一条经占满可用宽度。
  // 这是「诚实」的关键——不同经的长度差异必须看得见（南次一经 2,700 里 vs 北次三经 12,040 里）。
  let maxAll = 1;
  for (const s in bySeries) for (const row of bySeries[s]) if (row.maxD > maxAll) maxAll = row.maxD;
  const D = MAP_DIMS_ALL;
  const scale = (D.W - D.PADL - D.PADR) / maxAll;
  return { bySeries, maxAll, scale, dims: D };
}

// 舆地图主体（SVG 字符串）
function mapSvg(){
  const only = (UI.mapSeries && UI.mapSeries !== 'all') ? UI.mapSeries : null;
  const { bySeries, maxAll, scale, dims } = mapLayout(only);
  const W = dims.W, PADL = dims.PADL, PADR = dims.PADR, TOPH = dims.TOPH,
        ROWH = dims.ROWH, GAPX = dims.GAPX;
  const FS_NAME = dims.FS_NAME, FS_META = dims.FS_META, FS_HEAD = dims.FS_HEAD;
  const rows = [];
  let y = TOPH, H = TOPH;
  for (const s of MAP_ORDER){ if (bySeries[s]) H += 26 + bySeries[s].length * ROWH + GAPX; }
  H += 24;

  const hereId = Game.node;
  let visitedAll = 0, totalAll = 0;
  for (const s of MAP_ORDER) for (const row of (bySeries[s]||[])){ visitedAll += row.claimed; totalAll += row.total; }

  for (const s of MAP_ORDER){
    const g = bySeries[s];
    if (!g || !g.length) continue;
    const meta = MAP_SERIES[s] || { label:s, color:'#4C473E' };
    const c = meta.color;
    const bandTop = y - 6, bandH = 26 + g.length * ROWH + GAPX - 8;
    rows.push(`<rect x="0" y="${bandTop}" width="${W}" height="${bandH}" fill="${c}" fill-opacity=".032"/>`);
    rows.push(`<line x1="0" y1="${bandTop}" x2="${W}" y2="${bandTop}" stroke="${c}" stroke-opacity=".12"/>`);
    rows.push(`<text x="14" y="${y + 13}" font-size="${FS_HEAD}" font-weight="700" fill="${c}" opacity=".8">${esc(meta.label)}</text>`);
    y += 26;
    for (const row of g){
      const cy = y + ROWH / 2 - 4;
      const x2 = PADL + row.maxD * scale;
      // 里程轴：有真实里程画实线，无则虚线（如实标示「未载里程」）
      rows.push(`<line x1="${PADL}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${cy}" stroke="${c}"
        stroke-opacity=".16" stroke-width="1"${row.hasReal ? '' : ' stroke-dasharray="2 3"'}/>`);
      // 经名写在道左端上方：原先放在左侧留白里，窄屏横滑时会被切掉，
      // 玩家滑到中段就不知道自己在看哪条经。现在它跟着行首走。
      rows.push(`<text x="${PADL}" y="${cy - 9}" font-size="${FS_NAME}" fill="${c}" opacity=".62">${esc(row.name)}</text>`);
      for (const p of row.pts){
        const px = PADL + p.d * scale;
        const lv = p.lv || 1;
        const rr = (1.8 + lv / 81 * 1.5).toFixed(1);
        const isHere = (p.id === hereId);
        const isVisited = !!(Game.map || {})[p.id];
        const unlocked = (()=>{ const nd = nodeOf(p.id); return nd ? nodeUnlocked(nd) : false; })();
        const title = `${p.name}${row.hasReal ? ` · ${Math.round(p.d)} 里` : ''} · 舆地 ${lv} 级${isVisited ? ' · 已涉' : (unlocked ? ' · 可往' : ' · 未开通')}`;
        // 热区：点多小都要好点中，故叠一枚透明大点（半径 9）
        let dot;
        if (isHere){
          // 此刻所在：朱色实心 + 外环（与全站的「朱＝此刻」一致）
          dot = `<circle cx="${px.toFixed(1)}" cy="${cy}" r="${(Number(rr)+2.6).toFixed(1)}" fill="none" stroke="var(--zhu,#B03A2B)" stroke-opacity=".55" stroke-width="1.2"/>
                 <circle cx="${px.toFixed(1)}" cy="${cy}" r="${rr}" fill="var(--zhu,#B03A2B)" fill-opacity=".95"/>`;
        } else if (isVisited){
          dot = `<circle cx="${px.toFixed(1)}" cy="${cy}" r="${rr}" fill="${c}" fill-opacity=".85"/>`;
        } else {
          dot = `<circle cx="${px.toFixed(1)}" cy="${cy}" r="${rr}" fill="none" stroke="${c}"
                 stroke-opacity="${(0.28 + lv / 81 * 0.5).toFixed(2)}" stroke-width="1"/>`;
        }
        rows.push(`<g class="mp-node${isVisited?' on':''}${isHere?' here':''}" style="cursor:pointer"
          onclick="UI.mapPick('${p.id}')"><title>${esc(title)}</title>
          <circle cx="${px.toFixed(1)}" cy="${cy}" r="9" fill="transparent"/>${dot}</g>`);
      }
      const metaTxt = dims.SHOW_DIST
        ? `${row.total} 山${row.hasReal ? ` · ${Math.round(row.maxD)} 里` : ' · 未载里程'}`
        : `${row.total} 山`;
      rows.push(`<text x="${(x2 + 10).toFixed(1)}" y="${cy + 4}" font-size="${FS_META}" fill="${c}" opacity=".5">${metaTxt}</text>`);
      y += ROWH;
    }
    y += GAPX;
  }

  return `<div class="mp-head">
      <b>山海道里图</b>
      <span class="mp-sub">横为原文里程（同一比例尺：最长一经 ${maxAll} 里 ＝ ${Math.round(W - PADL - PADR)} px）· 实心＝已涉 · 朱点＝此刻所在 · 窄屏可左右滑动</span>
      <span class="mp-tally">已涉 <b>${visitedAll}</b>/${totalAll} 山</span>
    </div>
    <div class="mp-filters">
      ${['all', ...MAP_ORDER].map(k => {
        const on = ((UI.mapSeries || 'all') === k);
        const label = (k === 'all') ? '全图' : (MAP_SERIES[k] ? MAP_SERIES[k].label : k);
        const color = (k === 'all') ? '' : (MAP_SERIES[k] ? MAP_SERIES[k].color : '');
        return `<button class="chip-btn ${on?'on':''}" type="button"${color?` style="--sc:${color}"`:''}
          onclick="UI.mapSeries='${k}';UI.renderYudi()">${esc(label)}</button>`;
      }).join('')}
    </div>
    <div class="mp-scroll">
      <svg class="mp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img"
        aria-label="山海道里图：五系诸经按原文里程排布">
        <rect width="${MAP_W}" height="${H}" fill="transparent"/>
        <text x="14" y="40" font-size="11" fill="#4C473E" opacity=".55">诸经依原文次第；原文未载分段里程之经，按山序等距排布并以虚线标示</text>
        ${rows.join('')}
      </svg>
    </div>`;
}

// 点一座山：选中它并回到「录」（列表）模式，玩家立刻看到该山详情与动作。
// 一期不改玩法——仍然瞬移（travelTo 由详情里的动作按钮触发），此处只做选中。
UI.mapPick = function(nodeId){
  const nod = (typeof nodeOf === 'function') ? nodeOf(nodeId) : null;
  if (!nod) return;
  const reg = (typeof regionOf === 'function') ? regionOf(nodeId) : null;
  if (reg) this.selRegion = reg.regionId;
  this.selNode = nodeId;
  this.mapMode = false;            // 回到列表：地图是「导航」，不是终点
  this.renderYudi();
  const box = (typeof $ === 'function') ? $('content') : null;
  if (box && box.scrollIntoView) box.scrollIntoView({ block:'start' });
};

window.mapLayout = mapLayout;
window.mapSvg = mapSvg;
