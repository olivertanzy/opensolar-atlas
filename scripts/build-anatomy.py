"""Convert official BodyParts3D v4.0 reduced OBJ elements to local, indexed GLBs.

Python standard library only. See src/modules/human-anatomy/README.md for input
downloads, current provider license, coordinates and coverage limitations.
"""
import csv
import hashlib
import json
import re
import struct
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / 'src/modules/human-anatomy'
INPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'test-results/anatomy-download'
OUTPUT = MODULE / 'assets'
OUTPUT.mkdir(exist_ok=True)
ATTRIBUTION = 'BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International'


def elements(tree):
    result = defaultdict(set)
    with (MODULE / 'sources' / f'{tree}_element_parts.txt').open(encoding='utf-8') as f:
        for row in csv.DictReader(f, delimiter='\t'):
            result[row['concept id']].add(row['element file id'])
    return result


def convert(layer, archive, ids):
    tree = archive.name.split('_')[0]
    memberships = elements(tree)
    with (MODULE / 'sources' / f'{tree}_parts_list_e.txt').open(encoding='utf-8') as f:
        names = {r['concept id']: r['en'] for r in csv.DictReader(f, delimiter='\t')}
    binary = bytearray()
    doc = {'asset': {'version': '2.0', 'generator': 'OpenSolar Atlas build-anatomy.py',
                     'copyright': ATTRIBUTION},
           'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [],
           'buffers': [], 'bufferViews': [], 'accessors': []}
    catalog = []

    def accessor(values, fmt, component, kind, target, bounds=None):
        while len(binary) % 4:
            binary.append(0)
        offset = len(binary)
        binary.extend(struct.pack('<' + fmt * len(values), *values))
        view = len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(binary)-offset, 'target': target})
        result = {'bufferView': view, 'componentType': component,
                  'count': len(values)//(3 if kind == 'VEC3' else 1), 'type': kind}
        if bounds:
            result.update(min=bounds[0], max=bounds[1])
        doc['accessors'].append(result)
        return len(doc['accessors'])-1

    with zipfile.ZipFile(archive) as z:
        paths = {Path(n).stem: n for n in z.namelist() if n.endswith('.obj')}
        assert ids <= paths.keys(), f'Missing elements: {ids-paths.keys()}'
        for element in sorted(ids):
            raw = z.read(paths[element])
            text = raw.decode('utf-8')
            name_match = re.search(r'# English name : ([^\r\n]+)', text)
            fma_match = re.search(r'# Concept ID : ([^\r\n]+)', text)
            inferred = not (name_match and fma_match)
            fma = fma_match[1].strip() if fma_match else min(
                (key for key, values in memberships.items() if element in values),
                key=lambda key: (len(memberships[key]), key))
            name = name_match[1].strip() if name_match else names[fma] + ' / ' + element
            vertices, indices = [], []
            for line in text.splitlines():
                if line.startswith('v '):
                    x, y, zz = map(float, line.split()[1:4])
                    # Right-handed rotation: source X left, Y posterior, Z superior.
                    # World X left, Y superior, Z anterior; mm -> m. No deformation.
                    vertices.extend((x/1000, zz/1000, -y/1000))
                elif line.startswith('f '):
                    face = [int(v.split('/')[0])-1 for v in line.split()[1:]]
                    assert min(face) >= 0
                    for i in range(1, len(face)-1):
                        indices.extend((face[0], face[i], face[i+1]))
            assert vertices and indices and max(indices) < len(vertices)//3
            minimum = [min(vertices[c::3]) for c in range(3)]
            maximum = [max(vertices[c::3]) for c in range(3)]
            pos = accessor(vertices, 'f', 5126, 'VEC3', 34962, (minimum, maximum))
            index = accessor(indices, 'I', 5125, 'SCALAR', 34963)
            record = {'id': element, 'fma': fma, 'name': name, 'layer': layer, 'parentLabel': inferred,
                      'bounds': [minimum, maximum], 'triangles': len(indices)//3,
                      'sourceSha256': hashlib.sha256(raw).hexdigest()}
            catalog.append(record)
            doc['nodes'].append({'name': element, 'mesh': len(doc['meshes']),
                                 'extras': {'partId': element, 'fma': fma, 'layer': layer}})
            doc['scenes'][0]['nodes'].append(len(doc['nodes'])-1)
            doc['meshes'].append({'primitives': [{'attributes': {'POSITION': pos}, 'indices': index}]})
    while len(binary) % 4:
        binary.append(0)
    doc['buffers'].append({'byteLength': len(binary)})
    encoded = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
    encoded += b' ' * (-len(encoded) % 4)
    glb = struct.pack('<III', 0x46546C67, 2, 28+len(encoded)+len(binary))
    glb += struct.pack('<II', len(encoded), 0x4E4F534A)+encoded
    glb += struct.pack('<II', len(binary), 0x004E4942)+binary
    (OUTPUT / f'{layer}.glb').write_bytes(glb)
    print(layer, len(catalog), 'elements,', len(glb), 'bytes', flush=True)
    return catalog


isa = elements('isa')
layers = {
    'skeleton': ('isa', isa['FMA5018'] | isa['FMA12516'] | isa['FMA7591']),
    'arteries': ('isa', isa['FMA50720']),
    'veins': ('isa', isa['FMA50723']),
    'nerves': ('isa', isa['FMA55676'] | isa['FMA65132'] | isa['FMA45638']),
    'surface': ('isa', isa['FMA7163']),
}
catalog = []
for layer, (tree, ids) in layers.items():
    assert ids
    catalog.extend(convert(layer, INPUT / f'{tree}_BP3D_4.0_obj_99.zip', ids))
(OUTPUT / 'catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8')
evidence = {'provider': ATTRIBUTION, 'version': '4.0 / 20130619 / 99% reduction',
            'license': 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html',
            'transformation': '(x, y, z) mm -> (x, z, -y) / 1000 m',
            'inputs': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                       for p in [INPUT / 'isa_BP3D_4.0_obj_99.zip']},
            'outputs': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                        for p in sorted(OUTPUT.glob('*.glb'))}}
(OUTPUT / 'provenance.json').write_text(json.dumps(evidence, indent=2, ensure_ascii=False)+'\n', encoding='utf-8')
