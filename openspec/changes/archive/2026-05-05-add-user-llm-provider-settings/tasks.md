## 1. Tests First

- [x] 1.1 Add failing llm-proxy tests for DeepSeek fallback, saved preset routing, custom routing, bad key errors, and no key leakage.
- [x] 1.2 Add failing frontend LLM provider settings client tests for save/read/delete request contracts and plaintext-key redaction.
- [x] 1.3 Add failing migration/RLS contract tests for encrypted storage fields, provider constraints, and owner policies.
- [x] 1.4 Add failing workspace UI tests for provider settings entry, third-party disclosure, and custom provider fields.

## 2. Backend And Database

- [x] 2.1 Add the `llm_provider_settings` migration with encrypted key fields, provider constraints, updated_at trigger, and RLS policies.
- [x] 2.2 Extend `llm-proxy` runtime config, provider registry, encryption helpers, settings CRUD actions, and user-setting-aware chat routing.
- [x] 2.3 Support Gemini, Claude, OpenAI, GLM, DeepSeek, Kimi, and custom OpenAI-style request adapters with stable error envelopes.

## 3. Frontend

- [x] 3.1 Extend frontend LLM provider types and add a provider settings client that never reads plaintext keys.
- [x] 3.2 Add the compact provider settings UI in the workspace composer flow with preset/custom modes and medical-data disclosure.
- [x] 3.3 Keep normal `chat(messages, options)` calls keyless while settings save/update uses the authenticated Edge Function endpoint.

## 4. Documentation And Gates

- [x] 4.1 Update module maps and source-file headers for new or changed modules.
- [x] 4.2 Run focused tests, `npm run test`, `npm run lint`, `npm run build`, `openspec archive`, `openspec validate --all`, goal completion attempt, and commit.
