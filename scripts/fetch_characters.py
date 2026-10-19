# -*- coding: utf-8 -*-
"""
角色清单生成脚本（多游戏框架，数据源按游戏配置）
- 用法：python scripts/fetch_characters.py <gameId>
  - genshin  → Project Amber（https://gi.yatta.moe）EN/CHS 合并
- 输出：public/data/characters/<gameId>.json
- 新增游戏：在 GAME_SOURCES 加一条数据源配置（拉取接口 + 素材域名/前缀规律），
  并在 games.json 对应 game 加 "characters": true，前端即自动显示图鉴入口并按游戏加载数据。
"""
import json
import sys
import time
import urllib.request
from collections import Counter
from pathlib import Path

# ---------- 各游戏数据源配置（新增游戏在此扩展） ----------
# source: {
#   "langs":  接口语言代码列表（第一个为主语言）
#   "api":    lambda lang -> 清单接口 URL
#   "exclude_ids": 需排除的非可玩角色 id 集合
#   "merge_traveler": 是否合并旅行者多元素形态
#   "asset_base": 图片直链域名前缀
#   "icon_field": 清单中素材名对应的字段名
#   "avatar_tpl": 证件照 URL 模板（{base}{icon}.png）
#   "art_tpl":    抽卡立绘 URL 模板（{base}UI_Gacha_AvatarImg_{suffix}.png，suffix=icon 去 UI_AvatarIcon_ 前缀）
#   "elements":   元素中文化映射（接口原文 -> 中文）
#   "regions":    国家/地区中文化映射（接口原文 -> 中文）
#   "weapons":    武器中文化映射
#   "traveler_names": 旅行者合并条目 {主形态 id: 中文名}
# }
GAME_SOURCES = {
    "genshin": {
        "langs": ["EN", "CHS"],
        "api": lambda lang: f"https://gi.yatta.moe/api/v2/{lang}/avatar",
        "exclude_ids": {"10000117", "10000118"},  # Manekin / Manekina 演示人偶
        "merge_traveler": True,
        "asset_base": "https://gi.yatta.moe/assets/UI/",
        "icon_field": "icon",
        "avatar_tpl": "{base}{icon}.png",
        "art_tpl": "{base}UI_Gacha_AvatarImg_{suffix}.png",
        "elements": {
            "Ice": "冰", "Fire": "火", "Water": "水", "Electric": "雷",
            "Wind": "风", "Rock": "岩", "Grass": "草",
        },
        "regions": {
            "MONDSTADT": "蒙德", "LIYUE": "璃月", "INAZUMA": "稻妻", "SUMERU": "须弥",
            "FONTAINE": "枫丹", "NATLAN": "纳塔", "NODKRAI": "挪德卡莱",
            "NODKRAI_ZIBAI": "挪德卡莱", "SNEZHNAYA": "至冬", "SNEZHNAYA_STAR": "至冬",
            "FATUI": "愚人众", "OMNI_SCOURGE": "深渊", "RANGER": "其他",
            "MAINACTOR": "旅行者", "HVISION": "其他",
        },
        "weapons": {
            "WEAPON_SWORD_ONE_HAND": "单手剑", "WEAPON_CATALYST": "法器",
            "WEAPON_CLAYMORE": "双手剑", "WEAPON_BOW": "弓", "WEAPON_POLE": "长柄武器",
        },
        "traveler_names": {"10000005": "空", "10000007": "荧"},
        "region_order": ["蒙德", "璃月", "稻妻", "须弥", "枫丹", "纳塔", "挪德卡莱", "至冬", "愚人众", "深渊", "旅行者", "其他"],
        "source": {"name": "Project Amber", "url": "https://gi.yatta.moe"},
    },
    # 以后新增游戏示例（数据源就绪后启用）：
    # "hsr": { ... 星穹铁道数据站配置 ... },
}

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "data" / "characters"


def fetch_items(url: str) -> dict:
    """拉取清单接口（{id: item}），失败重试 3 次。"""
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0",
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))["data"]["items"]
        except Exception as e:
            print(f"  [warn] 拉取失败 (try {attempt+1}): {e}")
            time.sleep(2)
    return {}


def main() -> None:
    game = sys.argv[1] if len(sys.argv) > 1 else "genshin"
    cfg = GAME_SOURCES.get(game)
    if not cfg:
        print(f"错误：未知游戏「{game}」。可用：{', '.join(GAME_SOURCES)}")
        sys.exit(1)

    print(f"== 拉取《{game}》角色清单 ==")
    items = {}  # id -> {lang: item}
    for lang in cfg["langs"]:
        fetched = fetch_items(cfg["api"](lang))
        print(f"  {lang}: {len(fetched)} 条")
        for cid, item in fetched.items():
            items.setdefault(cid, {})[lang] = item
        time.sleep(1)

    # 旅行者多元素形态合并（如 10000005-anemo → 10000005）
    traveler_merge = {}
    if cfg["merge_traveler"]:
        for cid, pair in items.items():
            base = str(cid).split("-")[0]
            if base in cfg["traveler_names"] and "-" in str(cid):
                traveler_merge.setdefault(base, pair)

    chars = []
    for cid, pair in items.items():
        if str(cid).split("-")[0] in cfg["traveler_names"] and "-" in str(cid):
            continue  # 元素形态在下方合并
        if cid in cfg["exclude_ids"]:
            continue
        e, c = pair.get(cfg["langs"][0]) or {}, pair.get(cfg["langs"][1]) or {}
        icon = e.get(cfg["icon_field"]) or c.get(cfg["icon_field"]) or ""
        suffix = icon.removeprefix("UI_AvatarIcon_")
        chars.append({
            "id": str(cid),
            "name": c.get("name") or e.get("name") or "",
            "en": e.get("name") or c.get("route") or "",
            "icon": icon,
            "element": cfg["elements"].get(e.get("element")) or "",
            "elementEn": e.get("element") or "",
            "region": cfg["regions"].get(e.get("region")) or "",
            "regionEn": e.get("region") or "",
            "rarity": int(e.get("rank") or c.get("rank") or 4),
            "weapon": cfg["weapons"].get(e.get("weaponType")) or "",
            "avatar": cfg["avatar_tpl"].format(base=cfg["asset_base"], icon=icon),
            "art": cfg["art_tpl"].format(base=cfg["asset_base"], suffix=suffix),
        })

    # 合并旅行者（主形态一条）
    if cfg["merge_traveler"]:
        for tcid, cname in cfg["traveler_names"].items():
            pair = traveler_merge.get(tcid)
            if not pair:
                continue
            e, c = pair.get(cfg["langs"][0]) or {}, pair.get(cfg["langs"][1]) or {}
            icon = e.get(cfg["icon_field"]) or c.get(cfg["icon_field"]) or ""
            chars.append({
                "id": tcid,
                "name": cname,
                "en": "Traveler",
                "icon": icon,
                "element": "风",
                "elementEn": "Wind",
                "region": "旅行者",
                "regionEn": "MAINACTOR",
                "rarity": 5,
                "weapon": "单手剑",
                "avatar": cfg["avatar_tpl"].format(base=cfg["asset_base"], icon=icon),
                "art": cfg["art_tpl"].format(base=cfg["asset_base"], suffix=icon.removeprefix("UI_AvatarIcon_")),
            })

    # 稳定排序：区域顺序 + 组内 id
    order = cfg.get("region_order") or []
    chars.sort(key=lambda x: (order.index(x["region"]) if x["region"] in order else 99, x["id"]))

    out = OUT_DIR / f"{game}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        # 数据源元信息：前端页头/统计按此显示来源链接（多游戏各自不同素材站）
        "source": cfg.get("source") or {"name": game, "url": ""},
        "items": chars,
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"完成：{len(chars)} 个角色 -> {out}")
    for r, n in Counter(c["region"] for c in chars).most_common():
        print(f"  {r}: {n}")


if __name__ == "__main__":
    main()
