# Add a 3D subject module

[简体中文](ADDING_A_MODEL.zh-CN.md) · [Architecture](ARCHITECTURE.md)

OpenSolar Atlas is a Vue 3 application with native Three.js subject modules.
The solar system is the first implemented subject. Anatomy is a future extension,
not an included asset or a medical product. You can contribute a new subject
without changing the home page, application navigation or solar-system renderer.

## 1. Create and run a module

Install Node.js 20+ and the repository dependencies, then run:

```sh
npm ci
npm run create:model -- my-structure
```

Use a lowercase kebab-case ID. The command refuses existing directories and path
traversal. It creates four files under `src/modules/my-structure/`:

| File | Responsibility |
| --- | --- |
| `module.js` | Public metadata and lazy Vue view loader |
| `ModelView.vue` | Reactive UI, workbench slots and scene lifecycle |
| `scene.js` | Native Three.js geometry, camera, controls and cleanup |
| `README.md` | Module-specific provenance and contribution checklist |

Register the generated module in **two places in one file**, `src/modules/registry.js`:

```js
import solarSystem from './solar-system/module.js';
import myStructure from './my-structure/module.js';

export const modelModules = Object.freeze({
  [solarSystem.id]: solarSystem,
  [myStructure.id]: myStructure,
});
// Keep resolveModule, moduleText and routeFromSearch below this object.
```

Run `npm run dev` and open `/?model=my-structure&lang=en`. The library card,
category filter and navigation appear automatically. The starter renders a
one-metre cube with orbit, wheel/pinch zoom, visibility and reset controls.
It is an integration example, explicitly not a reconstructed scientific object.
The template is not registered in the shipped catalogue.

## 2. Complete the manifest

`module.js` exports a plain object. Do not initialize Three.js or fetch large data
at import time: manifests are imported by the library even before a model opens.

| Required field | Contract |
| --- | --- |
| `id` | Stable, unique ID matching the registry key and directory |
| `version` | Module version, e.g. `0.1.0` |
| `unit` | Meaning of one world unit, e.g. `m`, `mm`, `km` |
| `name` | Object containing `en`, `zh-CN`, `zh-TW`, `ja`, `ko` strings |
| `category` | Same five locales; English category is the filter identity |
| `description` | Same five locales; honest scope and capabilities |
| `credit` | Short source/creator credit, displayed on the card |
| `loadView()` | Promise resolving to a module whose default export is a Vue component |

Optional `cover` is a decorative thumbnail URL, e.g.
`new URL('./assets/cover.svg', import.meta.url).href`. Without it the card uses a
generic geometric symbol. Keep preview artwork distinct from scientific evidence.

The template repeats example English metadata in all five fields deliberately.
**Replace it with reviewed translations before opening a production contribution.**
`moduleText(manifest, field, locale)` falls back to English. Do not claim NASA,
official status, clinical accuracy or complete coverage without supporting evidence.

There is no runtime plugin upload, arbitrary-code execution or remote module
installation. Contributors add reviewed source code through Git pull requests.
The ID resolves only against the local registry; unknown IDs display an error.

## 3. Use the shared workbench

`@/components/ModelWorkbench.vue` is the subject-independent UI layout. The `@`
alias points to `src/`. It contains the toolbar, left catalogue, central stage,
right details panel, bottom status area and mobile panel buttons.

```vue
<ModelWorkbench
  :title="title"
  :catalog-label="text('objects')"
  :details-label="text('details')"
  v-model:catalog-open="catalogOpen"
  v-model:details-open="detailsOpen"
>
  <template #toolbar><!-- subject-specific tools --></template>
  <template #catalog><!-- parts, layers or object search --></template>
  <template #stage><!-- Three.js host and canvas overlays --></template>
  <template #details><!-- selection information, sources and limitations --></template>
  <template #status><!-- units, loading status and gesture hints --></template>
  <template #overlays><!-- optional dialog --></template>
</ModelWorkbench>
```

`expanded` optionally hides side panels and enlarges the stage; `stageClass`
optionally adds a module-specific class to the viewport. These props are not a
camera API. The module controls whether and how a tool changes its scene.

Use `scoped` Vue styles for module UI. Prefer module class names; do not add
global `header`, `aside`, `footer` or `canvas` rules. The shell supplies language
selection, so modules should not add a duplicate global header/language selector.
Solar-specific `SceneViewport.vue` and `BodyProfile.vue` are **not** generic APIs.

## 4. Replace the example with sourced geometry

Use the generated `onMounted`/`onBeforeUnmount` lifecycle. Vue owns selection,
visibility, labels and loading/error states; the native scene driver owns GPU
objects. Keep renderers, meshes and controls in ordinary variables, outside deep
Vue reactivity. Use watchers to send small updates to the driver.

For a self-contained GLB, place it at `src/modules/my-structure/assets/model.glb`:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const modelUrl = new URL('./assets/model.glb', import.meta.url).href;
// Inside your scene initialization/loading function:
const gltf = await new GLTFLoader().loadAsync(modelUrl);
```

This is a loading fragment, not a full replacement for the driver. Add an explicit
loading/error/retry state. If the view was disposed while loading, release the
returned geometry, materials and textures instead of attaching it. Abort fetches
when possible. Remove the cube once real geometry is ready. External texture or
decoder dependencies must be packaged or disclosed; test offline behavior.

Vite bundles module-relative `new URL(..., import.meta.url)` and `?url` imports.
Do not use `/assets/model.glb`: a root-absolute URL breaks GitHub Pages subpaths.
For fetched JSON/raw source documents not imported by Vite, add their exact files
to `scripts/build-site.cjs`'s allowlist. Never copy the entire workspace to `dist`.
Avoid runtime paths constructed from user input.

Set these independently for each subject:

- Native units, coordinate axes, origin and model-to-world transformation.
- Camera clipping planes and zoom limits appropriate to the model's dimensions.
- Interaction semantics: orbit, pan, select, hide layers, isolate parts, etc.
- Reliable component IDs and source-backed descriptions for selectable parts.
- Handling of missing parts, simplified surfaces and uncertain measurements.

The solar system uses kilometres and astronomical coordinates; an anatomy model
can use millimetres and its own orientation. Do not reuse astronomical fields,
Earth tile loading or the solar camera limits for unrelated subjects.

On unmount: cancel animation frames, disconnect observers, remove event handlers,
dispose controls, geometries, materials and textures, close owned ImageBitmaps,
abort outstanding requests, dispose the renderer and remove its canvas. Do not
dispose shared resources owned by another module. The starter demonstrates the
synchronous subset; imported assets require additional texture/async cleanup.

## 5. Sources, licensing and languages

Complete the module README with source URLs, creator, version/date, license,
required attribution, units, coordinate system and any transformations. Include
the asset license in `THIRD_PARTY.md` where applicable; the repository's MIT
license does not override a third party's asset license. Retain raw evidence or
retrieval instructions and checksums when practical.

For a future anatomy contribution, document the specific anatomical structures,
sample/model scope, simplifications and source limitations. Do not imply that a
generic model is an individual person's anatomy or a diagnostic instrument.
Add the model only after its assets, reuse rights and descriptions are ready.

Use the shared `locale` ref from `@/i18n/index.js`; default is English. Small
module dictionaries can follow the starter. Every user-facing control and error
state must cover all five locales. Keep source titles, formal identifiers and
unreviewed scientific names in their source language and label them as such.

## 6. Verify and submit

```sh
npm test
npx playwright install chromium
npm run test:shell
npm run test:browser
npm run test:earth
npm run test:imagery
npm run build
npm run test:production
```

On Windows, `BROWSER_CHANNEL=msedge` selects installed Edge. `test:shell`
generates and injects the starter in a temporary test server: it verifies a
non-astronomy module without adding it to the real registry. It covers separate
data loading, navigation/back/forward, five-language mobile layout, load failure
retry, disposal and leaving before a load finishes. This is framework coverage;
add tests for the scientific content and interactions of your own module.

Before opening a PR, check:

- Library entry, direct URL and English default work after a clean installation.
- Switching away releases the scene; returning creates one canvas and no duplicate listeners.
- Mobile panels, drag/pinch controls and keyboard navigation remain usable.
- Missing/corrupt assets produce a recoverable state rather than an empty canvas.
- Built assets and evidence links work below `/opensolar-atlas/`.
- Include screenshots, asset provenance, license notices and honest limitations.

No change to `App.vue`, `ModelLibrary.vue` or the solar renderer should be needed
for a normal contribution. Avoid committing generated `dist/`, test screenshots,
credentials or unlicensed assets.
