#!/usr/bin/env node
// 《山海经 · 著录》云端存档参考后端（零依赖，Node ≥ 18）
// 实现 CLOUD_SAVE.md 约定的接口：
//   GET    /save  -> { payload, rev, savedAt }      无档返回 404
//   PUT    /save  <- { payload, rev, deviceId }     -> { ok:true, rev }
//                                                   rev 落后于服务端则 409
//   DELETE /save  -> { ok:true }                   抹掉云端档
// 存档为单个 JSON 文件（原子写入：先写 .tmp 再 rename），按 rev 做乐观并发。
// 多设备同时玩时，客户端拿到 409 应重新拉取合并（mergeSaveData）后再上传。
//
// 用法：
//   node server/cloud-save-server.js [--port 8787] [--data ./cloud-save.json] [--token secret]
// 环境变量：PORT / DATA_FILE / CLOUD_TOKEN（命令行优先）。
// 设置 token 后，所有请求都要求 Authorization: Bearer <token>。
// 默认只监听 127.0.0.1；要给别人用，请自行放到反代 / 内网后面，并务必设置 token。

const http = require('http');
const fs = require('fs');
const path = require('path');

function argOf(name, dflt){
  const i = process.argv.indexOf(name);
  return (i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) ? process.argv[i + 1] : dflt;
}
const PORT = parseInt(argOf('--port', process.env.PORT || '8787'), 10);
const DATA_FILE = path.resolve(argOf('--data', process.env.DATA_FILE || path.join(__dirname, 'cloud-save.json')));
const TOKEN = argOf('--token', process.env.CLOUD_TOKEN || '');

let db = { payload: null, rev: 0, savedAt: 0, deviceId: '' };
try {
  if (fs.existsSync(DATA_FILE)) db = Object.assign(db, JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
} catch(e){ console.error('存档文件读取失败，按空库启动：', e.message); }

function persist(){
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DATA_FILE);   // 同目录原子替换，避免写一半断电留半档
}

function cors(res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
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
    req.on('data', c=>{ raw += c; if (raw.length > 8 * 1024 * 1024){ reject(new Error('body too large')); req.destroy(); } });
    req.on('end', ()=>resolve(raw));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res)=>{
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS'){ cors(res); res.writeHead(204); res.end(); return; }   // CORS 预检
  if (url.pathname !== '/save') return send(res, 404, { error: 'not found' });
  if (TOKEN && req.headers.authorization !== 'Bearer ' + TOKEN) return send(res, 401, { error: 'unauthorized' });
  try {
    if (req.method === 'GET'){
      if (!db.payload) return send(res, 404, { error: 'no save' });
      return send(res, 200, { payload: db.payload, rev: db.rev, savedAt: db.savedAt });
    }
    if (req.method === 'PUT'){
      let j = {};
      try { j = JSON.parse(await readBody(req) || '{}'); } catch(e){ return send(res, 400, { error: 'invalid json' }); }
      if (typeof j.payload !== 'string' || !j.payload) return send(res, 400, { error: 'payload required' });
      // 乐观并发：请求带的 rev 落后于服务端当前 rev → 冲突，让客户端合并后重传
      if (isFinite(j.rev) && j.rev < db.rev) return send(res, 409, { error: 'version conflict', rev: db.rev });
      db = { payload: j.payload, rev: db.rev + 1, savedAt: Date.now(), deviceId: String(j.deviceId || '') };
      persist();
      return send(res, 200, { ok: true, rev: db.rev });
    }
    if (req.method === 'DELETE'){
      db = { payload: null, rev: 0, savedAt: 0, deviceId: '' };
      persist();
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method not allowed' });
  } catch(e){
    return send(res, 500, { error: e.message || 'internal error' });
  }
});

server.listen(PORT, '127.0.0.1', ()=>{
  // 打印实际绑定端口（--port 0 时由系统分配，测试与脚本都靠这行拿端口）
  const actual = (server.address() && server.address().port) || PORT;
  console.log('cloud-save-server listening on http://127.0.0.1:' + actual + '  data=' + DATA_FILE + (TOKEN ? '  token=on' : '  token=off'));
});
