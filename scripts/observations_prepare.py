from pathlib import Path
from lxml import html
import json,urllib.parse
root=Path(__file__).resolve().parents[1];d=root/'data';jobs=[];sources={}
for name,ident in [('jupiter','599'),('saturn','699'),('uranus','799'),('neptune','899')]:
 doc=html.fromstring((d/f'opal-{name}.html').read_text(encoding='utf8'))
 for a in doc.xpath('//a[@href]'):
  text=a.text_content().strip();url=a.get('href')
  if text=='Download README':jobs.append(dict(url=url,file=f'data/opal-{name}-readme.txt'))
  if text=='RotA Color Preview':
   jobs.append(dict(url=url,file=f'assets/{ident}-original.tif'));sources[ident]=dict(url=url,page=f'https://archive.stsci.edu/hlsp/opal/opal-{name}-cycle-28')
for ident,fn,match,base in [('399','earth-map.html','bluemarble-2048.png','https://svs.gsfc.nasa.gov'),('301','moon-map.html','lroc_color_2k.jpg','https://svs.gsfc.nasa.gov'),('199','mercury-map.html','PIA12397.jpg','https://science.nasa.gov')]:
 doc=html.fromstring((d/fn).read_text(encoding='utf8'))
 urls=[urllib.parse.urljoin(base,a.get('href')) for a in doc.xpath('//a[@href]') if match in a.get('href')]
 if urls:
  url=urls[0];jobs.append(dict(url=url,file=f'assets/{ident}-original.'+url.split('.')[-1]));sources[ident]=dict(url=url,page={'399':'https://svs.gsfc.nasa.gov/2915/','301':'https://svs.gsfc.nasa.gov/4720/','199':'https://science.nasa.gov/photojournal/full-global-mercury-mosaic/'}[ident])
doc=html.fromstring((d/'io-usgs.html').read_text(encoding='utf8'))
url=next(a.get('href') for a in doc.xpath('//a[@href]') if a.text_content().strip()=='full image')
jobs.append(dict(url=url,file='assets/501-original.jpg'));sources['501']=dict(url=url,page='https://astrogeology.usgs.gov/search/map/io_galileo_ssi_global_color_merge_mosaic_1km')
(d/'observation-jobs.json').write_text(json.dumps(jobs),encoding='utf8');(d/'observation-sources.json').write_text(json.dumps(sources),encoding='utf8')
