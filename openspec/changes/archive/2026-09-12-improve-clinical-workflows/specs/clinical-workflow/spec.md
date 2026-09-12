## ADDED Requirements

### Requirement: Persist patient-owned auxiliary records reliably
The system SHALL associate new symptom and follow-up records with the authenticated owner and an owned patient, reject unrelated treatment lines, preserve patient identity during edits, and report a missing target instead of claiming success for zero-row writes.

#### Scenario: Edit and reload a visit
- **WHEN** the owner edits a saved visit
- **THEN** only editable fields change and reloading returns the same patient association

#### Scenario: Cross-patient treatment line
- **WHEN** a symptom is assigned a treatment line belonging to another patient
- **THEN** the database rejects the write

### Requirement: Show current clinical workflow state
The system SHALL select the latest dated reading per patient and indicator before classifying abnormalities, and SHALL derive follow-up reminders from each patient's latest visit using calendar dates. Unavailable sections SHALL be distinguishable from empty results.

#### Scenario: Import an older abnormal reading
- **WHEN** an older abnormal reading is imported after a newer normal reading
- **THEN** the Dashboard does not present the old reading as the patient's current abnormal state

#### Scenario: Supersede a follow-up plan
- **WHEN** a newer visit replaces an earlier next-visit date or clears the plan
- **THEN** the earlier plan no longer appears as the current reminder

### Requirement: Keep clinical forms recoverable and readable
The system SHALL provide labelled controls, calendar-date validation, retryable loading errors, preserved inputs after failed saves, explicit deletion confirmation and patient-scoped navigation. V3 primary action text SHALL remain readable across all preset colors and hover states.

#### Scenario: Local morning entry
- **WHEN** a user creates a visit before 08:00 in Asia/Shanghai
- **THEN** the default date is the current local date

#### Scenario: Failed load
- **WHEN** symptom or follow-up loading fails
- **THEN** a retry action is shown instead of an empty-history message

#### Scenario: Review a long record
- **WHEN** a record includes many lab indicators
- **THEN** the treatment timeline precedes the full lab table and AI analysis in the dossier

#### Scenario: Open sharing when needed
- **WHEN** the user opens a real or demo dossier
- **THEN** sharing controls are initially collapsed, with a short label and an explicit expansion action above the clinical content

#### Scenario: Enter a symptom on a narrow screen
- **WHEN** the user opens the symptom form
- **THEN** the full preset list is available through an expandable control, leaving core fields directly accessible
