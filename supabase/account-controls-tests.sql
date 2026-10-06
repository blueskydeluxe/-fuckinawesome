-- Disposable fixtures; every change, including account deletion, is rolled back.
begin;
insert into auth.users(id,email) values
('11000000-0000-0000-0000-000000000001','member-test@example.invalid'),
('11000000-0000-0000-0000-000000000002','other-test@example.invalid'),
('11000000-0000-0000-0000-000000000003','moderator-test@example.invalid');
update public.profiles set is_moderator=true where id='11000000-0000-0000-0000-000000000003';
insert into public.submissions(id,author_id,title,description,url,category,status) values
('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','Deletion test','Disposable test discovery.','https://example.invalid/account-test','Other','approved'),
('21000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000002','Other user test','Disposable other discovery.','https://example.invalid/other-test','Other','approved');
insert into public.votes(submission_id,user_id,value) values
('21000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001',1),
('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002',1);
insert into public.reports(submission_id,reporter_id,reason) values
('21000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000001','My private report reason.'),
('21000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000002','Another private report reason.');
insert into public.moderation_log(moderator_id,submission_id,old_status,new_status) values
('11000000-0000-0000-0000-000000000003','21000000-0000-0000-0000-000000000001','pending','approved');
do $$begin
 if has_function_privilege('anon','public.export_account()','execute') or has_function_privilege('anon','public.delete_own_account(text)','execute') then raise exception 'FAIL: anonymous account control access';end if;
end$$;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$declare data jsonb;begin
 data:=public.export_account();
 if data->'account'->>'email'<>'member-test@example.invalid' or jsonb_array_length(data->'submissions')<>1 or jsonb_array_length(data->'votes')<>1 or jsonb_array_length(data->'reports')<>1 or data->'reports'->0->>'reason'<>'My private report reason.' then raise exception 'FAIL: export isolation';end if;
 begin
 perform public.delete_own_account('wrong');raise exception 'FAIL: confirmation bypass';
 exception when raise_exception then if sqlerrm<>'Type DELETE MY ACCOUNT to confirm.' then raise;end if;end;
end$$;
select public.delete_own_account('DELETE MY ACCOUNT');
do $$begin
 begin
 perform public.export_account();raise exception 'FAIL: deleted user export';
 exception when raise_exception then if sqlerrm<>'Sign in to export your account.' then raise;end if;end;
end$$;
reset role;
do $$begin
 if exists(select 1 from auth.users where id='11000000-0000-0000-0000-000000000001') or exists(select 1 from public.submissions where id='21000000-0000-0000-0000-000000000001') or exists(select 1 from public.votes where user_id='11000000-0000-0000-0000-000000000001') or exists(select 1 from public.reports where reporter_id='11000000-0000-0000-0000-000000000001') then raise exception 'FAIL: deletion incomplete';end if;
 if not exists(select 1 from public.submissions where id='21000000-0000-0000-0000-000000000002') or not exists(select 1 from auth.users where id='11000000-0000-0000-0000-000000000002') then raise exception 'FAIL: other account deleted';end if;
end$$;
select set_config('request.jwt.claim.sub','11000000-0000-0000-0000-000000000003',true);
set local role authenticated;
do $$begin
 begin
 perform public.delete_own_account('DELETE MY ACCOUNT');raise exception 'FAIL: moderator deletion';
 exception when raise_exception then if sqlerrm<>'Moderator accounts must contact support before deletion.' then raise;end if;end;
end$$;
reset role;
rollback;
select 'Account export isolation, deletion, confirmation, and moderator protection passed.' as result;
