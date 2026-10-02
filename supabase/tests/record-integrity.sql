-- Synthetic data only. Exercise real functions and role boundaries, not SQL text.
begin;
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000011'), ('10000000-0000-4000-8000-000000000012');
insert into public.patients(id,user_id,basic_info) values
 ('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011','{"name":"Original"}'),
 ('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000012','{"name":"Other"}');
insert into public.treatment_lines(id,patient_id,line_number,regimen) values
 ('30000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000011',1,'Original regimen'),
 ('30000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000012',1,'Other regimen');
grant select on public.patients, public.treatment_lines, public.lab_results, public.record_shares to anon;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
insert into public.side_effects(patient_id,line_id,symptom,severity,occurred_on) values
 ('20000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000011','Synthetic symptom','mild','2026-10-01');
do $$
declare doc jsonb; before_doc jsonb; batch_result jsonb; saved_batch_id uuid;
begin
 begin
   perform public.persist_patient_record('10000000-0000-4000-8000-000000000012', '{"treatmentLines":[]}');
   raise exception 'Stale account created a patient';
 exception when insufficient_privilege then null; end;
 doc := public.persist_patient_record(auth.uid(), '{"id":"20000000-0000-4000-8000-000000000011","basicInfo":{"name":"Changed"},"treatmentLines":[{"id":"30000000-0000-4000-8000-000000000011","lineNumber":1,"regimen":"Changed regimen"}]}');
 if doc#>>'{basicInfo,name}' <> 'Changed' then raise exception 'Patient update failed'; end if;
 if doc#>>'{treatmentLines,0,id}' <> '30000000-0000-4000-8000-000000000011' then raise exception 'Line ID changed'; end if;
 if not exists(select 1 from public.side_effects where line_id='30000000-0000-4000-8000-000000000011') then raise exception 'Symptom attribution lost'; end if;
 -- Legacy records without line IDs reuse their own line number.
 doc := public.persist_patient_record(auth.uid(), doc #- '{treatmentLines,0,id}');
 if doc#>>'{treatmentLines,0,id}' <> '30000000-0000-4000-8000-000000000011' then raise exception 'Legacy identity lost'; end if;
 before_doc := doc;
 begin
   perform public.persist_patient_record(auth.uid(), jsonb_set(jsonb_set(doc,'{basicInfo,name}','"Must roll back"'),'{treatmentLines,0,id}','"30000000-0000-4000-8000-000000000012"'));
   raise exception 'Foreign child accepted';
 exception when insufficient_privilege then null; end;
 if public.patient_record_document('20000000-0000-4000-8000-000000000011') <> before_doc then raise exception 'Partial patient write'; end if;
 begin
   perform public.persist_patient_record(auth.uid(), jsonb_set(doc,'{labResults}','[{"category":"tumor-marker","itemCode":"cea","itemName":"CEA","value":"not-a-number"}]'));
   raise exception 'Invalid lab value accepted';
 exception when invalid_text_representation then null; end;
 if public.patient_record_document('20000000-0000-4000-8000-000000000011') <> before_doc then raise exception 'Lab failure did not roll back'; end if;
 batch_result := public.save_lab_report_batch('{"patient_id":"20000000-0000-4000-8000-000000000011","category":"tumor-marker","test_date":"2026-10-01","ocr_text":"PRIVATE OCR","source_storage_path":"PRIVATE PATH"}',
   '[{"item_code":"cea","item_name":"CEA","value":6,"source":"ocr"}]');
 saved_batch_id := (batch_result#>>'{batch,id}')::uuid;
 if batch_result->>'status' <> 'saved' then raise exception 'Batch failed'; end if;
 batch_result := public.save_lab_report_batch('{"patient_id":"20000000-0000-4000-8000-000000000011","category":"tumor-marker","test_date":"2026-10-01"}', '[]');
 if batch_result->>'status' <> 'duplicate' then raise exception 'Duplicate not detected'; end if;
 begin
   perform public.save_lab_report_batch('{"patient_id":"20000000-0000-4000-8000-000000000011","category":"tumor-marker","test_date":"2026-10-01"}',
    '[{"item_code":"cea","item_name":"CEA","value":"bad"}]', true);
   raise exception 'Invalid replacement accepted';
 exception when invalid_text_representation then null; end;
 if not exists(select 1 from public.lab_results l where l.batch_id=saved_batch_id and value=6) then raise exception 'Failed replacement destroyed readings'; end if;
 doc := public.persist_patient_record(auth.uid(), doc - 'labResults');
 if jsonb_array_length(doc->'labResults') <> 1 then raise exception 'Omitted labResults removed data'; end if;
 before_doc := doc;
 doc := public.persist_patient_record(auth.uid(), doc);
 if doc->'labResults' <> before_doc->'labResults' then raise exception 'Lab identity or provenance changed'; end if;
 doc := public.persist_patient_record(auth.uid(), jsonb_set(doc,'{treatmentLines}',(doc->'treatmentLines') || '[{"lineNumber":2,"regimen":"New line"}]'));
 if jsonb_array_length(doc->'treatmentLines') <> 2 or doc#>>'{treatmentLines,1,id}' is null then raise exception 'New identity missing'; end if;
end $$;
insert into public.record_shares(id,patient_id,owner_user_id,code_hash,expires_at) values
 ('40000000-0000-4000-8000-000000000011','20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011',repeat('a',64),now()+interval '1 day'),
 ('40000000-0000-4000-8000-000000000012','20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000011',repeat('b',64),now()-interval '1 day');
do $$ begin
 begin
  update public.record_shares set patient_id='20000000-0000-4000-8000-000000000012' where id='40000000-0000-4000-8000-000000000011';
  raise exception 'Share target was editable';
 exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare result jsonb; begin
 result := public.get_shared_patient_record(repeat('a',64));
 if result->>'status' <> 'active' or result#>>'{record,basicInfo,name}' <> 'Changed' then raise exception 'Anonymous code access failed'; end if;
 if result::text ~ 'PRIVATE|user_id|code_hash|source_storage_path|ocr_text' then raise exception 'Internal data leaked'; end if;
 if exists(select 1 from public.patients) or exists(select 1 from public.treatment_lines) or exists(select 1 from public.lab_results) or exists(select 1 from public.record_shares) then raise exception 'Anonymous base-table access'; end if;
 if public.get_shared_patient_record(repeat('b',64))->>'status' <> 'expired' then raise exception 'Expiry ignored'; end if;
 if public.get_shared_patient_record('wrong')->>'status' <> 'unavailable' then raise exception 'Malformed code accepted'; end if;
 if public.get_shared_patient_record(repeat('f',64))->>'status' <> 'unavailable' then raise exception 'Unknown code accepted'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000012',true);
do $$ begin
 if exists(select 1 from public.patients where id='20000000-0000-4000-8000-000000000011') then raise exception 'Foreign table read'; end if;
 if public.get_shared_patient_record(repeat('a',64))->>'status' <> 'active' then raise exception 'Authenticated code access failed'; end if;
 begin
  perform public.persist_patient_record(auth.uid(), '{"id":"20000000-0000-4000-8000-000000000011","treatmentLines":[]}');
  raise exception 'Foreign patient saved';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000011',true);
update public.record_shares set revoked_at=now() where id='40000000-0000-4000-8000-000000000011';
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if public.get_shared_patient_record(repeat('a',64)) <> '{"status":"revoked","record":null}'::jsonb then raise exception 'Revocation ignored'; end if;
end $$;
reset role;
-- A malformed historical share cannot authorize a different owner's patient.
insert into public.record_shares(patient_id,owner_user_id,code_hash,expires_at) values
 ('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000011',repeat('c',64),now()+interval '1 day');
set local role anon;
do $$ begin
 if public.get_shared_patient_record(repeat('c',64))->>'status' <> 'unavailable' then raise exception 'Malformed historical share leaked'; end if;
end $$;
rollback;
select 'Record integrity and sharing checks passed' as result;
