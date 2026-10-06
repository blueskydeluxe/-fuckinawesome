-- All disposable fixtures are rolled back.
begin;
insert into auth.users(id) select md5('fa-reward-fixture-'||i)::uuid from generate_series(0,10) i;
insert into public.photo_uploads(user_id,path) values(md5('fa-reward-fixture-0')::uuid,'test/cover.jpg');
insert into public.submissions(id,author_id,title,description,url,category,image_path)
values('26000000-0000-0000-0000-000000000001',md5('fa-reward-fixture-0')::uuid,'Reward test discovery','Disposable reward verification fixture','https://example.com/fa-reward-fixture','Other','test/cover.jpg');
update public.submissions set status='approved' where id='26000000-0000-0000-0000-000000000001';
insert into public.votes(submission_id,user_id,value) select '26000000-0000-0000-0000-000000000001',md5('fa-reward-fixture-'||i)::uuid,1 from generate_series(0,9) i;
do $$declare r record;begin
 select * into r from public.discovery_rewards(md5('fa-reward-fixture-0')::uuid);
 if r.reputation<>14 or r.awesome_votes<>9 or r.fame<>1 then raise exception 'FAIL self vote exclusion or fame qualification';end if;
 if (select count(*) from public.discovery_notifications where submission_id='26000000-0000-0000-0000-000000000001')<>3 then raise exception 'FAIL approval or milestone notifications';end if;
end$$;
update public.votes set value=-1 where submission_id='26000000-0000-0000-0000-000000000001' and user_id in (md5('fa-reward-fixture-8')::uuid,md5('fa-reward-fixture-9')::uuid);
do $$begin
 if exists(select 1 from public.discovery_feed('Hall of Fame') where id='26000000-0000-0000-0000-000000000001') then raise exception 'FAIL exactly 80 qualifies';end if;
end$$;
update public.votes set value=1 where submission_id='26000000-0000-0000-0000-000000000001';
do $$begin
 if (select count(*) from public.discovery_notifications where submission_id='26000000-0000-0000-0000-000000000001')<>3 then raise exception 'FAIL duplicate notifications';end if;
end$$;
update public.votes set value=-1 where submission_id='26000000-0000-0000-0000-000000000001';
do $$begin
 if (select reputation from public.discovery_rewards(md5('fa-reward-fixture-0')::uuid))<>0 then raise exception 'FAIL bullshit reputation';end if;
end$$;
select set_config('request.jwt.claim.sub',md5('fa-reward-fixture-1'),true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.discovery_notifications) then raise exception 'FAIL another user notification exposure';end if;
 if has_table_privilege('authenticated','public.discovery_notifications','insert') then raise exception 'FAIL forged notifications';end if;
 perform public.read_discovery_notifications();
end$$;
reset role;
do $$begin
 if exists(select 1 from public.discovery_notifications where submission_id='26000000-0000-0000-0000-000000000001' and read_at is not null) then raise exception 'FAIL marking another owner notifications read';end if;
end$$;
select set_config('request.jwt.claim.sub',md5('fa-reward-fixture-0'),true);
set local role authenticated;
select public.read_discovery_notifications();
reset role;
do $$begin
 if exists(select 1 from public.discovery_notifications where submission_id='26000000-0000-0000-0000-000000000001' and read_at is null) then raise exception 'FAIL marking own notifications read';end if;
end$$;
update public.submissions set status='hidden' where id='26000000-0000-0000-0000-000000000001';
do $$begin
 if (select approved from public.discovery_rewards(md5('fa-reward-fixture-0')::uuid))<>0 then raise exception 'FAIL private discoveries counted';end if;
end$$;
rollback;
select 'PASS: reputation, self votes, hall threshold, private notifications, milestone deduplication, read ownership, and unpublished discoveries' as result;
