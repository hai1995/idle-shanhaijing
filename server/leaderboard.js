#!/usr/bin/env node
// 《山海经 · 著录》群英榜参考后端（零依赖，Node >= 18）
// 复用 cloud-save-server.js 的零依赖骨架（CORS / Bearer token / 原子写 / 127.0.0.1 监听）。
// 这是一个爱好榜：数值只取各人历史最大值入榜，重复投递不会刷低自己；
// 它挡不住换名刷分，也不做任何账号校验。纯前端游戏本就无账号，服务端只收战绩数字与昵称。
//
// 接口：
//   GET    /api/ping                                  -> { ok:true, count }
//   GET    /api/leaderboard?metric=totalXp&limit=50    -> { metric, rows:[ {rank,name,value,at,v} ] }
//   POST   /api/score  <- { name, totalXp, rebirthCount, recorded, codexTotal, bestSec, bounties, bestEnhance, v }
//                                                        -> { ok:true, rank, total }
//
// 用法：
//   node server/leaderboard.js [--port 8788] [--data ./leaderboard.json] [--token secret]
// 环境变量：PORT / DATA_FILE / CLOUD_TOKEN（命令行优先）。
// 默认只监听 127.0.0.1；要给别人用，请自行放到反代 / 内网后面，并务必设置 token。

const http = require('http');
const fs = require('fs');
const path = require('path');

function argOf(name, dflt){
  const i = process.argv.indexOf(name);
  return (i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) ? process.argv[i + 1] : dflt;
}
const PORT = parseInt(argOf('--port', process.env.PORT || '8788'), 10);
const DATA_FILE = path.resolve(argOf('--data', process.env.DATA_FILE || path.join(__dirname, 'leaderboard.json')));
const TOKEN = argOf('--token', process.env.CLOUD_TOKEN || '');

// 各数值只取各人最大值入榜；允许排序的指标白名单
const METRICS = { totalXp: true, recorded: true, rebirthCount: true };
const LIMIT_MAX = 200;

let db = {};   // { name: { name, totalXp, rebirthCount, recorded, codexTotal, bestSec, bounties, bestEnhance, v, at } }
try {
  if (fs.existsSync(DATA_FILE)) db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) || {};
} catch(e){ console.error('榜单文件读取失败，按空库启动：', e.message); }

function persist(){
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DATA_FILE);   // 同目录原子替换
}

function cors(res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
function send(res, code, obj){
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readBody(req){
  return new Promise((resolve, reject)=>{
    let raw = '';
    req.on('data', c=>{ raw += c; if (raw.length > 16 * 1024){ reject(new Error('body too large')); req.destroy(); } });
    req.on('end', ()=>resolve(raw));
    req.on('error', reject);
  });
}

// 把投递的字段清洗成可信数值；任何一项不合法即整条拒绝
function sanitizeScore(j){
  if (!j || typeof j !== 'object') return null;
  const name = String(j.name == null ? '' : j.name).trim().replace(/[<>]/g, '').slice(0, 16);
  if (!name) return null;
  const num = (v, max) => {
    const n = Number(v);
    return (isFinite(n) && n >= 0 && n <= max) ? Math.floor(n) : null;
  };
  const totalXp = num(j.totalXp, 1e18);
  const rebirthCount = num(j.rebirthCount, 1e6);
  const recorded = num(j.recorded, 1e7);
  const codexTotal = num(j.codexTotal, 1e7);
  const bestSec = num(j.bestSec, 1e9);
  const bounties = num(j.bounties, 1e4);
  const bestEnhance = num(j.bestEnhance, 1e5);
  if ([totalXp, rebirthCount, recorded, codexTotal, bestSec, bounties, bestEnhance].some(x => x === null)) return null;
  if (recorded > codexTotal) return null;        // 著录数不可超过图鉴总数
  const v = String(j.v == null ? '' : j.v).trim().slice(0, 32);
  return { name, totalXp, rebirthCount, recorded, codexTotal, bestSec, bounties, bestEnhance, v, at: Date.now() };
}

// 防刷：同（IP + 昵称）3 秒内只收一次投递
const lastSubmit = new Map();

const server = http.createServer(async (req, res)=>{
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS'){ cors(res); res.writeHead(204); res.end(); return; }
  if (TOKEN && req.headers.authorization !== 'Bearer ' + TOKEN) return send(res, 401, { error: 'unauthorized' });
  try {
    if (req.method === 'GET' && url.pathname === '/api/ping'){
      return send(res, 200, { ok: true, count: Object.keys(db).length });
    }
    if (req.method === 'GET' && url.pathname === '/api/leaderboard'){
      const metric = METRICS[url.searchParams.get('metric')] ? url.searchParams.get('metric') : 'totalXp';
      const limit = Math.min(LIMIT_MAX, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
      const rows = Object.values(db)
        .map(e => ({ name: e.name, value: e[metric], at: e.at, v: e.v }))
        .filter(r => isFinite(r.value))
        .sort((a, b) => b.value - a.value || a.at - b.at)
        .slice(0, limit)
        .map((r, i) => ({ rank: i + 1, name: r.name, value: r.value, at: r.at, v: r.v }));
      return send(res, 200, { metric, rows });
    }
    if (req.method === 'POST' && url.pathname === '/api/score'){
      let j = {};
      try { j = JSON.parse(await readBody(req) || '{}'); } catch(e){ return send(res, 400, { error: 'invalid json' }); }
      const s = sanitizeScore(j);
      if (!s) return send(res, 400, { error: 'invalid score' });
      const ip = req.socket.remoteAddress || '';
      const key = ip + '|' + s.name;
      const now = Date.now();
      if (now - (lastSubmit.get(key) || 0) < 3000) return send(res, 429, { error: 'too frequent' });
      lastSubmit.set(key, now);
      const cur = db[s.name] || {};
      for (const k of ['totalXp', 'rebirthCount', 'recorded', 'codexTotal', 'bestSec', 'bounties', 'bestEnhance'])
        cur[k] = Math.max(cur[k] || 0, s[k]);
      cur.name = s.name; cur.v = s.v; cur.at = Math.max(cur.at || 0, s.at);
      db[s.name] = cur;
      persist();
      const board = Object.values(db).filter(e => isFinite(e.totalXp)).sort((a, b) => b.totalXp - a.totalXp);
      const rank = board.findIndex(e => e.name === s.name) + 1;
      return send(res, 200, { ok: true, rank, total: board.length });
    }
    return send(res, 404, { error: 'not found' });
  } catch(e){
    return send(res, 500, { error: e.message || 'internal error' });
  }
});

server.listen(PORT, '127.0.0.1', ()=>{
  const actual = (server.address() && server.address().port) || PORT;
  console.log('leaderboard listening on http://127.0.0.1:' + actual + '  data=' + DATA_FILE + (TOKEN ? '  token=on' : '  token=off'));
});
