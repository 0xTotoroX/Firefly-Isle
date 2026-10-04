-- [INPUT]: 依赖 auth.users、usage_events、plans 与 subscriptions。
-- [OUTPUT]: consume_usage 在同一事务中检查短时/30天额度并记录获准的上游尝试。
-- [POS]: 配额唯一写入边界；规则由数据库控制，客户端不能提交用户ID或额度。
-- [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。

alter table public.plans enable row level security;
create policy plans_select on public.plans for select to authenticated using (true);
revoke insert, update, delete, truncate on public.plans from anon, authenticated;
grant select on public.plans to authenticated;

-- 旧 RPC 没有额度校验；停止允许客户端直接记账。
revoke all on function public.record_usage(text, jsonb) from public, anon, authenticated;

create function public.consume_usage(event_kind text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  anonymous_user boolean;
  checked_at timestamptz;
  selected_plan text;
  month_limit integer;
  minute_limit integer;
  month_used bigint;
  minute_used bigint;
begin
  if caller is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if event_kind is null or event_kind not in ('llm_chat', 'ocr_document') then
    raise exception 'INVALID_USAGE_KIND' using errcode = '22023';
  end if;

  select coalesce(u.is_anonymous, false) into anonymous_user
  from auth.users u where u.id = caller;
  if not found then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  -- 所有 isolate 对同一用户和请求种类串行消费；事务结束自动释放锁。
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text || ':' || event_kind, 0));
  checked_at := clock_timestamp();

  select s.plan_id into selected_plan from public.subscriptions s
  where s.user_id = caller
    and s.status in ('active', 'trialing')
    and s.current_period_end > checked_at;
  selected_plan := coalesce(selected_plan, 'free');

  select case when event_kind = 'llm_chat' then p.ai_chat_quota else p.ocr_quota end
  into month_limit from public.plans p where p.id = selected_plan;
  if month_limit is null then
    raise exception 'USAGE_PLAN_UNAVAILABLE';
  end if;
  minute_limit := case when event_kind = 'ocr_document' then 20 when anonymous_user then 10 else 60 end;

  select count(*), count(*) filter (where e.created_at >= checked_at - interval '1 minute')
  into month_used, minute_used from public.usage_events e
  where e.user_id = caller and e.kind = event_kind
    and e.created_at >= checked_at - interval '30 days';

  if minute_used >= minute_limit then
    return jsonb_build_object('allowed', false, 'reason', 'window');
  end if;
  if month_used >= month_limit then
    return jsonb_build_object('allowed', false, 'reason', 'quota');
  end if;

  insert into public.usage_events (user_id, kind, created_at)
  values (caller, event_kind, checked_at);
  return jsonb_build_object('allowed', true, 'reason', null);
end;
$$;

revoke all on function public.consume_usage(text) from public, anon;
grant execute on function public.consume_usage(text) to authenticated;
