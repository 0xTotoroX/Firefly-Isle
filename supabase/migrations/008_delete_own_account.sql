-- [INPUT]: 依赖 Supabase auth.users、public 各业务表对 auth.users 的 on delete cascade、PostgreSQL security definer RPC 能力。
-- [OUTPUT]: 对外提供 delete_own_account() security definer RPC，让用户在不引入 service role key 的前提下自服务删除账户并级联清理全部数据。
-- [POS]: supabase/migrations 的隐私合规迁移，为 /settings 的账户删除动作提供数据库事实。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

-- patients / treatment_lines / lab_results / lab_report_batches / llm_provider_settings /
-- record_shares / profiles 全部经 auth.users 外键 on delete cascade 清理；
-- auth.users 自身的 identities / sessions / refresh_tokens 由 Supabase 内部级联。

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  delete from auth.users
  where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
