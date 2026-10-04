-- [INPUT]: 依赖 Supabase auth.users、PostgreSQL RLS、pgcrypto uuid 与 public.set_patients_updated_at 同类触发器模式。
-- [OUTPUT]: 对外提供 llm_provider_settings 表、加密 key 字段、provider/model 约束、updated_at trigger 与所有者 RLS policy。
-- [POS]: supabase/migrations 的 LLM provider 设置迁移，为用户自带模型密钥提供数据库事实但不存明文。
-- [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
-- 用户自带 provider 只保存当前启用项；系统默认 DeepSeek 由无行状态表达。

create table if not exists public.llm_provider_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  base_url text,
  model text,
  api_key_ciphertext text not null,
  api_key_iv text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id),
  constraint llm_provider_settings_provider_check check (
    provider in ('gemini', 'claude', 'openai', 'glm', 'deepseek', 'kimi', 'custom_openai')
  ),
  constraint llm_provider_settings_custom_shape_check check (
    (
      provider = 'custom_openai'
      and base_url is not null
      and length(trim(base_url)) > 0
      and model is not null
      and length(trim(model)) > 0
    )
    or (
      provider in ('gemini', 'claude', 'openai', 'glm', 'deepseek', 'kimi')
      and base_url is null
      and model is not null
      and length(trim(model)) > 0
    )
  )
);

create index if not exists llm_provider_settings_user_id_idx on public.llm_provider_settings (user_id);

alter table public.llm_provider_settings enable row level security;

drop policy if exists llm_provider_settings_select_own on public.llm_provider_settings;
create policy llm_provider_settings_select_own
  on public.llm_provider_settings
  for select
  using (auth.uid() is not null and user_id = auth.uid());

drop policy if exists llm_provider_settings_insert_own on public.llm_provider_settings;
create policy llm_provider_settings_insert_own
  on public.llm_provider_settings
  for insert
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists llm_provider_settings_update_own on public.llm_provider_settings;
create policy llm_provider_settings_update_own
  on public.llm_provider_settings
  for update
  using (auth.uid() is not null and user_id = auth.uid())
  with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists llm_provider_settings_delete_own on public.llm_provider_settings;
create policy llm_provider_settings_delete_own
  on public.llm_provider_settings
  for delete
  using (auth.uid() is not null and user_id = auth.uid());

create or replace function public.set_llm_provider_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists llm_provider_settings_set_updated_at on public.llm_provider_settings;
create trigger llm_provider_settings_set_updated_at
before update on public.llm_provider_settings
for each row
execute function public.set_llm_provider_settings_updated_at();
