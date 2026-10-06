-- Run only in a dedicated Supabase test project after 001_foundation.sql.
-- All fixtures are rolled back, including auth users created by this script.
begin;
insert into auth.users(id) values('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002'),('10000000-0000-0000-0000-000000000003');
update public.profiles set is_moderator=true where id='10000000-0000-0000-0000-000000000003';
insert into public.submissions(id,author_id,title,description,url,category,status) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Test discovery','A discovery for permission tests.','https://example.com/approved','Art','approved'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Pending discovery','A pending discovery for permission tests.','https://example.com/pending','Art','pending');
set local role anon;
do $$ begin
 if exists(select 1 from public.discoveries where status<>'approved') then raise exception 'FAIL: anonymous pending access';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.submissions where status='pending') then raise exception 'FAIL: another user sees pending';end if;
 begin
  update public.profiles set is_moderator=true where id=auth.uid();
  raise exception 'FAIL: user changed moderator role';
 exception when insufficient_privilege then null;end;
 begin
  perform public.moderate_discovery('20000000-0000-0000-0000-000000000001','hidden');
  raise exception 'FAIL: user moderated content';
 exception when raise_exception then if sqlerrm<>'Moderator access required.' then raise;end if;end;
 begin
  perform public.cast_vote('20000000-0000-0000-0000-000000000002',1);
  raise exception 'FAIL: vote on pending content';
 exception when raise_exception then if sqlerrm<>'This discovery is not available.' then raise;end if;end;
end $$;
select public.cast_vote('20000000-0000-0000-0000-000000000001',1);
select public.cast_vote('20000000-0000-0000-0000-000000000001',1);
do $$ begin
 if (select up_votes from public.discoveries where id='20000000-0000-0000-0000-000000000001')<>1 then raise exception 'FAIL: duplicate vote counted';end if;
end $$;
select public.cast_vote('20000000-0000-0000-0000-000000000001',-1);
do $$ begin
 if (select down_votes=1 and up_votes=0 from public.discoveries where id='20000000-0000-0000-0000-000000000001') is not true then raise exception 'FAIL: changing vote';end if;
end $$;
select public.cast_vote('20000000-0000-0000-0000-000000000001',0);
do $$ begin
 if (select down_votes+up_votes from public.discoveries where id='20000000-0000-0000-0000-000000000001')<>0 then raise exception 'FAIL: removing vote';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
set local role authenticated;
select public.moderate_discovery('20000000-0000-0000-0000-000000000001','hidden');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 if exists(select 1 from public.discoveries where id='20000000-0000-0000-0000-000000000001') then raise exception 'FAIL: hidden discovery public';end if;
end $$;
reset role;
rollback;
