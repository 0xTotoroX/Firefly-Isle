-- Creation retries preserve the complete committed record and its child IDs.
begin;
insert into auth.users(id) values
  ('c0000000-0000-4000-8000-000000000001'), ('c0000000-0000-4000-8000-000000000002');
set local role authenticated;
set local request.jwt.claim.sub = 'c0000000-0000-4000-8000-000000000001';
do $$
declare original jsonb; replay jsonb; edited jsonb; total integer;
  draft jsonb := '{"basicInfo":{"name":"Synthetic draft"},"treatmentLines":[{"lineNumber":1,"regimen":"Synthetic treatment"}],"labResults":[{"category":"blood_routine","itemCode":"wbc","itemName":"WBC","value":5}]}';
begin
  original := public.persist_patient_record(auth.uid(), draft, 'c0000000-0000-4000-8000-000000000011');
  replay := public.persist_patient_record(auth.uid(), draft, 'c0000000-0000-4000-8000-000000000011');
  if original is distinct from replay or original->>'id' <> 'c0000000-0000-4000-8000-000000000011'
    or (select count(*) from public.patients) <> 1
    or (select count(*) from public.treatment_lines) <> 1
    or (select count(*) from public.lab_results) <> 1 then
    raise exception 'Creation retry duplicated or changed the record';
  end if;
  -- A delayed no-ID retry must not reset an edit made after the first save.
  edited := public.persist_patient_record(auth.uid(), jsonb_set(original, '{basicInfo,name}', '"Edited after save"'));
  replay := public.persist_patient_record(auth.uid(), draft, 'c0000000-0000-4000-8000-000000000011');
  if edited is distinct from replay then raise exception 'Late retry overwrote an edit'; end if;
  perform public.persist_patient_record(auth.uid(), draft, 'c0000000-0000-4000-8000-000000000012');
  if (select count(*) from public.patients) <> 2 then raise exception 'New draft did not create separately'; end if;
  -- Existing two-argument clients still create and update through one resolvable RPC.
  original := public.persist_patient_record(auth.uid(), draft);
  if original->>'id' is null then raise exception 'Legacy create call failed'; end if;
  perform public.persist_patient_record(auth.uid(), original);
  select count(*) into total from public.patients;
  begin
    perform public.persist_patient_record(auth.uid(), '{"id":"c0000000-0000-4000-8000-000000000099","treatmentLines":[]}',
      'c0000000-0000-4000-8000-000000000098');
    raise exception 'Explicit unknown patient ID became a create';
  exception when insufficient_privilege then null; end;
  begin
    perform public.persist_patient_record(auth.uid(), jsonb_set(draft, '{labResults,0,value}', '"invalid"'),
      'c0000000-0000-4000-8000-000000000013');
    raise exception 'Invalid creation accepted';
  exception when invalid_text_representation then null; end;
  if (select count(*) from public.patients) <> total then raise exception 'Failed creation left partial data'; end if;
  perform public.persist_patient_record(auth.uid(), draft, 'c0000000-0000-4000-8000-000000000013');
  if (select count(*) from public.patients) <> total + 1 then raise exception 'Failed request UUID cannot retry'; end if;
end $$;
set local request.jwt.claim.sub = 'c0000000-0000-4000-8000-000000000002';
do $$ begin
  begin
    perform public.persist_patient_record(auth.uid(), '{"basicInfo":{"name":"Forbidden"},"treatmentLines":[]}',
      'c0000000-0000-4000-8000-000000000011');
    raise exception 'Another owner reused a creation UUID';
  exception when insufficient_privilege then null; end;
  if public.patient_record_document('c0000000-0000-4000-8000-000000000011') is not null then
    raise exception 'Another owner read the created record';
  end if;
  begin
    perform public.persist_patient_record('c0000000-0000-4000-8000-000000000001', '{"treatmentLines":[]}',
      'c0000000-0000-4000-8000-000000000015');
    raise exception 'Changed account created a record';
  exception when insufficient_privilege then null; end;
end $$;
set local request.jwt.claim.sub = 'c0000000-0000-4000-8000-000000000001';
do $$ begin
  if public.patient_record_document('c0000000-0000-4000-8000-000000000011')#>>'{basicInfo,name}' <> 'Edited after save' then
    raise exception 'Another owner changed the record';
  end if;
end $$;
rollback;
select 'Record creation retry checks passed' as result;
