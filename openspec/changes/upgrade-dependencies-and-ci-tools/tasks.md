# Tasks

- [x] Inspect all ten proposals, their diffs and failed CI logs; establish an isolated main-based checkout.
- [x] Integrate every proposed npm/Actions update and resolve compatible dependency versions.
- [x] Repair React state lifecycle checks and verify stale-response, account/profile and summary behavior.
- [ ] Validate deployment tool installations without publishing or modifying production.
- [ ] Pass Node.js 22 installation, lint, full type checks, tests with coverage, build, isolated database checks and OpenSpec validation.
- [ ] Verify the consolidated PR's exact head in hosted CI and merge it.
- [ ] Close superseded #3–#12, delete their branches and verify the user's checkout remains unchanged.

## Local evidence

Node.js 22.23.3 with npm 10.9.9: clean npm ci succeeds. Lint and all TypeScript boundaries pass. Coverage run: 534 tests / 86 files passed before four additional BrowserRouter regression cases; targeted lifecycle/router run: 37 tests / 5 files passed. Build and Capacitor Android/iOS sync pass. OpenSpec strict validation: 38 items pass. Existing >500 kB build warnings remain. Docker is unavailable locally; isolated database checks and actual new Actions installations must pass in hosted CI before merge.
