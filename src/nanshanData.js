// ===== 南山经世界数据（三系 39 山） =====
// 本文件由 nanshanjing_nodes.json 派生生成，请勿手改；
// 需要调整数据时改 JSON 后重新运行 node scripts/gen-world-data.js
// 底本：中华书局点校本《山海经校注》（袁珂）——古籍原文，公有领域

window.NANSHAN = {
  "regions": [
    {
      "regionId": "nanshan-1",
      "regionName": "南山首经",
      "regionAlias": "䧿山",
      "order": 1,
      "unlockLevel": 1,
      "summary": "南山经之首曰䧿山。其首曰招摇之山，临于西海之上。凡䧿山之首，自招摇之山，以至箕尾之山，凡十山，二千九百五十里。",
      "deity": {
        "form": "其神状皆鸟身而龙首",
        "rite": {
          "毛用": "一璋玉瘗",
          "糈用": "稌米",
          "附加": [
            "一璧",
            "稻米",
            "白菅为席"
          ],
          "原文": "其神状皆鸟身而龙首，其祠之礼：毛，用一璋玉瘗，糈用稌米，一璧，稻米、白菅为席。"
        }
      },
      "legs": {
        "自述里程": 2950,
        "分段之和": 2700,
        "差额": -250,
        "备注": "",
        "路线": [
          {
            "id": "nanshan-1-01",
            "name": "招摇之山",
            "mode": "首山",
            "distance": 0,
            "total": 0
          },
          {
            "id": "nanshan-1-02",
            "name": "堂庭之山",
            "direction": "东",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "nanshan-1-03",
            "name": "猿翼之山",
            "direction": "东",
            "distance": 380,
            "mode": "陆行",
            "total": 380
          },
          {
            "id": "nanshan-1-04",
            "name": "杻阳之山",
            "direction": "东",
            "distance": 370,
            "mode": "陆行",
            "total": 370
          },
          {
            "id": "nanshan-1-05",
            "name": "柢山",
            "direction": "东",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "nanshan-1-06",
            "name": "亶爰之山",
            "direction": "东",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "nanshan-1-07",
            "name": "基山",
            "direction": "东",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "nanshan-1-08",
            "name": "青丘之山",
            "direction": "东",
            "distance": 300,
            "mode": "陆行",
            "total": 300
          },
          {
            "id": "nanshan-1-09",
            "name": "箕尾之山",
            "direction": "东",
            "distance": 350,
            "mode": "陆行",
            "total": 350
          }
        ]
      },
      "nodes": [
        {
          "id": "nanshan-1-01",
          "name": "招摇之山",
          "chapter": "南山经·南山首经",
          "unlockLevel": 1,
          "terrain": "临于西海之上",
          "yields": {
            "wood": [
              "桂"
            ],
            "mineral": [
              "金",
              "玉"
            ],
            "herb": [
              {
                "name": "祝余",
                "form": "其状如韭而青华",
                "effect": "食之不饥"
              }
            ],
            "woodSpecial": [
              {
                "name": "迷榖",
                "form": "其状如榖而黑理，其华四照",
                "effect": "佩之不迷"
              }
            ],
            "water": [
              {
                "name": "育沛",
                "water": "丽麂之水",
                "effect": "佩之无瘕疾"
              }
            ]
          },
          "fauna": [
            {
              "name": "狌狌",
              "form": "其状如禺而白首，赤足",
              "sound": null,
              "effect": "食之善走",
              "omen": null,
              "category": "兽"
            }
          ],
          "omen": null,
          "hazard": null,
          "source": "南山经之首曰䧿山。其首曰招摇之山，临于西海之上，多桂，多金玉。有草焉，其状如韭而青华，其名曰祝余，食之不饥。有木焉，其状如榖而黑理，其华四照，其名曰迷榖，佩之不迷。有兽焉，其状如禺而白首，赤足，名曰狌狌，食之善走。丽麂之水出焉，而西流注于海，其中多育沛，佩之无瘕疾。",
          "dataUnlockLevel": 1
        },
        {
          "id": "nanshan-1-02",
          "name": "堂庭之山",
          "chapter": "南山经·南山首经",
          "unlockLevel": 1,
          "terrain": null,
          "yields": {
            "wood": [
              "棪木"
            ],
            "mineral": [
              "水玉",
              "黄金"
            ]
          },
          "fauna": [
            {
              "name": "白猿",
              "form": null,
              "category": "兽"
            }
          ],
          "omen": null,
          "hazard": null,
          "source": "又东三百里，曰堂庭之山，多棪木，多白猿，多水玉，多黄金。",
          "dataUnlockLevel": 2
        },
        {
          "id": "nanshan-1-03",
          "name": "猿翼之山",
          "chapter": "南山经·南山首经",
          "unlockLevel": 2,
          "terrain": null,
          "yields": {
            "mineral": [
              "白玉"
            ],
            "unknown": [
              "怪兽",
              "怪鱼",
              "怪蛇",
              "怪木"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": {
            "type": "不可以上",
            "detail": "多蝮虫、多怪蛇，不可攀登"
          },
          "source": "又东三百八十里，曰猿翼之山，其中多怪兽，水多怪鱼，多白玉，多蝮虫，多怪蛇，多怪木，不可以上。",
          "dataUnlockLevel": 4
        },
        {
          "id": "nanshan-1-04",
          "name": "杻阳之山",
          "chapter": "南山经·南山首经",
          "unlockLevel": 3,
          "terrain": "其阳多赤金，其阴多白金",
          "yields": {
            "mineral": [
              "赤金（阳）",
              "白金（阴）"
            ]
          },
          "fauna": [
            {
              "name": "鹿蜀",
              "form": "其状如马而白首，其文如虎而赤尾",
              "sound": "其音如谣",
              "effect": "佩之宜子孙",
              "omen": null,
              "category": "兽"
            },
            {
              "name": "旋龟",
              "form": "其状如龟而鸟首虺尾",
              "sound": "其音如判木",
              "effect": "佩之不聋，可以为底（胝）",
              "omen": null,
              "category": "水族",
              "water": "怪水"
            }
          ],
          "omen": null,
          "hazard": null,
          "source": "又东三百七十里，曰杻阳之山，其阳多赤金，其阴多白金。有兽焉，其状如马而白首，其文如虎而赤尾，其音如谣，其名曰鹿蜀，佩之宜子孙。怪水出焉，而东流注于宪翼之水。其中多玄龟，其状如龟而鸟首虺尾，其名曰旋龟，其音如判木，佩之不聋，可以为底。",
          "dataUnlockLevel": 6
        },
        {
          "id": "nanshan-1-05",
          "name": "柢山",
          "chapter": "南山经·南山首经",
          "unlockLevel": 3,
          "terrain": "多水，无草木",
          "yields": {},
          "fauna": [
            {
              "name": "鯥",
              "form": "其状如牛，陵居，蛇尾有翼，其羽在魼下",
              "sound": "其音如留牛",
              "effect": "食之无肿疾",
              "omen": null,
              "category": "水族",
              "trait": "冬死而夏生"
            }
          ],
          "omen": null,
          "hazard": null,
          "source": "又东三百里，曰柢山，多水，无草木。有鱼焉，其状如牛，陵居，蛇尾有翼，其羽在魼下，其音如留牛，其名曰鯥，冬死而夏生，食之无肿疾。",
          "dataUnlockLevel": 8
        },
        {
          "id": "nanshan-1-06",
          "name": "亶爰之山",
          "chapter": "南山经·南山首经",
          "unlockLevel": 4,
          "terrain": "多水，无草木",
          "yields": {},
          "fauna": [
            {
              "name": "类",
              "form": "其状如狸而有髦",
              "sound": null,
              "effect": "食者不妒",
              "omen": null,
              "category": "兽",
              "trait": "自为牝牡（雌雄同体）"
            }
          ],
          "omen": null,
          "hazard": {
            "type": "不可以上"
          },
          "source": "又东四百里，曰亶爰之山，多水，无草木，不可以上。有兽焉，其状如狸而有髦，其名曰类，自为牝牡，食者不妒。",
          "dataUnlockLevel": 10
        },
        {
          "id": "nanshan-1-07",
          "name": "基山",
          "chapter": "南山经·南山首经",
          "unlockLevel": 5,
          "terrain": "其阳多玉，其阴多怪木",
          "yields": {
            "mineral": [
              "玉（阳）"
            ],
            "wood": [
              "怪木（阴）"
            ]
          },
          "fauna": [
            {
              "name": "猼訑",
              "form": "其状如羊，九尾四耳，其目在背",
              "sound": null,
              "effect": "佩之不畏",
              "omen": null,
              "category": "兽"
            },
            {
              "name": "𪁺𪁸",
              "form": "其状如鸡而三首六目，六足三翼",
              "sound": null,
              "effect": "食之无卧（食后不眠）",
              "omen": null,
              "category": "鸟"
            }
          ],
          "omen": null,
          "hazard": null,
          "source": "又东三百里，曰基山，其阳多玉，其阴多怪木。有兽焉，其状如羊，九尾四耳，其目在背，其名曰猼訑，佩之不畏。有鸟焉，其状如鸡而三首六目、六足三翼，其名曰𪁺𪁸，食之无卧。",
          "dataUnlockLevel": 12
        },
        {
          "id": "nanshan-1-08",
          "name": "青丘之山",
          "chapter": "南山经·南山首经",
          "unlockLevel": 6,
          "terrain": "其阳多玉，其阴多青雘",
          "yields": {
            "mineral": [
              "玉（阳）",
              "青雘（阴）"
            ]
          },
          "fauna": [
            {
              "name": "九尾狐",
              "form": "其状如狐而九尾",
              "sound": "其音如婴儿",
              "effect": "食者不蛊",
              "omen": null,
              "category": "兽",
              "hazard": "能食人"
            },
            {
              "name": "灌灌",
              "form": "其状如鸠",
              "sound": "其音若呵",
              "effect": "佩之不惑",
              "omen": null,
              "category": "鸟"
            },
            {
              "name": "赤鱬",
              "form": "其状如鱼而人面",
              "sound": "其音如鸳鸯",
              "effect": "食之不疥",
              "omen": null,
              "category": "水族",
              "water": "英水"
            }
          ],
          "omen": null,
          "hazard": {
            "type": "食人",
            "detail": "九尾狐能食人"
          },
          "source": "又东三百里，曰青丘之山，其阳多玉，其阴多青雘。有兽焉，其状如狐而九尾，其音如婴儿，能食人，食者不蛊。有鸟焉，其状如鸠，其音若呵，名曰灌灌，佩之不惑。英水出焉，南流注于即翼之泽。其中多赤鱬，其状如鱼而人面，其音如鸳鸯，食之不疥。",
          "dataUnlockLevel": 15
        },
        {
          "id": "nanshan-1-09",
          "name": "箕尾之山",
          "chapter": "南山经·南山首经",
          "unlockLevel": 7,
          "terrain": "其㟬多沙石",
          "yields": {
            "mineral": [
              "沙石",
              "白玉"
            ],
            "water": [
              "汸水（南流注于淯）"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "source": "又东三百五十里，曰箕尾之山，其尾踆于东海，多沙石。汸水出焉，而南流注于淯，其中多白玉。",
          "dataUnlockLevel": 18
        }
      ],
      "dataUnlockLevel": 1
    },
    {
      "regionId": "nanshan-2",
      "regionName": "南次二经",
      "regionAlias": null,
      "order": 2,
      "unlockLevel": 7,
      "summary": "南次二经之首，曰柜山，西临流黄，北望诸𣲗，东望长右。凡南次二经之首，自柜山至于漆吴之山，凡十七山，七千二百里。",
      "deity": {
        "form": "其神状皆龙身而鸟首",
        "rite": {
          "毛用": "一璧瘗",
          "糈用": "稌",
          "原文": "其神状皆龙身而鸟首。其祠：毛用一璧瘗，糈用稌。"
        }
      },
      "legs": {
        "自述里程": 7200,
        "分段之和": 7210,
        "差额": 10,
        "备注": "山数相符（17 座）。分段里程较自述多 10 里，属古籍流传中的既有出入，非录入遗漏",
        "路线": [
          {
            "id": "nanshan-2-01",
            "name": "柜山",
            "mode": "首山",
            "distance": 0,
            "total": 0
          },
          {
            "id": "nanshan-2-02",
            "name": "长右之山",
            "direction": "东南",
            "distance": 450,
            "mode": "陆行",
            "total": 450
          },
          {
            "id": "nanshan-2-03",
            "name": "尧光之山",
            "direction": "东",
            "distance": 340,
            "mode": "陆行",
            "total": 340
          },
          {
            "id": "nanshan-2-04",
            "name": "羽山",
            "direction": "东",
            "distance": 350,
            "mode": "陆行",
            "total": 350
          },
          {
            "id": "nanshan-2-05",
            "name": "瞿父之山",
            "direction": "东",
            "distance": 370,
            "mode": "陆行",
            "total": 370
          },
          {
            "id": "nanshan-2-06",
            "name": "句余之山",
            "direction": "东",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "nanshan-2-07",
            "name": "浮玉之山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-2-08",
            "name": "成山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-2-09",
            "name": "会稽之山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-2-10",
            "name": "夷山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-2-11",
            "name": "仆勾之山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-2-12",
            "name": "咸阴之山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-2-13",
            "name": "洵山",
            "direction": "东",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "nanshan-2-14",
            "name": "虖勺之山",
            "direction": "东",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "nanshan-2-15",
            "name": "区吴之山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-2-16",
            "name": "鹿吴之山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-2-17",
            "name": "漆吴之山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          }
        ]
      },
      "nodes": [
        {
          "id": "nanshan-2-01",
          "name": "柜山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 7,
          "terrain": "西临流黄，北望诸𣲗，东望长右",
          "yields": {
            "mineral": [
              "白玉",
              "丹粟"
            ],
            "water": [
              "英水（西南流注于赤水）"
            ]
          },
          "fauna": [
            {
              "name": "狸力",
              "form": "其状如豚，有距",
              "sound": "其音如狗吠",
              "effect": null,
              "omen": "见则其县多土功",
              "category": "兽"
            },
            {
              "name": "鴸",
              "form": "其状如鸱而人手",
              "sound": "其音如痺，其名自号也",
              "effect": null,
              "omen": "见则其县多放士",
              "category": "鸟"
            }
          ],
          "omen": [
            {
              "trigger": "狸力",
              "type": "土功",
              "desc": "见则其县多土功"
            },
            {
              "trigger": "鴸",
              "type": "放士",
              "desc": "见则其县多放士"
            }
          ],
          "hazard": null,
          "source": "南次二经之首，曰柜山，西临流黄，北望诸𣲗，东望长右。英水出焉，西南流注于赤水，其中多白玉，多丹粟。有兽焉，其状如豚，有距，其音如狗吠，其名曰狸力，见则其县多土功。有鸟焉，其状如鸱而人手，其音如痺，其名曰鴸，其鸣自号也，见则其县多放士。",
          "dataUnlockLevel": 20
        },
        {
          "id": "nanshan-2-02",
          "name": "长右之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 8,
          "terrain": "无草木，多水",
          "yields": {},
          "fauna": [
            {
              "name": "长右",
              "form": "其状如禺而四耳",
              "sound": "其音如吟",
              "effect": null,
              "omen": "见则郡县大水",
              "category": "兽"
            }
          ],
          "omen": [
            {
              "trigger": "长右",
              "type": "大水",
              "desc": "见则郡县大水"
            }
          ],
          "hazard": null,
          "source": "东南四百五十里，曰长右之山，无草木，多水。有兽焉，其状如禺而四耳，其名长右，其音如吟，见则郡县大水。",
          "dataUnlockLevel": 22
        },
        {
          "id": "nanshan-2-03",
          "name": "尧光之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 9,
          "terrain": "其阳多玉，其阴多金",
          "yields": {
            "mineral": [
              "玉（阳）",
              "金（阴）"
            ]
          },
          "fauna": [
            {
              "name": "猾褢",
              "form": "其状如人而彘鬣，穴居而冬蛰",
              "sound": "其音如斫木",
              "effect": null,
              "omen": "见则县有大繇",
              "category": "兽"
            }
          ],
          "omen": [
            {
              "trigger": "猾褢",
              "type": "大繇",
              "desc": "见则县有大繇（大兴徭役）"
            }
          ],
          "hazard": null,
          "source": "又东三百四十里，曰尧光之山，其阳多玉，其阴多金。有兽焉，其状如人而彘鬣，穴居而冬蛰，其名曰猾褢，其音如斫木，见则县有大繇。",
          "dataUnlockLevel": 24
        },
        {
          "id": "nanshan-2-04",
          "name": "羽山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 9,
          "terrain": "其下多水，其上多雨，无草木",
          "yields": {},
          "fauna": [],
          "omen": null,
          "hazard": {
            "type": "蝮虫"
          },
          "source": "又东三百五十里，曰羽山，其下多水，其上多雨，无草木，多蝮虫。",
          "dataUnlockLevel": 26
        },
        {
          "id": "nanshan-2-05",
          "name": "瞿父之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 10,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "source": "又东三百七十里，曰瞿父之山，无草木，多金玉。",
          "dataUnlockLevel": 27
        },
        {
          "id": "nanshan-2-06",
          "name": "句余之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 10,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "source": "又东四百里，曰句余之山，无草木，多金玉。",
          "dataUnlockLevel": 28
        },
        {
          "id": "nanshan-2-07",
          "name": "浮玉之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 11,
          "terrain": "北望具区，东望诸𣲗",
          "yields": {
            "water": [
              "苕水（出于其阴，北流注于具区）",
              "鮆鱼"
            ]
          },
          "fauna": [
            {
              "name": "彘",
              "form": "其状如虎而牛尾",
              "sound": "其音如吠犬",
              "effect": null,
              "omen": null,
              "category": "兽",
              "hazard": "是食人"
            }
          ],
          "omen": null,
          "hazard": {
            "type": "食人",
            "detail": "彘是食人"
          },
          "source": "又东五百里，曰浮玉之山，北望具区，东望诸𣲗。有兽焉，其状如虎而牛尾，其音如吠犬，其名曰彘，是食人。苕水出于其阴，北流注于具区，其中多鮆鱼。",
          "dataUnlockLevel": 30
        },
        {
          "id": "nanshan-2-08",
          "name": "成山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 11,
          "terrain": "四方而三坛",
          "yields": {
            "mineral": [
              "金玉（上）",
              "青雘（下）",
              "黄金（𨴯水）"
            ],
            "water": [
              "𨴯水（南流注于虖勺）"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "source": "又东五百里，曰成山，四方而三坛，其上多金玉，其下多青雘。𨴯水出焉，而南流注于虖勺，其中多黄金。",
          "dataUnlockLevel": 32
        },
        {
          "id": "nanshan-2-09",
          "name": "会稽之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 12,
          "terrain": "四方",
          "yields": {
            "mineral": [
              "金玉（上）",
              "砆石（下）"
            ],
            "water": [
              "勺水（南流注于湨）"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "source": "又东五百里，曰会稽之山，四方，其上多金玉，其下多砆石。勺水出焉，而南流注于湨。",
          "dataUnlockLevel": 34
        },
        {
          "id": "nanshan-2-10",
          "name": "夷山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 12,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "沙石"
            ],
            "water": [
              "湨水（南流注于列涂）"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "source": "又东五百里，曰夷山，无草木，多沙石。湨水出焉，而南流注于列涂。",
          "dataUnlockLevel": 35
        },
        {
          "id": "nanshan-2-11",
          "name": "仆勾之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 13,
          "terrain": "其上多金玉，其下多草木",
          "yields": {
            "mineral": [
              "金玉"
            ],
            "wood": [
              "草木"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "note": "无鸟兽，无水",
          "source": "又东五百里，曰仆勾之山，其上多金玉，其下多草木。无鸟兽，无水。",
          "dataUnlockLevel": 36
        },
        {
          "id": "nanshan-2-12",
          "name": "咸阴之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 13,
          "terrain": null,
          "yields": {},
          "fauna": [],
          "omen": null,
          "hazard": null,
          "note": "无草木，无水",
          "source": "又东五百里，曰咸阴之山，无草木，无水。",
          "dataUnlockLevel": 37
        },
        {
          "id": "nanshan-2-13",
          "name": "洵山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 14,
          "terrain": "其阳多金，其阴多玉",
          "yields": {
            "mineral": [
              "金（阳）",
              "玉（阴）"
            ],
            "water": [
              "洵水（南流注于阏之泽）",
              "芘蠃"
            ]
          },
          "fauna": [
            {
              "name": "䍺",
              "form": "其状如羊而无口",
              "sound": null,
              "effect": null,
              "omen": null,
              "category": "兽",
              "trait": "不可杀也（不可被击杀，适合设计为不可讨伐的特殊对象）"
            }
          ],
          "omen": null,
          "hazard": null,
          "source": "又东四百里，曰洵山，其阳多金，其阴多玉。有兽焉，其名曰䍺，其状如羊而无口，不可杀也。洵水出焉，而南流注于阏之泽，其中多芘蠃。",
          "dataUnlockLevel": 39
        },
        {
          "id": "nanshan-2-14",
          "name": "虖勺之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 15,
          "terrain": null,
          "yields": {
            "wood": [
              "梓",
              "枏（楠）",
              "荆",
              "杞"
            ],
            "water": [
              "滂水（东流注于海）"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "source": "又东四百里，曰虖勺之山，其上多梓枏，其下多荆杞。滂水出焉，而东流注于海。",
          "dataUnlockLevel": 41
        },
        {
          "id": "nanshan-2-15",
          "name": "区吴之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 15,
          "terrain": "无草木",
          "yields": {
            "mineral": [
              "沙石"
            ],
            "water": [
              "鹿水（南流注于滂水）"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "source": "又东五百里，曰区吴之山，无草木，多沙石。鹿水出焉，而南流注于滂水。",
          "dataUnlockLevel": 42
        },
        {
          "id": "nanshan-2-16",
          "name": "鹿吴之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 16,
          "terrain": "上者无草木",
          "yields": {
            "mineral": [
              "金",
              "石"
            ],
            "water": [
              "泽更之水（南流注于滂水）"
            ]
          },
          "fauna": [
            {
              "name": "蛊雕",
              "form": "其状如雕而有角",
              "sound": "其音如婴儿之音",
              "effect": null,
              "omen": null,
              "category": "兽（水生）",
              "hazard": "是食人"
            }
          ],
          "omen": null,
          "hazard": {
            "type": "食人",
            "detail": "蛊雕是食人"
          },
          "source": "又东五百里，曰鹿吴之山，上者无草木，多金石。泽更之水出焉，而南流注于滂水。水有兽焉，名曰蛊雕，其状如雕而有角，其音如婴儿之音，是食人。",
          "dataUnlockLevel": 44
        },
        {
          "id": "nanshan-2-17",
          "name": "漆吴之山",
          "chapter": "南山经·南次二经",
          "unlockLevel": 16,
          "terrain": "处于东海，望丘山，其光载出载入，是惟日次",
          "yields": {
            "mineral": [
              "博石"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "note": "「是惟日次」——古人认为是太阳歇宿之处。",
          "source": "又东五百里，曰漆吴之山，无草木，多博石，无玉。处于东海，望丘山，其光载出载入，是惟日次。",
          "dataUnlockLevel": 46
        }
      ],
      "dataUnlockLevel": 20
    },
    {
      "regionId": "nanshan-3",
      "regionName": "南次三经",
      "regionAlias": null,
      "order": 3,
      "unlockLevel": 18,
      "summary": "南次三经之首，曰天虞之山。凡南次三经之首，自天虞之山以至南禺之山，凡一十四山，六千五百三十里。",
      "deity": {
        "form": "其神状皆龙身而人面",
        "rite": {
          "用": "一白狗祈",
          "糈用": "稌",
          "原文": "其神状皆龙身而人面。其祠之礼：用一白狗祈，糈用稌。"
        }
      },
      "legs": {
        "自述里程": 6530,
        "分段之和": 5480,
        "差额": -1050,
        "备注": "",
        "路线": [
          {
            "id": "nanshan-3-01",
            "name": "天虞之山",
            "mode": "首山",
            "distance": 0,
            "total": 0
          },
          {
            "id": "nanshan-3-02",
            "name": "祷过之山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-3-03",
            "name": "丹穴之山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-3-04",
            "name": "发爽之山",
            "direction": "东",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "nanshan-3-05",
            "name": "旄山之尾",
            "direction": "东",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "nanshan-3-06",
            "name": "非山之首",
            "direction": "东",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "nanshan-3-07",
            "name": "阳夹之山",
            "direction": "东",
            "distance": 350,
            "mode": "陆行",
            "total": 350
          },
          {
            "id": "nanshan-3-08",
            "name": "灌湘之山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-3-09",
            "name": "鸡山",
            "direction": "东",
            "distance": 500,
            "mode": "陆行",
            "total": 500
          },
          {
            "id": "nanshan-3-10",
            "name": "令丘之山",
            "direction": "东",
            "distance": 400,
            "mode": "陆行",
            "total": 400
          },
          {
            "id": "nanshan-3-11",
            "name": "仑者之山",
            "direction": "东",
            "distance": 370,
            "mode": "陆行",
            "total": 370
          },
          {
            "id": "nanshan-3-12",
            "name": "禺槁之山",
            "direction": "东",
            "distance": 580,
            "mode": "陆行",
            "total": 580
          },
          {
            "id": "nanshan-3-13",
            "name": "南禺之山",
            "direction": "东",
            "distance": 580,
            "mode": "陆行",
            "total": 580
          }
        ]
      },
      "nodes": [
        {
          "id": "nanshan-3-01",
          "name": "天虞之山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 18,
          "terrain": "其下多水",
          "yields": {},
          "fauna": [],
          "omen": null,
          "hazard": {
            "type": "不可以上"
          },
          "source": "南次三经之首，曰天虞之山，其下多水，不可以上。",
          "dataUnlockLevel": 50
        },
        {
          "id": "nanshan-3-02",
          "name": "祷过之山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 18,
          "terrain": null,
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "beast": [
              "犀",
              "兕",
              "象"
            ],
            "water": [
              "泿水（南流注于海）"
            ]
          },
          "fauna": [
            {
              "name": "瞿如",
              "form": "其状如䴔，而白首、三足、人面",
              "sound": "其鸣自号也",
              "effect": null,
              "omen": null,
              "category": "鸟"
            },
            {
              "name": "虎蛟",
              "form": "其状鱼身而蛇尾",
              "sound": "其音如鸳鸯",
              "effect": "食者不肿，可以已痔",
              "omen": null,
              "category": "水族",
              "water": "泿水"
            }
          ],
          "omen": null,
          "hazard": null,
          "source": "东五百里，曰祷过之山，其上多金玉，其下多犀、兕，多象。有鸟焉，其状如䴔，而白首、三足、人面，其名曰瞿如，其鸣自号也。泿水出焉，而南流注于海。其中有虎蛟，其状鱼身而蛇尾，其音如鸳鸯，食者不肿，可以已痔。",
          "dataUnlockLevel": 52
        },
        {
          "id": "nanshan-3-03",
          "name": "丹穴之山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 19,
          "terrain": "其上多金玉",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "water": [
              "丹水（南流注于渤海）"
            ]
          },
          "fauna": [
            {
              "name": "凤皇",
              "form": "其状如鸡，五采而文。首文曰德，翼文曰义，背文曰礼，膺文曰仁，腹文曰信",
              "sound": "自歌自舞",
              "effect": "饮食自然",
              "omen": "见则天下安宁",
              "category": "鸟",
              "rank": ""
            }
          ],
          "omen": [
            {
              "trigger": "凤皇",
              "type": "天下安宁",
              "desc": "见则天下安宁",
              "polarity": "吉"
            }
          ],
          "hazard": null,
          "source": "又东五百里，曰丹穴之山，其上多金玉。丹水出焉，而南流注于渤海。有鸟焉，其状如鸡，五采而文，名曰凤皇，首文曰德，翼文曰义，背文曰礼，膺文曰仁，腹文曰信。是鸟也，饮食自然，自歌自舞，见则天下安宁。",
          "dataUnlockLevel": 55
        },
        {
          "id": "nanshan-3-04",
          "name": "发爽之山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 20,
          "terrain": "无草木，多水",
          "yields": {
            "water": [
              "汎水（南流注于渤海）"
            ]
          },
          "fauna": [
            {
              "name": "白猿",
              "category": "兽"
            }
          ],
          "omen": null,
          "hazard": null,
          "source": "又东四百里，曰发爽之山，无草木，多水，多白猿。汎水出焉，而南流注于渤海。",
          "dataUnlockLevel": 57
        },
        {
          "id": "nanshan-3-05",
          "name": "旄山之尾",
          "chapter": "南山经·南次三经",
          "unlockLevel": 20,
          "terrain": "其南有谷，曰育遗",
          "yields": {},
          "fauna": [
            {
              "name": "怪鸟",
              "category": "鸟",
              "note": "多怪鸟"
            }
          ],
          "omen": null,
          "hazard": null,
          "note": "凯风自是出（南风自此谷而出）",
          "source": "又东四百里，至于旄山之尾，其南有谷，曰育遗，多怪鸟，凯风自是出。",
          "dataUnlockLevel": 58
        },
        {
          "id": "nanshan-3-06",
          "name": "非山之首",
          "chapter": "南山经·南次三经",
          "unlockLevel": 21,
          "terrain": "其上多金玉，无水",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": {
            "type": "蝮虫"
          },
          "source": "又东四百里，至于非山之首，其上多金玉，无水，其下多蝮虫。",
          "dataUnlockLevel": 59
        },
        {
          "id": "nanshan-3-07",
          "name": "阳夹之山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 21,
          "terrain": "无草木，多水",
          "yields": {},
          "fauna": [],
          "omen": null,
          "hazard": null,
          "source": "又东三百五十里，曰阳夹之山，无草木，多水。",
          "dataUnlockLevel": 60
        },
        {
          "id": "nanshan-3-08",
          "name": "灌湘之山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 21,
          "terrain": "上多木，无草",
          "yields": {
            "wood": [
              "木"
            ]
          },
          "fauna": [
            {
              "name": "怪鸟",
              "category": "鸟",
              "note": "多怪鸟，无兽"
            }
          ],
          "omen": null,
          "hazard": null,
          "source": "又东五百里，曰灌湘之山，上多木，无草，多怪鸟，无兽。",
          "dataUnlockLevel": 61
        },
        {
          "id": "nanshan-3-09",
          "name": "鸡山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 22,
          "terrain": "其上多金，其下多丹雘",
          "yields": {
            "mineral": [
              "金（上）",
              "丹雘（下）"
            ],
            "water": [
              "黑水（南流注于海）"
            ]
          },
          "fauna": [
            {
              "name": "鱄鱼",
              "form": "其状如鲋而彘毛",
              "sound": "其音如豚",
              "effect": null,
              "omen": "见则天下大旱",
              "category": "水族",
              "water": "黑水"
            }
          ],
          "omen": [
            {
              "trigger": "鱄鱼",
              "type": "大旱",
              "desc": "见则天下大旱",
              "polarity": "凶"
            }
          ],
          "hazard": null,
          "source": "又东五百里，曰鸡山，其上多金，其下多丹雘。黑水出焉，而南流注于海。其中有鱄鱼，其状如鲋而彘毛，其音如豚，见则天下大旱。",
          "dataUnlockLevel": 63
        },
        {
          "id": "nanshan-3-10",
          "name": "令丘之山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 23,
          "terrain": "无草木，多火。其南有谷焉，曰中谷",
          "yields": {
            "special": [
              "火"
            ]
          },
          "fauna": [
            {
              "name": "颙",
              "form": "其状如枭，人面四目而有耳",
              "sound": "其鸣自号也",
              "effect": null,
              "omen": "见则天下大旱",
              "category": "鸟"
            }
          ],
          "omen": [
            {
              "trigger": "颙",
              "type": "大旱",
              "desc": "见则天下大旱",
              "polarity": "凶"
            }
          ],
          "hazard": {
            "type": "多火"
          },
          "note": "条风自是出（东北风自此谷而出）",
          "source": "又东四百里，曰令丘之山，无草木，多火。其南有谷焉，曰中谷，条风自是出。有鸟焉，其状如枭，人面四目而有耳，其名曰颙，其鸣自号也，见则天下大旱。",
          "dataUnlockLevel": 65
        },
        {
          "id": "nanshan-3-11",
          "name": "仑者之山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 24,
          "terrain": "其上多金玉，其下多青雘",
          "yields": {
            "mineral": [
              "金",
              "玉",
              "青雘"
            ],
            "woodSpecial": [
              {
                "name": "白䓘",
                "form": "其状如榖而赤理，其汗如漆，其味如饴",
                "effect": "食者不饥，可以释劳；可以血玉（用以染玉）"
              }
            ]
          },
          "fauna": [],
          "omen": null,
          "hazard": null,
          "source": "又东三百七十里，曰仑者之山，其上多金玉，其下多青雘。有木焉，其状如榖而赤理，其汗如漆，其味如饴，食者不饥，可以释劳，其名曰白䓘，可以血玉。",
          "dataUnlockLevel": 68
        },
        {
          "id": "nanshan-3-12",
          "name": "禺槁之山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 24,
          "terrain": null,
          "yields": {},
          "fauna": [
            {
              "name": "怪兽",
              "category": "兽",
              "note": "多怪兽"
            },
            {
              "name": "大蛇",
              "category": "蛇",
              "note": "多大蛇"
            }
          ],
          "omen": null,
          "hazard": {
            "type": "大蛇"
          },
          "source": "又东五百八十里，曰禺槁之山，多怪兽，多大蛇。",
          "dataUnlockLevel": 70
        },
        {
          "id": "nanshan-3-13",
          "name": "南禺之山",
          "chapter": "南山经·南次三经",
          "unlockLevel": 26,
          "terrain": "其上多金玉，其下多水。有穴焉，水春辄入，夏乃出，冬则闭",
          "yields": {
            "mineral": [
              "金",
              "玉"
            ],
            "water": [
              "佐水（东南流注于海）"
            ]
          },
          "fauna": [
            {
              "name": "凤皇",
              "category": "鸟",
              "rank": "★"
            },
            {
              "name": "鹓雏",
              "category": "鸟",
              "rank": "★"
            }
          ],
          "omen": null,
          "hazard": null,
          "note": "",
          "source": "又东五百八十里，曰南禺之山，其上多金玉，其下多水。有穴焉，水春辄入，夏乃出，冬则闭。佐水出焉，而东南流注于海，有凤皇、鹓雏。",
          "dataUnlockLevel": 75
        }
      ],
      "dataUnlockLevel": 50
    }
  ]
};
