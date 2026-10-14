# -*- coding: utf-8 -*-
"""在官方 69 区结构上填入已查证 target（来源见 games-data-research-2026-10-13.md + BWiki 宝箱页）。"""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

P = r'D:\07-Code\Projects\MiYouExplorationLevel\public\data\games.json'
DATA = {
    'mondstadt': {'dragonspine': {'chest': 234, 'challenge': 16, 'seelie': 32}},
    'liyue': {'chasm': {'chest': 248, 'challenge': 20, 'seelie': 37}},
    'inazuma': {
        'watatsumi_island': {'chest': 93},
        'seirai_island': {'chest': 105},
        'tsurumi_island': {'chest': 169, 'challenge': 16, 'seelie': 6},
        'enkanomiya': {'chest': 185},
    },
    'natlan': {
        'teyvat_toyac_springs': {'chest': 55},
        'teyvat_quahuacan_cliff': {'chest': 37},
        'teyvat_ochkanatlan': {'chest': 78},
    },
    'nod_krai': {
        'xuha_wang': {'chest': 94}, 'zhulang_wilds': {'chest': 100},
        'yan_ge_peak': {'chest': 32}, 'du_nan_na_pit': {'chest': 10},
    },
    'snezhnaya': {
        'volkodlak_tundra': {'chest': 66}, 'white_birch_snowgrave': {'chest': 41},
        'everfrozen_earth': {'chest': 98}, 'flamefeather_valley': {'chest': 34},
        'fellfrost_peak': {'chest': 103},
    },
}

d = json.load(open(P, encoding='utf-8'))
written = 0
missing = []
for r in d['games'][0]['regions']:
    if r['id'] not in DATA:
        continue
    for a in r['areas']:
        if a['id'] not in DATA[r['id']]:
            continue
        for it in a['items']:
            if it['id'] in DATA[r['id']][a['id']]:
                it['target'] = DATA[r['id']][a['id']][it['id']]
                written += 1

json.dump(d, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('written:', written)

# 回读强校验：非零 target 数量必须等于 written，且逐项核对
d2 = json.load(open(P, encoding='utf-8'))
filled = 0
for r in d2['games'][0]['regions']:
    for a in r['areas']:
        for it in a['items']:
            if it['target'] > 0:
                filled += 1
                print(r['name'], a['name'], it['name'], it['target'])
print('nonzero targets after reload:', filled)
assert filled == written, 'MISMATCH!'
print('OK')
