/* ==========================================================================
   祠礼图标（riteIcon）—— 一套「礼器」谱系
   --------------------------------------------------------------------------
   原文祠礼不是抽象词，而是具体的仪节：一璋玉、一璧瘗、一犬祈、白鸡祈、
   少牢、太牢、百牲斋、藻茝……所以图标不取名字首字，改画「那一礼的动作与器物」：
     · 祭器（璧 / 圭 / 爵 / 席 / 坛）为主形
     · 祭物（犬 / 鸡 / 羊 / 牛 / 鱼 / 谷穗 / 蒿）为点睛
     · 仪节（瘗埋 / 抛投 / 血涂）以土褐虚线与朱点表示
   墨色器身走 currentColor（昼墨夜白），点睛用礼朱 / 玉青 / 赭金 / 土褐。
   ========================================================================== */
(function(){
  const R='#B03A2B';        // 礼朱：血、冠、祭仪
  const JADE='#4A6340';     // 玉青：玉璋 / 玉璧 / 玉圭
  const GOLD='#9C7628';     // 赭金：谷物、酒、稻穗
  const EARTH='#8C6A4E';    // 土褐：瘗埋、抛投、席
  const S='currentColor';   // 器身：随昼夜反相的墨色

  /* —— 通用部件 —— */
  // 背晕：与异兽图标同一套圆晕，让两套图标并排时是一家人
  const halo = (c)=>`<circle cx="32" cy="32" r="30.5" fill="${c}" opacity=".12"/>
    <circle cx="32" cy="32" r="29.5" fill="none" stroke="${c}" stroke-width="1.4" opacity=".38"/>`;

  // 祭坛：三层台座
  const altar = ()=>`<path d="M9 55 H55 L50 48 H14 Z" fill="${S}"/>
    <path d="M15 48 H49 L45 41 H19 Z" fill="${S}" opacity=".72"/>`;

  // 苇席：白菅为席，四道斜纹
  const mat = ()=>`<path d="M10 44 H54 M11 49 H53 M12 54 H52" stroke="${S}" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>`;

  // 玉璧：外环 + 中孔
  const bi = (cx,cy,r)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${JADE}" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="2" fill="${JADE}" opacity=".7"/>`;

  // 玉圭 / 玉璋：上尖下方身
  const gui = (x,y,h)=>`<path d="M${x} ${y+h} V${y+5} A3.5 3.5 0 0 1 ${x+7} ${y+5} V${y+h} Z" fill="${JADE}"/>`;

  // 酒爵：三足爵身
  const jue = ()=>`<path d="M21 24 H43 L40 35 H24 Z" fill="${S}"/>
    <path d="M20 24 Q32 17 44 24" stroke="${S}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M25 35 L22 48 M32 35 V49 M39 35 L42 48" stroke="${S}" stroke-width="2.6" stroke-linecap="round"/>`;

  // 谷穗：一茎左右各三片
  const ear = (x,y)=>`<path d="M${x} ${y} V${y+26}" stroke="${GOLD}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M${x} ${y+6} q7-3 9 3 q-6 3-9 1 Z" fill="${GOLD}" opacity=".9"/>
    <path d="M${x} ${y+6} q-7-3-9 3 q6 3 9 1 Z" fill="${GOLD}" opacity=".9"/>
    <path d="M${x} ${y+15} q7-3 9 3 q-6 3-9 1 Z" fill="${GOLD}" opacity=".8"/>
    <path d="M${x} ${y+15} q-7-3-9 3 q6 3 9 1 Z" fill="${GOLD}" opacity=".8"/>`;

  // 米粒：三粒撒在祭席上
  const grains = (pts)=>pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.1" fill="${GOLD}"/>`).join('');

  // 鸡：冠（朱）、喙（金）、身尾（墨）
  const chicken = (x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="30" cy="34" rx="11" ry="8.6" fill="${S}"/>
    <circle cx="19" cy="22" r="5.6" fill="${S}"/>
    <path d="M15 17 L14 11 L19 15 L21 10 L24 16" fill="${R}"/>
    <path d="M14 21 L7 24 L14 27 Z" fill="${GOLD}"/>
    <path d="M40 30 Q50 25 52 17 M40 35 Q52 34 54 26" stroke="${S}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M26 42 L25 51 M34 42 L35 51" stroke="${S}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="17.5" cy="21" r="1.2" fill="${GOLD}"/></g>`;

  // 犬：侧影
  const dog = (x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="20" cy="27" r="7" fill="${S}"/>
    <path d="M16 21 L13 12 L22 19 Z" fill="${S}"/>
    <path d="M27 30 Q37 26 41 33 Q36 39 27 36 Z" fill="${S}"/>
    <path d="M41 32 Q48 29 49 22" stroke="${S}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M24 36 L23 45 M34 37 L35 46" stroke="${S}" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="17" cy="25" r="1.3" fill="${GOLD}"/></g>`;

  // 羊：卷角
  const sheep = (x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M25 22 Q16 20 17 13 Q22 12 21 18" stroke="${S}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M39 22 Q48 20 47 13 Q42 12 43 18" stroke="${S}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <circle cx="32" cy="26" r="8" fill="${S}"/>
    <path d="M27 33 Q24 42 30 48 M37 33 Q40 42 34 48" stroke="${S}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="29" cy="25" r="1.3" fill="${GOLD}"/><circle cx="35" cy="25" r="1.3" fill="${GOLD}"/></g>`;

  // 牛：阔角
  const ox = (x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M23 23 Q15 16 12 23 M41 23 Q49 16 52 23" stroke="${S}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M32 17 Q21 17 21 27 Q21 36 32 36 Q43 36 43 27 Q43 17 32 17 Z" fill="${S}"/>
    <circle cx="27" cy="26" r="1.6" fill="${GOLD}"/><circle cx="37" cy="26" r="1.6" fill="${GOLD}"/>
    <path d="M28 32 Q32 35 36 32" stroke="${GOLD}" stroke-width="1.6" fill="none"/></g>`;

  // 鱼：身尾背鳍
  const fish = (x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M8 30 Q22 16 38 28 Q24 44 8 30 Z" fill="${S}"/>
    <path d="M37 27 L51 19 L51 39 Z" fill="${S}" opacity=".85"/>
    <path d="M20 19 L25 12 L29 20 Z" fill="${S}" opacity=".85"/>
    <circle cx="15" cy="28" r="1.6" fill="${GOLD}"/></g>`;

  // 瘗：地面一线，器物埋入土中
  const bury = ()=>`<path d="M6 40 H58" stroke="${S}" stroke-width="3" stroke-linecap="round"/>
    <path d="M6 42 H58 L52 50 H12 Z" fill="${EARTH}" opacity=".45"/>
    <path d="M16 46 H48" stroke="${EARTH}" stroke-width="1.4" opacity=".5"/>`;

  // 投：抛物虚线
  const toss = ()=>`<path d="M9 50 Q32 8 55 46" stroke="${EARTH}" stroke-width="2.4" fill="none"
    stroke-dasharray="5 4" stroke-linecap="round"/>`;

  // 血点：三滴
  const blood = (pts)=>pts.map(([x,y])=>`<path d="M${x} ${y} q3 3.5 0 5.5 q-3-2 0-5.5 Z" fill="${R}"/>`).join('');

  /* —— 二十八礼：各画「那一礼」 —— */
  const RITES = {
    // 常祭：以稌米薄祭山川
    rite_chang: ()=>`<path d="M7 45 L19 21 L27 35 L35 17 L53 45 Z" fill="${S}"/>
      ${grains([[22,50],[32,53],[42,50]])}`,

    // 首经祠礼：毛用一璋玉瘗，糈用稌米，白菅为席
    rite_ns1: ()=>`${gui(28,13,26)}${mat()}
      <circle cx="17" cy="36" r="2.2" fill="${GOLD}"/><circle cx="23" cy="40" r="2" fill="${GOLD}"/>`,

    // 二经祠礼：毛用一璧瘗
    rite_ns2: ()=>`${bi(32,23,11)}${bury()}`,

    // 三经祠礼：用一白狗祈，糈用稌
    rite_ns3: ()=>`${dog(4,4,1)}${grains([[46,44],[52,49],[44,52]])}`,

    // 华山太牢：牛羊豕三牲
    rite_xs1: ()=>`${ox(16,10,.85)}${altar()}${blood([[27,45],[32,48],[37,45]])}`,

    // 羭山百牲斋：斋百日以百牺，汤其酒百樽，婴以百珪百璧
    rite_yu: ()=>`${jue()}${bi(15,18,6)}${bi(49,18,6)}
      <circle cx="32" cy="8" r="4.6" fill="${GOLD}" opacity=".85"/>`,

    // 飞兽少牢：毛用少牢，白菅为席
    rite_xs2a: ()=>`${sheep(16,8,.9)}${mat()}
      <path d="M24 20 q4-6 9-5 q-2 5-7 6 Z" fill="${S}" opacity=".8"/>`,

    // 十辈雄鸡：毛一雄鸡，钤而不糈
    rite_xs2b: ()=>`${chicken(2,6,1)}`,

    // 吉玉稷米：用一吉玉瘗，糈用稷米
    rite_xs3: ()=>`${ear(40,14)}${gui(15,32,16)}`,

    // 白鸡祈：用一白鸡祈，糈以稻米，白菅为席
    rite_xs4: ()=>`${chicken(0,4,.9)}${ear(46,20)}`,

    // 北次一·瘗礼：毛用一雄鸡、彘瘗，吉玉用一珪，瘗而不糈
    rite_bs1: ()=>`${bury()}${gui(28,32,13)}`,

    // 北次二·投礼：投而不糈
    rite_bs2: ()=>`${toss()}${bi(32,22,9)}`,

    // 北次三·神祇礼：廿神一藻茝瘗／十四神皆玉不瘗／十神皆用一璧瘗
    rite_bs3: ()=>`${gui(14,20,26)}${gui(29,24,22)}${gui(44,18,28)}`,

    // 犬祈鱼䎶：毛用一犬祈，䎶用鱼（鱼血涂祭器）
    rite_ds1: ()=>`${fish(6,16,1)}${blood([[26,46],[32,50]])}`,

    // 鸡祈璧瘗：毛用一鸡祈，婴用一璧瘗
    rite_ds2: ()=>`${chicken(0,4,.88)}${bi(48,42,7)}`,

    // 牡羊黍米：用一牡羊，米用黍
    rite_ds3: ()=>`${sheep(14,10,.92)}${ear(46,22)}`,

    // 中次一经·太牢吉玉：冢用太牢之具，县婴以吉玉；十三神毛用一羊，县婴藻珪，瘗而不糈
    rite_zs1: ()=>`${ox(16,10,.85)}${gui(42,24,18)}${bury()}`,

    // 中次二经·雄鸡糈瘞：人面鸟身之神，毛用一雄鸡，瘞而糈
    rite_zs2: ()=>`${chicken(2,6,1)}${grains([[46,40],[52,44],[44,48]])}${bury()}`,

    // 中次三经·一物祈珪：帝之密都群神，毛用一物（色纯之牲），祈之以珪
    rite_zs3: ()=>`${sheep(12,10,.9)}${gui(42,20,22)}`,

    // 中次四经·白鸡彩衣：人面兽身之神，毛用一白鸡，祈而不糈，以彩衣之
    rite_zs4: ()=>`${chicken(2,6,1)}
      <path d="M46 30 q10 6 0 12 q-10-6 0-12 Z" fill="${R}"/>
      <path d="M50 18 q8 8 0 14 q-8-6 0-14 Z" fill="${GOLD}"/>
      <path d="M44 20 q6 8 0 13 q-6-5 0-13 Z" fill="${JADE}"/>`,

    // 中次五经·太牢吉玉：升山为冢，祠礼太牢，婴用吉玉；尸水合天，肥牲献血
    rite_zs5: ()=>`${ox(4,16,.62)}${sheep(30,18,.55)}${gui(46,6,18)}${blood([[16,48],[24,50],[32,48]])}`,

    // 中次六经·雄鸡禳祭：平逢骄虫「用一雄鸡，禳而勿杀」——鸡全生而不血食；岳在其中，六月祭之
    rite_zs6: ()=>`${chicken(2,6,1)}${gui(48,4,17)}${grains([[14,48],[20,51],[26,48]])}`,

    // 中次七经·羊羞藻玉：十六神豕身人面，毛牷用一羊羞，婴用一藻玉瘗
    rite_zs7: ()=>`${sheep(14,8,.85)}${gui(46,18,20)}${bury()}`,

    // 中次八经·雄鸡藻圭：山神鸟身人面，用一雄鸡祈瘗，用一藻圭，糈用稌
    rite_zs8: ()=>`${chicken(2,4,1)}${gui(44,4,17)}${bury()}`,

    // 中次九经·雄鸡吉玉：山神马身龙首，雄鸡瘗、糈用稌；熊山席也，婴毛一璧
    rite_zs9: ()=>`${chicken(2,6,1)}${bi(48,16,11)}${grains([[12,46],[18,49],[24,46],[30,49]])}`,

    // 中次十经·雄鸡五种：山神龙身人面，毛用一雄鸡瘗，糈用五种之糈（五撮米聚）
    rite_zs10: ()=>`${chicken(2,4,1)}${grains([[42,18],[49,15],[56,18],[45,26],[52,29]])}`,

    // 中次十一经·雄鸡珪糈：山神彘身人首，雄鸡祈瘗、用一珪、糈用五种之精
    rite_zs11: ()=>`${chicken(2,6,1)}${gui(46,4,17)}${grains([[10,48],[16,51],[22,48],[28,51]])}`,

    // 中次十二经·雄鸡牝豚：山神鸟身龙首，雄鸡与牝豚刏（取血），糈用稌
    rite_zs12: ()=>`${chicken(2,4,1)}${dog(36,8,.95)}${blood([[18,48],[26,50],[34,48]])}`,
  };

  // 未识别的礼：通用祭坛 + 一炷香
  const FALLBACK = ()=>`${altar()}
    <path d="M32 40 V26" stroke="${S}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M32 26 q4-5 0-9 q-4 4 0 9 Z" fill="${R}"/>`;

  /**
   * 生成祠礼图标
   * @param {string} id    祠礼 id（rite_xxx）
   * @param {string} name  祠礼名（用于无 aria-label 时的兜底）
   * @returns {string} SVG 片段
   */
  function riteIcon(id, name){
    const draw = RITES[id] || FALLBACK;
    const color = RITES[id] ? R : GOLD;
    return `<svg class="bi" viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label="${name||'祠礼'}" style="display:block">
      ${halo(color)}
      ${draw()}
    </svg>`;
  }

  window.riteIcon = riteIcon;
  window.RITE_ICON_IDS = Object.keys(RITES);
})();
