# -*- coding: utf-8 -*-
"""按官方（观测枢/版本公告）子区域划分重构 games.json；迁移已有 target；纳塔仙灵→幻写灵。"""
import json, io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

P = r'D:\07-Code\Projects\MiYouExplorationLevel\public\data\games.json'
d = json.load(open(P, encoding='utf-8'))
old = d['games'][0]['regions']

# 旧 target 快照（regionId -> areaId -> itemId -> target）
snap = {}
for r in old:
    for a in r['areas']:
        for it in a['items']:
            if it['target'] > 0:
                snap.setdefault(r['id'], {}).setdefault(a['id'], {})[it['id']] = it['target']

def items(region_id):
    if region_id == 'natlan':
        return [
            {'id': 'chest', 'name': '宝箱', 'target': 0},
            {'id': 'challenge', 'name': '限时挑战', 'target': 0},
            {'id': 'phantasm', 'name': '幻写灵', 'target': 0},
        ]
    return [
        {'id': 'chest', 'name': '宝箱', 'target': 0},
        {'id': 'challenge', 'name': '限时挑战', 'target': 0},
        {'id': 'seelie', 'name': '仙灵', 'target': 0},
    ]

# 官方子区域（观测枢地图列表 / 官方版本公告）
REGIONS = [
    {'id': 'mondstadt', 'name': '蒙德', 'image': '/images/mondstadt.jpg', 'sort': 1,
     'areas': [('falling_star_valley', '坠星山谷'), ('windwail_highland', '苍风高地'),
               ('stormbearer_mountains', '风啸山坡'), ('brightcrown_mountains', '明冠山地'),
               ('dragonspine', '龙脊雪山'), ('wind_rest_mountain', '风息山'),
               ('sky_temple', '空之神殿')]},
    {'id': 'liyue', 'name': '璃月', 'image': '/images/liyue.jpg', 'sort': 2,
     'areas': [('bishui_plain', '碧水原'), ('qiongji_estuary', '琼玑野'), ('minlin', '珉林'),
               ('lisha_suburb', '璃沙郊'), ('sea_of_clouds', '云来海'), ('chasm', '层岩巨渊'),
               ('chenyu_vale_upper', '沉玉谷·上谷'), ('chenyu_vale_south', '沉玉谷·南陵'),
               ('laixin_mountain', '来歆山')]},
    {'id': 'inazuma', 'name': '稻妻', 'image': '/images/inazuma.jpg', 'sort': 3,
     'areas': [('narukami_island', '鸣神岛'), ('kannazuka', '神无冢'), ('yashiori_island', '八酝岛'),
               ('watatsumi_island', '海祇岛'), ('seirai_island', '清籁岛'), ('tsurumi_island', '鹤观'),
               ('enkanomiya', '渊下宫')]},
    {'id': 'sumeru', 'name': '须弥', 'image': '/images/sumeru.jpg', 'sort': 4,
     'areas': [('avidya_forest', '道成林'), ('lokapala_jungle', '护世森'), ('ardravi_valley', '阿陀河谷'),
               ('asavran_realm', '善见地'), ('vissudha_field', '二净甸'), ('vanarana', '桓那兰那'),
               ('lost_nursery', '失落的苗圃'), ('upper_setekh', '上风蚀地'), ('lower_setekh', '下风蚀地'),
               ('hypostyle_desert', '列柱沙原'), ('desert_of_hadramaveth', '千壑沙地'),
               ('gavireh_lajavard', '荒石苍漠'), ('land_of_lower_setekh', '浮罗囿')]},
    {'id': 'fontaine', 'name': '枫丹', 'image': '/images/fontaine.jpg', 'sort': 5,
     'areas': [('fontaine_court', '枫丹廷区'), ('belleau_region', '白露区'), ('courcel_region', '苍晶区'),
               ('morte_region', '莫尔泰区'), ('eryl_region', '伊黎耶林区'), ('liffey_region', '黎翡区'),
               ('fontaine_research_institute', '枫丹动能工程科学研究院区'),
               ('nostoi_region', '诺思托伊区'), ('sea_of_bygone_eras', '旧日之海')]},
    {'id': 'natlan', 'name': '纳塔', 'image': '/images/natlan.jpg', 'sort': 6,
     'areas': [('teyvat_tezcatepetonco', '坚岩隘谷'), ('teyvat_toyac_springs', '踞石山'),
               ('teyvat_springs_of_flowing', '涌流地'), ('teyvat_basin_of_flames', '万火之瓯'),
               ('teyvat_quahuacan_cliff', '镜璧山'), ('teyvat_wounded_cliff', '翘枝崖'),
               ('teyvat_ochkanatlan', '奥奇卡纳塔'), ('teyvat_atocpan', '安饶之野'),
               ('teyvat_ancient_sacred_mountain', '远古圣山')]},
    {'id': 'nod_krai', 'name': '挪德卡莱', 'image': '/images/nodkrai.jpg', 'sort': 7,
     'areas': [('paha_island', '帕哈岛'), ('hiisi_island', '希汐岛'), ('lempo_island', '伦波岛'),
               ('xuha_wang', '虚海望'), ('zhulang_wilds', '逐浪野'), ('yan_ge_peak', '烟硌山峰'),
               ('du_nan_na_pit', '杜南纳深坑'), ('moon_highland', '月之高地'),
               ('moon_surging_sea', '月荡海'), ('moon_dark_side', '月之暗面')]},
    {'id': 'snezhnaya', 'name': '至冬', 'image': '/images/snezhnaya.jpg', 'sort': 8,
     'areas': [('volkodlak_tundra', '古兽冰原'), ('white_birch_snowgrave', '白桦雪葬地'),
               ('everfrozen_earth', '永凝冻土'), ('flamefeather_valley', '焰羽谷'),
               ('fellfrost_peak', '霜殛寒峰')]},
]

new_regions = []
migrated = []
for ri, reg in enumerate(REGIONS, start=1):
    areas = []
    for si, (aid, aname) in enumerate(reg['areas'], start=1):
        its = items(reg['id'])
        for it in its:
            # 迁移旧 target（按 regionId/areaId/itemId）
            if reg['id'] in snap and aid in snap[reg['id']] and it['id'] in snap[reg['id']]:
                it['target'] = snap[reg['id']][aid][it['id']]
                migrated.append((reg['name'], aname, it['id'], it['target']))
        areas.append({'id': aid, 'name': aname, 'sort': si, 'items': its})
    new_regions.append({
        'id': reg['id'], 'name': reg['name'], 'image': reg['image'], 'sort': ri, 'areas': areas
    })

d['games'][0]['regions'] = new_regions
json.dump(d, open(P, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

print('migrated targets:', len(migrated))
for m in migrated: print(' ', m)
total = sum(len(r['areas']) for r in new_regions)
print('total regions:', len(new_regions), '| total areas:', total)

# 回读校验
d2 = json.load(open(P, encoding='utf-8'))
g = d2['games'][0]
for r in g['regions']:
    print(r['sort'], r['name'], '->', [a['name'] for a in r['areas']])
nat = next(r for r in g['regions'] if r['id'] == 'natlan')
print('natlan items of first area:', [it['name'] for it in nat['areas'][0]['items']])
