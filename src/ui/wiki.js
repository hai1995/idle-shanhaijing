// ===== ui/wiki.js — 百科(wiki)页：索引 + 跳转 + 弹窗「查看百科」页脚（v1.31.169） =====
// 界面文案精简后，所有知识的深读都收拢到这里；弹窗里的「查看百科 ›」按钮即入口。
UI.renderWiki = function () {
  const box = $('content');
  if (!box) return;
  const groups = [
    { domain: 'skill', label: '技艺', items: (typeof WIKI !== 'undefined' && WIKI.skill) || {} },
    { domain: 'mechanic', label: '机制', items: (typeof WIKI !== 'undefined' && WIKI.mechanic) || {} },
    { domain: 'realm', label: '境界', items: (typeof WIKI !== 'undefined' && WIKI.realm) || {} }
  ];
  let html = `<div class="wiki-top">
    <div class="wiki-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4 4"/></svg>
      <input id="wikiQ" type="search" placeholder="检索条目（技艺 / 机制 / 境界）" value="${esc(this.wikiQuery || '')}"
        oninput="UI.wikiQuery=this.value;UI.filterWiki(this.value)"
        onkeydown="if(event.key==='Escape'){this.value='';UI.wikiQuery='';UI.filterWiki('')}">
    </div>
    <p class="hint">点任意技艺或机制，弹窗里都有「查看百科 ›」可回到此处。</p>
  </div><div class="wiki-body">`;
  groups.forEach(g => {
    const keys = Object.keys(g.items || {});
    if (!keys.length) return;
    html += `<section class="wiki-group" id="wiki-domain-${g.domain}">
      <h3 class="wiki-gtitle">${g.label}<i class="wiki-count">${keys.length}</i></h3>
      <div class="wiki-list">`;
    keys.forEach(id => {
      const e = g.items[id];
      html += `<article class="wiki-entry" id="wiki-entry-${g.domain}-${id}" data-wiki-entry="${g.domain}:${id}">
        <h4 class="wiki-etitle">${esc(e.icon || '')} ${esc(e.title || id)}</h4>
        <div class="wiki-ebody">${esc(e.body || '')}</div>
      </article>`;
    });
    html += `</div></section>`;
  });
  html += `</div>`;
  box.innerHTML = html;
};

// 顶部检索：按条目正文过滤，空分组自动隐藏
UI.filterWiki = function (q) {
  q = String(q || '').trim().toLowerCase();
  document.querySelectorAll('.wiki-entry').forEach(el => {
    const t = (el.textContent || '').toLowerCase();
    el.classList.toggle('hidden', !!q && t.indexOf(q) < 0);
  });
  document.querySelectorAll('.wiki-group').forEach(g => {
    g.classList.toggle('hidden', !g.querySelector('.wiki-entry:not(.hidden)'));
  });
};

// 弹窗里的「查看百科 ›」：切到百科页并定位 / 高亮对应条目
UI.openWiki = function (domain, id) {
  this.switchTab('wiki');
  const target = 'wiki-entry-' + domain + '-' + id;
  setTimeout(() => {
    const el = document.getElementById(target);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('wiki-flash');
      setTimeout(() => el.classList.remove('wiki-flash'), 1300);
    } else {
      const g = document.getElementById('wiki-domain-' + domain);
      if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 40);
};

// 供各 tooltip / 说明弹窗调用的页脚按钮
UI.wikiFooter = function (domain, id) {
  return `<div class="wiki-foot"><button class="tip-link" type="button" onclick="UI.openWiki('${domain}','${id}')">查看百科 ›</button></div>`;
};
