# Contributing

Please open an issue describing a reproducible problem or a proposed improvement.
For a visual bug, include the body name, browser, viewing direction and screenshot.

For a new 3D subject, follow [Add a model](docs/ADDING_A_MODEL.md)
([中文](docs/ADDING_A_MODEL.zh-CN.md)). Run `npm run create:model -- my-structure`
to create a working Vue/Three.js starter, then register its manifest. The shared
workbench supports independent units, parts, source panels and camera controls;
there is no need to edit the solar-system driver or global UI.

Run `npm ci`, `npm test`, `npm run test:browser`, `npm run build` and
`npm run test:production` before proposing code changes.
For Earth layer changes, also run `npm run test:earth`; the CI runs it on every change.
Run `npm run test:shell` for the app framework, module switching and starter integration.
Run `npm run test:imagery` for tile loading/caching/fallback checks. This uses a
retained source tile and requires no NASA connection. Set `IMAGERY_LIVE=1` for
an additional live NASA check; keep live screenshots separate from fixtures.
Install Chromium once with `npx playwright install chromium`. On Windows you may
set `BROWSER_CHANNEL=msedge` to use an installed Edge browser instead.

Data contributions must identify their primary source, epoch, units, coordinate
frame, projection, attribution and reuse terms. Never invent missing radius or
ephemeris values. Distinguish observation, processed imagery and illustration.
When updating a snapshot, regenerate the complete shared epoch and update tests
and documentation together. See `docs/DATA.md`.

Do not submit credentials, account information or fabricated usage statistics.
Keep changes focused; scientific corrections and rendering fixes are welcome.

UI changes must cover `en`, `zh-CN`, `zh-TW`, `ja` and `ko`. Preserve message
interpolation keys and source-language quotations. Keep Three.js objects outside
Vue's deep reactive graph and release all GPU/event resources on unmount. Read
`docs/ARCHITECTURE.md` before adding another subject module. New scientific
summaries require a primary source URL and a review date; uncertainty must remain
visible in every language.
