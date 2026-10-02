-- [INPUT]: 全部业务迁移、合成账号及 service_role；无 Stripe 或外部网络调用。
-- [OUTPUT]: 捐赠状态、重复事件、不可变付款事实、RPC 权限与注销重放的真实 SQL 断言。
-- [POS]: 事务内回滚；独立连接的竞争由 check-clinical-workflows.sh 补充。
-- [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
begin;
insert into auth.users (id) values
  ('d0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002');

set local role service_role;
do $$
declare first_id uuid; repeated_id uuid;
begin
  first_id := public.record_donation_payment('cs_delayed', null, 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'pending');
  repeated_id := public.record_donation_payment('cs_delayed', 'pi_delayed', 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'paid');
  if first_id is distinct from repeated_id then raise exception 'payment success created another donation'; end if;
  repeated_id := public.record_donation_payment('cs_delayed', null, 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'pending');
  if first_id is distinct from repeated_id then raise exception 'replayed completion created another donation'; end if;
  perform public.record_donation_payment('cs_delayed', 'pi_delayed', 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'failed');
  perform public.record_donation_payment('cs_failed', null, 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'failed');
  perform public.record_donation_payment('cs_failed', null, 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'pending');
  perform public.record_donation_payment('cs_other', 'pi_other', 'd0000000-0000-4000-8000-000000000002', 2000, 'usd', 'paid');
  perform public.record_donation_payment('cs_refunded', 'pi_refunded', 'd0000000-0000-4000-8000-000000000002', 1500, 'usd', 'paid');
end $$;
reset role;
do $$ begin
  if (select count(*) from public.donations where stripe_checkout_session_id = 'cs_delayed') <> 1
    or not exists (select 1 from public.donations where stripe_checkout_session_id = 'cs_delayed'
      and status = 'paid' and stripe_payment_intent_id = 'pi_delayed') then
    raise exception 'duplicate or late notification changed the settled payment';
  end if;
  if not exists (select 1 from public.donations where stripe_checkout_session_id = 'cs_failed' and status = 'failed') then
    raise exception 'late pending notification reverted a failed payment';
  end if;
end $$;
update public.donations set status = 'refunded' where stripe_checkout_session_id = 'cs_refunded';

set local role service_role;
select public.record_donation_payment('cs_failed', 'pi_recovered', 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'paid');
select public.record_donation_payment('cs_refunded', 'pi_refunded', 'd0000000-0000-4000-8000-000000000002', 1500, 'usd', 'paid');
select public.record_donation_payment('cs_refunded', null, 'd0000000-0000-4000-8000-000000000002', 1500, 'usd', 'pending');
do $$ begin
  begin
    perform public.record_donation_payment('cs_delayed', 'pi_delayed', 'd0000000-0000-4000-8000-000000000001', 2000, 'usd', 'paid');
    raise exception 'amount changed on an existing payment';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.record_donation_payment('cs_delayed', 'pi_delayed', 'd0000000-0000-4000-8000-000000000001', 1500, 'eur', 'paid');
    raise exception 'currency changed on an existing payment';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.record_donation_payment('cs_delayed', 'pi_delayed', 'd0000000-0000-4000-8000-000000000002', 1500, 'usd', 'paid');
    raise exception 'another account took ownership of a payment';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.record_donation_payment('cs_delayed', 'pi_another', 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'paid');
    raise exception 'payment intent changed on an existing payment';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.record_donation_payment('cs_invalid', null, null, 0, 'usd', 'paid');
    raise exception 'zero amount accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.record_donation_payment('cs_invalid', null, null, 1500, 'usd', 'refunded');
    raise exception 'checkout handler can set refund state';
  exception when invalid_parameter_value then null; end;
end $$;

set local role anon;
do $$ begin
  begin
    perform public.record_donation_payment('cs_client', null, null, 1500, 'usd', 'paid');
    raise exception 'unauthenticated API client forged a payment';
  exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
set local request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
do $$ begin
  begin
    perform public.record_donation_payment('cs_client', null, auth.uid(), 1500, 'usd', 'paid');
    raise exception 'authenticated API client forged a payment';
  exception when insufficient_privilege then null; end;
end $$;
select public.delete_own_account();

-- Both a replay and a newly delivered historical payment must survive account
-- deletion without reattaching ownership or failing their foreign key.
set local role service_role;
select public.record_donation_payment('cs_delayed', 'pi_delayed', 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'paid');
select public.record_donation_payment('cs_after_deletion', 'pi_after_deletion', 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'paid');
reset role;
insert into auth.users (id) values ('d0000000-0000-4000-8000-000000000001');
set local role service_role;
select public.record_donation_payment('cs_delayed', 'pi_delayed', 'd0000000-0000-4000-8000-000000000001', 1500, 'usd', 'paid');
reset role;
do $$ begin
  if (select count(*) from public.donations where stripe_checkout_session_id = 'cs_delayed') <> 1 then
    raise exception 'account deletion replay created duplicate rows';
  end if;
  if exists (select 1 from public.donations where stripe_checkout_session_id in ('cs_delayed', 'cs_after_deletion') and user_id is not null) then
    raise exception 'historical payment restored a deleted account link';
  end if;
  if not exists (select 1 from public.donations where stripe_checkout_session_id = 'cs_failed' and status = 'paid') then
    raise exception 'confirmed payment did not supersede earlier failure';
  end if;
  if not exists (select 1 from public.donations where stripe_checkout_session_id = 'cs_refunded' and status = 'refunded') then
    raise exception 'replayed checkout reverted a refund';
  end if;
  if not exists (select 1 from public.donations where stripe_checkout_session_id = 'cs_other'
    and user_id = 'd0000000-0000-4000-8000-000000000002' and status = 'paid' and amount_cents = 2000) then
    raise exception 'another account payment changed';
  end if;
end $$;
rollback;
select 'Donation payment database checks passed' as result;
