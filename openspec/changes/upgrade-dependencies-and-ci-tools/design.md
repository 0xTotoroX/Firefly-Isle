# Design

## Compatible version sets

Use one consolidated maintenance PR so npm resolves ESLint, its rule package and Hooks plugin together, and Vitest and coverage share an exact release. Preserve all 26 grouped updates and all five Actions updates. Do not bypass peer resolution with force or legacy-peer-deps.

## React state

Initialize configuration-only authentication flags with state initializers. Track input identity when resetting async resources, editable profile state and generated summaries, so changed inputs cannot expose stale data. Keep cleanup guards for delayed async settlement. Verify user-visible lifecycle behavior with DOM tests rather than only source-string checks.

## Deployment tool validation

CI uses the actual new Actions to install the Supabase CLI and run Wrangler version/function-build commands without credentials. No website publication, migration push, Edge Function deployment or native signing occurs. Merge only after the exact PR head passes checks.

## Delivery

Keep the user's current checkout untouched. Consolidated updates supersede the ten original PRs; delete those branches only after the upgrade is merged. Preserve main, the user's development branch and legacy-main. Record verification and OpenSpec completion with the delivery.
