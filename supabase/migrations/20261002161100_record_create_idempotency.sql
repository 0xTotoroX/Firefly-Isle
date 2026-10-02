-- A draft supplies one creation UUID and keeps it for retries until saved/reset.
-- The UUID becomes the patient ID; existing record.id still means owner-only update.
-- Replace the signature instead of overloading it: PostgREST can resolve both old
-- two-argument clients and new clients with the optional third argument.
drop function public.persist_patient_record(uuid, jsonb);

create function public.persist_patient_record(expected_owner_id uuid, record jsonb, create_request_id uuid default null)
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
    insert into public.patients(id, user_id, basic_info)
      values(coalesce(create_request_id, gen_random_uuid()), auth.uid(), '{}')
      on conflict(id) do nothing returning id into patient_id;
    if patient_id is null then
      -- The unique index waits for a concurrent creator to commit or roll back.
      -- A retry returns the committed record without overwriting later edits.
      select p.id into patient_id from public.patients p
        where p.id = create_request_id and p.user_id = auth.uid() for update;
      if not found then raise exception 'Patient not owned' using errcode = '42501'; end if;
      return public.patient_record_document(patient_id);
    end if;
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
revoke all on function public.persist_patient_record(uuid, jsonb, uuid) from public, anon;
grant execute on function public.persist_patient_record(uuid, jsonb, uuid) to authenticated;
