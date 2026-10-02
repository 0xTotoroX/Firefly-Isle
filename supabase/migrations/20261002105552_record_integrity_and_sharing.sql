-- Atomic record/batch writes and capability-based sharing. Deploy before the new client.
-- Database identity comes from auth.uid(); all nested identifiers are patient scoped.

create or replace function public.patient_record_document(target_patient_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', p.id, 'basicInfo', p.basic_info, 'clinicalNotes', p.clinical_notes,
    'initialOnset', p.initial_onset, 'followUpStatus', p.follow_up_status,
    'treatmentLines', coalesce((select jsonb_agg(jsonb_build_object(
      'id', t.id, 'lineNumber', t.line_number, 'startDate', t.start_date,
      'endDate', t.end_date, 'regimen', t.regimen, 'biopsy', t.biopsy,
      'immunohistochemistry', t.immunohistochemistry, 'geneticTest', t.genetic_test
    ) order by t.line_number) from public.treatment_lines t where t.patient_id = p.id), '[]'::jsonb),
    'labResults', coalesce((select jsonb_agg(jsonb_build_object(
      'id', l.id, 'batchId', l.batch_id, 'testDate', l.test_date,
      'category', l.category, 'itemCode', l.item_code, 'itemName', l.item_name,
      'value', l.value, 'unit', l.unit, 'referenceLow', l.reference_low,
      'referenceHigh', l.reference_high, 'source', l.source,
      'isDerived', l.is_derived, 'derivationMethod', l.derivation_method
    ) order by l.test_date, l.id) from public.lab_results l where l.patient_id = p.id), '[]'::jsonb)
  )) from public.patients p where p.id = target_patient_id;
$$;
revoke all on function public.patient_record_document(uuid) from public, anon;
grant execute on function public.patient_record_document(uuid) to authenticated;

-- Permit reordering existing lines within a transaction without changing their IDs.
alter table public.treatment_lines drop constraint treatment_lines_patient_id_line_number_key;
alter table public.treatment_lines add constraint treatment_lines_patient_id_line_number_key
  unique (patient_id, line_number) deferrable initially deferred;

create or replace function public.persist_patient_record(expected_owner_id uuid, record jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_variable
declare
  patient_id uuid;
  child_id uuid;
  batch_id uuid;
  item jsonb;
  kept_ids uuid[] := '{}';
begin
  if auth.uid() is null or expected_owner_id is distinct from auth.uid() then
    raise exception 'Account changed or authentication required' using errcode = '42501';
  end if;
  if jsonb_typeof(record) <> 'object' or jsonb_typeof(record->'treatmentLines') is distinct from 'array' then
    raise exception 'Invalid record' using errcode = '22023';
  end if;
  patient_id := nullif(record->>'id', '')::uuid;
  if patient_id is null then
    insert into public.patients(user_id, basic_info) values(auth.uid(), '{}') returning id into patient_id;
  else
    perform 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid() for update;
    if not found then raise exception 'Patient not owned' using errcode = '42501'; end if;
  end if;
  update public.patients p set basic_info = coalesce(record->'basicInfo', '{}'),
    clinical_notes = record->>'clinicalNotes', initial_onset = record->'initialOnset'
    where p.id = patient_id;

  for item in select value from jsonb_array_elements(record->'treatmentLines') loop
    child_id := nullif(item->>'id', '')::uuid;
    if child_id is not null then
      perform 1 from public.treatment_lines t where t.id = child_id and t.patient_id = patient_id;
      if not found then raise exception 'Treatment line not owned by patient' using errcode = '42501'; end if;
    else
      select t.id into child_id from public.treatment_lines t
        where t.patient_id = patient_id and t.line_number = (item->>'lineNumber')::integer;
      child_id := coalesce(child_id, gen_random_uuid());
    end if;
    if child_id = any(kept_ids) then raise exception 'Duplicate treatment line' using errcode = '22023'; end if;
    kept_ids := array_append(kept_ids, child_id);
    insert into public.treatment_lines(id, patient_id, line_number, start_date, end_date, regimen, biopsy, immunohistochemistry, genetic_test)
      values(child_id, patient_id, (item->>'lineNumber')::integer, item->>'startDate', item->>'endDate', item->>'regimen',
        item->>'biopsy', item->>'immunohistochemistry', item->>'geneticTest')
      on conflict(id) do update set line_number = excluded.line_number, start_date = excluded.start_date,
        end_date = excluded.end_date, regimen = excluded.regimen, biopsy = excluded.biopsy,
        immunohistochemistry = excluded.immunohistochemistry, genetic_test = excluded.genetic_test;
  end loop;
  delete from public.treatment_lines t where t.patient_id = patient_id and not (t.id = any(kept_ids));

  if record ? 'labResults' then
    if jsonb_typeof(record->'labResults') is distinct from 'array' then raise exception 'Invalid lab results' using errcode = '22023'; end if;
    kept_ids := '{}';
    for item in select value from jsonb_array_elements(record->'labResults') loop
      child_id := nullif(item->>'id', '')::uuid;
      if child_id is not null then
        perform 1 from public.lab_results l where l.id = child_id and l.patient_id = patient_id;
        if not found then raise exception 'Lab result not owned by patient' using errcode = '42501'; end if;
      end if;
      batch_id := nullif(item->>'batchId', '')::uuid;
      if batch_id is not null then
        perform 1 from public.lab_report_batches b where b.id = batch_id and b.patient_id = patient_id;
        if not found then raise exception 'Lab batch not owned by patient' using errcode = '42501'; end if;
      end if;
      child_id := coalesce(child_id, gen_random_uuid());
      if child_id = any(kept_ids) then raise exception 'Duplicate lab result' using errcode = '22023'; end if;
      kept_ids := array_append(kept_ids, child_id);
      insert into public.lab_results(id, patient_id, batch_id, category, item_code, item_name, value, unit,
          reference_low, reference_high, source, test_date, is_derived, derivation_method)
        values(child_id, patient_id, batch_id, item->>'category', item->>'itemCode', item->>'itemName',
          (item->>'value')::numeric, item->>'unit', (item->>'referenceLow')::numeric, (item->>'referenceHigh')::numeric,
          coalesce(item->>'source', case when (item->>'isDerived')::boolean then 'derived' else 'manual' end),
          item->>'testDate', coalesce((item->>'isDerived')::boolean, false), item->>'derivationMethod')
        on conflict(id) do update set batch_id = excluded.batch_id, category = excluded.category,
          item_code = excluded.item_code, item_name = excluded.item_name, value = excluded.value, unit = excluded.unit,
          reference_low = excluded.reference_low, reference_high = excluded.reference_high, source = excluded.source,
          test_date = excluded.test_date, is_derived = excluded.is_derived, derivation_method = excluded.derivation_method;
    end loop;
    delete from public.lab_results l where l.patient_id = patient_id and not (l.id = any(kept_ids));
  end if;
  return public.patient_record_document(patient_id);
end;
$$;
revoke all on function public.persist_patient_record(uuid, jsonb) from public, anon;
grant execute on function public.persist_patient_record(uuid, jsonb) to authenticated;

create or replace function public.save_lab_report_batch(batch jsonb, readings jsonb, replace_existing boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
#variable_conflict use_variable
declare
  patient_id uuid := (batch->>'patient_id')::uuid;
  saved_batch public.lab_report_batches;
  existing_count integer;
  item jsonb;
  saved_readings jsonb;
begin
  perform 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid() for update;
  if not found then raise exception 'Patient not owned' using errcode = '42501'; end if;
  if jsonb_typeof(readings) is distinct from 'array' then raise exception 'Invalid readings' using errcode = '22023'; end if;
  select count(*) into existing_count from public.lab_report_batches b where b.patient_id = patient_id
    and b.category = batch->>'category' and b.test_date = batch->>'test_date';
  if existing_count > 1 then raise exception 'Multiple existing batches require review' using errcode = '22023'; end if;
  select * into saved_batch from public.lab_report_batches b where b.patient_id = patient_id
    and b.category = batch->>'category' and b.test_date = batch->>'test_date';
  if saved_batch.id is not null and not replace_existing then
    return jsonb_build_object('status', 'duplicate', 'batch', to_jsonb(saved_batch));
  end if;
  insert into public.lab_report_batches(id, patient_id, category, test_date, source_file_name, source_mime_type, source_storage_path, ocr_text, review_status)
    values(coalesce(saved_batch.id, gen_random_uuid()), patient_id, batch->>'category', batch->>'test_date',
      batch->>'source_file_name', batch->>'source_mime_type', batch->>'source_storage_path', batch->>'ocr_text', coalesce(batch->>'review_status', 'confirmed'))
    on conflict(id) do update set source_file_name = excluded.source_file_name, source_mime_type = excluded.source_mime_type,
      source_storage_path = excluded.source_storage_path, ocr_text = excluded.ocr_text, review_status = excluded.review_status
    returning * into saved_batch;
  delete from public.lab_results l where l.batch_id = saved_batch.id and l.patient_id = patient_id;
  for item in select value from jsonb_array_elements(readings) loop
    insert into public.lab_results(patient_id, batch_id, category, test_date, item_code, item_name, value, unit,
        reference_low, reference_high, source, is_derived, derivation_method)
      values(patient_id, saved_batch.id, saved_batch.category, coalesce(item->>'test_date', saved_batch.test_date),
        item->>'item_code', item->>'item_name', (item->>'value')::numeric, item->>'unit',
        (item->>'reference_low')::numeric, (item->>'reference_high')::numeric, coalesce(item->>'source', 'manual'),
        coalesce((item->>'is_derived')::boolean, false), item->>'derivation_method');
  end loop;
  select coalesce(jsonb_agg(to_jsonb(l)), '[]') into saved_readings from public.lab_results l where l.batch_id = saved_batch.id;
  return jsonb_build_object('status', 'saved', 'batch', to_jsonb(saved_batch), 'readings', saved_readings);
end;
$$;
revoke all on function public.save_lab_report_batch(jsonb, jsonb, boolean) from public, anon;
grant execute on function public.save_lab_report_batch(jsonb, jsonb, boolean) to authenticated;

-- An active share does not grant base-table access. Only possession of its hash does.
drop policy if exists patients_select_shared on public.patients;
drop policy if exists treatment_lines_select_shared on public.treatment_lines;
drop policy if exists lab_results_select_shared on public.lab_results;
drop function if exists public.get_record_share_access(text);
revoke update on public.record_shares from authenticated, anon;
grant update(revoked_at) on public.record_shares to authenticated;
drop policy if exists record_shares_update_own on public.record_shares;
create policy record_shares_update_own on public.record_shares for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid() and revoked_at is not null and exists (
    select 1 from public.patients p where p.id = record_shares.patient_id and p.user_id = auth.uid()
  ));
create or replace function public.get_shared_patient_record(share_code_hash text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  shared public.record_shares;
begin
  if share_code_hash is null or share_code_hash !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('status', 'unavailable', 'record', null);
  end if;
  select s.* into shared from public.record_shares s join public.patients p
    on p.id = s.patient_id and p.user_id = s.owner_user_id where s.code_hash = share_code_hash;
  if not found then return jsonb_build_object('status', 'unavailable', 'record', null); end if;
  if shared.revoked_at is not null then return jsonb_build_object('status', 'revoked', 'record', null); end if;
  if shared.expires_at <= now() then return jsonb_build_object('status', 'expired', 'record', null); end if;
  return jsonb_build_object('status', 'active', 'record', public.patient_record_document(shared.patient_id));
end;
$$;
revoke all on function public.get_shared_patient_record(text) from public;
grant execute on function public.get_shared_patient_record(text) to anon, authenticated;
