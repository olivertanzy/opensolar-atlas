# OpenSolar Atlas

A source-attributed solar system atlas for teaching and exploration. Open the
webpage, fly from a true-scale system view to a planet, and inspect where its
geometry, position and appearance came from.

[中文说明](README.zh-CN.md) · [Data methods](docs/DATA.md) · [Asset credits](THIRD_PARTY.md)

![Saturn view](docs/saturn.png)

## What works

- One kilometre per world unit for both body axes and positions; no planet enlargement.
- Searchable snapshot of 471 bodies, including 461 planetary/Pluto satellites.
- Drag, wheel/pinch zoom, fly-to, system views and mobile side panels.
- Offline runtime: no login, API key, telemetry or CDN required.
- Per-body provenance, raw JPL responses and explicit missing-data states.
- Visible distinction between observation-based maps, artistic reconstruction and placeholders.

## Run

Open `index.html` in a modern WebGL browser. Or serve this folder:

```sh
python -m http.server 8000
```

Visit `http://localhost:8000`. Node and Python dependencies are not required to
open the shipped webpage. The interface is currently Chinese; this README is
English and Chinese. Full interface translation is not yet implemented.

## Verify and deploy

```sh
npm ci
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

The build copies an explicit runtime/provenance allowlist to `dist/`. On GitHub,
set Settings → Pages → Source to GitHub Actions. The included workflow validates
the data and browser before deploying pushes to `main`. Pull requests run checks
without deployment. No API credentials are required.

## Scientific boundaries

This is an educational visualization, not a navigation or research-grade model.
The frozen epoch is **2026-09-24 00:00:00 TDB**. The catalogue covers JPL planetary
and Pluto satellites plus the Moon, not all minor-planet satellites. There are
469 available positions, 81 known reference dimensions and 80 rendered bodies;
the rest are explicitly incomplete. Surface elevations and orbital animation
are not implemented. Labels are screen aids, not true-scale objects.

Original maps have different epochs, bands and processing histories. Saturn,
Uranus and Neptune use credited illustrations with artist-filled gaps, not full
observed globes. The Sun uses an EUV false-colour panorama. Most older maps lack
verified longitude registration. Illumination is disabled; historical image
shading may remain. Ring colours and fine details are illustrative.

## Provenance and development

- [JPL satellite catalogue](https://ssd.jpl.nasa.gov/sats/discovery.html)
- [Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [NAIF kernels](https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/)
- [NASA SVS](https://svs.gsfc.nasa.gov/), [Hubble OPAL](https://archive.stsci.edu/hlsp/opal)
- [Solar System Scope](https://www.solarsystemscope.com/textures/)

See `data/asset-manifest.json` for checksums and `docs/DATA.md` for rebuilding.
Development is AI-assisted using Codex. Scientific review and corrections are
welcome; generated code is not evidence of scientific accuracy.

This is an early project. We do not claim established adoption, institutional
endorsement, or a history of third-party maintenance. Near-term priorities are
better map registration, accessible controls and independently reviewed data.

## License

Original code and documentation: MIT. Imagery, datasets and Three.js retain their
own terms; see [THIRD_PARTY.md](THIRD_PARTY.md). The code license does not relicense
third-party assets or imply endorsement by their creators.
