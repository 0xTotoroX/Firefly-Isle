## Why

The workspace already supports first-time extraction, follow-up completion, and per-cell inline editing, but users still need to click individual fields for routine corrections. Natural-language editing lets a user say "把二线治疗改为 X" or "删除错误结束日期" and update the existing PatientRecord without creating a second record.

## What Changes

- Add a conversational edit mode for `/app` when a PatientRecord already exists and the main input contains an edit instruction.
- Extend the LLM prompt boundary so edit instructions return validated field-level patch intents instead of a full replacement record.
- Add merge logic that only changes explicitly targeted fields and supports clearing fields to `undefined`.
- Show edit success/failure feedback and reuse the existing retry affordance for failed edit attempts.
- Cover basicInfo, initialOnset, treatmentLine regimen/startDate/endDate, clearing fields, unchanged fields, and retry behavior with tests.

## Capabilities

### New Capabilities
- `conversational-record-editing`: Covers natural-language edit command parsing, field-level patch validation, merge semantics, workspace integration, feedback, and retry behavior.

### Modified Capabilities
- `editing`: Existing edit behavior is extended beyond direct cell blur edits to include validated natural-language field updates.

## Impact

- Affects `src/lib/extraction*`, workspace orchestration, workspace/composer copy, tests, and module maps.
- Reuses the existing LLM adapter and patient persistence boundary; no new database tables are required.
- Adds OpenSpec baseline specs for conversational editing and updates the editing spec.
