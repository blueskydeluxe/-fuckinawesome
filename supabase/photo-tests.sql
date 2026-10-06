-- No storage files are modified by SQL. All database fixtures are rolled back.
begin;
insert into auth.users(id) values('12000000-0000-0000-0000-000000000001'),('12000000-0000-0000-0000-000000000002'),('12000000-0000-0000-0000-000000000003');
update public.profiles set is_moderator=true where id='12000000-0000-0000-0000-000000000003';
select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000001',true);
set local role authenticated;
select set_config('test.photo_path',public.reserve_photo_upload(),true);
do $$begin
 if not public.can_upload_photo(current_setting('test.photo_path')) then raise exception 'FAIL owner reserved upload';end if;
 if public.can_upload_photo('someone-else/arbitrary.jpg') then raise exception 'FAIL arbitrary upload';end if;
 begin perform public.submit_photo('Test photo','Disposable photo description.',current_setting('test.photo_path'),'Art');raise exception 'FAIL missing upload accepted';
 exception when raise_exception then if sqlerrm<>'Upload your photo before submitting.' then raise;end if;end;
end$$;
reset role;
insert into public.submissions(id,author_id,title,description,image_path,category,status) values('22000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','Test photo','Disposable photo description.',current_setting('test.photo_path'),'Art','pending');
update public.photo_uploads set submitted_at=now() where path=current_setting('test.photo_path');
set local role authenticated;
do $$begin
 if not public.can_read_photo(current_setting('test.photo_path')) then raise exception 'FAIL owner pending access';end if;
 if public.can_upload_photo(current_setting('test.photo_path')) then raise exception 'FAIL submitted overwrite';end if;
 if (public.submit_photo('Test photo','Disposable photo description.',current_setting('test.photo_path'),'Art'))<>'22000000-0000-0000-0000-000000000001'::uuid then raise exception 'FAIL retry idempotency';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$begin
 if public.can_upload_photo(current_setting('test.photo_path')) or public.can_read_photo(current_setting('test.photo_path')) then raise exception 'FAIL other user pending access';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000003',true);
set local role authenticated;
do $$begin if not public.can_read_photo(current_setting('test.photo_path')) then raise exception 'FAIL moderator pending access';end if;end$$;
select public.moderate_discovery('22000000-0000-0000-0000-000000000001','approved');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$begin
 if not public.can_read_photo(current_setting('test.photo_path')) then raise exception 'FAIL public approved access';end if;
 if has_function_privilege('anon','public.reserve_photo_upload()','execute') or has_function_privilege('anon','public.submit_photo(text,text,text,text)','execute') or has_function_privilege('anon','public.prepare_photo_account_deletion(text)','execute') then raise exception 'FAIL anonymous mutations';end if;
end$$;
reset role;
update public.submissions set status='hidden' where id='22000000-0000-0000-0000-000000000001';
set local role anon;
do $$begin if public.can_read_photo(current_setting('test.photo_path')) then raise exception 'FAIL hidden photo public access';end if;end$$;
reset role;
select set_config('request.jwt.claim.sub','12000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$declare i integer;begin
 for i in 1..10 loop perform public.reserve_photo_upload();end loop;
 begin perform public.reserve_photo_upload();raise exception 'FAIL quota bypass';
 exception when raise_exception then if sqlerrm<>'You can start up to 10 submissions per day. Try again tomorrow.' then raise;end if;end;
 perform public.prepare_photo_account_deletion('DELETE MY ACCOUNT');
 if exists(select 1 from public.photo_uploads where user_id=auth.uid() and public.can_upload_photo(path)) then raise exception 'FAIL upload during deletion';end if;
 perform public.cancel_photo_account_deletion();
 if not exists(select 1 from public.photo_uploads where user_id=auth.uid() and public.can_upload_photo(path)) then raise exception 'FAIL canceled deletion';end if;
end$$;
reset role;
rollback;
select 'Photo privacy, upload ownership, overwrite protection, moderation, retry, quota, and cleanup checks passed.' as result;
