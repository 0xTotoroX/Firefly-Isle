## ADDED Requirements

### Requirement: Dependency upgrades preserve application contracts
The system SHALL install compatible dependency versions with the lockfile on Node.js 22 and preserve authentication, patient-scoped navigation, delayed async result isolation and symptom-summary invalidation.

#### Scenario: Related packages are upgraded together
- **WHEN** a dependency requires a matching major or exact release
- **THEN** the upgrade SHALL include its compatible peer packages without bypassing peer checks

#### Scenario: Inputs change while a resource is loading
- **WHEN** a patient/account input changes or a resource reload begins
- **THEN** the previous resource SHALL not be exposed for the new input
- **AND** a delayed result from the previous load SHALL be discarded

### Requirement: Deployment tools are verified without publication
The system SHALL exercise upgraded deployment tools in CI without production credentials or deployment commands.

#### Scenario: Maintenance CI checks deployment tools
- **WHEN** maintenance CI runs
- **THEN** the actual upgraded setup actions and local function build SHALL succeed
- **AND** no database migration, website publication or remote function deployment SHALL occur

### Requirement: Superseded branches are removed after verified delivery
Maintainers SHALL merge the verified consolidated upgrade before closing and deleting its superseded Dependabot proposals and branches.

#### Scenario: Consolidated upgrade succeeds
- **WHEN** the exact consolidated head passes required checks and is merged
- **THEN** #3–#12 SHALL be closed as superseded and their head branches removed
- **AND** the user's existing development checkout SHALL remain intact
