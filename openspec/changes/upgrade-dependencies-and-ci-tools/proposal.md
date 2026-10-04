# Upgrade dependencies and CI tools

## Why

Ten Dependabot proposals (#3–#12) remain open. Three npm proposals fail installation because ESLint and Vitest packages are upgraded independently; the grouped update fails new React Hooks checks. Existing successful CI does not exercise the changed deployment actions. The owner requested compatible upgrades, passing verification, and removal of the superseded branches.

## What Changes

- Integrate all proposed npm versions, pairing ESLint with compatible rules/plugins and Vitest with its matching coverage provider.
- Adopt React Router 7 while preserving the existing BrowserRouter routes and authentication/share boundaries.
- Remove synchronous effect-driven state resets without changing account isolation, async stale-result rejection or symptom-summary invalidation.
- Upgrade checkout/setup-node/upload-artifact and the Cloudflare/Supabase actions; exercise deployment tools in CI without deploying.
- Verify the consolidated main-based upgrade, merge it, then close #3–#12 as superseded and delete their branches.

## Impact

Targets the remote main baseline, independently of the user's dirty development checkout. Database migrations, provider contracts, production configuration and deployment triggers stay compatible. Hosted CI verifies Node.js 22, database behavior and tool installation. Native runtime validation remains a separate acceptance boundary.
