-- [INPUT]: 依赖 Supabase auth.users、PostgreSQL RLS 与 supabase/migrations 既有 owner RLS 模式。
-- [OUTPUT]: 对外提供 plans 价格档表（含 free/pro 种子行）、subscriptions 订阅表（每用户唯一、状态约束、owner 只读 RLS）。
-- [POS]: supabase/migrations 的计费基座迁移，让 Stripe webhook 与权益消费点共享同一订阅事实源；支付通道上线前所有用户隐式为 free。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

create table if not exists public.plans (
  id text primary key,
  name text not null,
  ai_chat_quota integer not null,
  ocr_quota integer not null,
  price_monthly_cents integer not null default 0,
  currency text not null default 'usd',
  constraint plans_nonnegative_quota_check check (ai_chat_quota >= 0 and ocr_quota >= 0)
);

insert into public.plans (id, name, ai_chat_quota, ocr_quota, price_monthly_cents, currency)
values
  ('free', 'Free', 50, 20, 0, 'usd'),
  ('pro', 'Pro', 1000, 200, 1500, 'usd')
on conflict (id) do nothing;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null references public.plans (id),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscriptions_status_check check (
    status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')
  ),
  unique (user_id)
);

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
  on public.subscriptions
  for select
  using (user_id = auth.uid());

-- 写入只经由持有 SUPABASE_SERVICE_ROLE_KEY 与 STRIPE_SECRET_KEY 的 stripe-webhook 边缘函数；
-- service 密钥只存在于 Supabase function secrets，与 STRIPE_SECRET_KEY 同属服务端边界，不出现在仓库或前端。
