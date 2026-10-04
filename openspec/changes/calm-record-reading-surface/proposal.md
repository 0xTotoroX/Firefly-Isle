## Why

The production record page currently gives Demo notices, view controls, sharing, patient facts, AI analysis, timeline, and decorative system badges nearly equal visual weight. Repeated rounded cards, borders, icon buttons, English control labels, and unsupported states such as `AI VERIFIED` make a private clinical record feel like an AI-generated SaaS dashboard instead of a calm document meant to be read and revisited.

The product owner has selected a quieter direction for the record experience: preserve every real capability, but let the patient's history and clinical evidence lead. This change applies that decision to `/demo/record`, `/record/:id`, and their shared record display components without migrating the global V4 evaluation system.

## What Changes

- Flatten the record reading surface into a document-led hierarchy using whitespace, typography, and thin separators instead of nested cards.
- Remove decorative system status from the shared top bar and remove unsupported record badges such as `AI VERIFIED`, data-completeness certification, and `LAST_UPDATE` console copy.
- Restyle the Demo notice as a quiet disclosure line and the record view switch as text tabs with an underline indicator.
- Keep editing, save feedback, PDF/PNG export, sharing, table/Gantt switching, lab trends, and clinical AI analysis available while reducing icon and border density.
- Present sharing as a secondary disclosure: collapsed by default in Demo, expanded by default for owned records, with all creation/copy/view/revoke states preserved.
- Keep current V3 theme tokens and route/data contracts; do not promote the isolated V4 preview or change Supabase behavior.

## Capabilities

### New Capabilities
- `record-reading-surface`: Defines the calm production hierarchy for record pages, including restrained controls, secondary sharing, and removal of decorative AI/system certification.

### Modified Capabilities

None.

## Impact

- Shared system UI: `src/components/system/topbar.tsx`, `src/components/system/demo-mode-banner.tsx`.
- Record composition and presentation: `src/routes/record-page.view.tsx`, `src/components/record/RecordSharePanel.tsx`, `record-dossier.tsx`, `ClinicalAnalysisPanel.tsx`, `LabTrendsTable.tsx`, and copy/tests.
- Architecture maps: `openspec/changes/AGENTS.md`, `src/routes/AGENTS.md`, `src/components/system/AGENTS.md`, and `src/components/record/AGENTS.md`.
- No schema, authentication, RLS, Edge Function, Demo data-source, export implementation, or record mutation contract changes.
