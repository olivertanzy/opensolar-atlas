# Earth geography

The geographic layer uses Natural Earth repository tag **v5.1.2**, retrieved on
2026-09-24. The release contains 242 country/region records at 1:50 million and
7,342 selected city/town points at 1:10 million. These scale denominators are
cartographic scales, not metre resolution. The number of records is not the
number of sovereign states, and the places are not every settlement worldwide.

Sources:

- [Countries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/)
- [Populated places](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/)
- [Boundary policy](https://www.naturalearthdata.com/about/disputed-boundaries-policy/)
- [Public-domain terms](https://www.naturalearthdata.com/about/terms-of-use/)

Natural Earth is an independent cartographic project, not an official map issued
by every country. Its default de facto boundaries and source place associations
are retained. This layer does not establish territorial status. Source names,
classifications, admin-1 names and capital flags may reflect the release's age.
No population estimates or historical projections are presented as current data.

## Rebuild and audit

The original GeoJSON files are retained in `data/earth/source/`. To regenerate
the compact browser payloads, run `node scripts/build-earth.cjs`; no network or
additional packages are needed. The manifest records exact source URLs, hashes,
output hashes, coverage and licensing. `npm test` verifies the source snapshot
and every city coordinate against the original geometry.

The conversion preserves all countries and populated places, polygon rings,
five-language source names, identifiers and city-to-country codes. GeoJSON
geometry coordinates are authoritative for placement; separate source attribute
columns can contain a different representative point. Countries use the source
`LABEL_X`/`LABEL_Y` to position their labels. Short country names and search
aliases use Node's ICU/CLDR `Intl.DisplayNames` for the source ISO code; source
names are also retained and searchable. Regeneration with another ICU release
can change a localized short name, so review resulting data diffs.

## Rendering and interaction

Data is fetched locally only after Earth is first selected. Failures remain in
the Earth panel and can be retried without losing the solar scene. Unmounting
cancels pending requests and releases the geographic GPU geometry.

Longitude is east-positive, and geographic latitude is treated as a surface
normal angle on the existing sourced Earth ellipsoid. The layer inherits the
Earth mesh's rotation and local origin. It does not change the planet's radius
or global distance scale. Line segments are densified along short longitude
intervals, including across the date line; a 0.6 km visual offset avoids depth
fighting and is not real surface elevation. Countries render outlines (including
coastlines and interior rings), not filled territorial areas.

Search/list results and visible globe labels locate the camera over the selected
point. Closer zoom increases city rank density; collision avoidance and screen
bounds limit simultaneous labels. The active pin stays visible when ordinary
labels are disabled. Ellipsoid-facing tests hide the far hemisphere. The layer
is hidden outside Earth's close view. Country selection highlights its outline;
city selection highlights its source-associated country/region outline.

The local fallback remains the existing NASA Blue Marble composite. Geographic
labels do not describe the solar scene's 2026 TDB epoch.

## Zoom-dependent NASA imagery

By default, Earth loads visible tiles from NASA GIBS's
`BlueMarble_ShadedRelief_Bathymetry` layer, **August 2004**. The source is a
composite with baked-in relief shading and ocean bathymetry colours; no terrain
mesh or physical scene illumination is added. Source resolution tops out at
approximately **500 m**, sufficient for regional landforms, not houses or streets.

- [NASA layer metadata](https://gibs.earthdata.nasa.gov/layer-metadata/v1.0/BlueMarble_ShadedRelief_Bathymetry.json)
- [NASA GIBS access documentation](https://nasa-gibs.github.io/gibs-api-docs/access-basics/)
- [Blue Marble background](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/)

`earth-tiles.js` uses the service's geographic/CRS84 `500m` matrix: 512-pixel
tiles, origin (-180°, 90°), 288° root span, levels 0–7. It is not a standard
Web Mercator XYZ grid. Partial edge tiles preserve their texture-coordinate
fraction. `createEarthImagery.js` samples view rays on the reference ellipsoid,
chooses resolution by ground footprint per screen pixel and loads visible tiles
center first. Requests settle after camera movement, with four concurrent fetches,
at most 32 desired tiles and 48 decoded/GPU tiles in an LRU cache. Cached coarse
detail remains while the next level loads. Patches use a 0.4 km display offset,
below the boundary overlay; neither offset is real elevation.

The UI shows loading, ready and fallback states plus attribution. The online
switch is remembered locally. Turning it off, leaving Earth or unmounting cancels
pending work; eviction/unmount releases textures, bitmaps and geometries. Network
failure leaves cached/local imagery visible. A stationary camera does not refetch;
toggle off/on to retry failed tiles. Fully offline use requires turning off this
optional online layer. No proxy, token, account or bulk imagery download is used.

The retained `source/gibs-sample-7-20-118.jpeg` is one original NASA tile for
deterministic tests, not a replacement for live imagery. Its exact URL/hash is
in `imagery-source.json`. Fixture-based test screenshots must not be presented
as correctly mapped imagery; live-source screenshots have `-live` in their names.

## Verification

`npm run test:earth` exercises Beijing/Chengdu searches, coordinate alignment,
country filtering, label clicks, far-side hiding, toggles, non-Earth views,
five-language mobile layouts, disposal and load-error recovery. Production tests
also search Earth under a Pages-style subdirectory with external traffic blocked.
`npm run test:imagery` tests loading, detail selection, caching, cancellation,
fallback and retry against a fixed tile fixture. Set `IMAGERY_LIVE=1` to also
verify actual NASA requests and capture Shihezi at regional and closer zoom.
