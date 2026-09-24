# Data pipeline and limitations

For the separately versioned country/city overlay, see [Earth geography](EARTH.md).
Its map release, coordinates and cartographic boundary policy are independent of
the solar system's frozen ephemeris epoch.

The repository includes a frozen snapshot retrieved on 2026-09-24. It covers
JPL's planetary/Pluto satellite discovery table plus Earth's Moon. It is not a
catalogue of every small-body satellite in the solar system.

## Rebuild the included snapshot

With Python 3.12 or newer:

```sh
python -m venv .venv
# Activate the environment using your operating system's usual command.
pip install -r requirements.txt
python scripts/prepare.py
python scripts/build_data.py
python scripts/build-discovery.py
python scripts/build-physical.py
npm test
```

`prepare.py` parses the saved JPL discovery, physical and elements tables and
maps identifiers using the retained major-body listing. `build_data.py` reads
the raw Horizons responses, PCK/LSK kernels and local source assets, converts
imagery for browser use and emits `data.js`, `data/model.json` and a checksummed
asset manifest. The JSON and browser payload contain identical data.

`build-discovery.py` parses the retained discovery HTML into 460 individually
matched satellite records. `build-physical.py` parses the retained planet and
satellite physical HTML into 55 records. Both use Python's standard library and
retain source-file SHA-256 values. Physical entries preserve table precision,
uncertainty, reference codes and units; Pluto's mass column uses 10^18 kg while
the planet table uses 10^24 kg. Signed rotation periods retain their meaning.

The 32 editorial background summaries in `src/modules/solar-system/profiles.js`
and `moon-profiles.js` link to NASA Science pages and carry a review date. They
are translated into five languages, not represented as official translations.
Other objects receive their own catalogue facts and an explicit statement that
a dedicated background article has not yet been curated. Lack of a curated
paragraph does not imply no scientific literature exists. Data sources and
original catalogue names are never replaced by guessed descriptions.

Discovery dates and physical reference parameters are not all measured at the
scene's frozen epoch. Coordinates and derived speed/distance explicitly refer
to that epoch; imagery and background text may describe different observations.

## Refreshing data is a reviewed operation

The snapshot date and Horizons date range are currently explicit constants in
the scripts. There is no automatic live update. To create a new snapshot, refresh
the source tables, update the shared epoch in both scripts, regenerate queries,
and fetch each vector response with `scripts/fetch.ps1` (PowerShell). Existing
responses are cached: use a separate checkout/data snapshot so old responses are
not silently reused. Review any Horizons error, unmatched ID or changed source
schema before rebuilding. Update the displayed date and count assertions too.

Positions are Sun-centered geometric vectors in km, J2000 ecliptic/ICRF, at one
TDB epoch, without light-time correction. Rotation is the IAU model in generic
PCK pck00011, not dedicated high-precision orientation kernels. Meshes are
reference ellipsoids or mean-radius spheres, not terrain reconstructions.

Missing positions are not placed in space. Missing radii have screen markers
only. Those markers and labels are not physical geometry. Solar illumination
is disabled by design. Historical textures contain their own exposure/shading.

Saturn, Uranus and Neptune use explicitly labelled third-party illustrations
with artist-filled areas and enhanced colours. The original OPAL assets remain
available for comparison. Most older maps lack independently verified longitude
registration. Large black connected regions in selected incomplete maps are
heuristically marked as missing, not scientifically classified pixel masks.
The Sun's EUV map is illustrative on the nominal solar sphere. Saturn's rings
have sourced main radii, while texture details/opacity are not calibrated.

Primary source links are in the UI, manifest and README. Please report any
scientific error as an issue with the supporting source.

## Pluto surface (2017 New Horizons / USGS release)

Pluto now uses the official global LORRI/MVIC grayscale mosaic on its reference
ellipsoid, rather than a placeholder sphere. `data/pluto-source.json` records the
source URL, projection, source and output hashes. The GeoTIFF is 24888×12444 at
300 m/pixel, central longitude 180°E, longitude 0–360°, latitude −90–90°;
USGS describes the latitude as planetographic. Runtime imagery is 4096×2048.
`scripts/build-pluto.py` reproduces the reduction and an independent mask from
GeoTIFF no-data value 0. Missing southern coverage stays neutral gray; it is not
shadow or missing mesh. Resolution varies across the original mosaic. No color,
missing terrain or topographic relief is invented. Default close-up looks toward
180°E, 20°N to present the observed encounter hemisphere, without moving Pluto.
