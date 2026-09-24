"""从保存的 JPL 表格生成名录与 Horizons 查询；不推断缺失的物理数据。"""
from pathlib import Path
from lxml import html
import json,re,urllib.parse
ROOT=Path(__file__).resolve().parents[1]; D=ROOT/'data'
def rows(name):
 return [[re.sub(r'\s+',' ',c.text_content()).strip() for c in tr.xpath('./th|./td')] for tr in html.fromstring((D/name).read_text(encoding='utf8')).xpath('//table[1]//tr')]
def norm(s):return re.sub(r'[^a-z0-9]','',s.lower())
def num(s):
 try:return float(s.replace(',','').split()[0])
 except:return None
elements=rows('sat-elements.html'); physical=rows('sat-physical.html')
print('EXAMPLE ELEMENT',elements[1]);print('EXAMPLE PHYSICAL',physical[2])
index={norm(r[2]):r for r in elements[1:] if len(r)>7}
phys={r[2]:r for r in physical[2:] if len(r)>7}
major=json.loads((D/'major-bodies.json').read_text())['result']
aliases={}
for line in major.splitlines():
 if re.match(r'\s+\d+\s',line):
  ident=line[:9].strip()
  for name in [line[11:45].strip(),*line[45:].split()]:
   if name:aliases[norm(name)]=ident
parent_ids={'Earth':'399','Mars':'499','Jupiter':'599','Saturn':'699','Uranus':'799','Neptune':'899','Pluto':'999'}
moons=[dict(name='Moon',parent='399',id='301',designation='',discovered='史前')]
parent=None
for r in rows('discovery.html')[1:]:
 if len(r)==1:
  m=re.search(r'Satellites of\s+(\w+)',r[0]);parent=parent_ids.get(m[1], '999') if m else parent
 elif len(r)>=6:
  name=r[1] or r[2];key=norm(name);e=index.get(key) or index.get(norm(r[2]));ident=e[3] if e else aliases.get(key) or aliases.get(norm(r[2]))
  moons.append(dict(name=name,parent=parent,id=ident,designation=r[2],discovered=r[3]))
for m in moons:
 p=phys.get(m['id']);m['radiusKm']=num(p[6]) if p else None;m['radiusSigmaKm']=num(p[7]) if p else None
 m['radiusSource']='https://ssd.jpl.nasa.gov/sats/phys_par/' if p else None
 e=index.get(norm(m['name'])) or index.get(norm(m['designation']))
 m['meanOrbitKm']=num(e[7]) if e else None
 m['catalogSource']='https://ssd.jpl.nasa.gov/sats/discovery.html' if m['id']!='301' else 'https://ssd.jpl.nasa.gov/sats/phys_par/'
planets=[]
for ident,name in [('10','Sun'),('199','Mercury'),('299','Venus'),('399','Earth'),('499','Mars'),('599','Jupiter'),('699','Saturn'),('799','Uranus'),('899','Neptune'),('999','Pluto')]:
 planets.append(dict(id=ident,name=name,parent=None,kind='star' if ident=='10' else 'dwarf' if ident=='999' else 'planet'))
allb=planets+[dict(m,kind='moon') for m in moons]
(D/'catalog.json').write_text(json.dumps(allb,ensure_ascii=False,indent=2),encoding='utf8')
jobs=[]
for b in allb:
 if not b['id']:continue
 params=dict(format='json',COMMAND="'"+b['id']+"'",OBJ_DATA="'YES'",MAKE_EPHEM="'YES'",EPHEM_TYPE="'VECTORS'",CENTER="'500@10'",START_TIME="'2026-09-24 00:00'",STOP_TIME="'2026-09-24 00:01'",STEP_SIZE="'1 m'",REF_PLANE="'ECLIPTIC'",REF_SYSTEM="'ICRF'",VEC_TABLE="'2'",VEC_CORR="'NONE'",OUT_UNITS="'KM-S'",CSV_FORMAT="'YES'",VEC_LABELS="'YES'")
 jobs.append(dict(url='https://ssd.jpl.nasa.gov/api/horizons.api?'+urllib.parse.urlencode(params),file='data/horizons/'+b['id']+'.json'))
(D/'vector-jobs.json').write_text(json.dumps(jobs),encoding='utf8')
print('Bodies',len(allb),'moons',len(moons),'matched',sum(bool(m['id']) for m in moons),'sizes',sum(bool(m['radiusKm']) for m in moons))
print('Missing IDs',[(m['name'],m['parent']) for m in moons if not m['id']])

