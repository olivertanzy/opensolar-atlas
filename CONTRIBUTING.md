# Contributing

Please open an issue describing a reproducible problem or a proposed improvement.
For a visual bug, include the body name, browser, viewing direction and screenshot.

Run `npm ci`, `npm test` and `npm run test:browser` before proposing code changes.
Install Chromium once with `npx playwright install chromium`. On Windows you may
set `BROWSER_CHANNEL=msedge` to use an installed Edge browser instead.

Data contributions must identify their primary source, epoch, units, coordinate
frame, projection, attribution and reuse terms. Never invent missing radius or
ephemeris values. Distinguish observation, processed imagery and illustration.
When updating a snapshot, regenerate the complete shared epoch and update tests
and documentation together. See `docs/DATA.md`.

Do not submit credentials, account information or fabricated usage statistics.
Keep changes focused; scientific corrections and rendering fixes are welcome.
