## Why

The current V3 interface has accumulated too many equal-weight borders, mixed typographic roles, and competing accent uses, so high-value clinical information does not establish a clear first-reading order. Before changing production pages, the project needs one explicit V4 evaluation contract and several comparable, working page directions that the product owner can choose from with real responsive evidence.

## What Changes

- Add a provisional V4 visual-system source that replaces page-specific decoration with role-based color, type, spacing, surface, emphasis, and motion rules.
- Add an isolated public `/design-preview` route with three selectable directions—Clinical Calm, Firefly Glass, and Living Archive—rendered from the same static patient data and the same page structure.
- Let the preview compare light and dark material modes without mutating the saved global theme or importing production patient records.
- Validate the preview at desktop and mobile widths, with reduced motion, no horizontal overflow, and no new console errors.
- Keep every existing production route and component on the V3 implementation until the product owner explicitly selects a final V4 direction or approved hybrid.

## Capabilities

### New Capabilities
- `visual-system-preview`: Defines the isolated, comparable, responsive three-direction product-page preview and its selection boundary.

### Modified Capabilities
- `theme-system`: Distinguishes the provisional V4 evaluation source from the still-active V3 production implementation and adds role-based hierarchy rules for the eventual redesign.

## Impact

- Design documentation: `DESIGN.md`, `docs/design/Image-2/V4/`, and the design ownership maps.
- OpenSpec: a new active change plus delta specs for `theme-system` and `visual-system-preview`.
- Frontend routing: one lazy-loaded public `/design-preview` route in `src/App.tsx`.
- Frontend implementation: a namespaced preview route and stylesheet with static local data only.
- Tests and QA: source/static-render tests, type checking, lint, build, responsive browser inspection, reduced-motion inspection, and console/overflow checks.
- No database, Supabase Auth, RLS, Edge Function, Demo data source, or production page behavior changes are included in this phase.
