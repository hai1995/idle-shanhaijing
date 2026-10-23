// ===== 北山经世界数据（三系 88 山） =====
// 本文件由 beishanjing_nodes.json 派生生成，请勿手改；
// 需要调整数据时改 JSON 后重新运行 node scripts/gen-world-data.js
// 底本：中华书局点校本《山海经校注》（袁珂）——古籍原文，公有领域

window.BEISHAN = {
  "_meta": {
    "项目": "山海经·放置挂机",
    "数据范围": "北山经 三系（北次一经25 / 北次二经16 / 北次三经47，合计 88 山）",
    "用途": "世界地图与资源节点数据源，结构与 nanshanjing_nodes.json、xishanjing_nodes.json 完全一致，可直接合并",
    "原文底本": "以中华书局点校本《山海经校注》（袁珂）为准，参校维基文库、中国哲学书电子化计划（ctext）、百度百科、山海经 Wiki 等多版本；异体字按通行写法处理",
    "统计差异说明": {
      "北次一经": "原文自述「凡二十五山」，本数据录 25 山，一致",
      "北次二经": "原文自述「凡十七山」，本数据录得 16 山。通行各本（维基文库、超星、山海经Wiki）可检出者均为 16 座，缺 1 座疑为版本异文或水程段被计入。全书《北经》总计原文记 87 山，与各经自述之和（25+17+46=88）本身即差 1，此为古籍流传中的既有出入",
      "北次三经": "原文自述「凡四十六山」，本数据录得 47 山。差异源于「太行之山」与「其首曰归山」在部分版本中被计为两条，另「雁门之山」「帝都之山」属水行段计入与否亦有分歧"
    },
    "字段说明": {
      "id": "唯一标识，格式 <区域>-<序号>，与前两份文件同体系",
      "name": "山名，取自原文",
      "unlockLevel": "解锁所需「舆地」等级，为自研调参值，非古籍内容",
      "fauna": "异兽/异鸟/异鱼，含形态、声音、效果、征兆",
      "omen": "征兆事件，取自原文「见则X」句式",
      "hazard": "危险标记，取自原文「是食人」「食之杀人」等",
      "source": "该节点对应的原文（节录）"
    },
    "统计口径复核": {
      "复核来源": "东山经第二轮修订时同步核出，为脚本统计，非人工逐条核定",
      "fauna记录数": 78,
      "去重后种数": 73,
      "重出多计": 5,
      "重出明细": "马×4、橐驼×2、旄牛×2",
      "仅列名条数": 24,
      "结论": "★此前「北山经 78 条异兽」应理解为记录数。去重后 73 种，其中还含常兽（马、橐驼、旄牛）"
    },
    "里程核算": {
      "说明": "★本轮新增。legs 由各节点 source 首句机械解析生成，逐系与自述里程校验。差额为古籍流传中的既有出入，nodes 与 legs 一律不改。",
      "逐系": [
        {
          "山系": "北次一经",
          "段数": 24,
          "分段之和": 5680,
          "自述": 5490,
          "差额": 190
        },
        {
          "山系": "北次二经",
          "段数": 15,
          "分段之和": 5240,
          "自述": 5690,
          "差额": -450
        },
        {
          "山系": "北次三经",
          "段数": 46,
          "分段之和": 12540,
          "自述": 12350,
          "差额": 190
        }
      ],
      "合计": {
        "段数": 85,
        "分段之和": 23460,
        "自述之和": 23530,
        "差额": -70
      }
    },
    "地形与物产画像": {
      "无草木之山": {
        "数量": 30,
        "占比": "30/88 ≈ 34.1%"
      },
      "物产键分布": {
        "wood": 19,
        "herb": 10,
        "mineral": 63,
        "water": 68,
        "fruit": 2,
        "terrain": 1,
        "woodSpecial": 1,
        "special": 1
      },
      "对比东山经": "东山经无草木 22/46 ≈ 47.8%、herb 仅 1 处，是五经中最荒的一经；本份的荒瘠程度见上"
    },
    "观象点清单": {
      "说明": "★本轮新增。原文「X望Y」句式可直接接观象系统（南山经原有 5 处观象/观瑞）",
      "合计": "2 山",
      "点位": [
        {
          "id": "beishan-3-10",
          "name": "景山",
          "望": [
            "南望盐贩之泽",
            "北望少泽"
          ],
          "临": []
        },
        {
          "id": "beishan-3-47",
          "name": "錞于毋逢之山",
          "望": [
            "北望鸡号之山",
            "西望幽都之山"
          ],
          "临": []
        }
      ]
    },
    "异兽口径核定": {
      "说明": "★本轮新增。在「统计口径复核」的脚本统计基础上做人工核定：以常兽名单剔除常兽与泛称，余下为具名异类",
      "去重种数": 73,
      "常兽": {
        "数量": 8,
        "名单": [
          "麢羊",
          "橐驼",
          "旄牛",
          "兕",
          "马",
          "麋",
          "罴",
          "大蛇"
        ]
      },
      "泛称与未名": {
        "数量": 1,
        "名单": [
          "怪蛇"
        ]
      },
      "具名异类": 64,
      "常兽名单说明": "常兽名单为人工核定：虎豹熊罴麋鹿牛羊马彘豚犬鸡蛇龟鱼象犀兕猿猴狐狼兔鼠雉鹰鸮鹊燕橐驼旄牛㸲牛白猿白虎白鹿鳣鲔蜃珵活师麢羊麋鹿大蛇鳡鱼麢麈猨貆豪彘鸱凫鸳鸯翡翠蛟螭。若你的判定不同，改名单重算即可",
      "用途": "★做图鉴分母、收集度百分比时请用「具名异类」，不要用 fauna 记录数"
    },
    "授权状态": "《山海经》原文已进入公有领域，可自由引用、改编、再创作。本文件所录均为古籍原文，不含任何当代作品内容。"
  },
  "regions": [
    {
      "regionId": "beishan-1",
      "regionName": "北次一经",
      "regionAlias": "单狐",
      "order": 8,
      "unlockLevel": 53,
      "summary": "北山经之首，曰单狐之山。凡北山经之首，自单狐之山至于堤山，凡二十五山，五千四百九十里。",
      "deity": {
        "form": "其神皆人面蛇身",
        "rite": {
          "毛用": "一雄鸡、彘瘗",
          "吉玉": "一珪",
          "特点": "瘗而不糈（埋祭品，不用精米）",
          "原文": "其神皆人面蛇身。其祠之：毛用一雄鸡、彘瘗，吉玉用一珪，瘗而不糈。其山北人，皆生食不火之物。",
          "设计提示": "★「其山北人，皆生食不火之物」——原文记载此地居民生食、不用火。可设计为「燔燎/调鼎」技能在此地无效的特殊区域规则，是全书少见的地域性负面限制"
        }
      },
      "legs": {
        "自述里程": 5490,
        "分段之和": 5680,
        "差额": 190,
        "备注": "山数相符（25 座）。分段里程较自述多 190 里，属古籍流传中的既有出入，非录入遗漏",
        "路线": [
          {
            "id": "beishan-1-01",
            "name": "单狐之山",
            "mode": "首山",
            "distance": 0,
            "total": 0
          },
          {
            "id": "beishan-1-02",
            "name": "求如之山",
            "direction": "北",
            "distance": 250,
            "mode": "陆行",
            "total": 250
          },
          {
            "id": "beishan-1-03",
            "name": "带山",
            "direction": "北",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-1-04",
            "name": "谯明之山",
            "direction": "北",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "beishan-1-05",
            "name": "涿光之山",
            "direction": "北",
            "distance": 350,
            "mode": "陆行",
            "total": 350
          },
          {
            "id": "beishan-1-06",
            "name": "虢山",
            "direction": "北",
            "distance": 380,
            "mode": "陆行",
            "total": 380
          },
          {
            "id": "beishan-1-07",
            "name": "虢山之尾",
            "direction": "北",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "beishan-1-08",
            "name": "丹熏之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-1-09",
            "name": "石者之山",
            "direction": "北",
            "distance": 280,
            "mode": "陆行",
            "total": 280
          },
          {
            "id": "beishan-1-10",
            "name": "边春之山",
            "direction": "北",
            "distance": 110,
            "mode": "陆行",
            "total": 110
          },
          {
            "id": "beishan-1-11",
            "name": "蔓联之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-1-12",
            "name": "单张之山",
            "direction": "北",
            "distance": 180,
            "mode": "陆行",
            "total": 180
          },
          {
            "id": "beishan-1-13",
            "name": "灌题之山",
            "direction": "北",
            "distance": 320,
            "mode": "陆行",
            "total": 320
          },
          {
            "id": "beishan-1-14",
            "name": "潘侯之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-1-15",
            "name": "小咸之山",
            "direction": "北",
            "distance": 230,
            "mode": "陆行",
            "total": 230
          },
          {
            "id": "beishan-1-16",
            "name": "大咸之山",
            "direction": "北",
            "distance": 280,
            "mode": "陆行",
            "total": 280
          },
          {
            "id": "beishan-1-17",
            "name": "敦薨之山",
            "direction": "北",
            "distance": 320,
            "mode": "陆行",
            "total": 320
          },
          {
            "id": "beishan-1-18",
            "name": "少咸之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-1-19",
            "name": "狱法之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-1-20",
            "name": "北岳之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-1-21",
            "name": "浑夕之山",
            "direction": "北",
            "distance": 180,
            "mode": "陆行",
            "total": 180
          },
          {
            "id": "beishan-1-22",
            "name": "北单之山",
            "direction": "北",
            "distance": 50,
            "mode": "陆行",
            "total": 50
          },
          {
            "id": "beishan-1-23",
            "name": "罴差之山",
            "direction": "北",
            "distance": 100,
            "mode": "陆行",
            "total": 100
          },
          {
            "id": "beishan-1-24",
            "name": "北鲜之山",
            "direction": "北",
            "distance": 180,
            "mode": "陆行",
            "total": 180
          },
          {
            "id": "beishan-1-25",
            "name": "堤山",
            "direction": "北",
            "distance": 170,
            "mode": "陆行",
            "total": 170
          }
        ]
      },
      "nodes": [
        {
          "id": "beishan-1-01",
          "name": "单狐之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 53,
          "yields": {
            "wood": [
              "机木"
            ],
            "herb": [
              "华草"
            ],
            "mineral": [
              "芘石",
              "文石"
            ],
            "water": [
              "漨水（西流注于泑水）"
            ]
          },
          "fauna": [],
          "source": "北山经之首，曰单狐之山，多机木，其上多华草。漨水出焉，而西流注于泑水，其中多芘石、文石。",
          "dataUnlockLevel": 280
        },
        {
          "id": "beishan-1-02",
          "name": "求如之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 53,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "铜（上）",
              "玉（下）"
            ],
            "water": [
              "滑水（西流注于诸毗之水）"
            ]
          },
          "fauna": [
            {
              "name": "滑鱼",
              "form": "其状如鱓，赤背",
              "sound": "其音如梧",
              "effect": "食之已疣",
              "category": "水族"
            },
            {
              "name": "水马",
              "form": "其状如马，文臂牛尾",
              "sound": "其音如呼",
              "category": "兽"
            }
          ],
          "source": "又北二百五十里，曰求如之山，其上多铜，其下多玉，无草木。滑水出焉，而西流注于诸毗之水。其中多滑鱼，其状如鱓，赤背，其音如梧，食之已疣。其中多水马，其状如马，文臂牛尾，其音如呼。",
          "dataUnlockLevel": 283
        },
        {
          "id": "beishan-1-03",
          "name": "带山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 53,
          "yields": {
            "mineral": [
              "玉（上）",
              "青碧（下）"
            ],
            "water": [
              "彭水（西流注于芘湖之水）"
            ]
          },
          "fauna": [
            {
              "name": "䑏疏",
              "form": "其状如马，一角有错",
              "effect": "可以辟火",
              "category": "兽"
            },
            {
              "name": "鵸鵌",
              "form": "其状如乌，五采而赤文",
              "trait": "是自为牝牡",
              "effect": "食之不疽",
              "category": "鸟",
              "note": "★与西次三经翼望之山「鵸鵌」同名，原文郭璞注已疑「上已有此鸟，疑同名」，数据层勿合并"
            },
            {
              "name": "鯈鱼",
              "form": "其状如鸡而赤毛，三尾、六足、四首",
              "sound": "其音如鹊",
              "effect": "食之可以已忧",
              "category": "水族",
              "rank": "★"
            }
          ],
          "source": "又北三百里，曰带山，其上多玉，其下多青碧。有兽焉，其状如马，一角有错，其名曰䑏疏，可以辟火。有鸟焉，其状如乌，五采而赤文，名曰鵸鵌，是自为牝牡，食之不疽。彭水出焉，而西流注于芘湖之水，其中多鯈鱼，其状如鸡而赤毛，三尾、六足、四首，其音如鹊，食之可以已忧。",
          "note": "★鯈鱼「三尾六足四首」是全书肢体数最多的水生生物；「食之可以已忧」是全书唯一的情绪类疗效",
          "dataUnlockLevel": 286
        },
        {
          "id": "beishan-1-04",
          "name": "谯明之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 54,
          "yields": {
            "mineral": [
              "青雄黄"
            ],
            "water": [
              "谯水（西流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "何罗鱼",
              "form": "一首而十身",
              "sound": "其音如吠犬",
              "effect": "食之已痈",
              "category": "水族",
              "rank": "★"
            },
            {
              "name": "孟槐",
              "form": "其状如貆而赤豪",
              "sound": "其音如榴榴",
              "effect": "可以御凶",
              "category": "兽"
            }
          ],
          "source": "又北四百里，曰谯明之山，谯水出焉，西流注于河。其中多何罗之鱼，一首而十身，其音如吠犬，食之已痈。有兽焉，其状如貆而赤豪，其音如榴榴，名曰孟槐，可以御凶。是山也，无草木，多青雄黄。",
          "dataUnlockLevel": 289
        },
        {
          "id": "beishan-1-05",
          "name": "涿光之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 54,
          "yields": {
            "wood": [
              "松",
              "柏（上）",
              "棕",
              "橿（下）"
            ],
            "water": [
              "嚣水（西流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "鳛鳛之鱼",
              "form": "其状如鹊而十翼，鳞皆在羽端",
              "sound": "其音如鹊",
              "effect": "可以御火，食之不瘅",
              "category": "水族",
              "rank": "★"
            },
            {
              "name": "麢羊",
              "category": "兽"
            },
            {
              "name": "蕃",
              "category": "鸟"
            }
          ],
          "source": "又北三百五十里，曰涿光之山，嚣水出焉，而西流注于河。其中多鳛鳛之鱼，其状如鹊而十翼，鳞皆在羽端，其音如鹊，可以御火，食之不瘅。其上多松柏，其下多棕橿，其兽多麢羊，其鸟多蕃。",
          "note": "★鳛鳛之鱼「十翼，鳞皆在羽端」——鳞片长在羽毛尖端，是全书最独特的鳞羽复合形态，且明确「可以御火」，与五行火行直接对应",
          "dataUnlockLevel": 292
        },
        {
          "id": "beishan-1-06",
          "name": "虢山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 54,
          "yields": {
            "wood": [
              "漆（上）",
              "桐",
              "椐（下）"
            ],
            "mineral": [
              "玉（阳）",
              "铁（阴）"
            ],
            "water": [
              "伊水（西流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "橐驼",
              "trait": "有肉鞍，善行流沙中，日行三百里，负千斤，知水泉所在",
              "category": "兽"
            },
            {
              "name": "寓",
              "form": "状如鼠而鸟翼",
              "sound": "其音如羊",
              "effect": "可以御兵",
              "category": "鸟"
            }
          ],
          "source": "又北三百八十里，曰虢山，其上多漆，其下多桐椐。其阳多玉，其阴多铁。伊水出焉，西流注于河。其兽多橐驼，其鸟多寓，状如鼠而鸟翼，其音如羊，可以御兵。",
          "note": "★橐驼「知水泉所在」——原文明确的能力描述，可设计为沙漠/流沙区域的寻水使役异兽",
          "dataUnlockLevel": 295
        },
        {
          "id": "beishan-1-07",
          "name": "虢山之尾",
          "chapter": "北山经·北次一经",
          "unlockLevel": 54,
          "terrain": "其上多玉而无石",
          "yields": {
            "mineral": [
              "玉",
              "文贝"
            ],
            "water": [
              "鱼水（西流注于河）"
            ]
          },
          "fauna": [],
          "source": "又北四百里，至于虢山之尾，其上多玉而无石。鱼水出焉，西流注于河，其中多文贝。",
          "dataUnlockLevel": 297
        },
        {
          "id": "beishan-1-08",
          "name": "丹熏之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 54,
          "yields": {
            "wood": [
              "樗",
              "柏"
            ],
            "herb": [
              "韭",
              "薤"
            ],
            "mineral": [
              "丹雘"
            ],
            "water": [
              "熏水（西流注于棠水）"
            ]
          },
          "fauna": [
            {
              "name": "耳鼠",
              "form": "其状如鼠，而菟首麋身",
              "sound": "其音如獋犬",
              "trait": "以其尾飞",
              "effect": "食之不䐆（腹胀），又可以御百毒",
              "category": "兽",
              "rank": "★"
            }
          ],
          "source": "又北二百里，曰丹熏之山，其上多樗柏，其草多韭薤，多丹雘。熏水出焉，而西流注于棠水。有兽焉，其状如鼠，而菟首麋身，其音如獋犬，以其尾飞，名曰耳鼠，食之不䐆，又可以御百毒。",
          "note": "★「以其尾飞」——用尾巴飞行。与西次四经当扈「以其髯飞」、北次三经天池之山飞鼠「以其背飞」构成三种非翅膀飞行方式",
          "dataUnlockLevel": 300
        },
        {
          "id": "beishan-1-09",
          "name": "石者之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 55,
          "terrain": "其上无草木",
          "yields": {
            "mineral": [
              "瑶",
              "碧"
            ],
            "water": [
              "泚水（西流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "孟极",
              "form": "其状如豹，而文题白身",
              "trait": "是善伏",
              "sound": "其鸣自呼",
              "category": "兽"
            }
          ],
          "source": "又北二百八十里，曰石者之山，其上无草木，多瑶碧。泚水出焉，西流注于河。有兽焉，其状如豹，而文题白身，名曰孟极，是善伏，其鸣自呼。",
          "dataUnlockLevel": 303
        },
        {
          "id": "beishan-1-10",
          "name": "边春之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 55,
          "yields": {
            "herb": [
              "葱",
              "葵",
              "韭"
            ],
            "fruit": [
              "桃",
              "李"
            ],
            "water": [
              "杠水（西流注于泑泽）"
            ]
          },
          "fauna": [
            {
              "name": "幽鴳",
              "form": "其状如禺而文身",
              "trait": "善笑，见人则卧",
              "sound": "其鸣自呼",
              "category": "兽"
            }
          ],
          "source": "又北百一十里，曰边春之山，多葱、葵、韭、桃、李。杠水出焉，而西流注于泑泽。有兽焉，其状如禺而文身，善笑，见人则卧，名曰幽鴳，其鸣自呼。",
          "note": "★「见人则卧」（见人就躺下装睡）——原文记载的拟死行为。与马成之山天马「见人则飞」形成对照，可做成两种截然相反的遭遇反应",
          "dataUnlockLevel": 305
        },
        {
          "id": "beishan-1-11",
          "name": "蔓联之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 55,
          "terrain": "其上无草木",
          "yields": {},
          "fauna": [
            {
              "name": "足訾",
              "form": "其状如禺而有鬣，牛尾、文臂、马蹄",
              "trait": "见人则呼",
              "sound": "其鸣自呼",
              "category": "兽"
            },
            {
              "name": "䴔",
              "form": "群居而朋飞，其毛如雌雉",
              "sound": "其鸣自呼",
              "effect": "食之已风",
              "category": "鸟"
            }
          ],
          "source": "又北二百里，曰蔓联之山，其上无草木。有兽焉，其状如禺而有鬣，牛尾、文臂、马蹄，见人则呼，名曰足訾，其鸣自呼。有鸟焉，群居而朋飞，其毛如雌雉，名曰䴔，其鸣自呼，食之已风。",
          "dataUnlockLevel": 307
        },
        {
          "id": "beishan-1-12",
          "name": "单张之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 55,
          "terrain": "其上无草木",
          "yields": {
            "water": [
              "栎水（南流注于杠水）"
            ]
          },
          "fauna": [
            {
              "name": "诸犍",
              "form": "其状如豹而长尾，人首而牛耳，一目",
              "trait": "善吒，行则衔其尾，居则蟠其尾",
              "category": "兽",
              "rank": "★"
            },
            {
              "name": "白鵺",
              "form": "其状如雉，而文首、白翼、黄足",
              "effect": "食之已嗌痛，可以已痸",
              "category": "鸟"
            }
          ],
          "source": "又北百八十里，曰单张之山，其上无草木。有兽焉，其状如豹而长尾，人首而牛耳，一目，名曰诸犍，善吒，行则衔其尾，居则蟠其尾。有鸟焉，其状如雉，而文首、白翼、黄足，名曰白鵺，食之已嗌痛，可以已痸。栎水出焉，而南流注于杠水。",
          "note": "★诸犍「行则衔其尾，居则蟠其尾」——走路咬着尾巴、休息时把尾巴盘起来，是全书最生动的习性描写之一",
          "dataUnlockLevel": 310
        },
        {
          "id": "beishan-1-13",
          "name": "灌题之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 55,
          "yields": {
            "wood": [
              "樗",
              "柘"
            ],
            "mineral": [
              "砥",
              "磁石"
            ],
            "terrain": "其下多流沙",
            "water": [
              "匠韩之水（西流注于泑泽）"
            ]
          },
          "fauna": [
            {
              "name": "那父",
              "form": "其状如牛而白尾",
              "sound": "其音如訆",
              "category": "兽"
            },
            {
              "name": "竦斯",
              "form": "其状如雌雉而人面",
              "trait": "见人则跃",
              "sound": "其鸣自呼",
              "category": "鸟"
            }
          ],
          "source": "又北三百二十里，曰灌题之山，其上多樗柘，其下多流沙，多砥。有兽焉，其状如牛而白尾，其音如訆，名曰那父。有鸟焉，其状如雌雉而人面，见人则跃，名曰竦斯，其鸣自呼也。匠韩之水出焉，而西流注于泑泽，其中多磁石。",
          "dataUnlockLevel": 313
        },
        {
          "id": "beishan-1-14",
          "name": "潘侯之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 55,
          "yields": {
            "wood": [
              "松",
              "柏（上）",
              "榛",
              "楛（下）"
            ],
            "mineral": [
              "玉（阳）",
              "铁（阴）"
            ],
            "water": [
              "边水（南流注于栎泽）"
            ]
          },
          "fauna": [
            {
              "name": "旄牛",
              "form": "其状如牛，而四节生毛",
              "category": "兽"
            }
          ],
          "source": "又北二百里，曰潘侯之山，其上多松柏，其下多榛楛，其阳多玉，其阴多铁。有兽焉，其状如牛，而四节生毛，或曰旄牛。边水出焉，而南流注于栎泽。",
          "dataUnlockLevel": 316
        },
        {
          "id": "beishan-1-15",
          "name": "小咸之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 56,
          "terrain": "无草木，冬夏有雪",
          "yields": {},
          "fauna": [],
          "source": "又北二百三十里，曰小咸之山，无草木，冬夏有雪。",
          "dataUnlockLevel": 318
        },
        {
          "id": "beishan-1-16",
          "name": "大咸之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 56,
          "terrain": "无草木，其下多玉。是山也，四方，不可以上",
          "yields": {
            "mineral": [
              "玉"
            ]
          },
          "fauna": [
            {
              "name": "长蛇",
              "form": "其毛如彘豪",
              "sound": "其音如鼓柝",
              "category": "蛇",
              "rank": "★"
            }
          ],
          "hazard": {
            "type": "不可以上"
          },
          "source": "北二百八十里，曰大咸之山，无草木，其下多玉。是山也，四方，不可以上。有蛇名曰长蛇，其毛如彘豪，其音如鼓柝。",
          "note": "★「四方，不可以上」——四面方正无法攀登，与南山经猿翼之山、亶爰之山、西次三经天帝山外的「不可以上」同型，是「履险」技能的硬门槛节点",
          "dataUnlockLevel": 321
        },
        {
          "id": "beishan-1-17",
          "name": "敦薨之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 56,
          "yields": {
            "wood": [
              "棕",
              "枏"
            ],
            "herb": [
              "茈草"
            ],
            "water": [
              "敦薨之水（西流注于泑泽）",
              "赤鲑"
            ]
          },
          "fauna": [
            {
              "name": "兕",
              "category": "兽"
            },
            {
              "name": "旄牛",
              "category": "兽"
            },
            {
              "name": "鸤鸠",
              "category": "鸟"
            }
          ],
          "source": "又北三百二十里，曰敦薨之山，其上多棕枏，其下多茈草。敦薨之水出焉，而西流注于泑泽，出于昆仑之东北隅，实惟河原。其中多赤鲑，其兽多兕、旄牛，其鸟多鸤鸠。",
          "note": "★「出于昆仑之东北隅，实惟河原」——原文明确此水源于昆仑东北角、是黄河之源。与西次三经昆仑之丘四水同源形成地理闭环，是跨区域叙事的重要连接点",
          "dataUnlockLevel": 324
        },
        {
          "id": "beishan-1-18",
          "name": "少咸之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 56,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "青碧"
            ],
            "water": [
              "敦水（东流注于雁门之水）"
            ]
          },
          "fauna": [
            {
              "name": "窫窳",
              "form": "其状如牛，而赤身、人面、马足",
              "sound": "其音如婴儿",
              "hazard": "是食人",
              "category": "兽",
              "rank": "★★后羿诛六凶之一"
            },
            {
              "name": "䰽䰽之鱼",
              "effect": "食之杀人",
              "category": "水族"
            }
          ],
          "hazard": {
            "type": "食人/有毒",
            "detail": "窫窳是食人；䰽䰽之鱼食之杀人"
          },
          "source": "又北二百里，曰少咸之山，无草木，多青碧。有兽焉，其状如牛，而赤身、人面、马足，名曰窫窳，其音如婴儿，是食人。敦水出焉，东流注于雁门之水，其中多䰽䰽之鱼，食之杀人。",
          "note": "★★重要：窫窳即「猰貐」，为后羿所诛六凶之一。⚠️ 但「后羿诛六凶」出自《淮南子·本经训》，非《山海经》本文——本经只记载其形态与食人。若要做后羿任务线，须在留痕表注明「出处非本经」",
          "dataUnlockLevel": 328
        },
        {
          "id": "beishan-1-19",
          "name": "狱法之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 57,
          "yields": {
            "water": [
              "瀤泽之水（东北流注于泰泽）"
            ]
          },
          "fauna": [
            {
              "name": "䲃鱼",
              "form": "其状如鲤而鸡足",
              "effect": "食之已疣",
              "category": "水族"
            },
            {
              "name": "山𤟤",
              "form": "其状如犬而人面",
              "trait": "善投，见人则笑，其行如风",
              "omen": "见则天下大风",
              "category": "兽",
              "rank": "★"
            }
          ],
          "omen": [
            {
              "trigger": "山𤟤",
              "type": "大风",
              "desc": "见则天下大风",
              "polarity": "凶"
            }
          ],
          "source": "又北二百里，曰狱法之山。瀤泽之水出焉，而东北流注于泰泽。其中多䲃鱼，其状如鲤而鸡足，食之已疣。有兽焉，其状如犬而人面，善投，见人则笑，其名山𤟤，其行如风，见则天下大风。",
          "dataUnlockLevel": 332
        },
        {
          "id": "beishan-1-20",
          "name": "北岳之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 57,
          "yields": {
            "wood": [
              "枳",
              "棘",
              "刚木"
            ],
            "water": [
              "诸怀之水（西流注于嚣水）"
            ]
          },
          "fauna": [
            {
              "name": "诸怀",
              "form": "其状如牛，而四角、人目、彘耳",
              "sound": "其音如鸣雁",
              "hazard": "是食人",
              "category": "兽"
            },
            {
              "name": "鮨鱼",
              "form": "鱼身而犬首",
              "sound": "其音如婴儿",
              "effect": "食之已狂",
              "category": "水族"
            }
          ],
          "hazard": {
            "type": "食人",
            "detail": "诸怀是食人"
          },
          "source": "又北二百里，曰北岳之山，多枳棘刚木。有兽焉，其状如牛，而四角、人目、彘耳，其名曰诸怀，其音如鸣雁，是食人。诸怀之水出焉，而西流注于嚣水，水中多鮨鱼，鱼身而犬首，其音如婴儿，食之已狂。",
          "dataUnlockLevel": 336
        },
        {
          "id": "beishan-1-21",
          "name": "浑夕之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 57,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "铜",
              "玉"
            ],
            "water": [
              "嚣水（西北流注于海）"
            ]
          },
          "fauna": [
            {
              "name": "肥遗",
              "form": "一首两身",
              "omen": "见则其国大旱",
              "category": "蛇",
              "rank": "★"
            }
          ],
          "omen": [
            {
              "trigger": "肥遗",
              "type": "大旱",
              "desc": "见则其国大旱",
              "polarity": "凶"
            }
          ],
          "source": "又北百八十里，曰浑夕之山，无草木，多铜玉。嚣水出焉，而西北流注于海。有蛇一首两身，名曰肥遗，见则其国大旱。",
          "note": "★全书第三处「肥遗」：太华之山肥𧔥（蛇，六足四翼，大旱）／英山肥遗（鸟，已疠）／此处肥遗（蛇，一首两身，大旱）。北次三经彭毗之山肥水另有「肥遗之蛇」。四处同名近名，数据层必须分开",
          "dataUnlockLevel": 340
        },
        {
          "id": "beishan-1-22",
          "name": "北单之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 57,
          "terrain": "无草木",
          "yields": {
            "herb": [
              "葱",
              "韭"
            ]
          },
          "fauna": [],
          "source": "又北五十里，曰北单之山，无草木，多葱韭。",
          "dataUnlockLevel": 342
        },
        {
          "id": "beishan-1-23",
          "name": "罴差之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 57,
          "terrain": "无草木",
          "yields": {},
          "fauna": [
            {
              "name": "马",
              "category": "兽"
            }
          ],
          "source": "又北百里，曰罴差之山，无草木，多马。",
          "dataUnlockLevel": 344
        },
        {
          "id": "beishan-1-24",
          "name": "北鲜之山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 58,
          "yields": {
            "water": [
              "鲜水（西北流注于涂吾之水）"
            ]
          },
          "fauna": [
            {
              "name": "马",
              "category": "兽"
            }
          ],
          "source": "又北百八十里，曰北鲜之山，是多马。鲜水出焉，而西北流注于涂吾之水。",
          "dataUnlockLevel": 346
        },
        {
          "id": "beishan-1-25",
          "name": "堤山",
          "chapter": "北山经·北次一经",
          "unlockLevel": 58,
          "yields": {
            "water": [
              "堤水（东流注于泰泽）"
            ]
          },
          "fauna": [
            {
              "name": "马",
              "category": "兽"
            },
            {
              "name": "狕",
              "form": "其状如豹而文首",
              "category": "兽"
            },
            {
              "name": "龙龟",
              "category": "水族",
              "rank": "★"
            }
          ],
          "source": "又北百七十里，曰堤山，多马。有兽焉，其状如豹而文首，名曰狕。堤水出焉，而东流注于泰泽，其中多龙龟。",
          "note": "★北次一经终点。龙龟为龟类神异，可做长线坐骑/使役",
          "dataUnlockLevel": 349
        }
      ],
      "dataUnlockLevel": 280
    },
    {
      "regionId": "beishan-2",
      "regionName": "北次二经",
      "regionAlias": "管涔",
      "order": 9,
      "unlockLevel": 58,
      "summary": "北次二经之首，在河之东，其首枕汾，其名曰管涔之山。凡北次二经之首，自管涔之山至于敦题之山，凡十七山，五千六百九十里。",
      "deity": {
        "form": "其神皆蛇身人面",
        "rite": {
          "毛用": "一雄鸡、彘瘗",
          "玉": "一璧一珪，投而不糈",
          "原文": "其神皆蛇身人面。其祠：毛用一雄鸡、彘瘗；用一璧一珪，投而不糈。",
          "设计提示": "★与北次一经对比：同为「雄鸡彘瘗」，但玉用「投」（投入水中/抛掷）而非「瘗」（埋），且用璧+珪两件。三套北山祠礼至此形成「瘗—投—祈」的完整对照"
        }
      },
      "legs": {
        "自述里程": 5690,
        "分段之和": 5240,
        "差额": -450,
        "备注": "★本系录得 16 山，原文自述「凡17山」，缺 1 座。分段里程较自述少 450 里，缺口与缺失的那一座高度相关",
        "路线": [
          {
            "id": "beishan-2-01",
            "name": "管涔之山",
            "mode": "首山",
            "distance": 0,
            "total": 0
          },
          {
            "id": "beishan-2-02",
            "name": "少阳之山",
            "direction": "北",
            "distance": 250,
            "mode": "陆行",
            "total": 250
          },
          {
            "id": "beishan-2-03",
            "name": "县雍之山",
            "direction": "北",
            "distance": 50,
            "mode": "陆行",
            "total": 50
          },
          {
            "id": "beishan-2-04",
            "name": "狐岐之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-2-05",
            "name": "白沙山",
            "direction": "北",
            "distance": 350,
            "mode": "陆行",
            "total": 350
          },
          {
            "id": "beishan-2-06",
            "name": "尔是之山",
            "direction": "北",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "beishan-2-07",
            "name": "狂山",
            "direction": "北",
            "distance": 380,
            "mode": "陆行",
            "total": 380
          },
          {
            "id": "beishan-2-08",
            "name": "诸余之山",
            "direction": "北",
            "distance": 380,
            "mode": "陆行",
            "total": 380
          },
          {
            "id": "beishan-2-09",
            "name": "敦头之山",
            "direction": "北",
            "distance": 350,
            "mode": "陆行",
            "total": 350
          },
          {
            "id": "beishan-2-10",
            "name": "钩吾之山",
            "direction": "北",
            "distance": 350,
            "mode": "陆行",
            "total": 350
          },
          {
            "id": "beishan-2-11",
            "name": "北嚻之山",
            "direction": "北",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-2-12",
            "name": "梁渠之山",
            "direction": "北",
            "distance": 350,
            "mode": "陆行",
            "total": 350
          },
          {
            "id": "beishan-2-13",
            "name": "姑灌之山",
            "direction": "北",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "beishan-2-14",
            "name": "湖灌之山",
            "direction": "北",
            "distance": 380,
            "mode": "陆行",
            "total": 380
          },
          {
            "id": "beishan-2-15",
            "name": "洹山",
            "direction": "北",
            "distance": 500,
            "sand": 300,
            "mode": "水行",
            "total": 800
          },
          {
            "id": "beishan-2-16",
            "name": "敦题之山",
            "direction": "北",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          }
        ]
      },
      "nodes": [
        {
          "id": "beishan-2-01",
          "name": "管涔之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 58,
          "terrain": "在河之东，其首枕汾。其上无木而多草",
          "yields": {
            "herb": [
              "草"
            ],
            "mineral": [
              "玉"
            ],
            "water": [
              "汾水（西流注于河）"
            ]
          },
          "fauna": [],
          "source": "北次二经之首，在河之东，其首枕汾，其名曰管涔之山。其上无木而多草，其下多玉。汾水出焉，而西流注于河。",
          "dataUnlockLevel": 352
        },
        {
          "id": "beishan-2-02",
          "name": "少阳之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 58,
          "yields": {
            "mineral": [
              "玉（上）",
              "赤银（下）",
              "美赭"
            ],
            "water": [
              "酸水（东流注于汾水）"
            ]
          },
          "fauna": [],
          "source": "又北二百五十里，曰少阳之山，其上多玉，其下多赤银。酸水出焉，而东流注于汾水，其中多美赭。",
          "dataUnlockLevel": 355
        },
        {
          "id": "beishan-2-03",
          "name": "县雍之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 58,
          "yields": {
            "mineral": [
              "玉（上）",
              "铜（下）"
            ],
            "water": [
              "晋水（东南流注于汾水）"
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
              "name": "白翟",
              "category": "鸟"
            },
            {
              "name": "白䳑",
              "category": "鸟"
            },
            {
              "name": "鮆鱼",
              "form": "其状如鯈而赤鳞",
              "sound": "其音如叱",
              "effect": "食之不骄",
              "category": "水族"
            }
          ],
          "source": "又北五十里，曰县雍之山，其上多玉，其下多铜，其兽多闾、麋，其鸟多白翟、白䳑。晋水出焉，而东南流注于汾水。其中多鮆鱼，其状如鯈而赤鳞，其音如叱，食之不骄。",
          "dataUnlockLevel": 358
        },
        {
          "id": "beishan-2-04",
          "name": "狐岐之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 59,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "青碧",
              "苍玉"
            ],
            "water": [
              "胜水（东北流注于汾水）"
            ]
          },
          "fauna": [],
          "source": "又北二百里，曰狐岐之山，无草木，多青碧。胜水出焉，而东北流注于汾水，其中多苍玉。",
          "dataUnlockLevel": 361
        },
        {
          "id": "beishan-2-05",
          "name": "白沙山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 59,
          "terrain": "广员三百里，尽沙也，无草木鸟兽",
          "yields": {
            "mineral": [
              "白玉"
            ],
            "water": [
              "鲔水（出于其上，潜于其下）"
            ]
          },
          "fauna": [],
          "source": "又北三百五十里，曰白沙山，广员三百里，尽沙也，无草木鸟兽。鲔水出于其上，潜于其下，是多白玉。",
          "note": "★「广员三百里，尽沙也」——全书最大的纯沙漠区域。与虢山橐驼「善行流沙中，知水泉所在」形成配套：沙漠区 + 沙漠坐骑",
          "dataUnlockLevel": 364
        },
        {
          "id": "beishan-2-06",
          "name": "尔是之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 59,
          "terrain": "无草木，无水",
          "yields": {},
          "fauna": [],
          "source": "又北四百里，曰尔是之山，无草木，无水。",
          "dataUnlockLevel": 366
        },
        {
          "id": "beishan-2-07",
          "name": "狂山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 59,
          "terrain": "无草木，是山也，冬夏有雪",
          "yields": {
            "mineral": [
              "美玉"
            ],
            "water": [
              "狂水（西流注于浮水）"
            ]
          },
          "fauna": [],
          "source": "又北三百八十里，曰狂山，无草木。是山也，冬夏有雪。狂水出焉，而西流注于浮水，其中多美玉。",
          "dataUnlockLevel": 369
        },
        {
          "id": "beishan-2-08",
          "name": "诸余之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 59,
          "yields": {
            "mineral": [
              "铜",
              "玉"
            ],
            "wood": [
              "松",
              "柏"
            ],
            "water": [
              "诸余之水（东流注于旄水）"
            ]
          },
          "fauna": [],
          "source": "又北三百八十里，曰诸余之山，其上多铜玉，其下多松柏。诸余之水出焉，而东流注于旄水。",
          "dataUnlockLevel": 372
        },
        {
          "id": "beishan-2-09",
          "name": "敦头之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 59,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "water": [
              "旄水（东流注于印泽）"
            ]
          },
          "fauna": [
            {
              "name": "𩣡马",
              "form": "牛尾而白身，一角",
              "sound": "其音如呼",
              "category": "兽"
            }
          ],
          "source": "又北三百五十里，曰敦头之山，其上多金玉，无草木。旄水出焉，而东流注于印泽。其中多𩣡马，牛尾而白身，一角，其音如呼。",
          "dataUnlockLevel": 375
        },
        {
          "id": "beishan-2-10",
          "name": "钩吾之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 60,
          "yields": {
            "mineral": [
              "玉（上）",
              "铜（下）"
            ]
          },
          "fauna": [
            {
              "name": "狍鸮",
              "form": "其状如羊身人面，其目在腋下，虎齿人爪",
              "sound": "其音如婴儿",
              "hazard": "是食人",
              "category": "兽",
              "rank": "★★"
            }
          ],
          "hazard": {
            "type": "食人",
            "detail": "狍鸮是食人"
          },
          "source": "又北三百五十里，曰钩吾之山，其上多玉，其下多铜。有兽焉，其状如羊身人面，其目在腋下，虎齿人爪，其音如婴儿，名曰狍鸮，是食人。",
          "note": "★★狍鸮即后世「饕餮」的原型之一（目在腋下）。⚠️ 本经只记形态，「饕餮」之名及青铜纹样的关联出自后世（《神异经》《吕氏春秋》等）。若要用「饕餮」之名或纹样，须注明出处非本经，且青铜饕餮纹属文物公有领域但现代设计受保护，美术上不要描摹任何具体藏品纹样",
          "dataUnlockLevel": 379
        },
        {
          "id": "beishan-2-11",
          "name": "北嚻之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 60,
          "terrain": "无石",
          "yields": {
            "mineral": [
              "碧（阳）",
              "玉（阴）"
            ],
            "water": [
              "涔水（东流注于邛泽）"
            ]
          },
          "fauna": [
            {
              "name": "独𤞞",
              "form": "其状如虎，而白身犬首，马尾彘鬣",
              "category": "兽"
            },
            {
              "name": "𪄀𪃑",
              "form": "其状如乌，人面",
              "trait": "宵飞而昼伏",
              "effect": "食之已暍（中暑）",
              "category": "鸟",
              "rank": "★"
            }
          ],
          "source": "又北三百里，曰北嚻之山，无石，其阳多碧，其阴多玉。有兽焉，其状如虎，而白身犬首，马尾彘鬣，名曰独𤞞。有鸟焉，其状如乌，人面，名曰𪄀𪃑，宵飞而昼伏，食之已暍。涔水出焉，而东流注于邛泽。",
          "note": "★𪄀𪃑「宵飞而昼伏」——夜行昼伏，与西次三经文鳐鱼「以夜飞」同为夜间限定对象",
          "dataUnlockLevel": 383
        },
        {
          "id": "beishan-2-12",
          "name": "梁渠之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 60,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "water": [
              "修水（东流注于雁门）"
            ]
          },
          "fauna": [
            {
              "name": "居暨",
              "form": "其状如汇（猬）而赤毛",
              "sound": "其音如豚",
              "category": "兽"
            },
            {
              "name": "嚣",
              "form": "其状如夸父，四翼、一目、犬尾",
              "sound": "其音如鹊",
              "effect": "食之已腹痛，可以止衕",
              "category": "鸟"
            }
          ],
          "source": "又北三百五十里，曰梁渠之山，无草木，多金玉。修水出焉，而东流注于雁门。其兽多居暨，其状如汇而赤毛，其音如豚。有鸟焉，其状如夸父，四翼、一目、犬尾，名曰嚣，其音如鹊，食之已腹痛，可以止衕。",
          "dataUnlockLevel": 387
        },
        {
          "id": "beishan-2-13",
          "name": "姑灌之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 61,
          "terrain": "无草木，是山也，冬夏有雪",
          "yields": {},
          "fauna": [],
          "source": "又北四百里，曰姑灌之山，无草木。是山也，冬夏有雪。",
          "dataUnlockLevel": 390
        },
        {
          "id": "beishan-2-14",
          "name": "湖灌之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 61,
          "yields": {
            "mineral": [
              "玉（阳）",
              "碧（阴）"
            ],
            "wood": [
              "（未名木，其叶如柳而赤理）"
            ],
            "water": [
              "湖灌之水（东流注于海）"
            ]
          },
          "fauna": [
            {
              "name": "马",
              "category": "兽"
            },
            {
              "name": "䱇",
              "category": "水族"
            }
          ],
          "source": "又北三百八十里，曰湖灌之山，其阳多玉，其阴多碧，多马。湖灌之水出焉，而东流注于海，其中多䱇。有木焉，其叶如柳而赤理。",
          "dataUnlockLevel": 393
        },
        {
          "id": "beishan-2-15",
          "name": "洹山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 61,
          "terrain": "又北水行五百里，流沙三百里，至于洹山",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "woodSpecial": [
              {
                "name": "三桑",
                "form": "其树皆无枝，其高百仞",
                "note": "★无枝且高达百仞，是全书最奇特的树木形态"
              }
            ],
            "fruit": [
              "百果树"
            ]
          },
          "fauna": [
            {
              "name": "怪蛇",
              "category": "蛇"
            }
          ],
          "hazard": {
            "type": "怪蛇"
          },
          "source": "又北水行五百里，流沙三百里，至于洹山，其上多金玉。三桑生之，其树皆无枝，其高百仞。百果树生之，其下多怪蛇。",
          "note": "★三桑「无枝而高百仞」是理想的高阶采集点：需「履险」或攀爬机制才能采到顶部",
          "dataUnlockLevel": 397
        },
        {
          "id": "beishan-2-16",
          "name": "敦题之山",
          "chapter": "北山经·北次二经",
          "unlockLevel": 61,
          "terrain": "无草木，是錞于北海",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ]
          },
          "fauna": [],
          "source": "又北三百里，曰敦题之山，无草木，多金玉。是錞于北海。",
          "note": "★北次二经终点，蹲踞北海之滨。与西山首经騩山「錞于西海」、西次四经崦嵫之山形成四海坐标",
          "dataUnlockLevel": 401
        }
      ],
      "dataUnlockLevel": 352
    },
    {
      "regionId": "beishan-3",
      "regionName": "北次三经",
      "regionAlias": "太行",
      "order": 10,
      "unlockLevel": 62,
      "summary": "北次三经之首，曰太行之山。凡北次三经之首，自太行之山以至于毋逢之山，凡四十六山，万二千三百五十里。",
      "deity": {
        "form": "分三类，共四十四神",
        "rite": {
          "二十神": "马身而人面 —— 用一藻茝瘗之",
          "十四神": "彘身而载玉 —— 皆玉，不瘗",
          "十神": "彘身而八足蛇尾 —— 皆用一璧瘗之",
          "总": "大凡四十四神，皆用稌糈米祠之，此皆不火食",
          "原文": "其神状皆马身而人面者廿神；其祠之，皆用一藻茝瘗之。其十四神状皆彘身而载玉，其祠之，皆玉，不瘗。其十神状皆彘身而八足蛇尾，其祠之，皆用一璧瘗之。大凡四十四神，皆用稌糈米祠之，此皆不火食。",
          "设计提示": "★全书最复杂的神谱：44 神分三种形态，三种祭法各不相同（藻茝瘗 / 玉不瘗 / 璧瘗）。这是《五藏山经》里结构最完整的一套祠礼，非常适合做成多分支的祭祀系统"
        }
      },
      "note": "★本系是《山经》中故事密度最高的山系之一，且含全书最著名的完整叙事——精卫填海。另有愚公移山所本之太行、王屋二山。",
      "legs": {
        "自述里程": 12350,
        "分段之和": 12540,
        "差额": 190,
        "备注": "★本系录得 47 山，原文自述「凡46山」，多 1 座（系版本分歧，详见 _meta）。分段里程较自述多 190 里",
        "路线": [
          {
            "id": "beishan-3-01",
            "name": "太行之山（归山）",
            "mode": "首山",
            "distance": 0,
            "total": 0
          },
          {
            "id": "beishan-3-02",
            "name": "龙侯之山",
            "direction": "东北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-03",
            "name": "马成之山",
            "direction": "东北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-04",
            "name": "咸山",
            "direction": "东北",
            "distance": 70,
            "mode": "陆行",
            "total": 70
          },
          {
            "id": "beishan-3-05",
            "name": "天池之山",
            "direction": "东北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-06",
            "name": "阳山",
            "direction": "东",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-07",
            "name": "贲闻之山",
            "direction": "东",
            "distance": 350,
            "mode": "陆行",
            "total": 350
          },
          {
            "id": "beishan-3-08",
            "name": "王屋之山",
            "direction": "北",
            "distance": 100,
            "mode": "陆行",
            "total": 100
          },
          {
            "id": "beishan-3-09",
            "name": "教山",
            "direction": "东北",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-10",
            "name": "景山",
            "direction": "南",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-11",
            "name": "孟门之山",
            "direction": "东南",
            "distance": 320,
            "mode": "陆行",
            "total": 320
          },
          {
            "id": "beishan-3-12",
            "name": "平山",
            "direction": "东南",
            "distance": 320,
            "mode": "陆行",
            "total": 320
          },
          {
            "id": "beishan-3-13",
            "name": "京山",
            "direction": "东",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-14",
            "name": "虫尾之山",
            "direction": "东",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-15",
            "name": "彭毗之山",
            "direction": "东",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-16",
            "name": "小侯之山",
            "direction": "东",
            "distance": 180,
            "mode": "陆行",
            "total": 180
          },
          {
            "id": "beishan-3-17",
            "name": "泰头之山",
            "direction": "东",
            "distance": 370,
            "mode": "陆行",
            "total": 370
          },
          {
            "id": "beishan-3-18",
            "name": "轩辕之山",
            "direction": "东北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-19",
            "name": "谒戾之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-20",
            "name": "沮洳之山",
            "direction": "东",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-21",
            "name": "神囷之山",
            "direction": "北",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-22",
            "name": "发鸠之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-23",
            "name": "少山",
            "direction": "东北",
            "distance": 120,
            "mode": "陆行",
            "total": 120
          },
          {
            "id": "beishan-3-24",
            "name": "锡山",
            "direction": "东北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-25",
            "name": "景山（其二）",
            "direction": "东南",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-26",
            "name": "题首之山",
            "direction": "北",
            "distance": 100,
            "mode": "陆行",
            "total": 100
          },
          {
            "id": "beishan-3-27",
            "name": "绣山",
            "direction": "北",
            "distance": 100,
            "mode": "陆行",
            "total": 100
          },
          {
            "id": "beishan-3-28",
            "name": "松山",
            "direction": "北",
            "distance": 120,
            "mode": "陆行",
            "total": 120
          },
          {
            "id": "beishan-3-29",
            "name": "敦与之山",
            "direction": "北",
            "distance": 120,
            "mode": "陆行",
            "total": 120
          },
          {
            "id": "beishan-3-30",
            "name": "柘山",
            "direction": "北",
            "distance": 170,
            "mode": "陆行",
            "total": 170
          },
          {
            "id": "beishan-3-31",
            "name": "维龙之山",
            "direction": "北",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-32",
            "name": "白马之山",
            "direction": "北",
            "distance": 180,
            "mode": "陆行",
            "total": 180
          },
          {
            "id": "beishan-3-33",
            "name": "空桑之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-34",
            "name": "泰戏之山",
            "direction": "北",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-35",
            "name": "石山",
            "direction": "北",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-36",
            "name": "童戎之山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-37",
            "name": "高是之山",
            "direction": "北",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-38",
            "name": "陆山",
            "direction": "北",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "beishan-3-39",
            "name": "沂山",
            "direction": "北",
            "distance": 200,
            "mode": "陆行",
            "total": 200
          },
          {
            "id": "beishan-3-40",
            "name": "燕山",
            "direction": "北",
            "distance": 120,
            "mode": "陆行",
            "total": 120
          },
          {
            "id": "beishan-3-41",
            "name": "饶山",
            "direction": "北",
            "distance": 500,
            "sand": 500,
            "mode": "水行",
            "total": 1000
          },
          {
            "id": "beishan-3-42",
            "name": "乾山",
            "direction": "北",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "beishan-3-43",
            "name": "伦山",
            "direction": "北",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "beishan-3-44",
            "name": "碣石之山",
            "direction": "北",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "beishan-3-45",
            "name": "雁门之山",
            "direction": "北",
            "distance": 500,
            "mode": "水行",
            "total": 500
          },
          {
            "id": "beishan-3-46",
            "name": "帝都之山",
            "direction": "北",
            "distance": 400,
            "mode": "水行",
            "total": 400
          },
          {
            "id": "beishan-3-47",
            "name": "錞于毋逢之山",
            "direction": "北",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          }
        ]
      },
      "nodes": [
        {
          "id": "beishan-3-01",
          "name": "太行之山（归山）",
          "chapter": "北山经·北次三经",
          "unlockLevel": 62,
          "terrain": "北次三经之首，其首曰归山",
          "yields": {
            "mineral": [
              "金玉（上）",
              "碧（下）"
            ]
          },
          "fauna": [
            {
              "name": "䴼",
              "form": "其状如麢羊而四角，马尾而有距",
              "trait": "善还",
              "sound": "其鸣自訆",
              "category": "兽"
            },
            {
              "name": "䴅",
              "form": "其状如鹊，白身、赤尾、六足",
              "trait": "是善惊",
              "sound": "其鸣自詨",
              "category": "鸟"
            }
          ],
          "source": "北次三经之首，曰太行之山。其首曰归山，其上有金玉，其下有碧。有兽焉，其状如麢羊而四角，马尾而有距，其名曰䴼，善还，其鸣自訆。有鸟焉，其状如鹊，白身、赤尾、六足，其名曰䴅，是善惊，其鸣自詨。",
          "note": "★太行即《愚公移山》所本。⚠️ 愚公故事出自《列子·汤问》，非《山海经》本文，做剧情须注明出处",
          "dataUnlockLevel": 405
        },
        {
          "id": "beishan-3-02",
          "name": "龙侯之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 62,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "water": [
              "决决之水（东流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "人鱼",
              "form": "其状如䱱鱼，四足",
              "sound": "其音如婴儿",
              "effect": "食之无痴疾",
              "category": "水族",
              "rank": "★"
            }
          ],
          "source": "又东北二百里，曰龙侯之山，无草木，多金玉。决决之水出焉，而东流注于河。其中多人鱼，其状如䱱鱼，四足，其音如婴儿，食之无痴疾。",
          "note": "★此「人鱼」为四足鱼类（大鲵/娃娃鱼），与南山经赤鱬「人面鱼身」、西山经竹山「人鱼」不同，是三种不同记载",
          "dataUnlockLevel": 408
        },
        {
          "id": "beishan-3-03",
          "name": "马成之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 62,
          "yields": {
            "mineral": [
              "文石（上）",
              "金玉（阴）"
            ]
          },
          "fauna": [
            {
              "name": "天马",
              "form": "其状如白犬而黑头",
              "trait": "见人则飞",
              "sound": "其鸣自訆",
              "category": "兽",
              "rank": "★"
            },
            {
              "name": "鶌鶋",
              "form": "其状如乌，首白而身青、足黄",
              "sound": "其鸣自詨",
              "effect": "食之不饥，可以已寓（健忘）",
              "category": "鸟"
            }
          ],
          "source": "又东北二百里，曰马成之山，其上多文石，其阴多金玉。有兽焉，其状如白犬而黑头，见人则飞，其名曰天马，其鸣自訆。有鸟焉，其状如乌，首白而身青、足黄，是名曰鶌鶋，其鸣自詨，食之不饥，可以已寓。",
          "note": "★天马「见人则飞」——与边春之山幽鴳「见人则卧」、蔓联之山足訾「见人则呼」、狱法之山山𤟤「见人则笑」构成四种见人反应，可做成一套遭遇行为系统",
          "dataUnlockLevel": 411
        },
        {
          "id": "beishan-3-04",
          "name": "咸山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 62,
          "yields": {
            "mineral": [
              "玉（上）",
              "铜（下）"
            ],
            "wood": [
              "松",
              "柏"
            ],
            "herb": [
              "茈草"
            ],
            "water": [
              "条菅之水（西南流注于长泽）"
            ],
            "special": [
              {
                "name": "器酸",
                "trait": "三岁一成",
                "effect": "食之已疠"
              }
            ]
          },
          "fauna": [],
          "source": "又东北七十里，曰咸山，其上有玉，其下多铜，是多松柏，草多茈草。条菅之水出焉，而西南流注于长泽。其中多器酸，三岁一成，食之已疠。",
          "note": "★★「三岁一成」——与峚山「丹木五岁」同为原文自带的长周期养成，且是第二个。器物类（器酸）而非植物类，可做成与丹木并列的第二条长线养成",
          "dataUnlockLevel": 414
        },
        {
          "id": "beishan-3-05",
          "name": "天池之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 62,
          "terrain": "其上无草木",
          "yields": {
            "mineral": [
              "文石",
              "黄垩"
            ],
            "water": [
              "渑水（出于其上，潜于其下）"
            ]
          },
          "fauna": [
            {
              "name": "飞鼠",
              "form": "其状如兔而鼠首",
              "trait": "以其背飞",
              "category": "兽",
              "rank": "★"
            }
          ],
          "source": "又东北二百里，曰天池之山，其上无草木，多文石。有兽焉，其状如兔而鼠首，以其背飞，其名曰飞鼠。渑水出焉，潜于其下，其中多黄垩。",
          "note": "★「以其背飞」——第三种非翅膀飞行方式（另两种：耳鼠以其尾飞、当扈以其髯飞）",
          "dataUnlockLevel": 417
        },
        {
          "id": "beishan-3-06",
          "name": "阳山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 63,
          "yields": {
            "mineral": [
              "玉（上）",
              "金铜（下）"
            ],
            "water": [
              "留水（南流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "领胡",
              "form": "其状如牛而赤尾，其颈肾，其状如句瞿",
              "sound": "其鸣自詨",
              "effect": "食之已狂",
              "category": "兽"
            },
            {
              "name": "象蛇",
              "form": "其状如雌雉，而五采以文",
              "trait": "是自为牝牡",
              "sound": "其鸣自詨",
              "category": "鸟"
            },
            {
              "name": "䱤父之鱼",
              "form": "其状如鲋鱼，鱼首而彘身",
              "effect": "食之已呕",
              "category": "水族"
            }
          ],
          "source": "又东三百里，曰阳山，其上多玉，其下多金铜。有兽焉，其状如牛而赤尾，其颈肾，其状如句瞿，其名曰领胡，其鸣自詨，食之已狂。有鸟焉，其状如雌雉，而五采以文，是自为牝牡，名曰象蛇，其鸣自詨。留水出焉，而南流注于河。其中有䱤父之鱼，其状如鲋鱼，鱼首而彘身，食之已呕。",
          "note": "★象蛇「自为牝牡」与南山经类、北次一经鵸鵌同型——全书第三例雌雄同体",
          "dataUnlockLevel": 420
        },
        {
          "id": "beishan-3-07",
          "name": "贲闻之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 63,
          "yields": {
            "mineral": [
              "苍玉（上）",
              "黄垩（下）",
              "涅石（下）"
            ]
          },
          "fauna": [],
          "source": "又东三百五十里，曰贲闻之山，其上多苍玉，其下多黄垩，多涅石。",
          "dataUnlockLevel": 423
        },
        {
          "id": "beishan-3-08",
          "name": "王屋之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 63,
          "terrain": "是多石",
          "yields": {
            "water": [
              "㶌水（西北流注于泰泽）"
            ]
          },
          "fauna": [],
          "source": "又北百里，曰王屋之山，是多石。㶌水出焉，而西北流注于泰泽。",
          "note": "★王屋即《愚公移山》所本之二（与太行并列）。⚠️ 同前，愚公故事出处非本经",
          "dataUnlockLevel": 426
        },
        {
          "id": "beishan-3-09",
          "name": "教山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 63,
          "terrain": "其上多玉而无石",
          "yields": {
            "mineral": [
              "玉",
              "金玉（发丸之山）"
            ],
            "water": [
              "教水（西流注于河）"
            ]
          },
          "fauna": [],
          "source": "又东北三百里，曰教山，其上多玉而无石。教水出焉，西流注于河，是水冬干而夏流，实惟干河。其中有两山，是山也，广员三百步，其名曰发丸之山，其上有金玉。",
          "note": "★「冬干而夏流，实惟干河」——季节性河流，与柢山鯥「冬死而夏生」同为季节循环。河中另有发丸之山（河中岛）",
          "dataUnlockLevel": 429
        },
        {
          "id": "beishan-3-10",
          "name": "景山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 63,
          "terrain": "南望盐贩之泽，北望少泽",
          "yields": {
            "herb": [
              "草",
              "藷藇",
              "秦椒"
            ],
            "mineral": [
              "赭（阴）",
              "玉（阳）"
            ]
          },
          "fauna": [
            {
              "name": "酸与",
              "form": "其状如蛇，而四翼、六目、三足",
              "sound": "其鸣自詨",
              "omen": "见则其邑有恐",
              "category": "鸟",
              "rank": "★"
            }
          ],
          "omen": [
            {
              "trigger": "酸与",
              "type": "有恐",
              "desc": "见则其邑有恐",
              "polarity": "凶"
            }
          ],
          "source": "又南三百里，曰景山，南望盐贩之泽，北望少泽。其上多草、藷藇，其草多秦椒，其阴多赭，其阳多玉。有鸟焉，其状如蛇，而四翼、六目、三足，名曰酸与，其鸣自詨，见则其邑有恐。",
          "note": "★「见则其邑有恐」是全书唯一的恐惧类征兆，与其他旱/水/兵灾不同型，可做成精神类debuff",
          "dataUnlockLevel": 432
        },
        {
          "id": "beishan-3-11",
          "name": "孟门之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 64,
          "yields": {
            "mineral": [
              "苍玉",
              "金（上）",
              "黄垩（下）",
              "涅石（下）"
            ]
          },
          "fauna": [],
          "source": "又东南三百二十里，曰孟门之山，其上多苍玉，多金，其下多黄垩，多涅石。",
          "note": "★孟门为黄河峡谷地标，「龙门未辟，吕梁未凿，河出孟门之上」（《淮南子》）。⚠️ 引文出处非本经",
          "dataUnlockLevel": 435
        },
        {
          "id": "beishan-3-12",
          "name": "平山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 64,
          "yields": {
            "mineral": [
              "美玉"
            ],
            "water": [
              "平水（出于其上，潜于其下）"
            ]
          },
          "fauna": [],
          "source": "又东南三百二十里，曰平山。平水出其上，潜于其下，是多美玉。",
          "dataUnlockLevel": 437
        },
        {
          "id": "beishan-3-13",
          "name": "京山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 64,
          "yields": {
            "mineral": [
              "美玉",
              "赤铜（阳）",
              "玄䃤（阴）"
            ],
            "wood": [
              "漆木",
              "竹"
            ],
            "water": [
              "高水（南流注于河）"
            ]
          },
          "fauna": [],
          "source": "又东三百里，曰京山，有美玉，多漆木，多竹，其阳有赤铜，其阴有玄䃤。高水出焉，南流注于河。",
          "dataUnlockLevel": 440
        },
        {
          "id": "beishan-3-14",
          "name": "虫尾之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 64,
          "yields": {
            "mineral": [
              "金玉（上）",
              "青碧（下）"
            ],
            "wood": [
              "竹"
            ],
            "water": [
              "丹水（南流注于河）",
              "薄水（东南流注于黄泽）"
            ]
          },
          "fauna": [],
          "source": "又东二百里，曰虫尾之山，其上多金玉，其下多竹，多青碧。丹水出焉，南流注于河。薄水出焉，而东南流注于黄泽。",
          "dataUnlockLevel": 443
        },
        {
          "id": "beishan-3-15",
          "name": "彭毗之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 64,
          "terrain": "其上无草木，其下多水",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "water": [
              "蚤林之水（东南流注于河）",
              "肥水（南流注于床水）"
            ]
          },
          "fauna": [
            {
              "name": "肥遗之蛇",
              "category": "蛇",
              "note": "★第四处肥遗记载，见 _meta 同名异物提示"
            }
          ],
          "source": "又东三百里，曰彭毗之山，其上无草木，多金玉，其下多水。蚤林之水出焉，东南流注于河。肥水出焉，而南流注于床水，其中多肥遗之蛇。",
          "dataUnlockLevel": 446
        },
        {
          "id": "beishan-3-16",
          "name": "小侯之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 65,
          "yields": {
            "water": [
              "明漳之水（南流注于黄泽）"
            ]
          },
          "fauna": [
            {
              "name": "鸪䳡",
              "form": "其状如乌而白文",
              "effect": "食之不灂（目昏）",
              "category": "鸟"
            }
          ],
          "source": "又东百八十里，曰小侯之山。明漳之水出焉，南流注于黄泽。有鸟焉，其状如乌而白文，名曰鸪䳡，食之不灂。",
          "dataUnlockLevel": 449
        },
        {
          "id": "beishan-3-17",
          "name": "泰头之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 65,
          "yields": {
            "mineral": [
              "金玉（上）"
            ],
            "wood": [
              "竹箭（下）"
            ],
            "water": [
              "共水（南注于虖沱）"
            ]
          },
          "fauna": [],
          "source": "又东三百七十里，曰泰头之山。共水出焉，南注于虖沱。其上多金玉，其下多竹箭。",
          "dataUnlockLevel": 451
        },
        {
          "id": "beishan-3-18",
          "name": "轩辕之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 65,
          "yields": {
            "mineral": [
              "铜（上）"
            ],
            "wood": [
              "竹（下）"
            ]
          },
          "fauna": [
            {
              "name": "黄鸟",
              "form": "其状如枭而白首",
              "sound": "其鸣自詨",
              "effect": "食之不妒",
              "category": "鸟"
            }
          ],
          "source": "又东北二百里，曰轩辕之山，其上多铜，其下多竹。有鸟焉，其状如枭而白首，其名曰黄鸟，其鸣自詨，食之不妒。",
          "note": "★「食之不妒」与南山经类「食者不妒」是全书仅有的两条同疗效记载，一兽一鸟，可做对照。注意：西次三经另有轩辕之丘，与此非同一地",
          "dataUnlockLevel": 454
        },
        {
          "id": "beishan-3-19",
          "name": "谒戾之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 65,
          "yields": {
            "wood": [
              "松",
              "柏"
            ],
            "mineral": [
              "金",
              "玉"
            ],
            "water": [
              "沁水（南流注于河）",
              "丹林之水（南流注于河）",
              "婴侯之水（北流注于汜水）"
            ]
          },
          "fauna": [],
          "source": "又北二百里，曰谒戾之山，其上多松柏，有金玉。沁水出焉，南流注于河。其东有林焉，名曰丹林。丹林之水出焉，南流注于河。婴侯之水出焉，北流注于汜水。",
          "dataUnlockLevel": 457
        },
        {
          "id": "beishan-3-20",
          "name": "沮洳之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 65,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "water": [
              "濝水（南流注于河）"
            ]
          },
          "fauna": [],
          "source": "东三百里，曰沮洳之山，无草木，有金玉。濝水出焉，南流注于河。",
          "dataUnlockLevel": 459
        },
        {
          "id": "beishan-3-21",
          "name": "神囷之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 65,
          "yields": {
            "mineral": [
              "文石（上）"
            ],
            "water": [
              "黄水（东流注于洹水）",
              "滏水（东流注于欧水）"
            ]
          },
          "fauna": [
            {
              "name": "白蛇",
              "category": "蛇"
            },
            {
              "name": "飞虫",
              "category": "虫"
            }
          ],
          "source": "又北三百里，曰神囷之山，其上有文石，其下有白蛇，有飞虫。黄水出焉，而东流注于洹水。滏水出焉，而东流注于欧水。",
          "dataUnlockLevel": 462
        },
        {
          "id": "beishan-3-22",
          "name": "发鸠之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 66,
          "yields": {
            "wood": [
              "柘木"
            ],
            "water": [
              "漳水（东流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "精卫",
              "form": "其状如乌，文首、白喙、赤足",
              "sound": "其鸣自詨",
              "identity": "炎帝之少女，名曰女娃",
              "story": "女娃游于东海，溺而不返，故为精卫，常衔西山之木石，以堙于东海",
              "category": "鸟",
              "rank": "★★★全书最著名叙事"
            }
          ],
          "source": "又北二百里，曰发鸠之山，其上多柘木。有鸟焉，其状如乌，文首、白喙、赤足，名曰精卫，其鸣自詨。是炎帝之少女，名曰女娃。女娃游于东海，溺而不返，故为精卫，常衔西山之木石，以堙于东海。漳水出焉，东流注于河。",
          "note": "★★★《山经》中唯一有完整前世今生、有名有姓有亲缘、有明确执念的对象。原文给出了「常衔西山之木石」——这正是放置挂机最好的长线成就原型：累积投掷木石 N 次。且发鸠山多柘木，柘木即衔取之材，采集与成就天然同源",
          "dataUnlockLevel": 466
        },
        {
          "id": "beishan-3-23",
          "name": "少山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 66,
          "yields": {
            "mineral": [
              "金玉（上）",
              "铜（下）"
            ],
            "water": [
              "清漳之水（东流注于浊漳之水）"
            ]
          },
          "fauna": [],
          "source": "又东北百二十里，曰少山，其上有金玉，其下有铜。清漳之水出焉，东流注于浊漳之水。",
          "dataUnlockLevel": 470
        },
        {
          "id": "beishan-3-24",
          "name": "锡山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 66,
          "yields": {
            "mineral": [
              "玉（上）",
              "砥（下）"
            ],
            "water": [
              "牛首之水（东流注于滏水）"
            ]
          },
          "fauna": [],
          "source": "又东北二百里，曰锡山，其上多玉，其下有砥。牛首之水出焉，而东流注于滏水。",
          "dataUnlockLevel": 472
        },
        {
          "id": "beishan-3-25",
          "name": "景山（其二）",
          "chapter": "北山经·北次三经",
          "unlockLevel": 66,
          "yields": {
            "mineral": [
              "美玉"
            ],
            "water": [
              "景水（东南流注于海泽）"
            ]
          },
          "fauna": [],
          "source": "又北二百里，曰景山，有美玉。景水出焉，东南流注于海泽。",
          "note": "★与 beishan-3-10 景山同名不同地（前者有酸与，此者仅美玉），数据层勿合并",
          "dataUnlockLevel": 474
        },
        {
          "id": "beishan-3-26",
          "name": "题首之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 66,
          "terrain": "无水",
          "yields": {
            "mineral": [
              "玉",
              "石"
            ]
          },
          "fauna": [],
          "source": "又北百里，曰题首之山，有玉焉，多石，无水。",
          "dataUnlockLevel": 476
        },
        {
          "id": "beishan-3-27",
          "name": "绣山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 67,
          "yields": {
            "mineral": [
              "玉",
              "青碧"
            ],
            "wood": [
              "栒"
            ],
            "herb": [
              "芍药",
              "芎藭"
            ],
            "water": [
              "洧水（东流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "鳠",
              "category": "水族"
            },
            {
              "name": "黾",
              "category": "水族"
            }
          ],
          "source": "又北百里，曰绣山，其上有玉、青碧，其木多栒，其草多芍药、芎藭。洧水出焉，而东流注于河，其中有鳠、黾。",
          "dataUnlockLevel": 478
        },
        {
          "id": "beishan-3-28",
          "name": "松山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 67,
          "yields": {
            "water": [
              "阳水（东北流注于河）"
            ]
          },
          "fauna": [],
          "source": "又北百二十里，曰松山。阳水出焉，东北流注于河。",
          "dataUnlockLevel": 480
        },
        {
          "id": "beishan-3-29",
          "name": "敦与之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 67,
          "terrain": "其上无草木",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "water": [
              "溹水（出于其阳，东流注于泰陆之水）",
              "泜水（出于其阴，东流注于彭水）",
              "槐水（东流注于泜泽）"
            ]
          },
          "fauna": [],
          "source": "又北百二十里，曰敦与之山，其上无草木，有金玉。溹水出于其阳，而东流注于泰陆之水。泜水出于其阴，而东流注于彭水。槐水出焉，而东流注于泜泽。",
          "dataUnlockLevel": 482
        },
        {
          "id": "beishan-3-30",
          "name": "柘山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 67,
          "yields": {
            "mineral": [
              "金玉（阳）",
              "铁（阴）"
            ],
            "water": [
              "历聚之水（北流注于洧水）"
            ]
          },
          "fauna": [],
          "source": "又北百七十里，曰柘山，其阳有金玉，其阴有铁。历聚之水出焉，而北流注于洧水。",
          "dataUnlockLevel": 484
        },
        {
          "id": "beishan-3-31",
          "name": "维龙之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 67,
          "yields": {
            "mineral": [
              "碧玉（上）",
              "金（阳）",
              "铁（阴）",
              "礨石"
            ],
            "water": [
              "肥水（东流注于皋泽）",
              "敞铁之水（北流注于大泽）"
            ]
          },
          "fauna": [],
          "source": "又北三百里，曰维龙之山，其上有碧玉，其阳有金，其阴有铁。肥水出焉，而东流注于皋泽，其中多礨石。敞铁之水出焉，而北流注于大泽。",
          "dataUnlockLevel": 487
        },
        {
          "id": "beishan-3-32",
          "name": "白马之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 67,
          "yields": {
            "mineral": [
              "石",
              "玉（阳）",
              "铁（阴）",
              "赤铜（阴）"
            ],
            "water": [
              "木马之水（东北流注于虖沱）"
            ]
          },
          "fauna": [],
          "source": "又北百八十里，曰白马之山，其阳多石、玉，其阴多铁，多赤铜。木马之水出焉，而东北流注于虖沱。",
          "dataUnlockLevel": 490
        },
        {
          "id": "beishan-3-33",
          "name": "空桑之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 67,
          "terrain": "无草木，冬夏有雪",
          "yields": {
            "water": [
              "空桑之水（东流注于虖沱）"
            ]
          },
          "fauna": [],
          "source": "又北二百里，曰空桑之山，无草木，冬夏有雪。空桑之水出焉，东流注于虖沱。",
          "dataUnlockLevel": 492
        },
        {
          "id": "beishan-3-34",
          "name": "泰戏之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 68,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "water": [
              "虖沱之水（东流注于溇水）",
              "液女之水（出于其阳，南流注于沁水）"
            ]
          },
          "fauna": [
            {
              "name": "䍶䍶",
              "form": "其状如羊，一角一目，目在耳后",
              "sound": "其鸣自訆",
              "category": "兽",
              "rank": "★"
            }
          ],
          "source": "又北三百里，曰泰戏之山，无草木，多金玉。有兽焉，其状如羊，一角一目，目在耳后，其名曰䍶䍶，其鸣自訆。虖沱之水出焉，而东流注于溇水。液女之水出于其阳，南流注于沁水。",
          "note": "★「目在耳后」——与北次一经狍鸮「目在腋下」、南山经猼訑「其目在背」构成「眼睛长在非常规位置」三连",
          "dataUnlockLevel": 495
        },
        {
          "id": "beishan-3-35",
          "name": "石山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 68,
          "yields": {
            "mineral": [
              "金玉"
            ],
            "water": [
              "濩濩之水（东流注于虖沱）",
              "鲜于之水（南流注于虖沱）"
            ]
          },
          "fauna": [],
          "source": "又北三百里，曰石山，多藏金玉。濩濩之水出焉，而东流注于虖沱。鲜于之水出焉，而南流注于虖沱。",
          "dataUnlockLevel": 498
        },
        {
          "id": "beishan-3-36",
          "name": "童戎之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 68,
          "yields": {
            "water": [
              "皋涂之水（东流注于溇液水）"
            ]
          },
          "fauna": [],
          "source": "又北二百里，曰童戎之山。皋涂之水出焉，而东流注于溇液水。",
          "dataUnlockLevel": 500
        },
        {
          "id": "beishan-3-37",
          "name": "高是之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 68,
          "yields": {
            "wood": [
              "棕"
            ],
            "herb": [
              "条"
            ],
            "water": [
              "滋水（南流注于虖沱）",
              "滱水（东流注于河）"
            ]
          },
          "fauna": [],
          "source": "又北三百里，曰高是之山。滋水出焉，而南流注于虖沱。其木多棕，其草多条。滱水出焉，东流注于河。",
          "dataUnlockLevel": 502
        },
        {
          "id": "beishan-3-38",
          "name": "陆山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 68,
          "yields": {
            "mineral": [
              "美玉"
            ],
            "water": [
              "姜阝水（东流注于河）"
            ]
          },
          "fauna": [],
          "source": "又北三百里，曰陆山，多美玉。姜阝水出焉，而东流注于河。",
          "dataUnlockLevel": 505
        },
        {
          "id": "beishan-3-39",
          "name": "沂山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 68,
          "yields": {
            "water": [
              "般水（东流注于河）"
            ]
          },
          "fauna": [],
          "source": "又北二百里，曰沂山。般水出焉，而东流注于河。",
          "dataUnlockLevel": 507
        },
        {
          "id": "beishan-3-40",
          "name": "燕山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 69,
          "yields": {
            "mineral": [
              "婴石"
            ],
            "water": [
              "燕水（东流注于河）"
            ]
          },
          "fauna": [],
          "source": "北百二十里，曰燕山，多婴石。燕水出焉，东流注于河。",
          "dataUnlockLevel": 509
        },
        {
          "id": "beishan-3-41",
          "name": "饶山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 69,
          "terrain": "又北山行五百里，水行五百里，至于饶山。是无草木",
          "yields": {
            "mineral": [
              "瑶",
              "碧"
            ],
            "water": [
              "历虢之水（东流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "橐驼",
              "category": "兽"
            },
            {
              "name": "鹠",
              "category": "鸟"
            },
            {
              "name": "师鱼",
              "effect": "食之杀人",
              "category": "水族",
              "hazard": "食之杀人"
            }
          ],
          "hazard": {
            "type": "有毒",
            "detail": "师鱼食之杀人"
          },
          "source": "又北山行五百里，水行五百里，至于饶山。是无草木，多瑶碧，其兽多橐驼，其鸟多鹠。历虢之水出焉，而东流注于河，其中有师鱼，食之杀人。",
          "dataUnlockLevel": 512
        },
        {
          "id": "beishan-3-42",
          "name": "乾山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 69,
          "terrain": "无草木。其阴有铁而无水",
          "yields": {
            "mineral": [
              "金玉（阳）",
              "铁（阴）"
            ]
          },
          "fauna": [
            {
              "name": "獂",
              "form": "其状如牛而三足",
              "sound": "其鸣自詨",
              "category": "兽"
            }
          ],
          "source": "又北四百里，曰乾山，无草木。其阳有金玉，其阴有铁而无水。有兽焉，其状如牛而三足，其名曰獂，其鸣自詨。",
          "dataUnlockLevel": 515
        },
        {
          "id": "beishan-3-43",
          "name": "伦山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 69,
          "yields": {
            "water": [
              "伦水（东流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "罴",
              "form": "其状如麋，其川（窍）在尾上",
              "category": "兽"
            }
          ],
          "source": "又北五百里，曰伦山。伦水出焉，而东流注于河。有兽焉，其状如麋，其川在尾上，其名曰罴。",
          "dataUnlockLevel": 518
        },
        {
          "id": "beishan-3-44",
          "name": "碣石之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 69,
          "yields": {
            "mineral": [
              "玉（上）",
              "青碧（下）"
            ],
            "water": [
              "绳水（东流注于河）"
            ]
          },
          "fauna": [
            {
              "name": "蒲夷之鱼",
              "category": "水族"
            }
          ],
          "source": "又北五百里，曰碣石之山。绳水出焉，而东流注于河，其中多蒲夷之鱼。其上有玉，其下多青碧。",
          "dataUnlockLevel": 521
        },
        {
          "id": "beishan-3-45",
          "name": "雁门之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 70,
          "terrain": "又北水行五百里，至于雁门之山，无草木",
          "yields": {},
          "fauna": [],
          "source": "又北水行五百里，至于雁门之山，无草木。",
          "dataUnlockLevel": 524
        },
        {
          "id": "beishan-3-46",
          "name": "帝都之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 70,
          "terrain": "又北水行四百里，至于泰泽，其中有山焉，曰帝都之山，广员百里，无草木",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ]
          },
          "fauna": [],
          "source": "又北水行四百里，至于泰泽。其中有山焉，曰帝都之山，广员百里，无草木，有金玉。",
          "dataUnlockLevel": 526
        },
        {
          "id": "beishan-3-47",
          "name": "錞于毋逢之山",
          "chapter": "北山经·北次三经",
          "unlockLevel": 70,
          "terrain": "北望鸡号之山，其风如䬅。西望幽都之山，浴水出焉",
          "yields": {
            "water": [
              "浴水"
            ]
          },
          "fauna": [
            {
              "name": "大蛇",
              "form": "赤首白身",
              "sound": "其音如牛",
              "omen": "见则其邑大旱",
              "category": "蛇"
            }
          ],
          "omen": [
            {
              "trigger": "大蛇",
              "type": "大旱",
              "desc": "见则其邑大旱",
              "polarity": "凶"
            }
          ],
          "source": "又北五百里，曰錞于毋逢之山，北望鸡号之山，其风如䬅。西望幽都之山，浴水出焉。是有大蛇，赤首白身，其音如牛，见则其邑大旱。",
          "note": "★北次三经终点。自此再北即为《海经》与幽都之地。大蛇「其音如牛」与北次一经长蛇「其音如鼓柝」构成北地巨蛇的声学对照",
          "dataUnlockLevel": 529
        }
      ],
      "dataUnlockLevel": 405
    }
  ]
};
