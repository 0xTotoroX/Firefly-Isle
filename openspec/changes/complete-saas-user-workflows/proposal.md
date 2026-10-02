# Complete SaaS user workflows

## Why

The consolidated product audit found working domain and persistence foundations, but lab review was unreachable, initial save failures could not retry persistence independently, account exports omitted data, diagnostic reports could disclose record content, and delayed Checkout completion could be mistaken for payment. These gaps prevent a dependable Web milestone even when builds pass.

## What Changes

- Connect lab upload, editable review, patient selection, duplicate confirmation and persisted analytics.
- Preserve extraction results on save failure and distinguish analytics failure from an empty result.
- Make initial record creation idempotent across lost responses and retries, and declare minimum Data API grants explicitly.
- Complete email confirmation, password recovery and callback-error recovery; expose every owned record through a paginated dashboard list.
- Export all account-owned data with pagination and identity continuity; redact diagnostic reports.
- Record donation transitions atomically without treating an unpaid completed Checkout as paid.
- Extend public synthetic Demo with isolated in-memory workflows and verify complete migrations and user isolation.
- Produce readable white-background PDF/PNG exports with page margins, content-aware pagination and no blank trailing page.
- Maintain the ten-part acceptance ledger and validate a reproducible Codex Cloud environment against a known Git commit.

## Impact

Existing record identifiers, sharing, authentication, export format and clinical workflows remain compatible. New database behavior uses additive migrations. Production deployment, naming, hosting and paid subscription decisions remain separate. The black/white design system is ready; production layout migration follows the user's layout selection.
