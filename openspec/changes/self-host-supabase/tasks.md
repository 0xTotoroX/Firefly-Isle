# Tasks

Completed remote checks below are historical results recorded on 2026-09-14, not current production acceptance.
- [x] Inventory production and VPS; restore source project
- [x] Deploy isolated Supabase and HTTPS routing
- [x] Restore data and compare full contents of 17 key tables
- [x] Download and deploy exact production Edge Functions; verify DeepSeek
- [x] Verify anonymous session continuity, password login, CRUD, RLS and shares
- [x] Configure daily backup and restore an archive into a disposable database
- [x] Build and preview the production baseline; verify UI extraction, save and reload
- [ ] Configure SMTP and verify registration/recovery email delivery (credentials needed)
- [ ] Supply original or rotated Google OAuth secret and verify login (credential needed)
- [ ] Validate configured image OCR; validate Gemini credentials and provider selection if PDF support is required
- [x] Integrate migration preparation into the current development branch, retaining production cloud URLs
- [x] Protect migration completion, refresh failure, later legacy events and explicit sign-out with local behavior tests
- [ ] Reconcile target database schema and deploy current SaaS Edge Functions before releasing the integrated frontend
- [ ] Freeze source writes, synchronize final data, switch production and verify
- [ ] After verified production cutover, update production URLs and retire the cloud deploy target
