## Context

V3 successfully unified the product around a recognizable orange, dark/light themes, shared shell geometry, and a long-form record surface. Runtime inspection of `/login`, `/demo/record`, and `/demo/analytics` now shows a different problem: too many containers use equal border weight, typography does not clearly distinguish brand/editorial/data roles, and the same orange competes as brand, action, selection, warning, and large-number emphasis.

The product owner wants to choose a stronger direction before any full-site rewrite. The repository is also carrying protected login-story and privacy-history work, so this change must remain additive and isolated.

## Goals / Non-Goals

**Goals:**

- Define one provisional V4 design contract grounded in attention hierarchy, semantic roles, and restrained motion.
- Make three materially different directions comparable through the same working page, content, viewport, and interactions.
- Keep the preview responsive, keyboard accessible, reduced-motion safe, and independent of Supabase.
- Preserve the V3 runtime until a later, explicit product decision authorizes production migration.

**Non-Goals:**

- Restyling `/login`, `/app`, `/record/:id`, `/analytics/:id`, `/privacy`, `/share/:code`, or shared production components.
- Changing authentication, patient data, Demo behavior, RLS, Edge Functions, or persistence.
- Selecting a final visual direction on behalf of the product owner.
- Creating a second production token system before a direction is selected.

## Decisions

### 1. Use an isolated route instead of restyling production pages in place

`/design-preview` will be a lazy-loaded route with one route component and one namespaced stylesheet. Its classes and custom properties use the `ff-v4-` prefix and do not override `html`, `.dark`, or global `--ff-*` tokens.

**Why:** the owner can compare real responsive UI without making unfinished design exploration leak into clinical workflows. It also gives a one-file rollback boundary.

**Alternative considered:** duplicate `/demo/record` three times. Rejected because three implementations would drift and the comparison would include content/layout differences rather than visual-system differences.

### 2. Keep one DOM and one static dataset for all directions

The preview will define a local immutable patient snapshot, treatment timeline, and lab summary. Direction and material controls only change `data-direction` and `data-mode` on the preview root; they do not branch the page structure.

**Why:** a controlled comparison must hold information architecture constant. If one candidate gets better content or a simpler layout, the owner is not choosing a visual system fairly.

**Alternative considered:** direction-specific components. Rejected because it creates three special cases and makes future hybridization expensive.

### 3. Compare three explicit design theses

- **Clinical Calm / 临床静观 (recommended):** warm neutral canvas, quiet tonal surfaces, restrained orange action focus, slate-blue information states, and minimum necessary borders. It optimizes long sessions and high-density clinical reading.
- **Firefly Glass / 萤光舷窗:** deep marine material, two controlled translucent layers, amber firefly focus, and cool cyan clinical context. It maximizes brand distinctiveness while limiting glass to shell and raised panels.
- **Living Archive / 活档案:** paper/ink material, editorial rhythm, indexed annotations, serif display only, and vermilion action focus. It emphasizes longitudinal record reading without recreating the current newspaper-style decoration.

All three share the same semantic roles: primary action, information, success, attention, critical, selected, muted, and disabled.

### 4. Make typography role-based rather than page-based

- UI, controls, navigation, and body copy use Geist/Inter-compatible sans.
- Brand and editorial section titles may use the localized display serif.
- Dates, identifiers, measurement values, and compact labels use IBM Plex Mono.
- Numeric emphasis uses tabular figures; abnormal values never depend on color alone.

**Why:** typography should communicate information role. Using serif for navigation, controls, data, and headings at once removes hierarchy.

### 5. Reduce surface and border vocabulary

The preview exposes four surface roles—base, canvas, surface, raised—and three line roles—none, separator, focus. Cards do not receive borders by default; borders are reserved for selection, focus, table separation, and safety-critical boundaries.

**Why:** hierarchy is clearer when spacing and tonal contrast do most of the work. Repeated boxed sections make every block look equally important.

### 6. Keep motion explanatory and infrequent

The route may use one entrance reveal and a short material crossfade when a candidate or material mode changes. Buttons receive press feedback. Tables, navigation, hover-only decoration, and repeated data scanning do not animate. Under `prefers-reduced-motion: reduce`, all non-essential transition and animation duration becomes effectively zero.

**Why:** clinical reading should feel immediate. Motion exists only to confirm preview state changes and preserve spatial continuity.

### 7. Treat preview controls as evaluation tooling

The control bar provides direction tabs, light/dark material selection, a recommendation label, and concise intent/risk text. The selected direction can be represented in the URL query string later, but this phase keeps state local to avoid unnecessary route/data complexity.

**Why:** the deliverable is a comparison tool, not a new user preference.

## Risks / Trade-offs

- **[Preview looks more polished than production and is mistaken for a completed migration]** → Label the route as a design review surface and state in both UI and docs that production remains on V3.
- **[Three token sets create premature maintenance cost]** → Keep tokens namespaced in one preview stylesheet; only the selected direction will be promoted into production tokens later.
- **[Glass direction harms legibility or performance]** → Limit blur to two large surfaces, provide opaque fallbacks, and test text contrast and mobile scrolling.
- **[Archive direction becomes decorative or low-density]** → Keep the same information structure and use serif only for display roles; body, controls, and numeric data remain sans/mono.
- **[Protected dirty-tree work is overwritten]** → Add new files and minimal patches only; do not reset, clean, rebase, or rewrite V3 files.
- **[Responsive comparison hides overflow]** → Verify 1440/1280 desktop and 390 mobile widths, inspect `scrollWidth`, and keep all grids collapsing through explicit breakpoints.

## Migration Plan

1. Add the V4 design source and OpenSpec contracts while retaining V3 as the production source.
2. Add `/design-preview` with isolated static data and namespaced CSS.
3. Run static gates and browser QA; present all three directions to the owner.
4. After an explicit selection, create a separate OpenSpec change that promotes the chosen tokens/components and sequences production-route migration.
5. Rollback for this phase is deletion of the preview route, stylesheet, V4 documents, and this active change; no data migration is required.

## Open Questions

- Which direction—or which explicitly named combination of directions—will become the production V4 base?
- Should the final production system keep both light and dark materials equally supported, or designate one as the primary product material?
- Which production page should migrate first after selection: workspace, record, analytics, or privacy?
