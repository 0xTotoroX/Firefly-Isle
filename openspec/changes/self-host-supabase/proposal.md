# Why
Free cloud project pausing interrupts Firefly. Run its existing Supabase backend on the owner-operated Tencent VPS.

# What Changes
Deploy isolated PostgreSQL 17, Auth, REST, Storage and Edge Runtime; preserve production accounts, records, RLS and existing frontend behavior; update HTTPS origins and backend settings. Preserve the cloud project for rollback.

# Capabilities
- New: self-hosted-backend

# Impact
Frontend session compatibility and CSP/PWA origin rules, OAuth callback, server deployment and backup operations. The preparation is integrated into the current SaaS codebase. Production cloud URLs remain in wrangler.jsonc until a separately verified cutover; no visual redesign is included.
