"""Preserve JPL tabulated values, uncertainties and reference codes without rounding."""
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

class Tables(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows=[]; self.row=None; self.cell=None
    def finish_cell(self):
        if self.cell is not None:
            self.row.append(' '.join(''.join(self.cell).split())); self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag=='tr': self.row=[]
        elif tag=='td' and self.row is not None:
            self.finish_cell(); self.cell=[]
        elif tag=='br' and self.cell is not None: self.cell.append(' ')
    def handle_data(self,value):
        if self.cell is not None: self.cell.append(value)
    def handle_endtag(self,tag):
        if tag=='td': self.finish_cell()
        elif tag=='tr' and self.row is not None:
            self.finish_cell(); self.rows.append(self.row); self.row=None

catalog=json.loads((ROOT/'data/catalog.json').read_text(encoding='utf-8'))
by_name={body['name']:body for body in catalog}
ids={body['id'] for body in catalog}
records={}; hashes={}
planet_fields=[('equatorialRadius','km'),('radius','km'),('mass','×10²⁴ kg'),('density','g/cm³'),('rotationPeriod','d'),('orbitalPeriod','y'),('magnitude','mag'),('albedo',''),('gravity','m/s²'),('escapeSpeed','km/s')]
for file in ['planet-physical.html','sat-physical.html']:
    raw=(ROOT/'data'/file).read_bytes(); hashes[file]=hashlib.sha256(raw).hexdigest()
    table=Tables(); table.feed(raw.decode('utf-8'))
    for row in table.rows:
        if file.startswith('planet') and len(row)==11 and row[0] in by_name:
            body=by_name[row[0]]; values=[]
            for (key,unit),value in zip(planet_fields,row[1:]):
                if key=='mass' and body['kind']=='dwarf': unit='×10¹⁸ kg'
                values.append(dict(key=key,value=value or None,unit=unit))
            records[body['id']]=dict(source='https://ssd.jpl.nasa.gov/planets/phys_par.html',values=values)
        elif file.startswith('sat') and len(row)==12 and row[2] in ids:
            values=[]
            for offset,key,unit in [(3,'gm','km³/s²'),(6,'radius','km'),(9,'density','g/cm³')]:
                value,sigma,reference=row[offset:offset+3]
                valid=value not in ['', '-', '—']
                text=value+(' ± '+sigma if sigma not in ['', '-', '—'] else '')+(' ['+reference+']' if reference else '')
                values.append(dict(key=key,value=text if valid else None,unit=unit))
            records[row[2]]=dict(source='https://ssd.jpl.nasa.gov/sats/phys_par/',values=values)
assert '399' in records and '301' in records
assert records['999']['values'][2]['unit']=='×10¹⁸ kg'
result=dict(snapshot='2026-09-24',sourceHashes=hashes,records=records)
(ROOT/'data/physical-records.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Physical parameter records:',len(records))
