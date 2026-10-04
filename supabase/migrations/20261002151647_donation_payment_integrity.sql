-- [INPUT]: donations、auth.users 与已在 Edge Function 完成验签/付款状态校验的 Checkout 事实。
-- [OUTPUT]: 仅 service_role 可调用的 record_donation_payment；按 session 原子合并，付款/退款不降级，注销后不恢复关联。
-- [POS]: 一次性捐赠记账边界；不发起支付、不授予订阅权益、不处理退款事件。
-- [PROTOCOL]: 依赖、导出或职责变化时更新此头部；仅在模块描述受影响时检查所属模块的 AGENTS.md，已加载且未变化的内容不重读。
create or replace function public.record_donation_payment(
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_user_id uuid,
  p_amount_cents integer,
  p_currency text,
  p_status text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  existing_user_id uuid;
  donation_id uuid;
begin
  if p_checkout_session_id is null or p_checkout_session_id !~ '^cs_[A-Za-z0-9_]+$'
    or (p_payment_intent_id is not null and p_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$')
    or p_amount_cents is null or p_amount_cents <= 0
    or p_currency is null or p_currency !~ '^[a-z]{3}$'
    or p_status is null or p_status not in ('pending', 'paid', 'failed') then
    raise exception 'INVALID_DONATION_PAYMENT' using errcode = '22023';
  end if;

  -- Keep deletion and insertion ordered on the auth row. Historical payments
  -- whose account is already gone are still recorded without a user link.
  select u.id into existing_user_id from auth.users u where u.id = p_user_id for key share;

  insert into public.donations as existing (
    user_id, amount_cents, currency, stripe_checkout_session_id, stripe_payment_intent_id, status
  ) values (
    existing_user_id, p_amount_cents, p_currency, p_checkout_session_id, p_payment_intent_id, p_status
  ) on conflict (stripe_checkout_session_id) do update set
    status = case
      when existing.status = 'refunded' then 'refunded'
      when excluded.status = 'paid' or existing.status = 'paid' then 'paid'
      when excluded.status = 'failed' or existing.status = 'failed' then 'failed'
      else 'pending'
    end,
    stripe_payment_intent_id = coalesce(existing.stripe_payment_intent_id, excluded.stripe_payment_intent_id)
  -- Amount/currency/owner/payment identity are immutable after the first event.
  -- Never update user_id: NULL also represents a deliberately deleted account.
  where existing.amount_cents = excluded.amount_cents
    and existing.currency = excluded.currency
    and (existing.user_id is null or existing.user_id is not distinct from excluded.user_id)
    and (existing.stripe_payment_intent_id is null or excluded.stripe_payment_intent_id is null
      or existing.stripe_payment_intent_id = excluded.stripe_payment_intent_id)
  returning id into donation_id;

  if donation_id is null then
    raise exception 'DONATION_PAYMENT_CONFLICT' using errcode = '22023';
  end if;
  return donation_id;
end;
$$;

revoke all on function public.record_donation_payment(text, text, uuid, integer, text, text) from public, anon, authenticated;
grant usage on schema public to service_role;
grant execute on function public.record_donation_payment(text, text, uuid, integer, text, text) to service_role;
