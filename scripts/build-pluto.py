"""Downsample the official georeferenced Pluto mosaic; never inpaint no-data pixels.

Download URL and projection metadata: data/pluto-source.json.
The large source TIFF belongs in ignored test-results/, not in Git.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = root / 'test-results/Pluto_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif'
Image.MAX_IMAGE_PIXELS = 400_000_000
image = Image.open(source)
assert image.size == (24888, 12444) and image.mode == 'L'
assert image.tag_v2[42113] == '0'
assert image.tag_v2[33550][:2] == (300.0, 300.0)
assert image.tag_v2[34736][:2] == (0.0, 180.0)
# Preserve the source no-data mask separately; black terrain is not missing data.
mask = Image.fromarray((np.asarray(image) == 0).astype(np.uint8) * 255)
mask.resize((4096, 2048), Image.Resampling.NEAREST).save(root / 'assets/999-missing.png')
image.resize((4096, 2048), Image.Resampling.LANCZOS).save(root / 'assets/999-global-2017.jpg', quality=94)
outputs = {name: hashlib.sha256((root / 'assets' / name).read_bytes()).hexdigest()
           for name in ['999-global-2017.jpg', '999-missing.png']}
record = dict(
    sourcePage='https://astrogeology.usgs.gov/search/map/pluto_new_horizons_lorri_mvic_global_mosaic_300m',
    nasaPage='https://science.nasa.gov/photojournal/global-mosaics-of-pluto-and-charon/',
    downloadUrl='https://planetarymaps.usgs.gov/mosaic/Pluto_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif',
    credit='NASA / JHUAPL / SwRI / LPI / USGS',
    sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    sourceSize=list(image.size), usedSize=[4096, 2048], sourceNoData=0,
    projection='Simple Cylindrical', latitudeType='Planetographic', longitudeDirection='Positive East',
    centerLongitudeEast=180, longitudeRange=[0, 360], latitudeRange=[-90, 90],
    referenceRadiusKm=1188.3, observation='2015-07', release='2017-07',
    processing='Lanczos downsample, grayscale JPEG; nearest-neighbour source no-data mask. No inpainting, colorization or relief invented.',
    outputs=outputs)
(root / 'data/pluto-source.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
print(json.dumps(outputs))
