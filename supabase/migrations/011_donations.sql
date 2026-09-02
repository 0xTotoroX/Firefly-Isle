-- [INPUT]: 依赖 010_billing.sql 的 plans/subscriptions、auth.users 与 owner RLS 模式。
-- [OUTPUT]: 对外提供 donations 一次性捐赠表；plans 增加 donation 档；订阅表保留但不作为产品主路径。
-- [POS]: supabase/migrations 的公益捐赠迁移。产品功能全免费，Stripe Checkout 只收一次性捐赠。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

insert into public.plans (id, name, ai_chat_quota, ocr_quota, price_monthly_cents, currency)
values ('donation', 'Donation', 50, 20, 0, 'usd')
on conflict (id) do nothing;

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'usd',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  status text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint donations_amount_positive check (amount_cents > 0),
  constraint donations_status_check check (status in ('pending', 'paid', 'failed', 'refunded'))
);

create index if not exists donations_user_id_idx on public.donations (user_id);

alter table public.donations enable row level security;

drop policy if exists donations_select_own on public.donations;
create policy donations_select_own
  on public.donations
  for select
  using (user_id = auth.uid());
