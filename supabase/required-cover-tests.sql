begin;
insert into auth.users(id) values('14000000-0000-0000-0000-000000000001'),('14000000-0000-0000-0000-000000000002'),('14000000-0000-0000-0000-000000000003');
update public.profiles set is_moderator=true where id='14000000-0000-0000-0000-000000000003';
insert into public.submissions(id,author_id,title,description,url,category,status) values('24000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','Cover fixture','Disposable rollback fixture','https://example.com','Other','approved');
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000003',true);
set local role authenticated;
do $$begin begin perform public.moderate_discovery('24000000-0000-0000-0000-000000000001','approved');raise exception 'FAIL coverless approval';exception when raise_exception then if sqlerrm<>'Add a working cover photo before approval.' then raise;end if;end;end$$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$begin
 if exists(select 1 from public.discovery_feed() where id='24000000-0000-0000-0000-000000000001') then raise exception 'FAIL coverless public feed';end if;
 if has_function_privilege('anon','public.set_discovery_cover(uuid,text)','execute') or has_function_privilege('anon','public.submit_photo(text,text,text,text,text)','execute') then raise exception 'FAIL anonymous cover mutations';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$begin begin perform public.set_discovery_cover('24000000-0000-0000-0000-000000000001','fake.jpg');raise exception 'FAIL other user cover change';exception when raise_exception then if sqlerrm<>'You can only add covers to your own discoveries.' then raise;end if;end;end$$;
reset role;
select set_config('request.jwt.claim.sub','14000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$declare path text;begin
 path:=public.reserve_discovery_cover('24000000-0000-0000-0000-000000000001');
 begin perform public.set_discovery_cover('24000000-0000-0000-0000-000000000001',path);raise exception 'FAIL cover without stored file';exception when raise_exception then if sqlerrm<>'Upload your cover before saving.' then raise;end if;end;
 begin perform public.submit_photo('Cover test','Disposable cover description',path,'Other','https://user:secret@example.com');raise exception 'FAIL credentials URL';exception when raise_exception then if sqlerrm<>'Use a complete public http or https link.' then raise;end if;end;
 if not exists(select 1 from public.discovery_feed('My discoveries') where id='24000000-0000-0000-0000-000000000001') then raise exception 'FAIL owner cannot repair coverless item';end if;
end$$;
reset role;
rollback;
select 'Required covers: approval, public visibility, ownership, file existence, URL safety, and owner repair passed. All fixtures rolled back.' as result;


