begin;
insert into auth.users(id) values('17000000-0000-0000-0000-000000000001');
insert into public.photo_uploads(user_id,path) values('17000000-0000-0000-0000-000000000001','test/quick-cover.jpg');
insert into public.submissions(author_id,title,description,image_path,category) values('17000000-0000-0000-0000-000000000001','Quick screenshot','', 'test/quick-cover.jpg','Other');
do $$begin
 begin update public.submissions set description=repeat('x',1001) where author_id='17000000-0000-0000-0000-000000000001';raise exception 'FAIL description bound';exception when check_violation then null;end;
 if has_function_privilege('anon','public.submit_photo(text,text,text,text,text)','execute') then raise exception 'FAIL unauthenticated submission';end if;
end$$;
select set_config('request.jwt.claim.sub','17000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$begin
 begin perform public.submit_photo('Quick screenshot','','test/missing.jpg','Other',null);raise exception 'FAIL missing cover';exception when raise_exception then if sqlerrm<>'Photo upload expired or unavailable. Choose the photo again.' then raise;end if;end;
end$$;
reset role;
rollback;
select 'PASS: optional description, description length limit, authenticated submissions, and cover requirement' as result;
