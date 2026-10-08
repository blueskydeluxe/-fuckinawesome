begin;
insert into auth.users(id) values(md5('mod-delete-owner')::uuid),(md5('mod-delete-moderator')::uuid);
update public.profiles set is_moderator=true where id=md5('mod-delete-moderator')::uuid;
insert into public.photo_uploads(user_id,path) values(md5('mod-delete-owner')::uuid,'mod-delete-test.jpg');
insert into public.content_screenings(asset_key,verdict) values('discovery:mod-delete-test.jpg','passed');
insert into public.submissions(id,author_id,title,description,url,category,status,image_path) values(md5('mod-delete-discovery')::uuid,md5('mod-delete-owner')::uuid,'Moderator deletion test','Transaction-only fixture','https://example.com/mod-delete-test','Art','approved','mod-delete-test.jpg');
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('mod-delete-owner')::uuid::text,true);
do $$begin
 begin perform public.remove_discovery_for_review(md5('mod-delete-discovery')::uuid);raise exception 'Nonmoderator deletion allowed';exception when raise_exception then if sqlerrm<>'Moderator access required.' then raise;end if;end;
 begin perform public.permanently_delete_discovery(md5('mod-delete-discovery')::uuid);raise exception 'Nonmoderator purge allowed';exception when raise_exception then if sqlerrm<>'Moderator access required.' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',md5('mod-delete-moderator')::uuid::text,true);
do $$begin
 begin perform public.permanently_delete_discovery(md5('mod-delete-discovery')::uuid);raise exception 'Live discovery purged';exception when raise_exception then if sqlerrm<>'Move this discovery to moderation before permanently deleting it.' then raise;end if;end;
end$$;
select public.remove_discovery_for_review(md5('mod-delete-discovery')::uuid);
do $$begin
 if exists(select 1 from public.search_discovery_feed('Trending') where id=md5('mod-delete-discovery')::uuid) then raise exception 'Removed discovery still public';end if;
 if not exists(select 1 from public.search_discovery_feed('Moderation') where id=md5('mod-delete-discovery')::uuid) then raise exception 'Removed discovery not queued';end if;
 if not exists(select 1 from public.moderation_log where submission_id=md5('mod-delete-discovery')::uuid) then raise exception 'Removal not audited';end if;
end$$;
select public.permanently_delete_discovery(md5('mod-delete-discovery')::uuid);
reset role;
do $$begin if exists(select 1 from public.submissions where id=md5('mod-delete-discovery')::uuid) then raise exception 'Purged discovery remains';end if;end$$;
select 'PASS: moderator-only two-step deletion; public removal, queue and permanent deletion verified' as result;
rollback;
