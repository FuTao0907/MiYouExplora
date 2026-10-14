# 《原神》探索度数据调研报告（games.json target 填充依据）

- 调研日期：2026-10-13
- 游戏当前版本：7.x（7.0 于 2026-08-12 开放至冬 5 区域；7.1 于 2026-09-23）
- 范围：8 地区 58 子区域 × 3 分项（chest 宝箱 / challenge 限时挑战 / seelie 仙灵）共 174 个 target
- 结论概要：公开权威统计（成就系统）多为**板块级/地区级**，能查到**子区域级**数字的共 24 项（§1/§2）；其余 150 项只有板块级总数（§3）或查无公开来源（§4）。**所有数字均来自真实访问的页面**（BWiki、米游社、Icy Veins、观测枢、Dot Esports、NGA、官方更新说明、搜狐/抖音/B站攻略等），无凭记忆填写，无编造。

---

## 1. 可直接合并进 games.json 的 JSON（仅含查到的子区域级数字）

```json
{
  "mondstadt": {
    "dragonspine": { "chest": 234, "challenge": 16, "seelie": 32 }
  },
  "liyue": {
    "chasm": { "chest": 248, "challenge": 20, "seelie": 37 }
  },
  "inazuma": {
    "tsurumi_island": { "chest": 169, "challenge": 16, "seelie": 6 },
    "seirai_island": { "chest": 105 },
    "watatsumi_island": { "chest": 93 }
  },
  "sumeru": {},
  "fontaine": {},
  "natlan": {
    "teyvat_toyac_springs": { "chest": 55 },
    "teyvat_quahuacan_cliff": { "chest": 37 },
    "teyvat_ochkanatlan": { "chest": 78 }
  },
  "nod_krai": {
    "xuha_wang": { "chest": 94 },
    "zhulang_wilds": { "chest": 100 },
    "yan_ge_peak": { "chest": 32 },
    "du_nan_na_pit": { "chest": 10 },
    "frost_moon": { "chest": 214 }
  },
  "snezhnaya": {
    "volkodlak_tundra": { "chest": 66 },
    "white_birch_snowgrave": { "chest": 41 },
    "everfrozen_earth": { "chest": 98 },
    "flamefeather_valley": { "chest": 34 },
    "fellfrost_peak": { "chest": 103 }
  }
}
```

> 未包含的子区域分项一律未查到子区域级来源，保持 0（见 §4）。**填入前请特别留意 §2 中每项的"口径说明"**，部分数字口径与游戏内成就系统不完全一致（见下）。

### 口径提醒（填入前必读）
- 清籁岛 105 / 海祇岛 93：为 **2.1 版本攻略宝箱位点数**（不含任务宝箱/地灵龛），非 7.x 成就数。交叉验证：稻妻其二板块 204 = 105 + 93 + 6 个任务宝箱，与板块总数自洽。
- 纳塔 踞石山 55 / 镜璧山 37 / 奥奇卡纳塔 78：Icy Veins **英文站口径**（含奇馈/任务附加宝箱），更新至 5.8（2026-06-29），与米游社成就口径未核对，**建议二次核对后再填**。
- 至冬 5 区：Icy Veins 口径（含任务/限时挑战宝箱），五区合计 342，而米游社/NGA 公认至冬总数为 **345**，疑 Icy Veins 初期更新漏 3 个任务/隐藏宝箱，数字未平均、未自行补齐。
- 月之四 3 区（94/100/32）：米游社路线攻略分段汇总（=226），不含 3 个"边域地灵龛"华丽宝箱（板块总数 229，差额即地灵龛）；含任务/限时挑战/镇守宝箱。

---

## 2. 来源表（子区域级数字）

| 子区域 | 分项 | 数值 | 来源 URL | 口径说明 | 截至版本 |
|---|---|---|---|---|---|
| 龙脊雪山 dragonspine | 宝箱 | 234 | https://wiki.biligame.com/ys/宝箱 | BWiki：雪山总计 234（华丽11/珍贵37/精致100/普通86）；成就帖 https://www.miyoushe.com/ys/article/36564660 一致 | 2026-08-24 |
| 龙脊雪山 dragonspine | 仙灵 | 32 | https://www.miyoushe.com/ys/article/36564660 | 成就"踏雪引路人 总计32"；另一帖 https://www.miyoushe.com/ys/article/56869018 同为 32 | 2023-03/2024-08 |
| 龙脊雪山 dragonspine | 限时挑战 | 16 | https://www.miyoushe.com/ys/article/56869018 | 成就口径 16；另有帖称 17（16 限时+1 非成就挑战"三匣子/剑柄"），取成就口径 | 2024-08 |
| 层岩巨渊 chasm | 宝箱 | 248 | https://wiki.biligame.com/ys/宝箱 | BWiki：地上 82+地下 166；成就帖 https://www.miyoushe.com/ys/article/47843895 一致 | 2026-08-24 |
| 层岩巨渊 chasm | 限时挑战 | 20 | https://www.miyoushe.com/ys/article/47843895 | 多源一致 | 2024-01 |
| 层岩巨渊 chasm | 仙灵 | 37 | https://www.miyoushe.com/ys/article/47843895 | 含须弥交界 1 个计入层岩；另一源 31844130 记 36~37（见 §5） | 2024-01 |
| 鹤观 tsurumi_island | 宝箱 | 169 | https://wiki.biligame.com/ys/宝箱 | 板块即单岛：华丽6/珍贵16(含6任务)/精致41(含3任务+10道具)/普通60/奇馈46 | 2026-08-24 |
| 鹤观 tsurumi_island | 限时挑战 | 16 | https://www.miyoushe.com/ys/article/60708697 | 稻妻其三（鹤观）限时挑战成就数 | 7.0 |
| 鹤观 tsurumi_island | 仙灵 | 6 | https://www.miyoushe.com/ys/article/60708697 | 鹤观仙灵成就数（雷灵 6 不计入仙灵成就）；冲突值见 §5 | 7.0 |
| 清籁岛 seirai_island | 宝箱 | 105 | https://www.miyoushe.com/ys/article/9151969 | **2.1 攻略宝箱位点数**（作者明示"清籁岛一共105个宝箱"），不含地灵龛/手鞠游戏/后续任务宝箱；实测不开地灵龛、不做手鞠游戏探索度即 99% | 2.1（2021-09） |
| 海祇岛 watatsumi_island | 宝箱 | 93 | https://www.miyoushe.com/ys/article/9260059 | **2.1 攻略宝箱位点数**（"海祇岛宝箱全收集93个位点"），不含地灵龛/小卷婆婆占卜等任务宝箱 | 2.1（2021-09） |
| 踞石山 teyvat_toyac_springs | 宝箱 | 55 | https://www.icy-veins.com/genshin-impact/toyac-springs-treasure-and-puzzles | Icy Veins 英文站：16普+21精+4华+11珍+4奇馈；含任务/奇馈，与成就口径未核对 | 5.8（2026-06-29） |
| 镜璧山 teyvat_quahuacan_cliff | 宝箱 | 37 | https://www.icy-veins.com/genshin-impact/quahuacan-cliff-treasure-and-puzzles | Icy Veins：10普+4精+2华+1珍+1奇馈+9附加 | 5.8（2026-06-29） |
| 奥奇卡纳塔 teyvat_ochkanatlan | 宝箱 | 78 | https://www.icy-veins.com/genshin-impact/ochkanatlan-treasure-and-puzzles | Icy Veins：19普+19精+3华+3珍+11奇馈+23附加；**已由组织层复核原文** | 5.8（2026-06-29） |
| 虚海望 xuha_wang | 宝箱 | 94 | https://m.miyoushe.com/wd/#/article/72646600 | 月之四路线分段：虚海望-1(30)+-2(19)+-3(22)+-4(23)=94；不含 3 个边域地灵龛；含任务/限时挑战/镇守宝箱 | 月之四(6.3) 2026-01 |
| 逐浪野 zhulang_wilds | 宝箱 | 100 | https://m.miyoushe.com/wd/#/article/72646600 | 路线分段：15+19+35+12+19=100；同上 | 月之四(6.3) 2026-01 |
| 烟硌山峰 yan_ge_peak | 宝箱 | 32 | https://m.miyoushe.com/wd/#/article/72646600 | 路线整段 32；同上 | 月之四(6.3) 2026-01 |
| 杜南纳深坑 du_nan_na_pit | 宝箱 | 10 | https://www.miyoushe.com/ys/article/76351345 | 6.7 收集攻略：大世界 224=杜南纳深坑10+霜月214 | 月之八(6.7) 2026-07 |
| 霜月 frost_moon | 宝箱 | 214 | https://www.miyoushe.com/ys/article/76351345 | 同上；月神瞳 74 亦归霜月 | 月之八(6.7) 2026-07 |
| 古兽冰原 volkodlak_tundra | 宝箱 | 66 | https://www.icy-veins.com/genshin-impact/volkodlak-tundra-treasure-and-puzzles | Icy Veins：含世界任务与限时挑战宝箱；**已复核原文**；五区合计 342 vs 公认 345（见 §5） | 7.0（2026-08-11） |
| 白桦雪葬地 white_birch_snowgrave | 宝箱 | 41 | https://www.icy-veins.com/genshin-impact/white-birch-snowgrave-treasure-and-puzzles | Icy Veins：全 41 个，含任务/限时挑战 | 7.0（2026-08-17） |
| 永凝冻土 everfrozen_earth | 宝箱 | 98 | https://www.icy-veins.com/genshin-impact/everfrozen-earth-treasure-and-puzzles | Icy Veins：含斯涅日格勒城/扎波利亚尔宫 | 7.0（2026-08-11） |
| 焰羽谷 flamefeather_valley | 宝箱 | 34 | https://www.icy-veins.com/genshin-impact/flamefeather-valley-treasure-and-puzzles | Icy Veins | 7.0（2026-08-17） |
| 霜殛寒峰 fellfrost_peak | 宝箱 | 103 | https://www.icy-veins.com/genshin-impact/fellfrost-peak-treasure-and-puzzles | Icy Veins | 7.0（2026-08-15） |

---

## 3. 板块级 / 地区级数字清单（待用户自行拆分，禁止硬拆）

官方成就统计只到"板块/地区"级，公开网络无按官方探索子区域的拆分；以下数字**不能直接填进单个子区域**，如需使用建议用观测枢互动地图按子区域筛点，或自行约定拆分口径。

| 板块 | 覆盖子区域 | 宝箱 | 限时挑战 | 仙灵/幻写灵 | 来源与口径 |
|---|---|---|---|---|---|
| 蒙德（除雪山） | 坠星山谷、苍风高地、风啸山坡、明冠峡、望风山地、奔狼领 | 521（成就 518，7.0 帖 524/519） | 17（成就） | 51（成就，实际 52，区间 51–53） | BWiki https://wiki.biligame.com/ys/宝箱 ；https://www.miyoushe.com/ys/article/72718251 ；https://www.miyoushe.com/ys/article/36564660 ；https://www.miyoushe.com/ys/article/56806018 |
| 璃月（除层岩） | 碧水原、琼玑野、珉林、璃沙郊、云来海 | 1135（成就；总数 1155，7.0 帖）；1131（2024-01）；1132（5.6 末） | 47（口径 47–50） | 81（含 3 个限定，81–84） | https://www.miyoushe.com/ys/article/72718251 ；https://www.miyoushe.com/ys/article/47843895 ；https://www.miyoushe.com/ys/article/56806018 |
| 稻妻其一 | 鸣神岛、神无冢、八酝岛 | 358（含 1 个 2.2 古时孤影限时；常驻 357） | 35（36 含 1 个幻影心流活动） | 21（雷灵 43 不计入） | BWiki；https://www.miyoushe.com/ys/article/72718251 ；https://www.miyoushe.com/ys/article/60708697 |
| 稻妻其二 | 海祇岛、清籁岛 | 204（=位点 105+93+6 任务宝箱） | 29 | 6（雷灵 19） | BWiki；https://www.miyoushe.com/ys/article/9260059 |
| 须弥雨林 | 道成林、护世森、阿陀河谷、善见地、二净甸、桓那兰那、失落的苗圃、水天丛林 | 575（初始 572 + 4.6 新增 3） | 45 | 54（计数 bug，53–55 均算拿全） | BWiki；https://www.miyoushe.com/ys/article/62084574 ；观测枢专题 https://baike.mihoyo.com/ys/strategy/content/3592/detail |
| 枫丹一 | 枫丹廷区、白露区、苍晶区 | 344（338+2+4，水仙十字结 2 不计成就） | 53（另一来源 51，见 §5） | 42 | BWiki；https://www.miyoushe.com/ys/article/58355322 |
| 枫丹二 | 黎翡区、枫丹动能工程科学研究院区 | 243 | 28 | 13 | 同上 |
| 枫丹三 | 莫尔泰区、伊黎耶林区 | 207 | 30 | 13 | 同上 |
| 纳塔一 | 坚岩隘谷、踞石山、涌流地、万火之瓯 | 411（开服 407，后补至 411） | 17 | 幻写灵 40（**纳塔无传统仙灵**） | https://www.miyoushe.com/ys/article/66522382 ；https://www.miyoushe.com/ys/article/58355322 |
| 纳塔二 | 镜璧山、翘枝崖、奥奇卡纳塔 | 202 | 11 | 幻写灵 12 | https://www.miyoushe.com/ys/article/66522382 |
| 纳塔三（圣山残辉） | 安饶之野、远古圣山 | 217 | 14 | 幻写灵 14 | https://www.miyoushe.com/ys/article/66522382 ；https://bbs.mihayo.com/dby/article/64106160 |
| 挪德卡莱·月之一 | 帕哈岛、希汐岛、伦波岛 | 299 | 13（每个对应 1 宝箱） | 无子区域级 | https://www.miyoushe.com/ys/article/69808187 ；https://www.miyoushe.com/ys/article/69196526 ；https://m.miyoushe.com/ys/#/article/68737313 |
| 挪德卡莱·月之四 | 虚海望、逐浪野、烟硌山峰 | 229（华丽13含3地灵龛+珍贵32+精致93+普通76+奇馈15） | 8 | 无子区域级 | https://www.miyoushe.com/wd/article/73013904 ；https://m.miyoushe.com/wd/#/article/72646600 |
| 挪德卡莱·月之八 | 杜南纳深坑、霜月 | 224（已拆子区域，见 §1） | 5 | 无子区域级 | https://dotesports.com/genshin-impact/news/all-time-trial-locations-in-genshin-impact |
| 至冬 | 古兽冰原、白桦雪葬地、永凝冻土、焰羽谷、霜殛寒峰 | 345（子区域级见 §1，合计 342） | 31 | 11（按坐标定位帖，未标注子区域归属） | https://www.miyoushe.com/wd/article/77491895 ；https://bbs.nga.cn/read.php?tid=47376352 ；https://dotesports.com/genshin-impact/news/all-time-trial-locations-in-genshin-impact ；https://www.miyoushe.com/ys/article/78111443 |

**璃月限时挑战旧版子区域分布（2021-12，仅供参考，勿直接采用）**：珉林 15、碧水原 8、琼玑野 8、璃沙郊 10、云来海 1（合计 42，与现 47 差 5，未含后续新增）。来源：https://m.sohu.com/a/512706472_120099890/

---

## 4. 未查到清单（子区域级分项，保持 0）

| 子区域 | 分项 | 尝试过的关键词/来源 |
|---|---|---|
| 坠星山谷、苍风高地、风啸山坡、明冠峡、望风山地、奔狼领 | chest/challenge/seelie | "坠星山谷 宝箱 总数"、BWiki `ys/坠星山谷`(404)、B站路线段非官方边界（明冠峡×28、望风山地→望风角×61 为视频作者分段，未采用）；Icy Veins Windwail Highland=64 但英文子区划分与官方中文不一致，未采用 |
| 碧水原、琼玑野、珉林、璃沙郊、云来海、孤云阁、明蕴镇 | chest/challenge/seelie | 仅"阴间宝箱"片段（28/32 处）、2022 旧版累计段（璃沙郊 42、孤云阁 25、明蕴镇 18），非当前版本官方边界总数，未采用 |
| 鸣神岛、神无冢、八酝岛 | chest/challenge/seelie | "鸣神岛 宝箱 数量""稻妻 单岛 分别 多少个"；BWiki/观测枢稻妻专题(3495)仅板块 357/358，无单岛拆分 |
| 海祇岛、清籁岛 | challenge/seelie | 仅板块级（29/6），无单岛拆分 |
| 须弥 8 区（除板块级外） | chest/challenge/seelie | BWiki/观测枢仅合并 572/575；抖音分段号(442-478)为累计成就数，非单区总数；无 8 区拆分 |
| 枫丹 7 区 | chest/challenge/seelie | BWiki 仅板块 344/243/207；18183 枫丹 4.0 分区域为开服 295 旧口径（与现状不符） |
| 坚岩隘谷、涌流地、万火之瓯、翘枝崖、安饶之野、远古圣山 | chest | "坚岩隘谷 宝箱"仅抖音累计段；翘枝崖不能用 202−37−78 倒推（跨来源硬拆，禁止）；安饶之野/远古圣山 Icy Veins 页地点列表为空、与板块 217 严重不符，判定为未完成页未采用 |
| 全部 58 子区域中未列出的 challenge/seelie | challenge/seelie | 全地区均只有板块级（"XX 限时挑战 数量""XX 仙灵 数量"结果均为板块） |
| 帕哈岛、希汐岛、伦波岛 | chest/challenge/seelie | "帕哈岛 宝箱 总数"；Skycoach 2026-02 早期数据（50/20/18，自承认不全）、抖音累计数 165，无可靠拆分 |
| 至冬 5 区 | seelie | 米游社 78111443 给总数 11 但正文按坐标定位，未标注每只子区域归属 |

---

## 5. 冲突与口径差异汇总（未取平均，按来源并列）

| 项目 | 冲突值 | 来源 |
|---|---|---|
| 鹤观仙灵 | 6（60708697、58355322、36060111 三帖一致）vs 9（B站 https://www.bilibili.com/list/ml2207214193?bvid=BV1hD4y1W7oz ）vs 16（7.0 帖 https://www.miyoushe.com/ys/article/62084574 ，疑为挑战 16 误植） | 推荐 6 |
| 稻妻其二仙灵 | 6（47843895、58355322 等多帖）vs 19（7.0 帖 62084574，19 实为雷灵数，疑笔误） | 推荐 6 |
| 至冬宝箱总数 | Icy Veins 五区合计 342 vs 米游社/NGA 公认 345 | 差 3，疑 Icy Veins 漏任务/隐藏宝箱；子区域数字沿用唯一子区域级来源 Icy Veins |
| 月之四宝箱 | 路线攻略 226（94+100+32）vs 空荧酒馆/全成就帖 229 | 差 3 = 边域地灵龛华丽宝箱 |
| 蒙德除雪山宝箱 | 521（BWiki 2026-08-24）vs 524/519（7.0 帖 72718251）vs 518 成就（36564660，含 22 个璃月跨区域计入） | 三套口径：纯大世界/含活动/成就 |
| 璃月宝箱 | 1155 总数/1135 成就（7.0 帖）vs 1131（2024-01）vs 1132（5.6 末） | 版本演进所致 |
| 枫丹一限时挑战 | 53（米游社两帖）vs 51（抖音） | 未取平均 |
| 纳塔一宝箱 | 407（5.0 开服帖正文）vs 411（更新后/7.1 复核） | 取 411 |

---

## 6. 子区域划分与命名修正建议（仅供建议，未改动 games.json）

1. **核心问题：板块级 vs 子区域级错配**。游戏内探索度面板按子区域显示百分比，但官方宝箱/仙灵/挑战**成就数只按板块统计**（蒙德除雪山、璃月 5 区、稻妻其一/其二/鹤观、须弥雨林、枫丹三板块、纳塔三板块、挪德卡莱三批次、至冬全区）。58 个子区域中仅 龙脊雪山、层岩巨渊、鹤观（单岛=单板块）能直接对齐成就数。若 target 要表示"子区域探索度 100%"，板块级数字不能直接填入单个子区域。可选方案：a) 用观测枢互动地图（https://act.mihoyo.com/ys/app/interactive-map/ ）按子区域筛点自行统计；b) 接受部分子区域 target 保持 0，等官方/社区出子区域级拆分再补。
2. **纳塔无传统"仙灵"**：纳塔对应收集物为"幻写灵"（板块级 40/12/14），与 games.json 的 `seelie`（仙灵）非同一物。建议纳塔各子区域 seelie 记 0，并在 UI 上区分"仙灵/幻写灵"，否则与成就对不上。
3. **孤云阁、明蕴镇并非官方独立探索子区域**：观测枢璃月专题（https://baike.mihoyo.com/ys/strategy/content/3494/detail ）显示璃月官方探索子区域仅 5 个（碧水原/琼玑野/珉林/璃沙郊/云来海）+ 层岩巨渊；明蕴镇地理上属琼玑野、孤云阁属云来海（观测枢云来海词条 https://baike.mihoyo.com/ys/obc/content/369/detail ：主要由天衡山、璃月港、孤云阁组成）。若本工具按"游戏内探索度面板"口径，建议确认是否保留这两个独立 area；若保留，其 target 无官方对应，需自行约定口径。
4. **`liyue_harbor` id 与名称"璃沙郊"语义不符**：id 直译应为"璃月港"，而"璃沙郊"是另一地理区（归离原/渌华池一带）。建议核对：若本意是璃沙郊，改 id 为 `lisha`；若本意是璃月港，改名为"璃月港"。
5. **"明冠峡"命名待核对**：BWiki 宝箱页原文写"月之六版本加入的一个宝箱（明冠山地）"，部分攻略亦作"明冠山地"；games.json 为"明冠峡"（Brightcrown Canyon）。建议对照游戏内地图确认官方命名。
6. **纳塔两个 id↔中文名疑似对调**：`teyvat_ancient_sacred_mountain`（直译"远古圣山"）当前配"安饶之野"，`teyvat_atocpan`（阿托卡平火山地表）当前配"远古圣山"。5.5 实测两子区为 Atocpan（地表火山）与 Ancient Sacred Mountain（地下落之城），建议核对官方中文名后修正。
7. **"涌流地"英文对应存疑**：官方英文 5.0 为 Toyac Springs / Basin of Unnumbered Flames / Tequemecan Valley / Coatepec Mountain，games.json 5.0 区为坚岩隘谷/踞石山/涌流地/万火之瓯，"涌流地"的英文对应未在权威来源确证，建议以观测枢地图再核对。
8. **未收录子区域提示（与常驻大世界口径一致，无需补）**：稻妻不含渊下宫（185 宝箱/36 仙灵/18 挑战）、须弥不含沙漠三区（大赤沙海 354/千壑沙地 290/列柱沙原）、枫丹不含旧日之海（151）、纳塔不含 5.8 夏活海岛（169）。填板块数字时不要把它们的数字混入。
9. **版本口径建议**：宝箱数随版本浮动（须弥雨林 3.0 为 572 → 4.6 后 575；蒙德/璃月随活动补箱变化）。建议工具侧统一标注"截至 7.0/7.1"，后续大版本更新后复核。

---

*调研执行说明：由 4 个并行检索任务分片完成（蒙德+璃月 / 稻妻+须弥 / 枫丹+纳塔 / 挪德卡莱+至冬），所有数字均通过 general_search/web_fetch 真实检索与抓取获得；组织层已独立复核 BWiki 宝箱页（521/234/248/169/344）、Icy Veins 奥奇卡纳塔（78）、Icy Veins 古兽冰原（66）。未改动 games.json。*
