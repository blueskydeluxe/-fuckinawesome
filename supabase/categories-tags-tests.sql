begin;
insert into auth.users(id) values(md5('fa-tags-owner')::uuid),(md5('fa-tags-other')::uuid),(md5('fa-tags-mod')::uuid);
update public.profiles set is_moderator=true where id=md5('fa-tags-mod')::uuid;
insert into public.photo_uploads(user_id,path) values(md5('fa-tags-owner')::uuid,'test/tags.jpg');
insert into public.submissions(id,author_id,title,description,url,category,image_path,status,tags) values('29000000-0000-0000-0000-000000000001',md5('fa-tags-owner')::uuid,'Tagged test discovery','','https://example.com/tags-test','Other','test/tags.jpg','approved',array['watches']);
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('fa-tags-owner')::text,true);
select public.suggest_category('Ocean Life','Find discoveries about ocean animals.');
do $$begin
 if not exists(select 1 from public.category_suggestions where user_id=auth.uid() and name='Ocean Life') then raise exception 'FAIL request';end if;
 begin perform public.review_category((select id from public.category_suggestions where user_id=auth.uid()),true);raise exception 'FAIL nonmoderator review';exception when raise_exception then if sqlerrm<>'Moderator access required.' then raise;end if;end;
 begin perform public.set_discovery_tags('29000000-0000-0000-0000-000000000001',array['bad!']);raise exception 'FAIL invalid tag';exception when raise_exception then if sqlerrm not like 'Use up to 5%' then raise;end if;end;
 if not exists(select 1 from public.tagged_discovery_feed(selected_tag=>'watches') where id='29000000-0000-0000-0000-000000000001') then raise exception 'FAIL tag feed';end if;
 if exists(select 1 from public.tagged_discovery_feed(selected_tag=>'cars') where id='29000000-0000-0000-0000-000000000001') then raise exception 'FAIL wrong tag feed';end if;
end$$;
select set_config('request.jwt.claim.sub',md5('fa-tags-other')::text,true);
do $$begin
 if exists(select 1 from public.category_suggestions) then raise exception 'FAIL request privacy';end if;
 begin perform public.set_discovery_tags('29000000-0000-0000-0000-000000000001',array['cars']);raise exception 'FAIL tag ownership';exception when raise_exception then if sqlerrm<>'You can only edit tags on your discoveries.' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',md5('fa-tags-mod')::text,true);
select public.review_category((select id from public.category_suggestions where name='Ocean Life'),true);
do $$begin if not exists(select 1 from public.discovery_categories where name='Ocean Life') then raise exception 'FAIL category activation';end if;end$$;
reset role;
update public.submissions set status='hidden' where id='29000000-0000-0000-0000-000000000001';
set local role anon;
do $$begin if exists(select 1 from public.tagged_discovery_feed(selected_tag=>'watches') where id='29000000-0000-0000-0000-000000000001') then raise exception 'FAIL hidden tag feed';end if;end$$;
select 'PASS: tag validation, privacy, ownership, filtered feed, moderator-only category activation' as result;
rollback;
