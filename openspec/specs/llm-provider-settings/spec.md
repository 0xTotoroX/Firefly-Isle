# llm-provider-settings Specification

## Purpose

定义用户 LLM provider 设置、preset/custom provider 合同、第三方医疗数据披露、加密密钥持久化与非明文回读规则。
## Requirements
### Requirement: Provider setting entry
The system SHALL provide a user-facing provider setting that chooses either system default DeepSeek or a user-owned LLM provider.

#### Scenario: Compact provider panel
- **WHEN** the user opens the authenticated `/models` page
- **THEN** the provider setting SHALL render as a compact expandable panel
- **AND** the compact state SHALL show the current provider mode without occupying the full form height
- **AND** the compact header area SHALL toggle expand/collapse as one click target with an unframed arrow indicator

#### Scenario: Workspace links to model settings
- **WHEN** the user needs to configure a provider from the `/app` workspace
- **THEN** the composer SHALL provide a link to `/models`
- **AND** provider configuration SHALL remain on that standalone page rather than occupying the intake composer

#### Scenario: System default selection
- **WHEN** the user selects the system default option
- **THEN** the system SHALL use the project DeepSeek provider without requiring a user API key
- **AND** any saved user-owned provider setting SHALL no longer affect chat routing

#### Scenario: System DeepSeek connectivity test
- **WHEN** the user clicks the provider settings test action
- **THEN** the browser SHALL call `llm-proxy` with Supabase JWT and a short DeepSeek test prompt
- **AND** the browser SHALL NOT call DeepSeek directly or include provider API keys
- **AND** the UI SHALL show whether the system DeepSeek service is reachable

#### Scenario: User-owned provider disclosure
- **WHEN** the user enables any user-owned preset or custom provider
- **THEN** the UI SHALL disclose that medical record content is sent to the selected third-party model provider

### Requirement: Preset provider registry
The system SHALL provide preset configurations for Gemini, Claude, OpenAI, GLM, DeepSeek, and Kimi where base URL and protocol adapter are system-maintained while model name is user-supplied.

#### Scenario: Preset provider save
- **WHEN** the user saves a preset provider setting
- **THEN** the user SHALL be required to provide provider choice, API key, and model name
- **AND** the browser SHALL NOT send a preset base URL as user-editable configuration

#### Scenario: Preset provider routing
- **WHEN** a saved preset provider is active and the user sends a chat request
- **THEN** `llm-proxy` SHALL route through that provider's server-maintained adapter, server-maintained base URL, and saved model name

### Requirement: Custom OpenAI-style provider
The system SHALL support a custom provider mode with minimal OpenAI-style `/chat/completions` compatibility.

#### Scenario: Custom provider save
- **WHEN** the user saves a custom provider setting
- **THEN** the request SHALL include HTTPS base URL, API key, and model
- **AND** the system SHALL reject missing or invalid values before persisting

#### Scenario: Custom provider routing
- **WHEN** a saved custom provider is active and the user sends a chat request
- **THEN** `llm-proxy` SHALL append `/chat/completions` to the stored base URL and send an OpenAI-style non-streaming request using the stored model

### Requirement: Encrypted key persistence
The system SHALL persist user API keys only through an Edge Function with server-side encryption and owner-scoped RLS storage.

#### Scenario: Plaintext key not readable
- **WHEN** the browser reads the current provider setting
- **THEN** the response SHALL include provider metadata and key presence only
- **AND** the response SHALL NOT include the plaintext API key or encrypted key material

#### Scenario: Secret not leaked in requests or logs
- **WHEN** the browser sends a chat request after a provider setting is saved
- **THEN** the request body SHALL NOT include the user API key
- **AND** error responses SHALL NOT echo the plaintext API key

### Requirement: Provider setting failure handling
The system SHALL fail provider-setting operations without mutating PatientRecord data.

#### Scenario: Bad key or upstream authentication failure
- **WHEN** a user-owned provider key is rejected by the upstream provider during chat
- **THEN** `llm-proxy` SHALL return a stable `ConfigurationError`
- **AND** PatientRecord extraction/editing state SHALL remain on the existing retry path
