begin;
insert into auth.users(id) values('15000000-0000-0000-0000-000000000001');
update public.profiles set is_moderator=true where id='15000000-0000-0000-0000-000000000001';
insert into public.submissions(id,author_id,title,description,url,category,status) values('25000000-0000-0000-0000-000000000001','15000000-0000-0000-0000-000000000001','Moderation queue fixture','Temporary rollback verification','https://example.com/moderation-queue-check','Other','pending');
select set_config('request.jwt.claim.sub','15000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$begin
 if not exists(select 1 from public.discovery_feed('Moderation') where id='25000000-0000-0000-0000-000000000001') then raise exception 'FAIL pending tile missing';end if;
 perform public.moderate_discovery('25000000-0000-0000-0000-000000000001','rejected');
 if exists(select 1 from public.discovery_feed('Moderation') where id='25000000-0000-0000-0000-000000000001') then raise exception 'FAIL rejected tile remains';end if;
 if not exists(select 1 from public.discovery_feed('My discoveries') where id='25000000-0000-0000-0000-000000000001' and status='rejected') then raise exception 'FAIL owner history missing';end if;
 perform public.moderate_discovery('25000000-0000-0000-0000-000000000001','hidden');
 if exists(select 1 from public.discovery_feed('Moderation') where id='25000000-0000-0000-0000-000000000001') then raise exception 'FAIL hidden tile remains';end if;
end$$;
reset role;
rollback;
select 'Passed: Reject removes the moderation tile; owner history remains; Hide also removes the tile. All test data rolled back.' as result;
