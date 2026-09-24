"""保留科学数值、资料出处与缺项；只做图片格式转换，不生成表面细节。"""
from pathlib import Path
import json,sys,re,base64,io,hashlib,csv
import numpy as np
from PIL import Image
from lxml import html
ROOT=Path(__file__).resolve().parents[1];D=ROOT/'data'
sys.path.insert(0,str(ROOT/'vendor/python'))
import spiceypy as spice
spice.furnsh(str(D/'pck00011.tpc'));spice.furnsh(str(D/'naif0012.tls'))
ET=spice.str2et('2026-09-24 00:00:00 TDB')
catalog=json.loads((D/'catalog.json').read_text(encoding='utf8'))
names={'Sun':'太阳','Mercury':'水星','Venus':'金星','Earth':'地球','Mars':'火星','Jupiter':'木星','Saturn':'土星','Uranus':'天王星','Neptune':'海王星','Pluto':'冥王星','Moon':'月球','Phobos':'火卫一','Deimos':'火卫二','Io':'木卫一','Europa':'木卫二','Ganymede':'木卫三','Callisto':'木卫四','Mimas':'土卫一','Enceladus':'土卫二','Tethys':'土卫三','Dione':'土卫四','Rhea':'土卫五','Titan':'土卫六','Hyperion':'土卫七','Iapetus':'土卫八','Phoebe':'土卫九','Ariel':'天卫一','Umbriel':'天卫二','Titania':'天卫三','Oberon':'天卫四','Miranda':'天卫五','Triton':'海卫一','Charon':'冥卫一'}
texture_files=json.loads((D/'texture-files.json').read_text())
sources=json.loads((D/'observation-sources.json').read_text())
textures={};manifest=[]
def encode(ident,path,crop=None):
 image=Image.open(path).convert('RGB')
 if crop:image=image.crop(crop)
 image.thumbnail((4096,2048),Image.Resampling.LANCZOS)
 buf=io.BytesIO();image.save(buf,format='JPEG',quality=94)
 textures[ident]='data:image/jpeg;base64,'+base64.b64encode(buf.getvalue()).decode()
 manifest.append(dict(id=ident,file=path.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),originalSize=Image.open(path).size,usedSize=image.size,crop=crop))
for ident in texture_files:
 path=ROOT/'assets'/f'{ident}.jpg'
 if path.exists():encode(ident,path)
for ident in sources:
 paths=list((ROOT/'assets').glob(ident+'-original.*'))
 if paths:encode(ident,paths[0])
# 官方缩略图左右含深色边框，球面首尾相接后会成为贯穿两极的黑线。
# 仅裁掉边框；保留原文件并在资产清单记录裁切，不绘制或填充地形。
encode('199',ROOT/'assets/199-global-2013.jpg',(1,0,1022,513))
encode('10',ROOT/'assets/10-original.tif')
encode('699',ROOT/'assets/699-illustration.jpg')
for ident in ['799','899']:encode(ident,ROOT/f'assets/{ident}-illustration.jpg')
# 土卫六图中已经印有经纬线坐标，裁去边框；不补齐灰色缺测区。
if (ROOT/'assets/606-original.jpg').exists():
 encode('606',ROOT/'assets/606-original.jpg',(36,40,776,410))
 sources['606']=dict(page='https://science.nasa.gov/resource/titan-global-map-june-2015/',url='https://assets.science.nasa.gov/dynamicimage/assets/science/psd/solar/2023/09/p/i/a/PIA19658-1.jpg?w=800&h=444&fit=clip&crop=faces%2Cfocalpoint')
# 2017 USGS GeoTIFF has a verified global Simple Cylindrical projection.
encode('999',ROOT/'assets/999-global-2017.jpg')
pluto_image=None
if (ROOT/'assets/999-original.jpg').exists():
 image=Image.open(ROOT/'assets/999-original.jpg');buf=io.BytesIO();image.save(buf,format='JPEG');pluto_image='data:image/jpeg;base64,'+base64.b64encode(buf.getvalue()).decode()
for ordinal,b in enumerate(catalog):
 ident=b['id'];b['key']=ident or 'unresolved-'+str(ordinal);b['zh']=names.get(b['name'],b['name']);b['positionKm']=None;b['state']='no-id' if not ident else 'not-fetched'
 f=D/'horizons'/f'{ident}.json'
 if f.exists():
  response=json.loads(f.read_text(encoding='utf8'));text=response.get('result','')
  match=re.search(r'\$\$SOE\s*\n(.*?)\n\$\$EOE',text,re.S)
  if match:
   row=next(csv.reader([match[1].strip().splitlines()[0]]));b['jdTdb']=float(row[0]);b['positionKm']=[float(x) for x in row[2:5]];b['velocityKmS']=[float(x) for x in row[5:8]];b['state']='ephemeris'
  else:b['state']='no-ephemeris';b['ephemerisError']=response.get('error',text[:350])
  b['ephemerisSource']='data/horizons/'+str(ident)+'.json'
 try:
  axes=spice.bodvrd(b['name'].upper(),'RADII',3)[1].tolist();b['axesKm']=axes;b['shape']='reference-ellipsoid';b['shapeSource']='https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc'
 except Exception:
  b['axesKm']=[b['radiusKm']]*3 if b.get('radiusKm') else None;b['shape']='mean-radius-sphere' if b['axesKm'] else 'no-size';b['shapeSource']=b.get('radiusSource')
 if ident=='10':b['axesKm']=[695700.0]*3;b['shape']='nominal-sphere';b['shapeSource']='https://iauarchive.eso.org/static/resolutions/IAU2015_English.pdf'
 try:b['rotation']=spice.pxform('IAU_'+b['name'].upper(),'ECLIPJ2000',ET).tolist()
 except Exception:b['rotation']=None
 b['texture']=ident if ident in textures else None;b['textureCenterEast']=180;b['textureLatitude']='centric';b['registration']='未核验经度零点；只用于外观示意，不用于地物定位'
 b['appearance']='无已接入的可靠表面地图；按已有尺寸绘制中性灰色完整参考形状；颜色及网格仅为占位标识，不代表真实外观。'
 b['appearanceType']='无纹理占位'
 if ident in texture_files:
  planet,_=texture_files[ident];b['textureSource']='https://space.jpl.nasa.gov/tmaps/'+planet+'.html';b['appearanceType']='观测拼接 · 灰度'
  b['appearance']='JPL/USGS 发布的历史探测器拼接图。保留原始空白区域；分辨率和覆盖不均，不恢复缺测细节。JPL 明确不建议用于科学影像分析。'
 if ident in sources:
  b['textureSource']=sources[ident]['page']
 if ident in ['599','699','799','899']:
  b['textureLatitude']='graphic';b['registration']='按 OPAL README：左缘 0°E（等价于360°W），向右东经增加；行星面纬度。历史云图不代表星历时刻的天气。'
  b['appearanceType']='Hubble OPAL · 增强色'
  b['appearance']='哈勃 WFC3/UVIS 观测；使用归档方提供的多波段颜色预览，经过临边校正与对比度处理。黑色是原图缺测区，不是地表。图中云系不是2026年的实况。'
  b['observation']='2020-10-08/09' if ident=='799' else {'599':'2021-09-04','699':'2021-09-12/13','899':'2021-09-06/08'}[ident]
 if ident=='399':
  b['appearanceType']='NASA Blue Marble · 合成图';b['textureCenterEast']=0;b['textureLatitude']='graphic';b['registration']='标准等距经纬图，中央经线0°，北朝上。';b['appearance']='NASA 卫星观测合成的无云地表地图，不是同一瞬间的照片；未添加虚构云层和夜间灯光。'
 if ident=='301':
  b['appearanceType']='LRO · 处理后颜色';b['textureCenterEast']=0;b['registration']='NASA 标明中央经线0°，LRO 球面参考半径1737.4 km。';b['appearance']='NASA 2025 CGI 月球图：LROC 多波段合成并调整曝光、白平衡；极区使用低分辨率激光反照率补充，少量缺点由原制作者修补。属于观测衍生可视化，不是原始科学影像。';b['observation']='2025版；多期LRO观测'
 if ident=='199':
  b['appearanceType']='MESSENGER / Mariner 10 · 灰度';b['appearance']='NASA PIA12397：2009 年发布，使用 MESSENGER 三次飞掠和 Mariner 10 影像，原始覆盖97.7%；这里使用官方低分辨率预览。黑色缺测区保持不补画。';b['observation']='1974–1975、2008–2009'
 if ident=='501':
  b['appearanceType']='Galileo / Voyager · 假彩色';b['appearance']='USGS 木卫一全球拼接图，使用紫、绿、近红外数据合成假彩色；人眼颜色会更柔和。使用官方1024像素预览，未生成额外地形。';b['textureCenterEast']=0;b['registration']='USGS 元数据：简单圆柱投影，行星心纬度，经度范围−180°至180°，正西经；左右方向尚未独立配准。'
 if ident=='299':
  b['appearanceType']='Magellan · 雷达地表';b['appearance']='这张图是 Magellan 雷达后向散射拼接，不是可见光照片。显示的是云层下面的地表；从太空肉眼不能看到这些纹理。'
 if ident=='499':b['appearanceType']='Viking · 观测拼接';b['appearance']='JPL/USGS 发布的 Viking 历史影像拼接。色彩和地形阴影属于影像产品，不是当前天气或数字高程。'
 if ident=='606':
  b['appearanceType']='Cassini ISS · 938nm近红外';b['appearance']='NASA PIA19658，2015版，观测截至2014-04；938nm近红外穿透部分霾层的地表反照率图，不是肉眼看到的橙色云层。灰色区域保留约3–5%的原始缺测区。';b['registration']='裁切图框[36,40,776,410]；标尺左360°W、右0°W，上90°N、下90°S。';b['observation']='2004–2014'
 if ident=='999':
  b['referenceImage']=pluto_image;b['textureSource']='https://astrogeology.usgs.gov/search/map/pluto_new_horizons_lorri_mvic_global_mosaic_300m';b['appearanceType']='New Horizons / USGS · 2017全球灰度拼接';b['textureLatitude']='graphic';b['textureCenterEast']=180;b['observation']='2015-07；2017-07发布';b['registration']='官方GeoTIFF简单圆柱投影，北朝上，正东经0°至360°，纬度−90°至90°，中央经线180°；球面参考半径1188.3 km。';b['appearance']='NASA New Horizons LORRI/MVIC 观测，USGS发布的2017年全球灰度拼接。原始24888×12444，网页4096×2048；空间分辨率不均。南极附近未观测区域以中性灰色标注，不补画；不是彩色照片或三维高程重建。'
 if ident=='10':b['appearanceType']='名义光球 · 无表面纹理';b['appearance']='使用 IAU 2015 名义太阳半径695700 km。白色球体仅表示光球边界，不绘制没有对应观测依据的黑子、耀斑或日冕。'
 if ident=='199':
  b['textureSource']='https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m';b['textureCenterEast']=0;b['appearanceType']='MESSENGER · 全球灰度拼接';b['observation']='2013年5月版'
  b['appearance']='MESSENGER Team / ASU / USGS：2013 全球灰度地图，极区及原有缺口使用其他实际观测补齐，产品标称全球覆盖。网页采用官方1024像素预览，原始250米/像素数据不等于本预览分辨率。仅裁去左右共3列深色图框，避免球面连接处出现人为黑线；不补画地形。';b['registration']='USGS 元数据：简单圆柱投影，中央经线0°，行星心纬度，正东经，纬度−90°至90°。预览边框裁切后用于外观展示，不用于精密地物定位。'
 if ident=='10':
  b['textureSource']='https://svs.gsfc.nasa.gov/30362';b['appearanceType']='NASA STEREO / SDO · 极紫外假彩色';b['observation']='2012系列的官方静态配图；2013发布'
  b['appearance']='NASA JPL：STEREO A/B 与 SDO 联合的304埃（30.4nm）太阳全景观测可视化，主要显示色球层活动。橙红色为极紫外假彩色，不是肉眼颜色；不是2026年实况。不额外生成耀斑或日冕。投影到名义太阳球面作为外观参考，不代表色球层精确高度。';b['registration']='官方 Carrington 全景配图归一化到球面；未核验该静帧时间及经度零点，不用于太阳活动区定位。'
 if ident in ['699','799','899']:
  b['appearanceType']='科普效果图 · 含作者补绘';b['textureSource']='https://www.solarsystemscope.com/textures/';b['textureLatitude']='centric';b['textureCenterEast']=0;b['observation']='Solar System Scope，2014版；不是特定日期实况'
  b['appearance']='Solar System Scope / INOVE，CC BY 4.0：基于 NASA 影像制作并调色的科普效果图；作者对缺测区域有虚构补绘，不是完整观测地图。本网页仅重新编码贴图，不新增云层细节。旧 OPAL 观测图仍保留在原始资料中。';b['registration']='仅用于云带外观展示，不声称云团经纬位置准确。颜色经过增强，不作为精确自然色依据。'
  if ident=='699':b['registration']+=' 主环几何采用 NASA D/C/B/A 范围；环颜色、细条纹、透明度为科普纹理，未进行逐条测量配准。'
 b['geometryNote']='参考椭球，不含高程起伏；半轴来自SPICE PCK。小型不规则卫星的椭球也不是精确形状重建。' if b['shape']=='reference-ellipsoid' else '仅有平均半径，以等体积球近似；不声称真实形状。' if b['shape']=='mean-radius-sphere' else '缺少已核验尺寸，只绘制固定屏幕大小的定位标记，不赋予虚构物理半径。'
 if not b['rotation']:b['geometryNote']+=' 未取得IAU姿态模型，不展示自转或精确朝向。'
 if b['shape']=='nominal-sphere':b['geometryNote']='IAU 2015 名义太阳半径定义的球面，不包含光球随时间变化的细节。'
summary=dict(catalog=len(catalog),moons=sum(b['kind']=='moon' for b in catalog),positions=sum(b['positionKm'] is not None for b in catalog),sizes=sum(b['axesKm'] is not None for b in catalog),textures=len(textures),unresolved=[b['name'] for b in catalog if b['positionKm'] is None])
payload=dict(epoch='2026-09-24 00:00:00 TDB',frame='ECLIPJ2000 / ICRF，太阳中心，几何位置，无光行时修正',retrieved='2026-09-24',auKm=149597870.7,summary=summary,bodies=catalog,textures=textures)
payload['saturnRing']='data:image/png;base64,'+base64.b64encode((ROOT/'assets/saturn-ring.png').read_bytes()).decode()
manifest.append(dict(id='saturn-ring',file='assets/saturn-ring.png',sha256=hashlib.sha256((ROOT/'assets/saturn-ring.png').read_bytes()).hexdigest(),author='Solar System Scope / INOVE',license='https://creativecommons.org/licenses/by/4.0/',sourcePage='https://www.solarsystemscope.com/textures/',downloadUrl='https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png'))
# 只标记已知不完整地图中的大块近黑连通区，避免把零散深色地形变成灰色碎洞。
from collections import deque
payload['missingMasks']={}
for ident in ['599','701','702','703','704','705','801']:
 if ident not in textures:continue
 im=Image.open(io.BytesIO(base64.b64decode(textures[ident].split(',')[1]))).convert('RGB').resize((512,256),Image.Resampling.BOX)
 arr=np.asarray(im);candidate=arr.max(axis=2)<6;visited=np.zeros((256,512),bool);mask=np.zeros((256,512),np.uint8)
 for y,x in zip(*np.where(candidate)):
  if visited[y,x]:continue
  component=[];queue=deque([(int(y),int(x))]);visited[y,x]=True
  while queue:
   cy,cx=queue.popleft();component.append((cy,cx))
   for ny,nx in [(cy-1,cx),(cy+1,cx),(cy,(cx-1)%512),(cy,(cx+1)%512)]:
    if 0<=ny<256 and candidate[ny,nx] and not visited[ny,nx]:visited[ny,nx]=True;queue.append((ny,nx))
  if len(component)>512*256*.005:
   for cy,cx in component:mask[cy,cx]=255
 buf=io.BytesIO();Image.fromarray(mask).save(buf,format='PNG');payload['missingMasks'][ident]='data:image/png;base64,'+base64.b64encode(buf.getvalue()).decode()
payload['missingMasks']['999']='data:image/png;base64,'+base64.b64encode((ROOT/'assets/999-missing.png').read_bytes()).decode()
(D/'model.json').write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':')),encoding='utf8')
(ROOT/'data.js').write_text('window.SOLAR_DATA='+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+';',encoding='utf8')
for asset in manifest:
 body=next((b for b in catalog if b['id']==asset['id']),{})
 asset['sourcePage']=asset.get('sourcePage') or body.get('textureSource')
 if '-original.' in asset['file'] and asset['id'] in sources:
  asset['sourcePage']=sources[asset['id']]['page'];asset['downloadUrl']=sources[asset['id']]['url']
 if asset['id'] in texture_files and asset['file']==f"assets/{asset['id']}.jpg":
  planet,filename=texture_files[asset['id']];asset['sourcePage']=f'https://space.jpl.nasa.gov/tmaps/{planet}.html';asset['downloadUrl']='https://space.jpl.nasa.gov/tmaps/pix/'+filename
 if asset['file']=='assets/699-illustration.jpg':asset.update(author='Solar System Scope / INOVE',license='https://creativecommons.org/licenses/by/4.0/',downloadUrl='https://upload.wikimedia.org/wikipedia/commons/e/ea/Solarsystemscope_texture_2k_saturn.jpg')
 if asset['file']=='assets/799-illustration.jpg':asset.update(author='Solar System Scope / INOVE',license='https://creativecommons.org/licenses/by/4.0/',downloadUrl='https://upload.wikimedia.org/wikipedia/commons/9/95/Solarsystemscope_texture_2k_uranus.jpg')
 if asset['file']=='assets/899-illustration.jpg':asset.update(author='Solar System Scope / INOVE',license='https://creativecommons.org/licenses/by/4.0/',downloadUrl='https://www.solarsystemscope.com/textures/download/2k_neptune.jpg')
 if asset['file']=='assets/10-original.tif':asset['downloadUrl']='https://svs.gsfc.nasa.gov/vis/a030000/a030300/a030362/euvi_aia304_2012_carrington.tif'
 if asset['file']=='assets/199-global-2013.jpg':asset['downloadUrl']='https://astrogeology.usgs.gov/ckan/dataset/279e5d50-ff2f-4250-bde3-bb510096079e/resource/2b5865c2-bd0d-4962-bdb0-c12f0502def1/download/mercury_messenger_mosaic_global_1024.jpg'
pluto_source=json.loads((D/'pluto-source.json').read_text())
for asset in manifest:
 if asset['file']=='assets/999-global-2017.jpg':asset.update(downloadUrl=pluto_source['downloadUrl'],credit=pluto_source['credit'],processing=pluto_source['processing'])
manifest.append(dict(id='999-mask',file='assets/999-missing.png',sha256=pluto_source['outputs']['999-missing.png'],sourcePage=pluto_source['sourcePage'],processing='Source GeoTIFF no-data=0, nearest-neighbour reduction.'))
(D/'asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(summary,ensure_ascii=False))
