## ADDED Requirements

### Requirement: Preserve production data and access
The self-hosted backend SHALL preserve account IDs, patient ownership, records, RLS, functions, and storage permissions without publishing private credentials.

#### Scenario: Migration validation
- **WHEN** the production backend is switched
- **THEN** source and target data counts and content fingerprints match, and an unrelated user cannot read or change another user's patient records

### Requirement: Operate independently
The backend SHALL restart automatically on the VPS, use persistent volumes and HTTPS, and retain recoverable backups outside its live data directory.

#### Scenario: Recovery
- **WHEN** restoring a backup into an isolated database
- **THEN** the exported accounts and records can be read with their original ownership

### Requirement: Preserve client behavior
The production frontend SHALL use the self-hosted HTTPS API and exclude its dynamic responses from PWA caching.

#### Scenario: Backend connection
- **WHEN** a user logs in and opens a patient record
- **THEN** requests reach the VPS backend without a CSP error or a dependency on the old hosted project

### Requirement: Anonymous session continuity
Existing browser sessions SHALL retain their original anonymous user ID across the endpoint change. The frontend SHALL copy the old project session to the new storage key only if no destination session exists, retain the old entry, and exchange the migrated refresh token before enabling authenticated routes.

#### Scenario: Browser contains an unexpired cloud JWT
- **WHEN** the browser loads the VPS frontend with an existing cloud session
- **THEN** it refreshes the session against the VPS using the imported refresh-token records
- **AND** accesses the same user's records without creating another anonymous account

#### Scenario: Production still targets the cloud
- **WHEN** the configured backend is the original cloud origin
- **THEN** session migration does not copy credentials or force a token refresh

#### Scenario: Migration fails or a legacy auth event arrives later
- **WHEN** an imported session cannot be refreshed, including an expired token discarded by SDK initialization
- **THEN** the frontend displays a session-restoration error and retains source credentials
- **AND** later events carrying a legacy JWT cannot enable authenticated routes

#### Scenario: User signs out after migration
- **WHEN** a destination session has been established and the user later signs out
- **THEN** a persisted completion marker prevents automatic re-import of the old identity
- **AND** the source credential remains available for explicit recovery

### Requirement: Separate integration from production cutover
The repository SHALL retain its current production cloud configuration until the self-hosted backend and the integrated SaaS schema/functions have passed deployment acceptance. A self-hosted preview SHALL use explicit environment configuration.

#### Scenario: Development branches are consolidated
- **WHEN** migration preparation is merged into main
- **THEN** merging alone does not switch the production backend or retire its cloud deployment workflow
