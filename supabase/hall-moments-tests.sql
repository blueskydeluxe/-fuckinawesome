-- Every fixture is rolled back; no real discovery receives a test vote.
begin;
insert into auth.users(id) select md5('hall-moment-user-'||n)::uuid from generate_series(1,12) n;
insert into public.photo_uploads(user_id,path) values(md5('hall-moment-user-1')::uuid,'hall-moment-test.jpg'),(md5('hall-moment-user-1')::uuid,'hall-moment-hidden.jpg');
insert into public.content_screenings(asset_key,verdict) values('discovery:hall-moment-test.jpg','passed');
insert into public.submissions(id,author_id,title,description,url,category,status,image_path,tags,opening_pick) values
 (md5('hall-moment-find')::uuid,md5('hall-moment-user-1')::uuid,'Hall moment fixture','Transaction-only fixture','https://example.com/hall-moment-test','Art','approved','hall-moment-test.jpg',array['hall-moment-test'],1),
 (md5('hall-moment-hidden')::uuid,md5('hall-moment-user-1')::uuid,'Hidden hall fixture','Transaction-only fixture','https://example.com/hall-moment-hidden','Art','pending','hall-moment-hidden.jpg',array['hall-moment-test'],1);
insert into public.discovery_preferences(user_id,rewards) values(md5('hall-moment-user-2')::uuid,false);
set local role anon;
do $$begin
 if (select count(*) from public.opening_discoveries('Art','hall-moment-test'))<>1 then raise exception 'Opening privacy/filter failed';end if;
 if (select count(*) from public.hall_contenders('Art','hall-moment-test'))<>1 then raise exception 'Contender privacy/filter failed';end if;
 if has_function_privilege('anon','public.cast_vote_with_result(uuid,integer)','execute') then raise exception 'Anonymous vote execution allowed';end if;
end$$;
set local role authenticated;
do $$declare n integer; result record;begin
 for n in 2..10 loop
  perform set_config('request.jwt.claim.sub',md5('hall-moment-user-'||n)::uuid::text,true);
  select * into result from public.cast_vote_with_result(md5('hall-moment-find')::uuid,1);
  if result.up_votes<>n-1 or result.entered_hall then raise exception 'Prequalification result wrong';end if;
 end loop;
 perform set_config('request.jwt.claim.sub',md5('hall-moment-user-11')::uuid::text,true);
 select * into result from public.cast_vote_with_result(md5('hall-moment-find')::uuid,2);
 if not result.entered_hall or result.up_votes<>9 or result.neutral_votes<>1 then raise exception 'Neutral qualification result wrong';end if;
 if exists(select 1 from public.hall_contenders('Art','hall-moment-test') where id=md5('hall-moment-find')::uuid) then raise exception 'Winner stayed contender';end if;
 if exists(select 1 from public.opening_discoveries('Art','hall-moment-test') where id=md5('hall-moment-find')::uuid) then raise exception 'Voted item stayed in opening round';end if;
end$$;
reset role;
do $$begin
 if (select count(*) from public.discovery_notifications where submission_id=md5('hall-moment-find')::uuid and event='backed_hall_of_fame')<>8 then raise exception 'Backer alerts or preference exclusion wrong';end if;
 if not exists(select 1 from public.submissions where id=md5('hall-moment-find')::uuid and hall_first_entered_at is not null) then raise exception 'First entry missing';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('hall-moment-user-12')::uuid::text,true);
select * from public.cast_vote_with_result(md5('hall-moment-find')::uuid,1);
do $$begin if exists(select 1 from public.discovery_notifications where event='backed_hall_of_fame' and submission_id=md5('hall-moment-find')::uuid) then raise exception 'Late voter got early backer alert';end if;end$$;
select * from public.cast_vote_with_result(md5('hall-moment-find')::uuid,0);
select 'PASS: confirmed tallies, neutral threshold, first-entry alerts, preferences, unvoted rounds and public filtering' as result;
rollback;
