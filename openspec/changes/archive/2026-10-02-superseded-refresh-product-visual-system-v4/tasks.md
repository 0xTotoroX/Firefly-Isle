## 1. Design Contract

- [x] 1.1 Record the V3 visual audit and the Clinical Calm, Firefly Glass, and Living Archive theses in the V4 design source.
- [x] 1.2 Define role-based color, typography, surface, spacing, emphasis, and motion contracts for the candidate system.
- [x] 1.3 Update the root design entrypoint and design ownership maps without editing the protected V3 source.

## 2. Isolated Preview Route

- [x] 2.1 Add a lazy-loaded public `/design-preview` route without adding it to production navigation.
- [x] 2.2 Build one static patient-page structure shared by all three directions.
- [x] 2.3 Add accessible direction and Light/Dark material controls with Clinical Calm selected by default.
- [x] 2.4 Implement namespaced candidate tokens and responsive layouts without mutating global V3 theme tokens.
- [x] 2.5 Add reduced-motion behavior, visible focus, semantic abnormal states, and mobile overflow protection.

## 3. Documentation and Tests

- [x] 3.1 Update route, style, source, root architecture, and active OpenSpec ownership maps for the new files and boundaries.
- [x] 3.2 Add static-render/source contract tests for all candidates, shared content, route registration, isolation, controls, and motion/accessibility hooks.
- [x] 3.3 Validate the OpenSpec change in strict mode.

## 4. Verification

- [x] 4.1 Run targeted tests, full type-check, full tests, lint, build, and staged/unstaged diff checks.
- [x] 4.2 Verify desktop layouts at 1280px and 1440px for all three candidates and both materials.
- [ ] 4.3 Verify 390px mobile layout, keyboard selection, reduced-motion rendering, horizontal overflow, and console state.
  - Mobile layout, reduced motion, overflow, focus semantics, accessibility tree, and console state are verified. Browser keyboard injection focuses native buttons but does not reliably dispatch Enter/Space activation; keep this task open until a trusted manual or alternate E2E activation check is available.
- [x] 4.4 Capture comparison screenshots and present a recommendation without migrating production pages.
