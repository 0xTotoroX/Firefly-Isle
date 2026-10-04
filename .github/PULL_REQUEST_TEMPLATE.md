## Summary

-

## Verification

- [ ] Verification scope matches the change (incremental by default; see CONTRIBUTING.md)
- Commands / selected test files and results:
- Type/lint, build, database or browser checks performed where relevant:
- Checks omitted and why (documentation-only may mark product checks not applicable):
- Full regression evidence when dependencies/configuration, broad core changes or uncertain impact require it; CI remains the full integration check

## Documentation

- [ ] OpenSpec updated for feature, permission/data or user-flow changes; styling and behavior-preserving cleanup may be marked not applicable
- [ ] Nearest `AGENTS.md` updated, if files, folders, or responsibilities changed
- [ ] Source INPUT / OUTPUT / POS contracts updated, if dependencies, exports, or responsibilities changed
- [ ] Security or privacy notes updated, if auth, RLS, exports, provider keys, or patient-record flows changed

## Commit / PR Title

- [ ] PR title follows Conventional Commits: `<type>[optional scope]: <description>`

Examples:

```text
feat(provider-settings): add user-owned Kimi preset
fix(auth): preserve session after privacy gate redirect
docs(governance): add community health files
```
