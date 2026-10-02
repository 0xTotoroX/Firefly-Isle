## ADDED Requirements

### Requirement: Every owned record remains discoverable
The dashboard SHALL provide a paginated list of the caller's own records with links to the record, analytics and intake for that patient. Navigation without a selected patient SHALL lead to record selection rather than claiming that no records exist. Returning from a record to intake SHALL preserve that record's patient identity.

#### Scenario: Create a second record
- **WHEN** an account owns multiple records, including one without labs, symptoms or follow-up
- **THEN** every record remains reachable from the dashboard, and opening or resuming an older record does not silently load the latest one

### Requirement: Lab review is reachable and recoverable
The application SHALL connect upload, OCR, human review and atomic persistence for a selected existing patient. Unknown readings SHALL remain visible for correction or explicit exclusion. Duplicate replacement SHALL require confirmation. A failed reload after saving SHALL not present the save as failed.

#### Scenario: Import multiple reports
- **WHEN** the user selects multiple reports for the current patient
- **THEN** each report retains its own OCR result, review state and retry state; one failure does not discard successful reports, and already saved reports are not submitted again

#### Scenario: Review changes indicator identity
- **WHEN** the reviewer maps a reading to a different indicator
- **THEN** units and reference ranges cannot silently retain values belonging to the previous indicator, and any prior replacement confirmation is invalidated

#### Scenario: Save completes before refresh
- **WHEN** a saved report is refreshing the patient's readings
- **THEN** only one refresh is active and an older completion cannot discard a newer import draft

#### Scenario: Correct a report before saving
- **WHEN** an uploaded report contains an unknown indicator or invalid date/range
- **THEN** the user can correct or exclude the row before submitting; invalid included rows prevent persistence

### Requirement: Failures preserve user work
An initial record save failure SHALL retain the extracted record and allow retrying persistence without another LLM extraction. Analytics errors SHALL display a retry action and SHALL NOT be presented as normal zero/empty data.

#### Scenario: Retry a failed initial save
- **WHEN** extraction succeeded and persistence failed
- **THEN** retry saves the same edited result and does not call the extraction model again

#### Scenario: A creation response is lost after commit
- **WHEN** a first save commits but the response is lost and the user retries
- **THEN** a stable creation request identity resolves to the same patient, without creating a duplicate or accessing another owner's record

### Requirement: Fresh backend permissions are explicit
Application migrations SHALL declare the minimal table, column and RPC grants required by authenticated clients and server services. A fresh Supabase project SHALL work without relying on legacy automatic public-schema exposure. RLS isolation SHALL remain effective.

#### Scenario: New project uses revoked-by-default API grants
- **WHEN** all migrations are applied and a synthetic user registers through Auth
- **THEN** the user can perform the permitted account and clinical operations through PostgREST, and cannot read or modify another account's records

### Requirement: Email authentication is complete
Registration SHALL support both immediate-session and pending-confirmation configurations. Pending confirmation SHALL show a successful waiting state without granting authentication. Password recovery SHALL include a dedicated route that verifies callback success before allowing a new password to be set. Callback errors SHALL be visible and recoverable rather than leaving an indefinite loading screen.

#### Scenario: Email confirmation is enabled
- **WHEN** sign-up succeeds without a session
- **THEN** the password is cleared and the user is told to confirm their email, with protected routes still unavailable

#### Scenario: A reset link is invalid while another account is signed in
- **WHEN** recovery initialization reports a link error and an older session still exists
- **THEN** the error takes precedence and the page does not offer to change that other account's password

### Requirement: Account export is complete and identity-bound
The export SHALL include each supported account-owned table, paginate beyond server row limits, and omit key ciphertext and authorization hashes. Any sign-out or account change during collection SHALL permanently cancel that export. Query errors other than explicitly supported missing optional schema SHALL prevent producing a partial file.

#### Scenario: Account changes during pagination
- **WHEN** the account changes away from the initiating identity, including a subsequent change back
- **THEN** no downloadable account artifact is produced

### Requirement: Diagnostic reporting protects clinical data
Reports SHALL use fixed route templates and known error classes without arbitrary messages, raw stack text, patient identifiers, share codes or query strings. Synchronous and asynchronous sender failures SHALL remain contained and SHALL NOT trigger recursive reports.

#### Scenario: Reporting endpoint rejects a request
- **WHEN** a configured report sender rejects its promise
- **THEN** the rejection is consumed without another report or disruption to the application

### Requirement: Donation state reflects payment
Only confirmed paid Checkout sessions SHALL become paid donations. Session completion without payment SHALL remain pending. Duplicate and concurrent events SHALL update one row atomically; paid/refunded states SHALL not regress through older events. Replays SHALL preserve an account deletion's detached ownership.

#### Scenario: Delayed completion follows payment
- **WHEN** an unpaid completion is delivered after the same session was recorded paid
- **THEN** its donation remains paid and no additional row is created

#### Scenario: Stripe calls the deployed webhook
- **WHEN** Stripe sends its signed request without a user access token
- **THEN** the webhook's explicit gateway configuration allows it to reach signature verification, and invalid signatures remain rejected; other functions retain their authentication requirements

### Requirement: Exported records are complete and readable
PDF and PNG exports SHALL retain all clinical text in a stable document layout with readable contrast and safe margins. Screen-only controls SHALL not appear in the document. Multi-page PDF output SHALL avoid splitting text lines and SHALL use the existing renderer's compression support.

#### Scenario: Export a long record from a dark or narrow screen
- **WHEN** the record contains long labels, several treatment stages and clinical notes
- **THEN** the exported document has a light readable background, does not crop text at its edges, preserves content across page breaks and excludes export, navigation and analysis action buttons

### Requirement: Evidence separates code and service readiness
The project SHALL keep an acceptance ledger for all 17 capabilities. It SHALL validate all migrations and RLS with synthetic data, and separately record real authentication, model, browser, deployment and cloud task evidence. Missing evidence SHALL remain a stated limitation.

#### Scenario: Cloud environment is published
- **WHEN** onboarding succeeds and an environment is published
- **THEN** readiness still requires an independent task to run the required checks and identify its exact Git commit and produced artifacts

### Requirement: Public Demo covers the product with synthetic state
Public Demo SHALL expose dashboard, intake/review, record views/export, labs, follow-up, symptoms, model configuration preview and settings through shared product components. Its navigation SHALL stay under `/demo`, and its data and identity SHALL be independent of the real user's session. All example patient information SHALL be explicitly fictional. Local editing may persist only within the demonstration session and SHALL be identified as demonstration behavior. AI and payment previews SHALL not make real service calls; no user key input, account deletion or real sharing is allowed.

#### Scenario: An authenticated user opens Demo
- **WHEN** a real account is signed in and the user opens a Demo route
- **THEN** the page shows only synthetic data and all demonstration edits affect only local Demo state, including after navigating between its pages
