# Vue and native Three.js architecture

OpenSolar Atlas provides a model library, shared workbench and contributor guide.
The solar system is the first implemented subject. New modules join through a
manifest and independent Vue view. The unregistered starter in `templates/structure/`
demonstrates a second subject boundary with a geometric cube, not an anatomy model.
Follow [Add a model](ADDING_A_MODEL.md) ([中文](ADDING_A_MODEL.zh-CN.md)).

## Ownership and lifecycle

`src/App.vue` owns global navigation, language selection, page routing, async
loading and load-error recovery. Root visits open the library, `?view=guide`
opens the contributor guide, and `?model=solar-system` loads its Vue view.
Legacy `?body=...` URLs still open the solar system. Unknown IDs show a clear
unavailable state. Navigation uses query strings and History API for static
hosting; no server rewrite rules are required. Back/forward are supported.

`ModelWorkbench.vue` supplies toolbar/catalog/stage/details/status/overlays slots
and mobile panels. Only one subject view is mounted at once. Switching away
unmounts the current view; late async completions are ignored using a request token.
There is no KeepAlive scene cache. Browser tests verify actual WebGL context loss
when a generated template module is left.

`SolarExplorer.vue` owns reactive selection, filters, panels and scene
status. `SceneViewport.vue` creates the native Three.js driver in `onMounted`
after its container exists. Watchers send small UI state changes to the driver.
The driver reports selection/status through callbacks; it never builds Vue UI.

Three.js renderers, geometries, materials, textures and camera controls stay in
a plain closure rather than Vue's deeply reactive state. `onBeforeUnmount`
disposes the driver: animation frame, observer, event handlers, GPU resources,
WebGL context and canvas. A guard prevents asynchronous initialization after
unmount. Browser tests actually unmount and remount the Vue application.

## Subject boundaries

- `src/modules/registry.js`: reviewed local manifests, lazy view loaders and URL resolution.
  Only `solar-system` is registered in production today; manifests declare five-language
  name/category/description, version, units and credits. No remote code loading.
- `src/components/ModelLibrary.vue` and `ContributorGuide.vue`: subject-independent pages.
- `src/components/ModelWorkbench.vue`: shared visual layout; scene logic stays in modules.
- `src/shell.css`: global shell/workbench layout; module styles should remain scoped.
- `src/modules/solar-system/`: solar UI, native rendering, catalogue presentation
  and editorial NASA summaries. Solar assumptions remain within this module.
- `EarthGeography.vue` / `createEarthLayer.js`: Earth-only UI and geographic
  overlay. Place data stays in a shallow ref; native geometry is attached to the
  Earth mesh and disposed by its driver. `earth-geography.js` contains coordinate,
  search and local-loading functions. See [data limits](EARTH.md).
- `src/components/BodyProfile.vue`: the current solar-system evidence panel.
- `src/i18n/`: five-language messages and selection/number formatting.
- `data.js` and `data/`: frozen solar evidence and source-derived records. The large
  legacy payload is requested lazily by `loadSolarData.js` when opening the solar
  module. Visiting the library, guide or another subject does not load it.
  The Vue application and Three.js drivers are compiled with Vite.

For a future anatomy subject, first choose appropriately licensed assets and
sources. Then add its independent view/driver and register a real module. Its
units, camera ranges, categories, descriptions and validation should belong to
that module; do not reuse astronomical kilometre assumptions or solar body
fields. Extract a shared component only when two implemented subjects need it.
No anatomy assets, medical claims or anatomy routes are implemented now.

## Internationalization and evidence

Supported locales are `en`, `zh-CN`, `zh-TW`, `ja`, `ko`. A valid URL language
takes precedence over the locally saved choice; a new visit defaults to English.
The chosen language updates document language/title, labels, controls, method
notes, scientific qualifications and curated descriptions. Body selection is
also linkable. Search accepts the five reviewed name sets and source names.

Formal names without reviewed translations, discoverer names, units, reference
codes and source titles remain unchanged. Original Chinese technical notes are
separately labelled and language-tagged. Curated prose is an attributed
paraphrase, not an official agency translation. Missing fields remain missing.

## Verification

`test:shell` generates a starter in a temporary directory and injects its manifest
only in the test server. It checks independent data, search, switching, history,
GPU cleanup, late loads, error/retry and five-language mobile layouts. The production
registry and user contributions are never modified by this integration test.

`npm test` checks registry metadata, URL resolution, source hashes, true-scale inputs, record matching, physical
units, search, all locale keys and interpolation parameters. `test:browser`
checks native mesh scales, texture/placeholder policy, navigation, all languages,
mobile overflow and disposal/remount. `test:production` checks built assets under
a GitHub Pages-style subdirectory, source-response access and operation while
external requests are blocked. Reports/screenshots stay in ignored test output.
