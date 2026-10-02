# Design

Reuse the current React, Radix, Supabase client and existing lab ingestion RPC. Keep OCR review as an explicit workflow bound to a persisted patient rather than rerunning initial record extraction. Saved data and a failed post-save reload must be separate states.

Initial saves carry a stable draft request UUID. The database returns the original record after a successful write whose response was lost, without replacing later edits. Explicit Data API grants complement RLS instead of depending on platform default privileges.

Password recovery is bound to the recovery identity; stale requests must not act on a different account. Dashboard pagination reads owner-bound summaries and preserves record context when opening intake.

Account export uses stable primary-key pagination, explicit owner filters and a cancellation latch when authentication changes. It is a complete multi-query export, not a transaction snapshot. Provider ciphertext and share hashes never enter the output.

Error reports contain known error categories and fixed route templates only; arbitrary messages and stacks are not safe diagnostic fields. Sender rejection is contained locally. Sentry uses its event envelope protocol.

Donation webhooks preserve raw-body signature verification and call a service-only atomic RPC keyed by Checkout Session ID. Paid/refunded states cannot regress through late events, and account deletion cannot be undone by a replay.

Demo uses the shared product surfaces with a synthetic, in-memory session. It does not mount real authentication, initialize Supabase or read real preferences and provider keys. Cross-page edits last for that session; refresh or reset restores fixtures. Model operations use labeled fixed examples, and unavailable sensitive operations remain explicit previews.

Record export renders a white document clone using html2canvas-pro. Pagination respects text lines and content blocks, keeps page margins and trims only an unpainted final tail; export acceptance includes actual downloaded and rendered files.

Database checks initialize every migration in a disposable network-isolated PostgreSQL container. Synthetic account/RLS fixtures validate database behavior; real Auth, model, deployment and browser acceptance are recorded independently.

Cloud onboarding starts from the consolidated main branch. A newly published environment must run a separate task against the verified feature commit before cloud readiness is claimed.
