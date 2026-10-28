// ===== ui/wikiData.js — 百科(wiki)条目数据（v1.31.169） =====
// 知识库正文集中在此，界面文案只留入口。技能条目由 Skills 自动派生，避免重复维护；
// 机制条目为人工撰写的精简说明；境界条目在 gameData.REALMS 定义后由下方生成。
(function () {
  const WIKI = { skill: {}, mechanic: {}, realm: {} };

  // ① 技艺条目：直接复用 Skills 的 name / icon / desc，正文随技能数据自动同步
  if (typeof Skills !== 'undefined') {
    for (const id in Skills) {
      const s = Skills[id];
      if (!s || !s.name) continue;
      WIKI.skill[id] = { title: s.name, icon: s.icon || '📖', body: s.desc || '' };
    }
  }

  // ② 机制条目：对应「玩法说明 / 叙录·体例」里被精简掉的长散文，这里给可深读的版本
  WIKI.mechanic = {
    xiuwei: {
      title: '修为',
      body: '修为即累计获得的经验，不设上限。它是「群英榜·修为」的排名口径，也决定境界的突破时机。' +
        '打坐、采集、制作、征伐、御使——一切修行都会积累修为。离线时按效率一并结算，不会浪费。'
    },
    mastery: {
      title: '著录阶位',
      body: '采集、渔、采药等所得记为「著录」。每种物产分五阶：初见 → 识名 → 明性 → 通形 → 得御。' +
        '著录越深，产出越丰，亦解锁更高「舆地」等级的山川。异兽著录至「通形」可入御使槽，「得御」为最高阶。'
    },
    wuxing: {
      title: '五行相克',
      body: '兵器与异兽分属金木水火土。相克 ×1.35、被克 ×0.75、同属 ×1.00、相生 ×1.15。' +
        '相克：金克木、木克土、土克水、水克火、火克金；相生：金生水、水生木、木生火、火生土、土生金。' +
        '装备相克属性的兵器可压制目标。'
    },
    omen: {
      title: '征兆',
      body: '首次著录异兽可能触发吉凶之兆（如「其邑大水」「有大兵」），影响区域产出或全局采获。' +
        '部分物品可免疫对应征兆（如「佩之不惑」之符、「御兵」之兽）。'
    },
    lunhui: {
      title: '轮回',
      body: '修行至一定火候可入轮回：转生重置部分进度，换取永久增益与「前世遗物」。是长线的成长拐点，与境界并行不悖。'
    },
    offline: {
      title: '离线收益',
      body: '离开页面仍按离线时长结算，效率随「观象」等提升，封顶约 0.85。' +
        '离山较久归来会弹出「离线归来」汇总，逐项交代这一夜在做什么、得了多少。挂机打坐同样离线结算。'
    },
    rank: {
      title: '群英榜',
      body: '以修为、著录、轮回等综合指标排名。修为口径为累计经验——打坐等一切修行都计入，所以勤修者自然居前。'
    },
    codex: {
      title: '图鉴',
      body: '记录走过的山川、著录的物产与异兽，以及所得遗物。录之愈广，简帙愈厚；简帙既盈，此卷遂成。'
    },
    jisi: {
      title: '祠祀与卜筮',
      body: '谒见山神献祭以增益区域产出；卜筮可问吉凶、抉择事件走向。吉凶之兆随之而动，可禳可解。'
    },
    shanglv: {
      title: '商旅 · 观象 · 圃艺',
      body: '以贝币买卖物品、低买高卖；观象提升离线上限（基础 ' + (typeof TUNING !== 'undefined' && TUNING.OFFLINE ? TUNING.OFFLINE.CAP_H : '?') +
        ' 小时，每处观象 +1、仓廪 +2、土窟 +1）与离线效率；圃艺种植收成。'
    },
    realm: {
      title: '境界',
      body: '境界是修行的里程碑：攒够修为后，于打坐中突破，获得全局修炼效率的永久加成。' +
        '从炼气起步，历经筑基、金丹、元婴、化神……每突破一阶，一切经验收益都更丰厚。详见各境界阶条目。'
    }
  };

  // ③ 境界条目：由 gameData.REALMS 生成（Phase 3 定义后自动出现；此处守卫，未定义则不产生）
  if (typeof REALMS !== 'undefined' && Array.isArray(REALMS)) {
    REALMS.forEach((r, i) => {
      const prev = i > 0 ? REALMS[i - 1] : null;
      const next = REALMS[i + 1] || null;
      const bonusPct = Math.round(r.bonus * 100);
      let body = '累计修为达 ' + (typeof fmt === 'function' ? fmt(r.need) : r.need) + ' 可从此阶突破而来。';
      if (bonusPct > 0) body += '驻此境界，全局修炼效率 +' + bonusPct + '%。';
      if (prev) body += '上一阶：' + prev.name + '。';
      if (next) body += '下一阶：' + next.name + '（需修为 ' + (typeof fmt === 'function' ? fmt(next.need) : next.need) + '）。';
      else body += '此为已知最高境界。';
      WIKI.realm[r.id] = { title: r.name, icon: '🌀', body: body };
    });
  }

  if (typeof window !== 'undefined') window.WIKI = WIKI;
})();
