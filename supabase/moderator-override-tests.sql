begin;
insert into auth.users(id) values(md5('override-test-owner')::uuid),(md5('override-test-mod')::uuid);
update public.profiles set is_moderator=true where id=md5('override-test-mod')::uuid;
insert into public.photo_uploads(user_id,path) values(md5('override-test-owner')::uuid,'override-test-cover.jpg'),(md5('override-test-owner')::uuid,'override-test-replacement.jpg');
insert into storage.objects(bucket_id,name,metadata) values('discovery-photos','override-test-cover.jpg','{"mimetype":"image/jpeg","size":100}'::jsonb);
insert into public.submissions(id,author_id,title,description,url,category,image_path) values(md5('override-test-find')::uuid,md5('override-test-owner')::uuid,'Override test fixture','Rollback-only review fixture','https://example.com/override-test','Art','override-test-cover.jpg');
insert into public.content_screenings(asset_key,verdict) values('discovery:override-test-cover.jpg','blocked');
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('override-test-owner')::uuid::text,true);
do $$begin
 begin perform public.approve_discovery_as_moderator(md5('override-test-find')::uuid,true);raise exception 'Unauthorized override succeeded';exception when others then if sqlerrm<>'Moderator access required.' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',md5('override-test-mod')::uuid::text,true);
do $$begin
 begin perform public.approve_discovery_as_moderator(md5('override-test-find')::uuid,false);raise exception 'Unchecked review succeeded';exception when others then if sqlerrm<>'Confirm your review before approving.' then raise;end if;end;
 perform public.approve_discovery_as_moderator(md5('override-test-find')::uuid,true);
end$$;
reset role;
do $$begin
 if not exists(select 1 from public.submissions where id=md5('override-test-find')::uuid and status='approved') then raise exception 'Override did not publish';end if;
 if not exists(select 1 from public.discovery_screening_overrides where submission_id=md5('override-test-find')::uuid and moderator_id=md5('override-test-mod')::uuid and image_path='override-test-cover.jpg') then raise exception 'Audit missing';end if;
 if not exists(select 1 from public.content_screenings where asset_key='discovery:override-test-cover.jpg' and verdict='blocked') then raise exception 'Machine verdict overwritten';end if;
 if has_table_privilege('authenticated','public.discovery_screening_overrides','INSERT') or has_function_privilege('anon','public.approve_discovery_as_moderator(uuid,boolean)','EXECUTE') then raise exception 'Permissions too broad';end if;
 update public.submissions set image_path='override-test-replacement.jpg' where id=md5('override-test-find')::uuid;
 if not exists(select 1 from public.submissions where id=md5('override-test-find')::uuid and status='pending') then raise exception 'Changed cover retained approval';end if;
 begin update public.submissions set status='approved' where id=md5('override-test-find')::uuid;raise exception 'Unreviewed replacement published';exception when others then if sqlerrm<>'Image screening or a recorded moderator approval is required.' then raise;end if;end;
end$$;
select 'PASS: moderator override, required confirmation, immutable machine verdict, audit and replacement-cover guard' as result;
rollback;
