// ===== 存档层：可插拔存储 · 版本迁移 · 多端合并 =====
// 为将来的云端存档提前铺路（业务层零改动即可切换后端）：
//   · 业务代码只与「一个存档对象」打交道，不直接依赖 localStorage；
//   · 存档带 schema 版本号与迁移链，老档自动升级、不丢数据；
//   · 存储后端可插拔（本地 / 云端），序列化与迁移逻辑共用一份；
//   · 多端同时改档按规则合并，避免「后写覆盖先写」丢档；
//   · 本地维护 rev（修订号）/ dirty（脏标记）/ deviceId 元数据，
//     为将来的上传、下载、冲突检测与同步留好钩子。
//
// 依赖：仅用标准 Web API，不引用本项目其它模块（保证可独立测试）。

const SAVE_VERSION = 6;                       // 当前存档结构版本（v6：行囊装备按件存，含各自强化档）
const SAVE_KEY = 'shj_zhulu_save_v1';         // 本地存档键（沿用旧键，旧档直接可读）
const SAVE_TIME_KEY = SAVE_KEY + '_time';     // 最后写入时间戳（离线结算用）
const SAVE_META_KEY = 'shj_zhulu_meta_v1';    // 元数据：rev / dirty / savedAt / deviceId
const DEVICE_KEY = 'shj_device_id';           // 本机设备标识（多端冲突与审计用）
const CLOUD_CFG_KEY = 'shj_cloud_cfg_v1';     // 云端接入配置：endpoint / token / autoSync
const SYNC_DEBOUNCE_MS = 3000;                // 停止改动后多久自动上传（防抖）

// ---------- 版本迁移链 ----------
// SAVE_MIGRATIONS[n] 表示「把 n 版存档升到 n+1 版」的补丁函数。
// 新增字段一律在此登记，不要直接改老版本语义，否则线上老档会读崩。
const SAVE_MIGRATIONS = {
  // v1 → v2：补齐连续讨伐计数与方国求购订单
  1: (d) => {
    d.mobStreak = (d.mobStreak && typeof d.mobStreak === 'object') ? d.mobStreak : {};
    d.orders = Array.isArray(d.orders) ? d.orders : [];
    d.ordersAt = isFinite(d.ordersAt) ? d.ordersAt : 0;
    return d;
  },
  // v5 → v6：行囊装备从「按 id 计数 + 共享一档强化」改为「按件实例」
  // 旧的 enhance[id] 是整堆共享的，迁过来就是 n 件同一档——语义不变，只是能分开了。
  5: (d) => {
    const inv = (d.inventory && typeof d.inventory === 'object') ? d.inventory : {};
    const enh = (d.enhance && typeof d.enhance === 'object') ? d.enhance : {};
    const out = [];
    if (Array.isArray(d.packGear)) out.push(...d.packGear);
    for (const id of Object.keys(inv)){
      const n = Math.floor(inv[id] || 0);
      if (n <= 0) continue;
      const isEquip = !!(typeof Items !== 'undefined' && Items[id] && Items[id].equip);
      if (!isEquip) continue;
      const lv = Math.max(0, parseInt(enh[id], 10) || 0);
      for (let i = 0; i < n; i++) out.push({ id, enh: lv });
      delete inv[id];
    }
    d.inventory = inv;
    d.packGear = out;
    return d;
  },
  // v4 → v5：会员权益快照（现在恒为未开通；账号系统登录后写入 tier / until）
  4: (d) => {
    const m = (d.member && typeof d.member === 'object') ? d.member : {};
    d.member = { tier: typeof m.tier === 'string' ? m.tier : 'none', until: isFinite(m.until) ? m.until : 0 };
    return d;
  },
  // v3 → v4：轮回记录（转生次数 / 时刻 / 历史最高总等级）
  3: (d) => {
    const r = (d.rebirth && typeof d.rebirth === 'object') ? d.rebirth : {};
    d.rebirth = { count: isFinite(r.count) ? r.count : 0, at: isFinite(r.at) ? r.at : 0, best: isFinite(r.best) ? r.best : 0 };
    return d;
  },
  // v2 → v3：补齐养成点、丹木、征兆免疫等结构
  2: (d) => {
    d.grow = (d.grow && typeof d.grow === 'object') ? d.grow : {};
    d.danmu = (d.danmu && typeof d.danmu === 'object') ? d.danmu : { stage:0, done:0 };
    d.omenImmune = (d.omenImmune && typeof d.omenImmune === 'object') ? d.omenImmune : {};
    return d;
  },
};

// 把任意历史版本的存档升到当前版本。迁移链断了也不抛错：跳过该级继续往上，
// 最后由 engine 的读档校正逻辑补齐缺失字段（保证「宁可少字段，不可读不进来」）。
function migrateSave(d){
  if (!d || typeof d !== 'object' || Array.isArray(d)) return d;
  let v = (isFinite(d.version) && d.version > 0) ? Math.floor(d.version) : 1;
  let guard = 0;
  while (v < SAVE_VERSION && guard++ < 32){
    const fn = SAVE_MIGRATIONS[v];
    if (fn){
      try { const out = fn(d); if (out && typeof out === 'object') d = out; }
      catch(e){ console.error('存档迁移失败（v'+v+'）', e); }
    }
    v++;
    d.version = v;
  }
  if (!isFinite(d.version) || d.version < SAVE_VERSION) d.version = SAVE_VERSION;
  return d;
}

// ---------- 序列化：内存状态 → 存档对象 ----------
// 字段白名单在此集中声明：新增可持久化字段只改这里，且必须同步登记迁移函数。
function serializeSave(){
  const G = (typeof Game !== 'undefined') ? Game : ((typeof window !== 'undefined' && window.Game) || {});
  const P = (typeof Prefs !== 'undefined') ? Prefs : ((typeof window !== 'undefined' && window.Prefs) || {});
  if (!G || !G.shells && !G.inventory) return null;
  G.skills = G.skills || {};
  return {
    version: SAVE_VERSION,
    // 同步元数据：随负载一起落盘，供多端合并判定新旧、供服务端做冲突检测
    savedAt: Date.now(),
    rev: (typeof SaveManager !== 'undefined') ? SaveManager.rev() : 0,
    deviceId: (typeof SaveManager !== 'undefined') ? SaveManager.deviceId() : '',
    shells: G.shells, nickname: G.nickname || '', banking: G.banking, inventory: G.inventory,
    skills: G.skills, gear: G.gear, records: G.records, map: G.map, observed: G.observed,
    buildings: G.buildings, deployed: G.deployed, omens: G.omens, rites: G.rites,
    riteOf: G.riteOf || {}, riteAuto: G.riteAuto || {}, riteStall: G.riteStall || {},
    omensPending: G.omensPending || [],
    recentLoot: G.recentLoot || [], omenImmune: G.omenImmune || {},
    danmu: G.danmu || { stage:0, done:0 }, grow: G.grow || {}, buff: G.buff, farms: G.farms,
    node: G.node, activity: G.activity || null, stats: G.stats, startedAt: G.startedAt,
    prefs: P,
    queue: G.queue || [], queueIdx: G.queueIdx || 0, queueRound: G.queueRound || 0,
    queueRunning: !!G.queueRunning, queueLoop: G.queueLoop !== false, fallback: G.fallback || null,
    mobStreak: G.mobStreak || {}, orders: G.orders || [], ordersAt: G.ordersAt || 0,
    enhance: G.enhance || {}, enhanceHeat: G.enhanceHeat || {}, affixSalt: G.affixSalt || {},
    // 行囊装备：一件一条，各自带淬炼档（v6）
    packGear: Array.isArray(G.packGear) ? G.packGear.map(g => ({ id: g.id, enh: g.enh | 0 })) : [],
    rebirth: G.rebirth || { count:0, at:0, best:0 },
    // 会员权益快照：由账号层写入，本地只读；未登录时恒为 { tier:'none', until:0 }
    member: G.member || { tier:'none', until:0 },
    bounties: Array.isArray(G.bounties) ? G.bounties.slice(0, 3) : [],
    // 只记「离山时在打谁」，不记战斗细节：战斗本身不跨会话恢复（见 applySave 注释），
    // 这一项只为离线结算知道该往哪只怪身上算账。
    combat: G.combat ? { monsterId: G.combat.monsterId } : null,
  };
}

// ---------- 存储后端 ----------
// 后端只需实现 read / write / remove / available 四个方法。
// 业务层永远只走 SaveManager，不直接碰某个具体后端。

const LocalSaveStore = {
  id: 'local',
  label: '本地存档',
  available(){ return true; },
  read(){ try { return localStorage.getItem(SAVE_KEY); } catch(e){ return null; } },
  write(text){ try { localStorage.setItem(SAVE_KEY, text); return true; } catch(e){ console.error('保存失败', e); return false; } },
  remove(){ try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_TIME_KEY); } catch(e){} },
};

// 云端后端（接口齐备，默认未启用；接后端时只需 SaveManager.setCloud({endpoint, token})）。
// 约定：GET  /save 返回 { payload, rev, savedAt }；PUT /save 接收 { payload, rev, deviceId }。
// write 第二参可传 { keepalive:true }：页面关闭前的最后一次上传用，浏览器会把请求
// 保留到页面销毁之后（限 64KB 以内；超限会抛错由 sync 捕获记入 lastError）。
function createCloudStore(cfg){
  cfg = cfg || {};
  const endpoint = String(cfg.endpoint || '').replace(/\/+$/, '');
  const tokenOf = typeof cfg.token === 'function' ? cfg.token : () => (cfg.token || '');
  const auth = () => {
    const h = { 'Content-Type':'application/json' };
    const t = tokenOf();
    if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  };
  return {
    id:'cloud', label:'云端存档', endpoint:endpoint,
    available(){ return !!endpoint && typeof fetch === 'function'; },
    async read(){
      if (!this.available()) return null;
      const res = await fetch(endpoint + '/save', { headers: auth() });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('云端读取失败 HTTP ' + res.status);
      const j = await res.json();
      if (!j) return null;
      return (typeof j.payload === 'string') ? j.payload : JSON.stringify(j);
    },
    async write(text, opts){
      if (!this.available()) return false;
      const opt = { method:'PUT', headers: auth(),
        body: JSON.stringify({ payload:text, rev:SaveManager.rev(), deviceId:SaveManager.deviceId() }) };
      if (opts && opts.keepalive) opt.keepalive = true;
      const res = await fetch(endpoint + '/save', opt);
      if (!res.ok) throw new Error('云端写入失败 HTTP ' + res.status);
      return true;
    },
    async remove(){
      if (!this.available()) return false;
      const res = await fetch(endpoint + '/save', { method:'DELETE', headers: auth() });
      return res.ok;
    },
  };
}

// ---------- 多端合并 ----------
// 规则：单调递增的字段取「两边较大值」（经验/等级/著录/统计，绝不倒退）；
// 其余可变资源（贝币/行囊/仓廪/装备）取「较新一档」，避免合并出凭空物资。
function mergeSkillMap(a, b){
  const out = {};
  const keys = Object.keys(a || {}).concat(Object.keys(b || {}));
  keys.forEach(k => {
    const x = (a && a[k]) || null, y = (b && b[k]) || null;
    if (!x) out[k] = y;
    else if (!y) out[k] = x;
    else out[k] = {
      level: Math.max(x.level || 0, y.level || 0),
      xp: Math.max(x.xp || 0, y.xp || 0),
    };
  });
  return out;
}
function mergeRecordMap(a, b){
  const out = {};
  const keys = Object.keys(a || {}).concat(Object.keys(b || {}));
  keys.forEach(k => {
    const x = (a && a[k]) || null, y = (b && b[k]) || null;
    if (!x) out[k] = y;
    else if (!y) out[k] = x;
    else out[k] = {
      count: Math.max(x.count || 0, y.count || 0),
      tier: Math.max(x.tier || 0, y.tier || 0),
    };
  });
  return out;
}
function mergeStatMap(a, b){
  const out = {};
  const keys = Object.keys(a || {}).concat(Object.keys(b || {}));
  keys.forEach(k => {
    const x = a ? a[k] : undefined, y = b ? b[k] : undefined;
    if (x && typeof x === 'object'){
      // 嵌套对象（bossKills / gathers / omens / seenMilestones）：按并集合并
      out[k] = Object.assign({}, x, y || {});
    } else if (isFinite(x) || isFinite(y)){
      out[k] = Math.max(isFinite(x) ? x : 0, isFinite(y) ? y : 0);
    } else out[k] = x !== undefined ? x : y;
  });
  return out;
}
function mergeGrowMap(a, b){
  const out = {};
  const keys = Object.keys(a || {}).concat(Object.keys(b || {}));
  keys.forEach(k => {
    const x = (a && a[k]) || null, y = (b && b[k]) || null;
    if (!x) out[k] = y;
    else if (!y) out[k] = x;
    else out[k] = {
      stage: Math.max(x.stage || 0, y.stage || 0),
      done: Math.max(x.done || 0, y.done || 0),
    };
  });
  return out;
}

// 合并两档存档（local / remote）。savedAt 缺失时以 0 计，等价于「无时间戳的一档更旧」。
// 合并原则：
//   · 单调递增字段（经验/等级/著录/统计/养成）取两边较大值 —— 绝不倒退；
//   · 布尔集合（地图节点 / 已观象 / 已营造 / 免疫）取并集 —— 不丢已达成；
//   · 物品数量（行囊 / 仓廪）逐项取较大值 —— 采集是累加行为，取大即可保留两端
//     各自收获的更多份；若一端已消耗该物品，另一端更多的那份即为真实留存量。
//   · 贝币取较新一档（贝币可花可赚，不适合取大，否则可凭空造钱）。
function mergeBag(local, remote){
  const out = {};
  const keys = Object.keys(local || {}).concat(Object.keys(remote || {}));
  keys.forEach(k => {
    const x = local ? local[k] : undefined;
    const y = remote ? remote[k] : undefined;
    if (x === undefined) out[k] = y;
    else if (y === undefined) out[k] = x;
    else out[k] = Math.max(isFinite(x) ? x : 0, isFinite(y) ? y : 0);
  });
  return out;
}

function mergeSaveData(local, remote){
  if (!local) return remote;
  if (!remote) return local;
  const lt = isFinite(local.savedAt) ? local.savedAt : 0;
  const rt = isFinite(remote.savedAt) ? remote.savedAt : 0;
  const remoteNewer = (rt >= lt);
  const newer = remoteNewer ? remote : local;
  const older = remoteNewer ? local  : remote;
  const out = Object.assign({}, older, newer);
  out.version = SAVE_VERSION;
  out.skills = mergeSkillMap(local.skills, remote.skills);
  out.records = mergeRecordMap(local.records, remote.records);
  out.stats = mergeStatMap(local.stats, remote.stats);
  out.grow = mergeGrowMap(local.grow, remote.grow);
  out.map = Object.assign({}, local.map || {}, remote.map || {});
  out.observed = Object.assign({}, local.observed || {}, remote.observed || {});
  out.buildings = Object.assign({}, local.buildings || {}, remote.buildings || {});
  out.omenImmune = Object.assign({}, local.omenImmune || {}, remote.omenImmune || {});
  out.inventory = mergeBag(local.inventory, remote.inventory);
  out.banking = mergeBag(local.banking, remote.banking);
  out.danmu = {
    stage: Math.max((local.danmu && local.danmu.stage) || 0, (remote.danmu && remote.danmu.stage) || 0),
    done:  Math.max((local.danmu && local.danmu.done)  || 0, (remote.danmu && remote.danmu.done)  || 0),
  };
  return out;
}

// ---------- 元数据（rev / dirty / deviceId） ----------
function readSaveMeta(){
  try {
    const raw = localStorage.getItem(SAVE_META_KEY);
    if (!raw) return { rev:0, dirty:false, savedAt:0, deviceId:'' };
    const m = JSON.parse(raw);
    return {
      rev: isFinite(m.rev) ? m.rev : 0,
      dirty: !!m.dirty,
      savedAt: isFinite(m.savedAt) ? m.savedAt : 0,
      deviceId: m.deviceId || '',
    };
  } catch(e){ return { rev:0, dirty:false, savedAt:0, deviceId:'' }; }
}
function writeSaveMeta(m){
  try { localStorage.setItem(SAVE_META_KEY, JSON.stringify(m)); } catch(e){}
}

// ---------- 云端接入配置（端点 / 令牌 / 自动同步） ----------
// 配置持久化在 localStorage：玩家填一次，下次开页自动恢复接入（restore()）。
// 令牌只存本机浏览器，随配置一起走，不随存档负载上传。
function readCloudConfig(){
  try {
    const raw = localStorage.getItem(CLOUD_CFG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || typeof c !== 'object' || !c.endpoint) return null;
    return {
      endpoint: String(c.endpoint).replace(/\/+$/, ''),
      token: String(c.token || ''),
      autoSync: c.autoSync !== false,
    };
  } catch(e){ return null; }
}
function writeCloudConfig(cfg){
  try { localStorage.setItem(CLOUD_CFG_KEY, JSON.stringify(cfg)); } catch(e){}
}

// ---------- 存档管理器：业务层唯一入口 ----------
const SaveManager = {
  version: SAVE_VERSION,
  store: LocalSaveStore,          // 当前主后端（本地）
  cloud: null,                    // 云端后端（未接入时为 null）
  syncState: 'idle',              // idle | pending | syncing | ok | error | offline
  lastSyncAt: 0,
  lastError: '',
  _syncing: false,
  _syncTimer: 0,                  // 防抖自动同步的定时器句柄

  deviceId(){
    let id = '';
    try { id = localStorage.getItem(DEVICE_KEY) || ''; } catch(e){}
    if (!id){
      id = 'dev-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      try { localStorage.setItem(DEVICE_KEY, id); } catch(e){}
    }
    return id;
  },
  rev(){ return readSaveMeta().rev; },
  meta(){ return readSaveMeta(); },

  // 写入本地存档。rev 自增并置 dirty（= 有尚未上传云端的改动）。
  save(){
    const data = serializeSave();
    if (!data) return false;
    const text = JSON.stringify(data);
    const ok = this.store.write(text);
    if (!ok) return false;
    const m = readSaveMeta();
    writeSaveMeta({ rev: m.rev + 1, dirty: true, savedAt: Date.now(), deviceId: this.deviceId() });
    try { localStorage.setItem(SAVE_TIME_KEY, String(Date.now())); } catch(e){}
    if (this.cloud && this.cloud.available() && this.syncState !== 'syncing') this.syncState = 'pending';
    return true;
  },

  // 读取本地存档（已做版本迁移）。无档返回 null。
  load(){
    const raw = this.store.read();
    if (!raw) return null;
    let d;
    try { d = JSON.parse(raw); } catch(e){ return null; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
    const before = d.version;
    d = migrateSave(d);
    // 版本回写：老档迁移后立刻以新版本落盘，避免每次启动都重跑一遍迁移链
    if (before !== d.version){
      try { this.store.write(JSON.stringify(d)); } catch(e){}
    }
    return d;
  },

  // 导出：文本形式，可粘贴到别处 / 上传云端
  exportText(){
    const raw = this.store.read();
    return raw || '';
  },

  // 导入：接受文本或对象；成功后重载内存状态由调用方负责
  importText(raw){
    if (!raw || typeof raw !== 'string') return { ok:false, reason:'内容为空' };
    let d;
    try { d = JSON.parse(raw); } catch(e){ return { ok:false, reason:'不是合法的 JSON' }; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) return { ok:false, reason:'格式不是存档对象' };
    if (!isFinite(d.shells) || typeof d.inventory !== 'object' || typeof d.skills !== 'object'){
      return { ok:false, reason:'缺少存档字段（shells / inventory / skills）' };
    }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(migrateSave(d))); }
    catch(e){ return { ok:false, reason:'写入本地存储失败' }; }
    const m = readSaveMeta();
    writeSaveMeta({ rev: m.rev + 1, dirty: true, savedAt: Date.now(), deviceId: this.deviceId() });
    return { ok:true, reason:'导入成功' };
  },

  // 清档（本地 + 可选云端）
  reset(){
    this.store.remove();
    try { localStorage.removeItem(SAVE_TIME_KEY); localStorage.removeItem(SAVE_META_KEY); } catch(e){}
    if (this.cloud && this.cloud.available()){
      try { this.cloud.remove(); } catch(e){}
    }
  },

  // 接入云端后端：登记 + 持久化配置（下次开页由 restore() 自动恢复）。
  // endpoint 为空表示断开。自动同步默认开启，可显式传 autoSync:false 关闭。
  setCloud(cfg){
    const c = cfg || {};
    const norm = {
      endpoint: String(c.endpoint || '').replace(/\/+$/, ''),
      token: String(c.token || ''),
      autoSync: c.autoSync !== false,
    };
    this.cloud = norm.endpoint ? createCloudStore(norm) : null;
    if (this.cloud){
      writeCloudConfig(norm);
      this.syncState = 'pending';
      this.lastError = '';
    } else {
      this.clearCloud();
    }
    return this.cloud;
  },
  // 当前云端接入配置（无配置返回 null）
  cloudConfig(){ return readCloudConfig(); },
  // 断开云端：保留本地存档与设置页已填信息由调用方决定；服务端存档不动
  //（要连服务端一起抹掉请用 reset()，它会 DELETE 云端档）。
  clearCloud(){
    this.cloud = null;
    this.syncState = 'offline';
    clearTimeout(this._syncTimer);
    this._syncTimer = 0;
    try { localStorage.removeItem(CLOUD_CFG_KEY); } catch(e){}
  },
  // 恢复上次接入的云端配置（init 时调用一次）；未配置过返回 null。
  restore(){
    const cfg = readCloudConfig();
    if (cfg && cfg.endpoint){
      this.cloud = createCloudStore(cfg);
      return this.cloud;
    }
    return null;
  },

  // 同步可用性（同步返回，供 UI 直接展示状态，无需 await）
  syncReady(){
    if (!this.cloud || !this.cloud.available()) return { ready:false, reason:'云端未接入', state:'offline' };
    const m = readSaveMeta();
    return { ready:true, reason:m.dirty ? '有待上传的改动' : '已与云端一致', state:this.syncState, dirty:m.dirty, rev:m.rev };
  },

  // 防抖自动同步：本地每次存档后调用（engine.saveGame 已接）。
  // 未接入 / 关闭了自动同步 / 正在同步中 → 安全跳过；否则标记 pending 并重启防抖计时。
  scheduleSync(){
    if (!this.cloud || !this.cloud.available() || this._syncing) return false;
    const cfg = readCloudConfig();
    if (!cfg || cfg.autoSync === false) return false;
    this.syncState = 'pending';
    clearTimeout(this._syncTimer);
    this._syncTimer = setTimeout(()=>{ this._syncTimer = 0; this.sync(); }, SYNC_DEBOUNCE_MS);
    return true;
  },
  // 立即同步（页面隐藏 / 关闭 / 手动「立即上传」）：取消防抖，马上传。
  // keepalive 让 beforeunload 里的请求在页面销毁后继续完成。
  flushSync(){
    clearTimeout(this._syncTimer);
    this._syncTimer = 0;
    return this.sync(true);
  },

  // 上传本地改动到云端（幂等：dirty 为假直接跳过）
  async sync(keepalive){
    if (!this.cloud || !this.cloud.available()){ this.syncState = 'offline'; return { ok:false, reason:'云端未接入' }; }
    if (this._syncing) return { ok:false, reason:'同步中' };
    const m = readSaveMeta();
    if (!m.dirty) return { ok:true, reason:'无改动' };
    this._syncing = true;
    this.syncState = 'syncing';
    try {
      const raw = this.store.read();
      if (!raw) return { ok:false, reason:'本地无存档' };
      await this.cloud.write(raw, keepalive ? { keepalive:true } : undefined);
      writeSaveMeta({ ...m, dirty:false, savedAt:Date.now(), deviceId:this.deviceId() });
      this.lastSyncAt = Date.now();
      this.syncState = 'ok';
      this.lastError = '';
      return { ok:true, reason:'已同步' };
    } catch(e){
      this.syncState = 'error';
      this.lastError = (e && e.message) ? e.message : String(e);
      return { ok:false, reason:this.lastError };
    } finally { this._syncing = false; }
  },

  // 从云端拉取并与本地合并（多端同时改档时按合并规则处理，不丢进度）。
  // 合并结果即刻落本地；合并档与云端不再一致，标记 dirty 让下一次同步把合并结果推回去，
  // 否则另一台设备拉到的会是「未合并的旧云端档」，多端进度各说各话。
  async pull(){
    if (!this.cloud || !this.cloud.available()){ this.syncState = 'offline'; return { ok:false, reason:'云端未接入' }; }
    try {
      const raw = await this.cloud.read();
      if (!raw) return { ok:false, reason:'云端无存档' };
      const remote = migrateSave(JSON.parse(raw));
      const local = this.load();
      const merged = mergeSaveData(local, remote);
      // 合并结果即刻落本地，避免「合并了但没保存」导致下次启动又退回旧档
      merged.savedAt = Date.now();
      if (!this.store.write(JSON.stringify(merged))) return { ok:false, reason:'合并结果写入本地失败' };
      const m = readSaveMeta();
      writeSaveMeta({ rev: m.rev + 1, dirty:true, savedAt:Date.now(), deviceId:this.deviceId() });
      this.lastSyncAt = Date.now();
      this.syncState = 'pending';
      return { ok:true, reason:'已合并云端存档', data:merged };
    } catch(e){
      this.syncState = 'error';
      this.lastError = (e && e.message) ? e.message : String(e);
      return { ok:false, reason:this.lastError };
    }
  },
};

if (typeof window !== 'undefined'){
  window.SaveManager = SaveManager;
  window.LocalSaveStore = LocalSaveStore;
  window.createCloudStore = createCloudStore;
  window.migrateSave = migrateSave;
  window.serializeSave = serializeSave;
  window.mergeSaveData = mergeSaveData;
  // 给 ui.js 初始化用的薄封装（不抛错）。
  // 原先还有一个 restoreCloudSave：自从「云端配置不再在启动时自动套用」后
  // 就没有调用者了——留着只会让人以为启动时还在恢复云端档。
  window.flushCloudSave = function(){
    try { return SaveManager.flushSync(); } catch(e){ return Promise.resolve({ ok:false, reason:String(e) }); }
  };
}
