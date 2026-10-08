-- Transaction-only fixtures: rolls back every test user and record.
begin;
insert into auth.users(id) select md5('personal-test-user-'||n)::uuid from generate_series(1,11) n;
update public.profiles set is_moderator=true where id=md5('personal-test-user-11')::uuid;
insert into public.photo_uploads(user_id,path) values(md5('personal-test-user-1')::uuid,'personal-test.jpg'),(md5('personal-test-user-2')::uuid,'personal-pending.jpg');
insert into public.content_screenings(asset_key,verdict) values('discovery:personal-test.jpg','passed'),('discovery:personal-pending.jpg','blocked');
insert into public.submissions(id,author_id,title,description,url,category,status,image_path,tags) values
 (md5('personal-approved')::uuid,md5('personal-test-user-1')::uuid,'Personal discovery test','Transaction-only fixture','https://example.com/personal-test','Art','approved','personal-test.jpg',array['watches']),
 (md5('personal-pending')::uuid,md5('personal-test-user-2')::uuid,'Personal pending test','Transaction-only fixture','https://example.com/personal-pending','Art','pending','personal-pending.jpg',array['watches']);
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('personal-test-user-2')::text,true);
select public.set_discovery_follow('tag','watchmaking',true);
select public.set_discovery_follow('discoverer',md5('personal-test-user-1')::uuid::text,true);
do $$begin
 if not exists(select 1 from public.discovery_follows where kind='tag' and target='watches') then raise exception 'Alias was not canonicalized';end if;
 if not exists(select 1 from public.personal_discovery_feed('All',null,md5('personal-approved')::uuid)) then raise exception 'Followed approved discovery missing';end if;
 if exists(select 1 from public.personal_discovery_feed('All',null,md5('personal-pending')::uuid)) then raise exception 'Pending discovery in personal feed';end if;
 if (select screening from public.own_discovery_statuses(array[md5('personal-pending')::uuid]))<>'blocked' then raise exception 'Owner screening status missing';end if;
 if exists(select 1 from public.own_discovery_statuses(array[md5('personal-approved')::uuid])) then raise exception 'Someone else status leaked';end if;
 begin insert into public.discovery_follows values(md5('personal-test-user-1')::uuid,'category','Art',now());raise exception 'Forged follow allowed';exception when insufficient_privilege then null;end;
 begin perform public.discovery_usage_summary();raise exception 'Non moderator metrics access';exception when raise_exception then if sqlerrm<>'Moderator access required.' then raise;end if;end;
end$$;
select public.record_discovery_usage('vote',50);
do $$begin if exists(select 1 from public.discovery_usage) then raise exception 'Default-off measurement recorded data';end if;end$$;
select public.set_discovery_preferences(true,false,false,true);
select public.record_discovery_usage('image',1200);
select public.record_discovery_usage('image',800);
select public.record_discovery_usage('invalid',999);
do $$begin
 if (select count from public.discovery_usage where event='image')<>2 then raise exception 'Measurement count incorrect';end if;
 if (select duration_ms from public.discovery_usage where event='image')<>2000 then raise exception 'Measurement duration incorrect';end if;
 if jsonb_array_length(public.export_account()->'following')<>2 then raise exception 'Following export incorrect';end if;
end$$;
select set_config('request.jwt.claim.sub',md5('personal-test-user-3')::text,true);
do $$begin if exists(select 1 from public.discovery_follows) or exists(select 1 from public.discovery_preferences) or exists(select 1 from public.discovery_usage) then raise exception 'Private follows, preferences or metrics leaked';end if;end$$;
select public.add_discovery_comment(md5('personal-approved')::uuid,'A genuinely great discovery');
select set_config('request.jwt.claim.sub',md5('personal-test-user-1')::text,true);
do $$begin if not exists(select 1 from public.discovery_notifications where event like 'comment:%') then raise exception 'Owner comment alert missing';end if;end$$;
select public.set_discovery_preferences(true,false,false,false);
select set_config('request.jwt.claim.sub',md5('personal-test-user-4')::text,true);
select public.add_discovery_comment(md5('personal-approved')::uuid,'Another thoughtful opinion');
select set_config('request.jwt.claim.sub',md5('personal-test-user-1')::text,true);
do $$begin if (select count(*) from public.discovery_notifications where event like 'comment:%')<>1 then raise exception 'Comment opt-out ignored';end if;end$$;
reset role;
insert into public.votes(user_id,submission_id,value) select md5('personal-test-user-'||n)::uuid,md5('personal-approved')::uuid,-1 from generate_series(1,10) n;
do $$begin if exists(select 1 from public.discovery_notifications where user_id=md5('personal-test-user-1')::uuid and event='hall_of_bullshit') then raise exception 'Reward opt-out ignored';end if;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('personal-test-user-1')::text,true);
select public.set_discovery_preferences(true,false,true,false);
select public.cast_vote(md5('personal-approved')::uuid,1);
do $$begin if not exists(select 1 from public.discovery_notifications where event='hall_of_bullshit') then raise exception 'Hall of Bullshit alert missing';end if;end$$;
select set_config('request.jwt.claim.sub',md5('personal-test-user-11')::text,true);
select public.discovery_usage_summary();
select 'PASS: private follows, canonical interests, personalized feed, ownership, alert preferences, comments, both halls, consent, aggregates, exports' as result;
rollback;
