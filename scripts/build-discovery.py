"""Extract discovery records from the existing JPL snapshot, without changing its epoch."""
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.row = []
        elif tag == 'td' and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag == 'td' and self.cell is not None:
            self.row.append(' '.join(''.join(self.cell).split()))
            self.cell = None
        elif tag == 'tr' and self.row is not None:
            if len(self.row) == 6:
                self.rows.append(self.row)
            self.row = None

raw = (ROOT / 'data/discovery.html').read_bytes()
parser = TableParser()
parser.feed(raw.decode('utf-8'))
normalize = lambda value: re.sub(r'\s+', '', value).lower()
lookup = {}
for row in parser.rows:
    for name in [row[1], row[2]]:
        if name:
            lookup[normalize(name)] = row
records = {}
catalog = json.loads((ROOT / 'data/catalog.json').read_text(encoding='utf-8'))
for ordinal, body in enumerate(catalog):
    if body['kind'] != 'moon' or body['id'] == '301':
        continue
    row = lookup.get(normalize(body['name'])) or lookup.get(normalize(body.get('designation', '')))
    if row is None:
        raise ValueError('No discovery row for ' + body['name'])
    records[body['id'] or 'unresolved-' + str(ordinal)] = dict(
        iauNumber=row[0], officialName=row[1], designation=row[2], year=row[3],
        discoverers=row[4], references=row[5],
        source='https://ssd.jpl.nasa.gov/sats/discovery.html',
    )
assert len(records) == 460, len(records)
result = dict(snapshot='2026-09-24', sourceSha256=hashlib.sha256(raw).hexdigest(), records=records)
(ROOT / 'data/discovery-records.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('Verified discovery records:', len(records))
