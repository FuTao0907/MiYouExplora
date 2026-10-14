# -*- coding: utf-8 -*-
"""为 8 个地区写入板块级目标 targets（权威统计，来源见 games-data-research-2026-10-13.md 板块级清单）。
分项顺序与 items 一致：chest 宝箱 / challenge 限时挑战 / seelie 仙灵（纳塔 phantasm 幻写灵）。"""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

P = r'D:\07-Code\Projects\MiYouExplorationLevel\public\data\games.json'
BOARDS = {
    # 蒙德：除雪山 521/51/17 + 龙脊雪山 234/32/16（BWiki 确认）＝ 755/83/33
    'mondstadt': {'chest': 755, 'challenge': 33, 'seelie': 83},
    # 璃月：除层岩 1135/81/47 + 层岩巨渊 248/37/20（BWiki 确认）＝ 1383/118/67
    # ⚠️ 另有旧权威总数 1155（3.x 口径，见调研报告冲突并列 1155/1131/1132），此处按当前明细之和
    'liyue': {'chest': 1383, 'challenge': 67, 'seelie': 118},
    # 稻妻：其一 358/35/21 + 其二 204/29/6 + 鹤观 169/16/6 + 渊下宫 185（鹤观/渊下宫 BWiki 确认）＝ 916/43/70
    'inazuma': {'chest': 916, 'challenge': 43, 'seelie': 70},
    # 须弥：雨林 575/45/54 + 大赤沙海 354 + 千壑沙地 290（沙漠板块仙灵/挑战无来源）＝ 1219/54/45
    'sumeru': {'chest': 1219, 'challenge': 54, 'seelie': 45},
    # 枫丹：344/42/53 + 243/13/28 + 207/13/30（枫丹一 344 BWiki 确认）＝ 794/68/111
    'fontaine': {'chest': 794, 'challenge': 111, 'seelie': 68},
    # 纳塔：411/40/17 + 202/12/11 + 217/14/14（407 vs 411 取 411）＝ 830/66/42；幻写灵取代仙灵
    'natlan': {'chest': 830, 'challenge': 42, 'phantasm': 66},
    # 挪德卡莱：月之一 299 + 月之四 229 + 月之八 224（10+214，霜月整图）＝ 752；月之一/月之四分项不明，0
    'nod_krai': {'chest': 752, 'challenge': 0, 'seelie': 0},
    # 至冬：全区 345/31/11（342 vs 345 取 345）
    'snezhnaya': {'chest': 345, 'challenge': 11, 'seelie': 31},
}

d = json.load(open(P, encoding='utf-8'))
written = 0
for r in d['games'][0]['regions']:
    if r['id'] in BOARDS:
        r['targets'] = BOARDS[r['id']]
        written += 1

json.dump(d, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('regions with targets:', written)

d2 = json.load(open(P, encoding='utf-8'))
for r in d2['games'][0]['regions']:
    print(r['sort'], r['name'], r.get('targets'))
assert all(r.get('targets') for r in d2['games'][0]['regions'])
print('OK')
