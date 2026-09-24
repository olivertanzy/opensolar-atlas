# Third-party attribution and reuse

## Female anatomy / HRA–HuBMAP

`src/modules/human-anatomy/assets/female/` derives from **Browne, Kristen, and
Heidi Schlehlein. 2026. 3D Reference Organ Set for Female, v1.10.**
[Dataset and citation](https://doi.org/10.48539/HBM637.DWBM.744), licensed under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Official metadata and ontology crosswalk are preserved in the module's `sources/`.
Changes: selected skeletal/vascular/neural/skin nodes extracted, hierarchy baked,
translation in metres, exact coincident vertices welded, surfaces simplified,
materials replaced and normals recomputed. Source and derivative hashes are in
`assets/female/provenance.json`; the module README documents reproduction.
No endorsement is implied. HRA organ registrations include the Allen brain
reference; not all organs were measured from one individual, and not all atlas
differences represent sex differences.

## Human anatomy / BodyParts3D

`src/modules/human-anatomy/assets/*.glb` and source-derived catalog data use
**BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International**.
The [provider's current license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)
was updated on 2025-02-27. Original 2013 OBJ comments retain the previous
CC BY-SA 2.1 Japan notice; the provider's updated database license is recorded in
the module's saved README evidence. Code remains MIT; third-party meshes remain
CC BY 4.0. Converted from v4.0 / 20130619 / 99% reduced OBJ elements into indexed
GLB, rotated from Z-up to Y-up, uniformly converted from mm to m, recolored for
layer identification, with display normals recomputed. No tissue geometry is
invented to fill missing structures.

See [anatomy provenance and reproduction](src/modules/human-anatomy/README.md)
for official download links, selection rules, checksums and partial neural
coverage. The traditional meridian layer is a separate original approximate
diagram under MIT, with source links and explicitly unmeasured coordinates.
It is not WHO geometry or part of the DBCLS dataset. TARA data is not bundled.

The MIT license applies to our original code/documentation, not to every file
in this repository. No NASA, JPL, USGS, ESA or STScI endorsement is implied.
The embedded image data in `data.js` retains the same attribution as its source.

## Libraries

Three.js r160: Copyright © 2010–2023 three.js authors, MIT. The full notice is
included at `vendor/THREE-LICENSE.txt`. Python packages and Playwright are build
or test dependencies; their packages retain their respective licenses.

Vue 3: Copyright (c) 2018-present, Yuxi (Evan) You and Vue contributors, MIT.
The full notice is included at `vendor/VUE-LICENSE.txt`. Vite and its Vue plugin
are build dependencies and retain their package licenses.

## Solar System Scope illustrations

Files: `assets/699-illustration.jpg`, `799-illustration.jpg`,
`899-illustration.jpg`, `saturn-ring.png`, and derivatives embedded in `data.js`.

Author: **Solar System Scope / INOVE**.
[Source](https://www.solarsystemscope.com/textures/).
License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

These textures use NASA imagery as a basis, enhanced colours and artist-filled
missing areas. They are illustrations, not complete observed globes. We resize
or re-encode cloud textures, map them to reference ellipsoids, and map the ring
strip onto sourced main ring dimensions with an explicit Cassini division.
The ring texture has not been scientifically registered feature by feature.

Saturn and Uranus files were downloaded from Wikimedia mirrors of the same
author's work. Exact URLs and original SHA-256 values are in the asset manifest.

## NASA / JPL / USGS observation-derived products

- Earth: NASA Blue Marble, [SVS 2915](https://svs.gsfc.nasa.gov/2915/).
- Moon: NASA SVS / LRO, [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/).
  This processed colour product includes source-author repairs and polar
  supplementation, as explained in the body panel.
- Sun: NASA JPL, STEREO and SDO, [SVS 30362](https://svs.gsfc.nasa.gov/30362/).
  EUV 304 Å false colour; visual reference on a nominal solar sphere.
- Mercury: MESSENGER Team / Arizona State University / USGS Astrogeology,
  [2013 global mosaic](https://astrogeology.usgs.gov/search/map/mercury_messenger_mdis_global_mosaic_250m).
  Uses the 1024-pixel preview, with three total border columns cropped.
- Io: USGS Astrogeology / Galileo / Voyager,
  [global colour mosaic](https://astrogeology.usgs.gov/search/map/io_galileo_ssi_global_color_merge_mosaic_1km).
- Titan: NASA/JPL-Caltech/Space Science Institute,
  [PIA19658](https://science.nasa.gov/resource/titan-global-map-june-2015/).
  Near-IR map, cropped to remove the printed coordinate frame.
- Pluto reference image: NASA/Johns Hopkins University Applied Physics
  Laboratory/Southwest Research Institute,
  [global perspective](https://www.nasa.gov/image-article/pluto-global-perspective/).
  Displayed as a reference image, not a verified globe texture.
- Venus, Mars and older satellite mosaics: Caltech/JPL/USGS and the individual
  creators listed in the [JPL texture archive](https://space.jpl.nasa.gov/tmaps/).
  These are historical visualization products, not scientific analysis maps.

Public agency imagery may carry individual third-party notices. Preserve the
credits and consult each original product page before reuse beyond this atlas.
See [NASA media guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
and [JPL image use policy](https://www.jpl.nasa.gov/jpl-image-use-policy/).

## Hubble OPAL

Jupiter uses the original OPAL-derived map. Saturn, Uranus and Neptune OPAL files
are retained as source evidence but are not the default complete-globe display.

This work used data acquired from the NASA/ESA HST Space Telescope, associated
with OPAL program (PI: Simon, GO13937), and archived by the Space Telescope
Science Institute, which is operated by the Association of Universities for
Research in Astronomy, Inc., under NASA contract NAS 5-26555. All maps are
available at [doi:10.17909/T9G593](https://doi.org/10.17909/T9G593).

## Numerical sources

JPL SSD discovery/physical tables, Horizons vector responses, NAIF generic
PCK/LSK kernels and IAU nominal solar radius. Source files preserve their original
headers and notices. Our parsed catalogue is a transformation of these sources,
not a claim of ownership over the measurements. See `docs/DATA.md`.

## NASA GIBS detail imagery

The optional online Earth layer uses NASA GIBS Blue Marble Shaded Relief and
Bathymetry (August 2004), MODIS / NASA Earth Observatory. Tiles are rendered as
supplied, without synthetic detail or changes to their colour data; geographic
patch geometry follows the service's CRS84 matrix. The original low-resolution
NASA map remains a local fallback. This is a composite, not current imagery.

[Source metadata](https://gibs.earthdata.nasa.gov/layer-metadata/v1.0/BlueMarble_ShadedRelief_Bathymetry.json).
One original tile is retained for tests, with source URL and checksum in
`data/earth/imagery-source.json`. NASA image-use guidance cited above applies.

## Natural Earth geographic data

`data/earth/source/` contains GeoJSON from the Natural Earth public-domain map
dataset, repository tag v5.1.2. Browser derivatives retain source names, place
coordinates and boundary rings with a reduced property set. Per-file original
URLs and hashes are recorded in `data/earth/manifest.json`.

[Project](https://www.naturalearthdata.com/) ·
[Public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/) ·
[Boundary policy](https://www.naturalearthdata.com/about/disputed-boundaries-policy/).

This is independent cartographic data, not NASA data or an endorsement by a
government. Short localized country labels additionally use the platform's
ICU/CLDR region display names. See `docs/EARTH.md` for transformations and limits.

## Background descriptions

The five-language background summaries in `src/modules/solar-system/profiles.js`
and `moon-profiles.js` paraphrase the NASA Science pages linked in each record.
They are editorial summaries/translations, not NASA-authored translations.
Discovery names, reference codes and physical measurements are transcribed from
the linked JPL tables. Preserve these per-record links when reusing the content.
