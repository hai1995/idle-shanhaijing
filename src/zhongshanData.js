// ===== 中山经世界数据（十二系，首录三系 29 山） =====
// 本文件由 zhongshanjing_nodes.json 派生生成，请勿手改；
// 需要调整数据时改 JSON 后重新运行 node scripts/gen-world-data.js
// 底本：中华书局点校本《山海经校注》（袁珂）——古籍原文，公有领域
// 中山经是神祇与氏族记载最密的一部：十二系各有祠礼，多系末明言「冢也」（宗主山）与「帝也」（帝冢）。本轮 nodes 仅录中次一经 15 山、中次二经 9 山、中次三经 5 山；中次四经至中次十二经 nodes 为空、region 元数据俱全，待逐系补录。

window.ZHONGSHAN = {
  "_meta": {
    "项目": "山海经·放置挂机",
    "数据范围": "中山经 十二系（中次一经15 / 中次二经9 / 中次三经5 / 中次四经9 / 中次五经15 / 中次六经14 / 中次七经19 / 中次八经23 / 中次九经16 / 中次十经9 / 中次十一经48 / 中次十二经15，全书自述 197 山 21371 里）",
    "用途": "世界地图与资源节点数据源，结构与前四份文件完全一致，可直接合并",
    "原文底本": "以中华书局点校本《山海经校注》（袁珂）为准，参校维基文库《山海经·中山经》、识典古籍 SBCK099（中山经第五）",
    "本轮填充范围": "★中次一经、中次二经、中次三经、中次四经、中次五经五系共 53 山完整入录（原文、异兽、产出俱全）；中次六经至中次十二经七系先立 region 框架（山名、里程、祠礼、山神俱全，nodes 待后续逐系补录）",
    "版本差异说明": "中次五经传世本各本一致只录 15 山（苟床/首/县𣃁/葱聋/条谷/超/成侯/朝歌/槐/历/尸/良馀/蛊尾/升/阳虚），而末句自述「凡十六山，二千九百八十二里」——里程数与 15 山版精确吻合，主流观点认为古本传抄漏落一座，无从考补，本文件按实录 15 山入录并在 summary 保留「十六山」原文。用字互校：县𣃁（维基作县㔉、识典作縣劚、百度作县斸，𣃁/劚/㔉/斸为异体）；成侯（维基/识典/山海经Wiki/袁珂目录作侯，百度/快懂/360 作候，取多本之侯）；良馀（维基/百度/360 作馀，识典/wiki 作余，取馀）；葱聋之山多玤石（维基作𢈦石为玤之讹）；升山草属取「藷藇、蕙」（维基/识典作「藇蕙」脱薯字，wiki 作「𫉄、藇蕙」，𫉄=薯）；阳虚之山里程「又东十二里」（维基作二十里，2982 里总数吻合十二里）；首山机谷䲦鸟取全句「其状如枭而三目，有耳，其音如录，食之已垫」（百度残作「其状如录」）。中次十一经末句自述，识典本作「凡四十八山，三千七百三十二里」，维基文库/袁珂本亦作四十八山；全书总结「百九十七山」各本一致。",
    "统计说明": "中山经是五藏山经中神祇与氏族记载最密的一部：十二系各有祠礼，多系末明言「冢也」（宗主山）与「帝也」（帝冢）；著名异兽密集（朏朏、旋龟、夫诸、马腹、化蛇、鸣蛇、雍和、跂踵、闻𧲂、狙如、梁渠、帝女之桑、洞庭帝之二女等）",
    "字段说明": {
      "id": "唯一标识，格式 zhongshan-<系>-<序号>，与前四份文件同体系",
      "name": "山名，取自原文",
      "unlockLevel": "自研调参值（raw，非古籍内容），经 scripts/gen-world-data.js 的 bandMap 重排为游戏内等级；中山经 raw 区间 691–960 → 69–81",
      "fauna": "异兽/异鸟/异鱼/异草，含形态、声音、效果、征兆",
      "omen": "征兆事件，取自原文「见则X」句式",
      "hazard": "危险标记，取自原文「是食人」等",
      "source": "该节点对应的原文（节录）",
      "terrain": "山体形胜，取自原文方位/水系描述",
      "yields": "物产归类（木/草/玉/金/水族/水），取自原文「其上多X，其下多Y」"
    },
    "统计": {
      "山数": 197,
      "fauna记录数": 61,
      "本轮已入录": 53,
      "具名异类种数": 42,
      "著名异兽": "朏朏（霍山）、旋龟（密山）、夫诸（敖岸）、马腹（蔓渠）、化蛇（阳山）、鸣蛇（鲜山）、蠪蚳（昆吾）、㔮（甘枣）、豪鱼（渠猪）",
      "征兆条数": 5,
      "祠礼套数": 12,
      "异木条目": 15,
      "神祇": "熏池、武罗、泰逢、骄虫、天愚、𬠷围、计蒙、涉𬠷、于儿、耕父等"
    },
    "授权状态": "《山海经》原文已进入公有领域，可自由引用、改编、再创作。本文件所录均为古籍原文，不含任何当代作品内容。",
    "等级重排": "前三系（中次一至三经 29 山）raw 691–749 → 69–73 斜率固定；中次四经 raw 753–775 → 74–75 已上线不变；中次五至十二经 raw 777–950 顺序紧排（五经 15 山 +1/山，六经 14 山，七经 19 山，八经 23 山，九经 16 山，十经 9 山，十一经 48 山均 +1/山，十二经 15 山 +2/山以 81 收卷），bandMap 后九系段 750–960 → 74–81 两段式不变，补录不回头改旧章"
  },
  "regions": [
    {
      "regionId": "zhongshan-1",
      "regionName": "中次一经",
      "regionAlias": "薄山",
      "order": 15,
      "unlockLevel": 69,
      "summary": "凡薄山之首，自甘枣之山至于鼓镫之山，凡十五山，六千六百七十里。其祠礼：历儿，冢也——毛，太牢之具，县婴以吉玉；其余十三者，毛用一羊，县婴用藻珪，瘗而不糈。",
      "deity": {
        "form": "薄山十五山共祀；历儿山为冢（宗主），用太牢之具、县婴以吉玉；其余十三山用一羊、县婴用藻珪，瘗而不糈",
        "rite": {
          "毛用": "历儿太牢之具；其余一羊",
          "婴用": "吉玉；藻珪（藻玉也，方其下而锐其上，而中穿之加金）",
          "原文": "凡薄山之首，自甘枣之山至于鼓镫之山，凡十五山，六千六百七十里。历儿，冢也，其祠礼：毛，太牢之具；县婴以吉玉。其余十三者，毛用一羊，县婴用藻珪，瘞而不糈。"
        }
      },
      "requirement": "进入中山经需舆地 69 级（重排后）；首系以草木主治（已瞢/已瘿/已忧/已聋/已风）为主，是「采药」线的收官素材区",
      "legs": [
        {
          "direction": "东行",
          "distance": 20,
          "from": "甘枣之山",
          "to": "历儿之山",
          "mode": "陆行",
          "total": 20
        },
        {
          "direction": "东行",
          "distance": 15,
          "from": "历儿之山",
          "to": "渠猪之山",
          "mode": "陆行",
          "total": 15
        },
        {
          "direction": "东行",
          "distance": 35,
          "from": "渠猪之山",
          "to": "葱聋之山",
          "mode": "陆行",
          "total": 35
        },
        {
          "direction": "东行",
          "distance": 15,
          "from": "葱聋之山",
          "to": "涹山",
          "mode": "陆行",
          "total": 15
        },
        {
          "direction": "东行",
          "distance": 70,
          "from": "涹山",
          "to": "脱扈之山",
          "mode": "陆行",
          "total": 70
        },
        {
          "direction": "东行",
          "distance": 20,
          "from": "脱扈之山",
          "to": "金星之山",
          "mode": "陆行",
          "total": 20
        },
        {
          "direction": "东行",
          "distance": 70,
          "from": "金星之山",
          "to": "泰威之山",
          "mode": "陆行",
          "total": 70
        },
        {
          "direction": "东行",
          "distance": 15,
          "from": "泰威之山",
          "to": "橿谷之山",
          "mode": "陆行",
          "total": 15
        },
        {
          "direction": "东行",
          "distance": 120,
          "from": "橿谷之山",
          "to": "吴林之山",
          "mode": "陆行",
          "total": 120
        },
        {
          "direction": "北行",
          "distance": 30,
          "from": "吴林之山",
          "to": "牛首之山",
          "mode": "陆行",
          "total": 30
        },
        {
          "direction": "北行",
          "distance": 40,
          "from": "牛首之山",
          "to": "霍山",
          "mode": "陆行",
          "total": 40
        },
        {
          "direction": "北行",
          "distance": 52,
          "from": "霍山",
          "to": "合谷之山",
          "mode": "陆行",
          "total": 52
        },
        {
          "direction": "北行",
          "distance": 35,
          "from": "合谷之山",
          "to": "阴山",
          "mode": "陆行",
          "total": 35
        },
        {
          "direction": "东北行",
          "distance": 400,
          "from": "阴山",
          "to": "鼓镫之山",
          "mode": "陆行",
          "total": 400
        }
      ],
      "nodes": [
        {
          "id": "zhongshan-1-01",
          "name": "甘枣之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 69,
          "terrain": "共水出焉，而西流注于河",
          "yields": {
            "wood": [
              "杻木"
            ],
            "herb": [
              "箨"
            ]
          },
          "fauna": [
            {
              "name": "㔮",
              "form": "其状如𤠢鼠而文题",
              "effect": "食之已瘿",
              "category": "兽"
            }
          ],
          "source": "中山经薄山之首，曰甘枣之山。共水出焉，而西流注于河。其上多杻木，其下有草焉，葵本而杏叶，黄华而荚实，名曰箨，可以已瞢。有兽焉，其状如𤠢鼠而文题，其名曰㔮，食之已瘿。",
          "dataUnlockLevel": 691
        },
        {
          "id": "zhongshan-1-02",
          "name": "历儿之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 69,
          "terrain": "薄山之冢（宗主山）——祠礼用太牢",
          "yields": {
            "wood": [
              "橿",
              "櫔木"
            ]
          },
          "fauna": [],
          "source": "又东二十里，曰历儿之山，其上多橿，多櫔木，是木也，方茎而员叶，黄华而毛，其实如拣，服之不忘。",
          "dataUnlockLevel": 694
        },
        {
          "id": "zhongshan-1-03",
          "name": "渠猪之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 69,
          "terrain": "渠猪之水出焉，而南流注于河",
          "yields": {
            "wood": [
              "竹"
            ],
            "fish": [
              "豪鱼"
            ]
          },
          "fauna": [
            {
              "name": "豪鱼",
              "form": "状如鲔，而赤喙赤尾赤羽",
              "effect": "可以已白癣",
              "category": "水族"
            }
          ],
          "source": "又东十五里，曰渠猪之山，其上多竹。渠猪之水出焉，而南流注于河。其中是多豪鱼，状如鲔，而赤喙赤尾赤羽，可以已白癣。",
          "dataUnlockLevel": 697
        },
        {
          "id": "zhongshan-1-04",
          "name": "葱聋之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 70,
          "terrain": "其中多大谷",
          "yields": {
            "mineral": [
              "白垩",
              "黑垩",
              "青垩",
              "黄垩"
            ]
          },
          "fauna": [],
          "source": "又东三十五里，曰葱聋之山，其中多大谷，是多白垩，黑、青、黄垩。",
          "dataUnlockLevel": 699
        },
        {
          "id": "zhongshan-1-05",
          "name": "涹山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 70,
          "terrain": "其上多赤铜，其阴多铁",
          "yields": {
            "mineral": [
              "赤铜",
              "铁"
            ]
          },
          "fauna": [],
          "source": "又东十五里，曰涹山，其上多赤铜，其阴多铁。",
          "dataUnlockLevel": 700
        },
        {
          "id": "zhongshan-1-06",
          "name": "脱扈之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 70,
          "yields": {
            "herb": [
              "植楮"
            ]
          },
          "fauna": [],
          "source": "又东七十里，曰脱扈之山。有草焉，其状如葵叶而赤华，荚实，实如棕椶荚，名曰植楮，可以已癙，食之不眯。",
          "dataUnlockLevel": 702
        },
        {
          "id": "zhongshan-1-07",
          "name": "金星之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 70,
          "yields": {
            "herb": [
              "天婴"
            ]
          },
          "fauna": [],
          "source": "又东二十里，曰金星之山，多天婴，其状如龙骨，可以已痤。",
          "dataUnlockLevel": 704
        },
        {
          "id": "zhongshan-1-08",
          "name": "泰威之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 70,
          "terrain": "其中有谷，曰枭谷",
          "yields": {
            "mineral": [
              "铁"
            ]
          },
          "fauna": [],
          "source": "又东七十里，曰泰威之山，其中有谷，曰梟谷，其中多铁。",
          "dataUnlockLevel": 705
        },
        {
          "id": "zhongshan-1-09",
          "name": "橿谷之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 70,
          "yields": {
            "mineral": [
              "赤铜"
            ]
          },
          "fauna": [],
          "source": "又东十五里，曰橿谷之山，其中多赤铜。",
          "dataUnlockLevel": 707
        },
        {
          "id": "zhongshan-1-10",
          "name": "吴林之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 70,
          "yields": {
            "herb": [
              "葌草"
            ]
          },
          "fauna": [],
          "source": "又东百二十里，曰吴林之山，其中多葌草。",
          "dataUnlockLevel": 709
        },
        {
          "id": "zhongshan-1-11",
          "name": "牛首之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 71,
          "terrain": "劳水出焉，而西流注于潏水",
          "yields": {
            "herb": [
              "鬼草"
            ],
            "fish": [
              "飞鱼"
            ]
          },
          "fauna": [
            {
              "name": "飞鱼",
              "form": "其状如鲋鱼",
              "effect": "食之已痔衕",
              "category": "水族"
            }
          ],
          "source": "又北三十里，曰牛首之山。有草焉，名曰鬼草，其叶如葵而赤茎，其秀如禾，服之不忧。劳水出焉，而西流注于潏水。是多飞鱼，其状如鲋鱼，食之已痔衕。",
          "dataUnlockLevel": 711
        },
        {
          "id": "zhongshan-1-12",
          "name": "霍山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 71,
          "terrain": "其木多榖",
          "yields": {
            "wood": [
              "榖"
            ]
          },
          "fauna": [
            {
              "name": "朏朏",
              "form": "其状如狸，而白尾有鬛",
              "effect": "养之可以已忧",
              "category": "兽"
            }
          ],
          "source": "又北四十里，曰霍山，其木多榖。有兽焉，其状如狸，而白尾有鬛，名曰朏朏，养之可以已忧。",
          "dataUnlockLevel": 713
        },
        {
          "id": "zhongshan-1-13",
          "name": "合谷之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 71,
          "yields": {
            "wood": [
              "薝棘"
            ]
          },
          "fauna": [],
          "source": "又北五十二里，曰合谷之山，是多薝棘。",
          "dataUnlockLevel": 715
        },
        {
          "id": "zhongshan-1-14",
          "name": "阴山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 71,
          "terrain": "少水出焉",
          "yields": {
            "mineral": [
              "砺石",
              "文石"
            ],
            "wood": [
              "雕棠"
            ]
          },
          "fauna": [],
          "source": "又北三十五里，曰阴山，多砺石、文石。少水出焉，其中多雕棠，其叶如榆叶而方，其实如赤菽，食之已聋。",
          "dataUnlockLevel": 717
        },
        {
          "id": "zhongshan-1-15",
          "name": "鼓镫之山",
          "chapter": "中山经·中次一经",
          "unlockLevel": 71,
          "yields": {
            "mineral": [
              "赤铜"
            ],
            "herb": [
              "荣草"
            ]
          },
          "fauna": [],
          "source": "又东北四百里，曰鼓镫之山，多赤铜。有草焉，名曰荣草，其叶如柳，其本如鸡卵，食之已风。",
          "dataUnlockLevel": 719
        }
      ],
      "dataUnlockLevel": 691
    },
    {
      "regionId": "zhongshan-2",
      "regionName": "中次二经",
      "regionAlias": "济山",
      "order": 16,
      "unlockLevel": 71,
      "summary": "凡济山经之首，自𪸩诸之山至于蔓渠之山，凡九山，一千六百七十里。其神皆人面而鸟身。祠用毛，用一吉玉，投而不糈。",
      "deity": {
        "form": "其神皆人面而鸟身。祠用毛，用一吉玉，投而不糈",
        "rite": {
          "毛用": "未特指（通用）",
          "婴用": "一吉玉",
          "祭法": "投而不糈（玉投于水，不用精米）",
          "原文": "凡济山经之首，自𪸩诸之山至于蔓渠之山，凡九山，一千六百七十里。其神皆人面而鸟身。祠用毛，用一吉玉，投而不糈。"
        }
      },
      "requirement": "中次二经多金玉无草木之山，采玉线核心；鸣蛇/化蛇双征兆共处一系",
      "legs": [
        {
          "direction": "西南行",
          "distance": 200,
          "from": "𪸩诸之山",
          "to": "发视之山",
          "mode": "陆行",
          "total": 200
        },
        {
          "direction": "西行",
          "distance": 300,
          "from": "发视之山",
          "to": "豪山",
          "mode": "陆行",
          "total": 300
        },
        {
          "direction": "西行",
          "distance": 300,
          "from": "豪山",
          "to": "鲜山",
          "mode": "陆行",
          "total": 300
        },
        {
          "direction": "西行",
          "distance": 300,
          "from": "鲜山",
          "to": "阳山",
          "mode": "陆行",
          "total": 300
        },
        {
          "direction": "西行",
          "distance": 200,
          "from": "阳山",
          "to": "昆吾之山",
          "mode": "陆行",
          "total": 200
        },
        {
          "direction": "西行",
          "distance": 120,
          "from": "昆吾之山",
          "to": "葌山",
          "mode": "陆行",
          "total": 120
        },
        {
          "direction": "西行",
          "distance": 150,
          "from": "葌山",
          "to": "独苏之山",
          "mode": "陆行",
          "total": 150
        },
        {
          "direction": "西行",
          "distance": 200,
          "from": "独苏之山",
          "to": "蔓渠之山",
          "mode": "陆行",
          "total": 200
        }
      ],
      "nodes": [
        {
          "id": "zhongshan-2-01",
          "name": "𪸩诸之山",
          "chapter": "中山经·中次二经",
          "unlockLevel": 71,
          "yields": {
            "wood": [
              "桑"
            ]
          },
          "fauna": [
            {
              "name": "闾",
              "category": "兽"
            },
            {
              "name": "麋",
              "category": "兽"
            },
            {
              "name": "鹖",
              "category": "鸟"
            }
          ],
          "source": "中次二经济山之首，曰𪸩诸之山，其上多桑，其兽多闾麋，其鸟多鹖。",
          "dataUnlockLevel": 721
        },
        {
          "id": "zhongshan-2-02",
          "name": "发视之山",
          "chapter": "中山经·中次二经",
          "unlockLevel": 71,
          "terrain": "即鱼之水出焉，而西流注于伊水",
          "yields": {
            "mineral": [
              "金",
              "玉",
              "砥砺"
            ]
          },
          "fauna": [],
          "source": "又西南二百里，曰发视之山，其上多金玉，其下多砥砺。即鱼之水出焉，而西流注于伊水。",
          "dataUnlockLevel": 724
        },
        {
          "id": "zhongshan-2-03",
          "name": "豪山",
          "chapter": "中山经·中次二经",
          "unlockLevel": 72,
          "yields": {
            "mineral": [
              "金",
              "玉"
            ]
          },
          "fauna": [],
          "source": "又西三百里，曰豪山，其上多金玉而无草木。",
          "dataUnlockLevel": 726
        },
        {
          "id": "zhongshan-2-04",
          "name": "鲜山",
          "chapter": "中山经·中次二经",
          "unlockLevel": 72,
          "terrain": "鲜水出焉，而北流注于伊水",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ]
          },
          "omen": [
            {
              "trigger": "鸣蛇",
              "type": "大旱",
              "desc": "见则其邑大旱",
              "polarity": "凶"
            }
          ],
          "fauna": [
            {
              "name": "鸣蛇",
              "form": "其状如蛇而四翼",
              "sound": "其音如磬",
              "effect": "见则其邑大旱",
              "category": "蛇"
            }
          ],
          "source": "又西三百里，曰鲜山，多金玉，无草木。鲜水出焉，而北流注于伊水。其中多鸣蛇，其状如蛇而四翼，其音如磬，见则其邑大旱。",
          "dataUnlockLevel": 728
        },
        {
          "id": "zhongshan-2-05",
          "name": "阳山",
          "chapter": "中山经·中次二经",
          "unlockLevel": 72,
          "terrain": "阳水出焉，而北流注于伊水",
          "yields": {
            "mineral": [
              "石"
            ]
          },
          "omen": [
            {
              "trigger": "化蛇",
              "type": "大水",
              "desc": "见则其邑大水",
              "polarity": "凶"
            }
          ],
          "fauna": [
            {
              "name": "化蛇",
              "form": "其状如人面而豺身，鸟翼而蛇行",
              "sound": "其音如叱呼",
              "effect": "见则其邑大水",
              "category": "蛇"
            }
          ],
          "source": "又西三百里，曰阳山，多石，无草木。阳水出焉，而北流注于伊水。其中多化蛇，其状如人面而豺身，鸟翼而蛇行，其音如叱呼，见则其邑大水。",
          "dataUnlockLevel": 730
        },
        {
          "id": "zhongshan-2-06",
          "name": "昆吾之山",
          "chapter": "中山经·中次二经",
          "unlockLevel": 72,
          "yields": {
            "mineral": [
              "赤铜"
            ]
          },
          "fauna": [
            {
              "name": "蠪蚳",
              "form": "其状如彘而有角",
              "sound": "其音如号",
              "effect": "食之不眯",
              "category": "兽"
            }
          ],
          "source": "又西二百里，曰昆吾之山，其上多赤铜。有兽焉，其状如彘而有角，其音如号，名曰蠪蚳，食之不眯。",
          "dataUnlockLevel": 732
        },
        {
          "id": "zhongshan-2-07",
          "name": "葌山",
          "chapter": "中山经·中次二经",
          "unlockLevel": 72,
          "terrain": "葌水出焉，而北流注于伊水",
          "yields": {
            "mineral": [
              "金",
              "玉",
              "青雄黄"
            ],
            "herb": [
              "芒草"
            ]
          },
          "fauna": [],
          "source": "又西百二十里，曰葌山。葌水出焉，而北流注于伊水，其上多金玉，其下多青雄黄。有木焉，其状如棠而赤叶，名曰芒草，可以毒鱼。",
          "dataUnlockLevel": 734
        },
        {
          "id": "zhongshan-2-08",
          "name": "独苏之山",
          "chapter": "中山经·中次二经",
          "unlockLevel": 72,
          "terrain": "无草木而多水",
          "yields": {},
          "fauna": [],
          "source": "又西一百五十里，曰独苏之山。无草木而多水。",
          "dataUnlockLevel": 736
        },
        {
          "id": "zhongshan-2-09",
          "name": "蔓渠之山",
          "chapter": "中山经·中次二经",
          "unlockLevel": 73,
          "terrain": "伊水出焉，而东流注于洛",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "wood": [
              "竹箭"
            ]
          },
          "fauna": [
            {
              "name": "马腹",
              "form": "其状如人面虎身",
              "sound": "其音如婴儿",
              "effect": "是食人",
              "hazard": true,
              "category": "兽"
            }
          ],
          "source": "又西二百里，曰蔓渠之山，其上多金玉，其下多竹箭。伊水出焉，而东流注于洛。有兽焉，其名曰马腹，其状如人面虎身，其音如婴儿，是食人。",
          "dataUnlockLevel": 738
        }
      ],
      "dataUnlockLevel": 721
    },
    {
      "regionId": "zhongshan-3",
      "regionName": "中次三经",
      "regionAlias": "萯山",
      "order": 17,
      "unlockLevel": 73,
      "summary": "凡萯山之首，自敖岸之山至于和山，凡五山，四百四十里。其祠：太逢、熏池、武罗，皆一牡羊，副婴用吉玉；其二神用一雄鸡，瘗之，糈用稌。",
      "deity": {
        "form": "青要之山为帝之密都，䰠武罗司之（人面豹文，小腰白齿，穿耳以鐻，其鸣如鸣玉）；和山吉神泰逢司之（人而虎尾，好居于萯山之阳，出入有光）",
        "rite": {
          "毛用": "太逢、熏池、武罗皆一牡羊；其二神用一雄鸡",
          "婴用": "吉玉",
          "祭法": "瘗之，糈用稌",
          "原文": "凡萯山之首，自敖岸之山至于和山。凡五山，四百四十里。其祠：太逢、熏池、武罗，皆一牡羊。副婴用吉玉。其二神用一雄鸡。瘞之，糈用稌。"
        }
      },
      "requirement": "帝之密都所在——神祇密度最高的一系；青要之山「宜女子」，鴢、荀草皆宜子宜色",
      "legs": [
        {
          "direction": "东行",
          "distance": 10,
          "from": "敖岸之山",
          "to": "青要之山",
          "mode": "陆行",
          "total": 10
        },
        {
          "direction": "东行",
          "distance": 10,
          "from": "青要之山",
          "to": "騩山",
          "mode": "陆行",
          "total": 10
        },
        {
          "direction": "东行",
          "distance": 40,
          "from": "騩山",
          "to": "宜苏之山",
          "mode": "陆行",
          "total": 40
        },
        {
          "direction": "东行",
          "distance": 20,
          "from": "宜苏之山",
          "to": "和山",
          "mode": "陆行",
          "total": 20
        }
      ],
      "nodes": [
        {
          "id": "zhongshan-3-01",
          "name": "敖岸之山",
          "chapter": "中山经·中次三经",
          "unlockLevel": 73,
          "terrain": "其阳多㻬琈之玉，其阴多赭、黄金；神熏池居之，是常出美玉",
          "yields": {
            "mineral": [
              "㻬琈之玉",
              "赭",
              "黄金"
            ]
          },
          "omen": [
            {
              "trigger": "夫诸",
              "type": "大水",
              "desc": "见则其邑大水",
              "polarity": "凶"
            }
          ],
          "fauna": [
            {
              "name": "夫诸",
              "form": "其状如白鹿而四角",
              "effect": "见则其邑大水",
              "category": "兽"
            }
          ],
          "source": "中次三经萯山之首，曰敖岸之山。其阳多㻬琈之玉，其阴多赭、黄金。神熏池居之，是常出美玉。北望河林，其状如蒨如举。有兽焉，其状如白鹿而四角，名曰夫诸，见则其邑大水。",
          "dataUnlockLevel": 741
        },
        {
          "id": "zhongshan-3-02",
          "name": "青要之山",
          "chapter": "中山经·中次三经",
          "unlockLevel": 73,
          "terrain": "实维帝之密都；畛水出焉，而北流注于河；宜女子",
          "yields": {
            "herb": [
              "荀草"
            ],
            "fish": [
              "鴢"
            ]
          },
          "fauna": [
            {
              "name": "武罗",
              "form": "其状人面而豹文，小腰而白齿，而穿耳以鐻",
              "sound": "其鸣如鸣玉",
              "category": "神祇"
            },
            {
              "name": "驾鸟",
              "category": "鸟"
            },
            {
              "name": "鴢",
              "form": "其状如凫，青身而朱目赤尾",
              "effect": "食之宜子",
              "category": "鸟"
            }
          ],
          "source": "又东十里，曰青要之山，实维帝之密都。北望河曲，是多驾鸟。南望䰠渚，禹父之所化，是多仆累、蒲卢。䰠武罗司之，其状人面而豹文，小腰而白齿，而穿耳以鐻，其鸣如鸣玉。是山也，宜女子，畛水出焉，而北流注于河。其中有鸟焉，名曰鴢，其状如凫，青身而朱目赤尾，食之宜子。有草焉，其状如葌而方茎、黄华、赤实，其本如稿本，名曰荀草，服之美人色。",
          "dataUnlockLevel": 743
        },
        {
          "id": "zhongshan-3-03",
          "name": "騩山",
          "chapter": "中山经·中次三经",
          "unlockLevel": 73,
          "terrain": "正回之水出焉，而北流注于河",
          "yields": {
            "fruit": [
              "美枣"
            ],
            "mineral": [
              "㻬琈之玉"
            ],
            "fish": [
              "飞鱼"
            ]
          },
          "fauna": [
            {
              "name": "飞鱼",
              "form": "其状如豚而赤文",
              "effect": "服之不畏雷，可以御兵",
              "category": "水族"
            }
          ],
          "source": "又东十里，曰騩山。其上有美枣，其阴有㻬琈之玉。正回之水出焉，而北流注于河。其中多飞鱼，其状如豚而赤文，服之不畏雷，可以御兵。",
          "dataUnlockLevel": 745
        },
        {
          "id": "zhongshan-3-04",
          "name": "宜苏之山",
          "chapter": "中山经·中次三经",
          "unlockLevel": 73,
          "terrain": "滽滽之水出焉，而北流注于河",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "wood": [
              "蔓居之木"
            ]
          },
          "fauna": [],
          "source": "又东四十里，曰宜苏之山。其上多金玉，其下多蔓居之木。滽滽之水出焉，而北流注于河，是多黄贝。",
          "dataUnlockLevel": 747
        },
        {
          "id": "zhongshan-3-05",
          "name": "和山",
          "chapter": "中山经·中次三经",
          "unlockLevel": 73,
          "terrain": "实惟河之九都；是山也五曲，九水出焉，合而北流注于河",
          "yields": {
            "mineral": [
              "瑶碧",
              "苍玉"
            ]
          },
          "fauna": [
            {
              "name": "泰逢",
              "form": "其状如人而虎尾",
              "effect": "好居于萯山之阳，出入有光——太逢神动天地气也",
              "category": "神祇"
            }
          ],
          "source": "又东二十里，曰和山。其上无草木，而多瑶碧，实惟河之九都。是山也五曲，九水出焉，合而北流注于河。其中多苍玉。吉神泰逢司之，其状如人而虎尾，是好居于萯山之阳，出入有光，太逢神动天地气也。",
          "dataUnlockLevel": 749
        }
      ],
      "dataUnlockLevel": 741
    },
    {
      "regionId": "zhongshan-4",
      "regionName": "中次四经",
      "regionAlias": "厘山",
      "order": 18,
      "unlockLevel": 74,
      "summary": "凡厘山之首，自鹿蹄之山至于玄扈之山，凡九山，千六百七十里。其神状皆人面兽身。其祠之，毛用一白鸡，祈而不糈，以彩衣之。",
      "deity": {
        "form": "其神状皆人面兽身。其祠之毛，用一白鸡，祈而不糈，以彩衣之",
        "rite": {
          "毛用": "一白鸡",
          "祭法": "祈而不糈，以彩衣之",
          "原文": "凡厘山之首，自鹿蹄之山至于玄扈之山，凡九山，千六百七十里。其神状皆人面兽身。其祠之毛，用一白鸡，祈而不糈，以彩衣之。"
        }
      },
      "requirement": "中次四经厘山九山已入录（2026-10-24 补录）",
      "legs": [],
      "nodes": [
        {
          "id": "zhongshan-4-01",
          "name": "鹿蹄之山",
          "chapter": "中山经·中次四经",
          "unlockLevel": 74,
          "terrain": "甘水出焉，而北流注于洛",
          "yields": {
            "mineral": [
              "玉",
              "金",
              "泠石"
            ]
          },
          "source": "中次四经厘山之首，曰鹿蹄之山，其上多玉，其下多金。甘水出焉，而北流注于洛，其中多泠石。",
          "dataUnlockLevel": 753
        },
        {
          "id": "zhongshan-4-02",
          "name": "扶猪之山",
          "chapter": "中山经·中次四经",
          "unlockLevel": 74,
          "terrain": "虢水出焉，而北流注于洛",
          "yields": {
            "mineral": [
              "碝石"
            ]
          },
          "fauna": [
            {
              "name": "䴦",
              "form": "其状如貉而人目",
              "category": "兽"
            }
          ],
          "source": "西五十里，曰扶猪之山，其上多碝石。有兽焉，其状如貉而人目，其名曰䴦。虢水出焉，而北流注于洛，其中多碝石。",
          "dataUnlockLevel": 756
        },
        {
          "id": "zhongshan-4-03",
          "name": "厘山",
          "chapter": "中山经·中次四经",
          "unlockLevel": 74,
          "terrain": "滽滽之水出焉，而南流注于伊水",
          "yields": {
            "mineral": [
              "玉"
            ],
            "herb": [
              "蒐"
            ]
          },
          "fauna": [
            {
              "name": "犀渠",
              "form": "其状如牛，苍身",
              "sound": "其音如婴儿",
              "effect": "是食人",
              "hazard": true,
              "category": "兽"
            },
            {
              "name": "𤢺",
              "form": "其状如獳犬而有鳞，其毛如彘鬣",
              "category": "兽"
            }
          ],
          "source": "又西一百二十里，曰厘山，其阳多玉，其阴多蒐。有兽焉，其状如牛，苍身，其音如婴儿，是食人，其名曰犀渠。滽滽之水出焉，而南流注于伊水。有兽焉，名曰𤢺，其状如獳犬而有鳞，其毛如彘鬣。",
          "dataUnlockLevel": 758
        },
        {
          "id": "zhongshan-4-04",
          "name": "箕尾之山",
          "chapter": "中山经·中次四经",
          "unlockLevel": 74,
          "yields": {
            "wood": [
              "楮"
            ],
            "mineral": [
              "涂石",
              "㻬琈之玉"
            ]
          },
          "source": "又西二百里，曰箕尾之山，多楮，多涂石，其上多㻬琈之玉。",
          "dataUnlockLevel": 761
        },
        {
          "id": "zhongshan-4-05",
          "name": "柄山",
          "chapter": "中山经·中次四经",
          "unlockLevel": 74,
          "terrain": "滔雕之水出焉，而北流注于洛",
          "yields": {
            "mineral": [
              "玉",
              "铜"
            ],
            "wood": [
              "茇"
            ]
          },
          "fauna": [
            {
              "name": "羬羊",
              "category": "兽"
            }
          ],
          "source": "又西二百五十里，曰柄山，其上多玉，其下多铜。滔雕之水出焉，而北流注于洛。其中多羬羊。有木焉，其状如樗，其叶如桐而荚实，其名曰茇，可以毒鱼。",
          "dataUnlockLevel": 764
        },
        {
          "id": "zhongshan-4-06",
          "name": "白边之山",
          "chapter": "中山经·中次四经",
          "unlockLevel": 75,
          "yields": {
            "mineral": [
              "金",
              "玉",
              "青雄黄"
            ]
          },
          "source": "又西二百里，曰白边之山，其上多金玉，其下多青雄黄。",
          "dataUnlockLevel": 767
        },
        {
          "id": "zhongshan-4-07",
          "name": "熊耳之山",
          "chapter": "中山经·中次四经",
          "unlockLevel": 75,
          "terrain": "浮濠之水出焉，而西流注于洛",
          "yields": {
            "wood": [
              "漆",
              "棕"
            ],
            "mineral": [
              "水玉"
            ],
            "herb": [
              "葶苎"
            ]
          },
          "fauna": [
            {
              "name": "人鱼",
              "category": "水族"
            }
          ],
          "source": "又西二百里，曰熊耳之山，其上多漆，其下多棕。浮濠之水出焉，而西流注于洛，其中多水玉，多人鱼。有草焉，其状如苏而赤华，名曰葶苎，可以毒鱼。",
          "dataUnlockLevel": 770
        },
        {
          "id": "zhongshan-4-08",
          "name": "牡山",
          "chapter": "中山经·中次四经",
          "unlockLevel": 75,
          "yields": {
            "mineral": [
              "文石"
            ],
            "wood": [
              "竹箭",
              "竹䉋"
            ]
          },
          "fauna": [
            {
              "name": "㸲牛",
              "category": "兽"
            },
            {
              "name": "羬羊",
              "category": "兽"
            },
            {
              "name": "赤鷩",
              "category": "鸟"
            }
          ],
          "source": "又西三百里，曰牡山，其上多文石，其下多竹箭、竹䉋。其兽多㸲牛、羬羊，鸟多赤鷩。",
          "dataUnlockLevel": 772
        },
        {
          "id": "zhongshan-4-09",
          "name": "𬤰举之山",
          "chapter": "中山经·中次四经",
          "unlockLevel": 75,
          "terrain": "雒水出焉，而东北流注于玄扈之水",
          "source": "又西三百五十里，曰𬤰举之山，雒水出焉，而东北流注于玄扈之水，其中多马肠之物。此二山者，洛间也。",
          "dataUnlockLevel": 775
        }
      ],
      "dataUnlockLevel": 753
    },
    {
      "regionId": "zhongshan-5",
      "regionName": "中次五经",
      "regionAlias": "薄山",
      "order": 19,
      "unlockLevel": 75,
      "summary": "凡薄山之首，自苟林之山至于阳虚之山，凡十六山，二千九百八十二里。升山，冢也；首山，䰠也；尸水，合天也。",
      "deity": {
        "form": "升山冢也，其祠礼太牢，婴用吉玉；首山䰠也，其祠用稌、黑牺、大牢之具，蘖酿，干舞置鼓，婴用一璧；尸水合天也，肥牲祠之",
        "rite": {
          "原文": "凡薄山之首，自苟林之山至于阳虚之山，凡十六山，二千九百八十二里。升山，冢也，其祠礼：太牢，婴用吉玉。首山，䰠也，其祠用稌，黑牺，大牢之具，蘖酿，干舞置鼓，婴用一璧。尸水，合天也，肥牲祠之，用一黑犬于上，用一雌鸡于下，刏一牝羊，献血；婴用吉玉，彩之。飨之。"
        }
      },
      "requirement": "nodes 已补录 15 山（传世本实录；末句自述「凡十六山」，脱漏一座无从考补——里程 2982 里与 15 山版精确吻合，详见 _meta.版本差异说明）",
      "legs": [],
      "nodes": [
        {
          "id": "zhongshan-5-01",
          "name": "苟床之山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "yields": {
            "mineral": [
              "怪石"
            ]
          },
          "source": "中次五经薄山之首，曰苟床之山，无草木，多怪石。",
          "dataUnlockLevel": 777
        },
        {
          "id": "zhongshan-5-02",
          "name": "首山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "terrain": "其阴有谷，曰机谷",
          "yields": {
            "mineral": [
              "㻬琈之玉"
            ],
            "wood": [
              "榖",
              "柞",
              "槐"
            ],
            "herb": [
              "𦬸",
              "芫"
            ]
          },
          "fauna": [
            {
              "name": "䲦鸟",
              "form": "其状如枭而三目，有耳",
              "sound": "其音如录",
              "effect": "食之已垫",
              "category": "鸟"
            }
          ],
          "source": "东三百里，曰首山，其阴多榖、柞，其草多𦬸芫，其阳多㻬琈之玉，木多槐。其阴有谷，曰机谷，多䲦鸟，其状如枭而三目，有耳，其音如录，食之已垫。",
          "dataUnlockLevel": 778
        },
        {
          "id": "zhongshan-5-03",
          "name": "县𣃁之山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "yields": {
            "mineral": [
              "文石"
            ]
          },
          "source": "又东三百里，曰县𣃁之山。无草木，多文石。",
          "dataUnlockLevel": 779
        },
        {
          "id": "zhongshan-5-04",
          "name": "葱聋之山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "yields": {
            "mineral": [
              "玤石"
            ]
          },
          "source": "又东三百里，曰葱聋之山。无草木，多玤石。",
          "dataUnlockLevel": 780
        },
        {
          "id": "zhongshan-5-05",
          "name": "条谷之山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "yields": {
            "wood": [
              "槐",
              "桐"
            ],
            "herb": [
              "芍药",
              "虋冬"
            ]
          },
          "source": "东北五百里，曰条谷之山。其木多槐、桐，其草多芍药、虋冬。",
          "dataUnlockLevel": 781
        },
        {
          "id": "zhongshan-5-06",
          "name": "超山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "terrain": "其阳有井，冬有水而夏竭",
          "yields": {
            "mineral": [
              "苍玉"
            ]
          },
          "source": "又北十里，曰超山。其阴多苍玉，其阳有井，冬有水而夏竭。",
          "dataUnlockLevel": 782
        },
        {
          "id": "zhongshan-5-07",
          "name": "成侯之山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "yields": {
            "wood": [
              "櫄木"
            ],
            "herb": [
              "芃"
            ]
          },
          "source": "又东五百里，曰成侯之山。其上多櫄木，其草多芃。",
          "dataUnlockLevel": 783
        },
        {
          "id": "zhongshan-5-08",
          "name": "朝歌之山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "yields": {
            "mineral": [
              "美垩"
            ]
          },
          "source": "又东五百里，曰朝歌之山。谷多美垩。",
          "dataUnlockLevel": 784
        },
        {
          "id": "zhongshan-5-09",
          "name": "槐山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "yields": {
            "mineral": [
              "金",
              "锡"
            ]
          },
          "source": "又东五百里，曰槐山。谷多金、锡。",
          "dataUnlockLevel": 785
        },
        {
          "id": "zhongshan-5-10",
          "name": "历山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "yields": {
            "mineral": [
              "玉"
            ],
            "wood": [
              "槐"
            ]
          },
          "source": "又东十里，曰历山。其木多槐，其阳多玉。",
          "dataUnlockLevel": 786
        },
        {
          "id": "zhongshan-5-11",
          "name": "尸山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "terrain": "尸水出焉，南流注于洛水",
          "yields": {
            "mineral": [
              "苍玉",
              "美玉"
            ]
          },
          "fauna": [
            {
              "name": "麖",
              "category": "兽"
            }
          ],
          "source": "又东十里，曰尸山。多苍玉，其兽多麖。尸水出焉，南流注于洛水，其中多美玉。",
          "dataUnlockLevel": 787
        },
        {
          "id": "zhongshan-5-12",
          "name": "良馀之山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "terrain": "馀水出于其阴，而北流注于河；乳水出于其阳，而东南流注于洛",
          "yields": {
            "wood": [
              "榖",
              "柞"
            ]
          },
          "source": "又东十里，曰良馀之山。其上多榖、柞，无石。馀水出于其阴，而北流注于河；乳水出于其阳，而东南流注于洛。",
          "dataUnlockLevel": 788
        },
        {
          "id": "zhongshan-5-13",
          "name": "蛊尾之山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "terrain": "龙馀之水出焉，而东南流注于洛",
          "yields": {
            "mineral": [
              "砺石",
              "赤铜"
            ]
          },
          "source": "又东南十里，曰蛊尾之山。多砺石、赤铜。龙馀之水出焉，而东南流注于洛。",
          "dataUnlockLevel": 789
        },
        {
          "id": "zhongshan-5-14",
          "name": "升山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "terrain": "黄酸之水出焉，而北流注于河",
          "yields": {
            "mineral": [
              "璇玉"
            ],
            "wood": [
              "榖",
              "柞",
              "棘"
            ],
            "herb": [
              "藷藇",
              "蕙",
              "寇脱"
            ]
          },
          "source": "又东北二十里，曰升山，其木多榖、柞、棘，其草多藷藇、蕙，多寇脱。黄酸之水出焉，而北流注于河，其中多璇玉。",
          "dataUnlockLevel": 790
        },
        {
          "id": "zhongshan-5-15",
          "name": "阳虚之山",
          "chapter": "中山经·中次五经",
          "unlockLevel": 75,
          "terrain": "临于玄扈之水",
          "yields": {
            "mineral": [
              "金"
            ]
          },
          "source": "又东十二里，曰阳虚之山。多金。临于玄扈之水。",
          "dataUnlockLevel": 791
        }
      ],
      "dataUnlockLevel": 777
    },
    {
      "regionId": "zhongshan-6",
      "regionName": "中次六经",
      "regionAlias": "缟羝山",
      "order": 20,
      "unlockLevel": 75,
      "summary": "凡缟羝山之首，自平逢之山至于阳华之山，凡十四山，七百九十里。岳在其中，以六月祭之，如诸岳之祠法，则天下安宁。",
      "deity": {
        "form": "平逢之山有神焉，名曰骄虫，其状如人而二首，是为螫虫，实惟蜂蜜之庐；用一雄鸡，禳而勿杀",
        "rite": {
          "原文": "凡缟羝山之首，自平逢之山至于阳华之山，凡十四山，七百九十里，岳在其中，以六月祭之，如诸岳之祠法，则天下安宁。"
        }
      },
      "requirement": "nodes 待补录（平逢/缟羝/廆/瞻诸/娄涿/白石/榖/密/长石/传/橐/常烝/夸父/阳华十四山；密山多旋龟）",
      "legs": [],
      "nodes": [],
      "dataUnlockLevel": 793
    },
    {
      "regionId": "zhongshan-7",
      "regionName": "中次七经",
      "regionAlias": "苦山",
      "order": 21,
      "unlockLevel": 76,
      "summary": "凡苦山之首，自休与之山至于大騩之山，凡十有九山，千一百八十四里。其十六神者，皆豕身而人面。苦山、少室、太室，皆冢也。",
      "deity": {
        "form": "其十六神者，皆豕身而人面；苦山、少室、太室皆冢也，太牢之具，婴以吉玉；堵山神天愚居之，是多怪风雨",
        "rite": {
          "原文": "凡苦山之首，自休与之山至于大騩之山，凡十有九山，千一百八十四里。其十六神者，皆豕身而人面。其祠：毛牷用一羊羞，婴用一藻玉瘗。苦山、少室、太室，皆冢也。其祠之：太牢之具，婴以吉玉。其神状皆人面而三首，其余属皆豕身人面也。"
        }
      },
      "requirement": "nodes 待补录（休与/鼓钟/姑媱/苦/堵/放皋/大𩇵/半石/少室/泰室/讲/婴梁/浮戏/少陉/太/末/役/敏/大騩十九山）",
      "legs": [],
      "nodes": [],
      "dataUnlockLevel": 807
    },
    {
      "regionId": "zhongshan-8",
      "regionName": "中次八经",
      "regionAlias": "荆山",
      "order": 22,
      "unlockLevel": 77,
      "summary": "凡荆山之首，自景山至琴鼓之山，凡二十三山，二千八百九十里。其神状皆鸟身而人面。骄山，冢也。",
      "deity": {
        "form": "其神状皆鸟身而人面；骄山神𬠷围（人面羊角虎爪，恒游于睢漳之渊，出入有光）、光山神计蒙（人身龙首，出入必有飘风暴雨）、岐山神涉𬠷（人身而方面三足）",
        "rite": {
          "原文": "凡荆山之首，自景山至琴鼓之山，凡二十三山，二千八百九十里。其神状皆鸟身而人面。其祠：用一雄鸡祈瘗，用一藻圭，糈用稌。骄山，冢也。其祠：用羞酒少牢祈瘗，婴毛一璧。"
        }
      },
      "requirement": "nodes 待补录（景/荆/骄/女几/宜诸/纶/陆䣀/光/岐/铜/美/大尧/灵/龙/衡/石/若/彘/玉/𬤰/仁举/师每/琴鼓二十三山）",
      "legs": [],
      "nodes": [],
      "dataUnlockLevel": 826
    },
    {
      "regionId": "zhongshan-9",
      "regionName": "中次九经",
      "regionAlias": "岷山",
      "order": 23,
      "unlockLevel": 77,
      "summary": "凡岷山之首，自女几山至于贾超之山，凡十六山，三千五百里。其神状皆马身而龙首。文山、勾、檷、风雨丑之山，是皆冢也；熊山，席也。",
      "deity": {
        "form": "其神状皆马身而龙首；冢者羞酒少牢具，婴毛一吉玉；熊山席也，羞酒大牢具，婴毛一璧，干舞，用兵以禳祈",
        "rite": {
          "原文": "凡岷山之首，自女几山至于贾超之山，凡十六山，三千五百里。其神状皆马身而龙首。其祠：毛用一雄鸡瘗，糈用稌。文山、勾、檷、风雨丑之山，是皆冢也，其祠之：羞酒，少牢具，婴毛一吉玉。熊山，席也，其祠：羞酒，大牢具，婴毛一璧，干舞，用兵以禳祈，球冕舞。"
        }
      },
      "requirement": "nodes 待补录（女几/岷/崃/崌/高梁/蛇/鬲/隅阳/岐/勾檷/风雨/玉/熊/騩/葛/贾超十六山）",
      "legs": [],
      "nodes": [],
      "dataUnlockLevel": 849
    },
    {
      "regionId": "zhongshan-10",
      "regionName": "中次十经",
      "regionAlias": "首阳山",
      "order": 24,
      "unlockLevel": 78,
      "summary": "凡首阳山之首，自首山至于丙山，凡九山，二百六十七里。其神状皆龙身而人面。堵山，冢也；騩山，帝也。",
      "deity": {
        "form": "其神状皆龙身而人面；堵山冢也，少牢具，羞酒祠，婴毛一璧瘗；騩山帝也，羞酒太牢，合巫祝二人舞，婴一璧",
        "rite": {
          "原文": "凡首阳山之首，自首山至于丙山，凡九山，二百六十七里。其神状皆龙身而人面。其祠之：毛用一雄鸡瘗，糈用五种之糈。堵山，冢也，其祠之：少牢具，羞酒祠，婴毛一璧瘗。騩山，帝也，其祠羞酒，太牢其；合巫祝二人舞，婴一璧。"
        }
      },
      "requirement": "nodes 待补录（首阳/虎尾/繁缋/勇石/复州/楮/又原/涿/丙九山；复州多跂踵）",
      "legs": [],
      "nodes": [],
      "dataUnlockLevel": 865
    },
    {
      "regionId": "zhongshan-11",
      "regionName": "中次十一经",
      "regionAlias": "荆山",
      "order": 25,
      "unlockLevel": 78,
      "summary": "凡荆山之首，自翼望之山至于几山，凡四十八山（识典本；维基文库/袁珂本作四十六山），三千七百三十二里。其神状皆彘身人首。禾山，帝也；堵山、玉山，冢也。",
      "deity": {
        "form": "其神状皆彘身人首；禾山帝也，太牢之具，羞瘗倒毛，用一璧；堵山、玉山冢也，皆倒祠，羞毛少牢，婴毛吉玉",
        "rite": {
          "原文": "凡荆山之首，自翼望之山至于几山，凡四十八山，三千七百三十二里。其神状皆彘身人首。其祠：毛用一雄鸡祈，瘗用一圭，糈用五种之精。禾山，帝也，其祠：太牢之具，羞瘗倒毛，用一璧，牛无常。堵山、玉山，冢也，皆倒祠，羞毛少牢，婴毛吉玉。"
        }
      },
      "requirement": "nodes 待补录（翼望至几山，全书最长一系；宣山帝女之桑、鲜山𤝻即、倚帝狙如）",
      "legs": [],
      "nodes": [],
      "dataUnlockLevel": 874
    },
    {
      "regionId": "zhongshan-12",
      "regionName": "中次十二经",
      "regionAlias": "洞庭山",
      "order": 26,
      "unlockLevel": 80,
      "summary": "凡洞庭山之首，自篇遇之山至于荣余之山，凡十五山，二千八百里。其神状皆鸟身而龙首。洞庭、荣余山，神也。",
      "deity": {
        "form": "其神状皆鸟身而龙首；夫夫之山神于儿（人身而身操两蛇，常游于江渊，出入有光）；帝之二女居洞庭之山，出入必以飘风暴雨",
        "rite": {
          "原文": "凡洞庭山之首，自篇遇之山至于荣余之山，凡十五山，二千八百里，其神状皆鸟身而龙首。其祠：毛用一雄鸡、一牝豚刏，糈用稌。凡夫夫之山、即公之山、尧山、阳帝之山，皆冢也，其祠：皆肆瘗，祈用酒，毛用少牢，婴毛一吉玉。洞庭、荣余山，神也，其祠：皆肆瘗，祈酒太牢祠，婴用圭璧十五，五彩惠之。"
        }
      },
      "requirement": "nodes 待补录（篇遇至荣余十五山；全书收卷之系——帝之二女与九江风涛）",
      "legs": [],
      "nodes": [],
      "dataUnlockLevel": 922
    }
  ]
};
