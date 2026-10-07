-- Transaction-only fixtures: no permanent users, discoveries, votes, or notifications.
begin;
insert into auth.users(id) select md5('meh-test-user-'||n)::uuid from generate_series(1,10) n;
insert into public.photo_uploads(user_id,path) values(md5('meh-test-user-1')::uuid,'neutral-test.jpg');
insert into public.content_screenings(asset_key,verdict) values('discovery:neutral-test.jpg','passed');
insert into public.submissions(id,author_id,title,description,url,category,status,image_path) values(md5('meh-test-discovery')::uuid,md5('meh-test-user-1')::uuid,'Neutral voting test','Temporary transaction-only fixture','https://example.com/neutral-test','Other','approved','neutral-test.jpg');
insert into public.votes(user_id,submission_id,value) select md5('meh-test-user-'||n)::uuid,md5('meh-test-discovery')::uuid,case when n<=8 then 1 else 2 end from generate_series(1,10) n;
do $$begin
 if not exists(select 1 from public.discoveries where id=md5('meh-test-discovery')::uuid and up_votes=8 and down_votes=0 and neutral_votes=2) then raise exception 'Neutral aggregation failed';end if;
 if exists(select 1 from public.search_discovery_feed('Hall of Fame','All',null,md5('meh-test-discovery')::uuid,0,null,null)) then raise exception '80 percent must not enter Hall';end if;
 if not exists(select 1 from public.search_discovery_feed('Trending','All',null,md5('meh-test-discovery')::uuid,0,null,null)) then raise exception 'Trending fixture missing';end if;
end$$;
select set_config('request.jwt.claim.sub',md5('meh-test-user-10')::text,true);
set local role authenticated;
select public.cast_vote(md5('meh-test-discovery')::uuid,2);
do $$begin
 if not public.has_voted_on(md5('meh-test-discovery')::uuid) then raise exception 'Meh is not a recorded vote';end if;
 if exists(select 1 from public.search_discovery_feed('Unvoted','All',null,md5('meh-test-discovery')::uuid,0,null,null)) then raise exception 'Meh stayed in Unvoted';end if;
 if (select votes_cast from public.voter_levels(array[md5('meh-test-user-10')::uuid]))<>1 then raise exception 'Meh did not earn level credit';end if;
end$$;
select public.cast_vote(md5('meh-test-discovery')::uuid,0);
do $$begin
 if public.has_voted_on(md5('meh-test-discovery')::uuid) then raise exception 'Undo failed';end if;
 if (select votes_cast from public.voter_levels(array[md5('meh-test-user-10')::uuid]))<>1 then raise exception 'Undo changed earned credit';end if;
end$$;
select public.cast_vote(md5('meh-test-discovery')::uuid,-1);
select public.cast_vote(md5('meh-test-discovery')::uuid,2);
do $$begin
 if not exists(select 1 from public.discoveries where id=md5('meh-test-discovery')::uuid and down_votes=0 and neutral_votes=2) then raise exception 'Switching from Bullshit failed';end if;
 if (select votes_cast from public.voter_levels(array[md5('meh-test-user-10')::uuid]))<>1 then raise exception 'Switching farmed levels';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$begin
 if public.neutral_vote_count(md5('meh-test-discovery')::uuid)<>2 then raise exception 'Public aggregate unavailable';end if;
 begin perform public.cast_vote(md5('meh-test-discovery')::uuid,2);raise exception 'Anonymous voting allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
update public.submissions set deleted_at=now() where id=md5('meh-test-discovery')::uuid;
select set_config('request.jwt.claim.sub',md5('meh-test-user-10')::text,true);
set local role authenticated;
do $$begin
 begin perform public.cast_vote(md5('meh-test-discovery')::uuid,2);raise exception 'Deleted discovery accepted vote';exception when raise_exception then if sqlerrm<>'This discovery is not available.' then raise;end if;end;
end$$;
reset role;
rollback;
