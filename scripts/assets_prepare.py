from lxml import html
from pathlib import Path
import json,urllib.parse
root=Path(__file__).resolve().parents[1];d=root/'data';jobs=[]
for fn in ['opal.html','mercury-map.html','moon-map.html','jupiter-map.html']:
 doc=html.fromstring((d/fn).read_text(encoding='utf8'))
 links=[(a.text_content().strip()[:55],a.get('href')) for a in doc.xpath('//a') if a.get('href') and any(x in a.get('href') for x in ['cycle-','png','jpg','tif','fits','readme'])]
 print(fn,links[:50])
files={
 '502':('jupiter','jup2vuu2.jpg'), '503':('jupiter','jup3vuu2.jpg'), '504':('jupiter','jup4vuu2.jpg'),
 '401':('mars','mar1kuu2.jpg'), '402':('mars','mar2kuu2.jpg'), '499':('mars','mar0kuu2.jpg'),
 '299':('venus','ven0auu1.jpg'),
 **{str(600+i):('saturn',f'sat{i}vuu2.jpg') for i in [1,2,3,4,5,8]},
 **{str(700+i):('uranus',f'ura{i}vuu2.jpg') for i in [1,2,3,4,5]},
 '801':('neptune','nep1vuu2.jpg')}
for ident,(planet,filename) in files.items():jobs.append(dict(url='https://space.jpl.nasa.gov/tmaps/pix/'+filename,file='assets/'+ident+'.jpg'))
(d/'texture-files.json').write_text(json.dumps(files),encoding='utf8')
(d/'texture-jobs.json').write_text(json.dumps(jobs),encoding='utf8')
