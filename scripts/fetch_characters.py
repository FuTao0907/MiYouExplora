# -*- coding: utf-8 -*-
"""
角色清单生成脚本（数据源：Project Amber https://gi.yatta.moe）
- 拉取 EN / CHS 两个接口，合并出完整角色数据
- 旅行者（空/荧）各元素形态合并为一条；排除演示人偶（Manekin/Manekina）
- 输出 public/data/genshin-characters.json，字段含头像/立绘直链

用法：python scripts/fetch_characters.py
"""
import json
import time
import urllib.request
from pathlib import Path

BASE = "https://gi.yatta.moe/api/v2"

# 元素/国家/武器 中文化映射
ELEMENT_ZH = {
    "Ice": "冰", "Fire": "火", "Water": "水", "Electric": "雷",
    "Wind": "风", "Rock": "岩", "Grass": "草",
}
REGION_ZH = {
    "MONDSTADT": "蒙德", "LIYUE": "璃月", "INAZUMA": "稻妻", "SUMERU": "须弥",
    "FONTAINE": "枫丹", "NATLAN": "纳塔", "NODKRAI": "挪德卡莱",
    "NODKRAI_ZIBAI": "挪德卡莱", "SNEZHNAYA": "至冬", "SNEZHNAYA_STAR": "至冬",
    "FATUI": "愚人众", "OMNI_SCOURGE": "深渊", "RANGER": "其他",
    "MAINACTOR": "旅行者", "HVISION": "其他",
}
WEAPON_ZH = {
    "WEAPON_SWORD_ONE_HAND": "单手剑", "WEAPON_CATALYST": "法器",
    "WEAPON_CLAYMORE": "双手剑", "WEAPON_BOW": "弓", "WEAPON_POLE": "长柄武器",
}
# 演示人偶（非可玩角色）
EXCLUDE_IDS = {"10000117", "10000118"}  # Manekin / Manekina


def fetch(lang: str) -> dict:
    """拉取指定语言的角色列表接口。"""
    url = f"{BASE}/{lang}/avatar"
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0",
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))["data"]["items"]
        except Exception as e:
            print(f"  [warn] {lang} 拉取失败 (try {attempt+1}): {e}")
            time.sleep(2)
    return {}


def main() -> None:
    out = Path(__file__).resolve().parent.parent / "public" / "data" / "genshin-characters.json"
    print("== 拉取 EN 列表 ==")
    en = fetch("EN")
    print(f"EN {len(en)} 条")
    time.sleep(1)
    print("== 拉取 CHS 列表 ==")
    chs = fetch("CHS")
    print(f"CHS {len(chs)} 条")

    # 合并：以 id 为键（旅行者元素形态 id 带后缀，如 10000005-anemo）
    by_id = {}
    for cid, item in en.items():
        by_id.setdefault(cid, {})["en"] = item
    for cid, item in chs.items():
        by_id.setdefault(cid, {})["chs"] = item

    # 旅行者男女各元素形态 → 合并为一条（保留首发形态做生日/元素展示）
    traveler_merge = {}
    for cid, pair in by_id.items():
        e = pair.get("en") or {}
        if str(e.get("id", "")).startswith("10000005-"):
            traveler_merge.setdefault("10000005", pair)
        elif str(e.get("id", "")).startswith("10000007-"):
            traveler_merge.setdefault("10000007", pair)

    chars = []
    for cid, pair in by_id.items():
        if str(cid).startswith("10000005-") or str(cid).startswith("10000007-"):
            continue  # 元素形态在下方合并处理
        if cid in EXCLUDE_IDS:
            continue
        e, c = pair.get("en") or {}, pair.get("chs") or {}
        icon = e.get("icon") or c.get("icon") or ""
        suffix = icon.removeprefix("UI_AvatarIcon_")
        chars.append({
            "id": str(cid),
            "name": c.get("name") or e.get("name") or "",
            "en": e.get("name") or c.get("route") or "",
            "icon": icon,
            "element": ELEMENT_ZH.get(e.get("element")) or "",
            "elementEn": e.get("element") or "",
            "region": REGION_ZH.get(e.get("region")) or "",
            "regionEn": e.get("region") or "",
            "rarity": int(e.get("rank") or c.get("rank") or 4),
            "weapon": WEAPON_ZH.get(e.get("weaponType")) or "",
            "avatar": f"https://gi.yatta.moe/assets/UI/{icon}.png",
            "art": f"https://gi.yatta.moe/assets/UI/UI_Gacha_AvatarImg_{suffix}.png",
        })

    # 旅行者合并（男=空、女=荧）
    for tcid, cname in (("10000005", "空"), ("10000007", "荧")):
        pair = traveler_merge.get(tcid)
        if not pair:
            continue
        e, c = pair.get("en") or {}, pair.get("chs") or {}
        icon = e.get("icon") or c.get("icon") or "UI_AvatarIcon_PlayerBoy"
        chars.append({
            "id": tcid,
            "name": cname,
            "en": "Traveler",
            "icon": icon,
            "element": "风",  # 默认风元素展示
            "elementEn": "Wind",
            "region": "旅行者",
            "regionEn": "MAINACTOR",
            "rarity": 5,
            "weapon": "单手剑",
            "avatar": f"https://gi.yatta.moe/assets/UI/{icon}.png",
            "art": f"https://gi.yatta.moe/assets/UI/UI_Gacha_AvatarImg_{icon.removeprefix('UI_AvatarIcon_')}.png",
        })

    # 按国家分组顺序 + 组内按 id 排序，保证输出稳定
    region_order = ["蒙德", "璃月", "稻妻", "须弥", "枫丹", "纳塔", "挪德卡莱", "至冬", "愚人众", "深渊", "旅行者", "其他"]
    chars.sort(key=lambda x: (region_order.index(x["region"]) if x["region"] in region_order else 99, x["id"]))

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(chars, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"完成：{len(chars)} 个角色 -> {out}")
    from collections import Counter
    for r, n in Counter(c["region"] for c in chars).most_common():
        print(f"  {r}: {n}")


if __name__ == "__main__":
    main()
