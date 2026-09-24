# Data pipeline and limitations

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
npm test
```

`prepare.py` parses the saved JPL discovery, physical and elements tables and
maps identifiers using the retained major-body listing. `build_data.py` reads
the raw Horizons responses, PCK/LSK kernels and local source assets, converts
imagery for browser use and emits `data.js`, `data/model.json` and a checksummed
asset manifest. The JSON and browser payload contain identical data.

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
