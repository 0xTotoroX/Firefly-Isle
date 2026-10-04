-- [INPUT]: 既有业务表/RPC、anon/authenticated/service_role 及 owner RLS。
-- [OUTPUT]: 显式 schema、表、列和函数的最小 Data API GRANT/REVOKE。
-- [POS]: 数据暴露权限迁移；区分对象授权与行级隔离，服务端捐赠记账不向客户端开放。
-- [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
-- Explicit Data API exposure, including projects with auto_expose_new_tables=false.
-- RLS remains the row boundary; table grants are restricted to the operations used.
grant usage on schema public to anon, authenticated;

revoke all on table public.patients, public.treatment_lines, public.lab_results,
  public.lab_report_batches, public.llm_provider_settings, public.profiles,
  public.record_shares, public.side_effects, public.follow_up_visits,
  public.usage_events, public.plans, public.subscriptions, public.donations
  from public, anon, authenticated;

grant select, insert, update, delete on table public.patients, public.treatment_lines,
  public.lab_results, public.lab_report_batches, public.llm_provider_settings,
  public.side_effects, public.follow_up_visits to authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select, insert on table public.record_shares to authenticated;
grant update(revoked_at) on table public.record_shares to authenticated;
grant select on table public.usage_events, public.plans, public.subscriptions,
  public.donations to authenticated;
-- All generated business IDs use gen_random_uuid(); no sequence grant is needed.

-- Do not inherit PUBLIC's default EXECUTE or legacy automatic role grants.
-- Trigger functions are invoked by their triggers, not exposed as RPC endpoints.
revoke all on function public.set_patients_updated_at(),
  public.set_lab_report_batches_updated_at(), public.set_llm_provider_settings_updated_at(),
  public.set_profiles_updated_at(), public.handle_new_user(),
  public.set_side_effects_updated_at(), public.set_follow_up_visits_updated_at(),
  public.record_usage(text, jsonb), public.patient_record_document(uuid),
  public.persist_patient_record(uuid, jsonb), public.save_lab_report_batch(jsonb, jsonb, boolean),
  public.dashboard_recent_abnormal_readings(), public.dashboard_next_follow_up(),
  public.consume_usage(text), public.delete_own_account(),
  public.get_shared_patient_record(text),
  public.record_donation_payment(text, text, uuid, integer, text, text)
  from public, anon, authenticated;

grant execute on function public.patient_record_document(uuid),
  public.persist_patient_record(uuid, jsonb), public.save_lab_report_batch(jsonb, jsonb, boolean),
  public.dashboard_recent_abnormal_readings(), public.dashboard_next_follow_up(),
  public.consume_usage(text), public.delete_own_account() to authenticated;
grant execute on function public.get_shared_patient_record(text) to anon, authenticated;
grant execute on function public.record_donation_payment(text, text, uuid, integer, text, text)
  to service_role;
