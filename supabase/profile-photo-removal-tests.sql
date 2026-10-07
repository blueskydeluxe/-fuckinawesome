-- Only two newly created fixtures are changed; the transaction rolls back.
begin;
insert into auth.users(id) values('18000000-0000-0000-0000-000000000020'),('18000000-0000-0000-0000-000000000021');
select set_config('request.jwt.claim.sub','18000000-0000-0000-0000-000000000020',true);
set local role authenticated;
select public.submit_profile_photo('data:image/jpeg;base64,/9j/2Q==');
reset role;
select set_config('request.jwt.claim.sub','18000000-0000-0000-0000-000000000021',true);
set local role authenticated;
do $$begin begin perform public.remove_profile_photo('18000000-0000-0000-0000-000000000020');raise exception 'FAIL other member removal';exception when raise_exception then if sqlerrm<>'You can only remove your own profile photo.' then raise;end if;end;end$$;
reset role;
select set_config('request.jwt.claim.sub','18000000-0000-0000-0000-000000000020',true);
set local role authenticated;
select public.remove_profile_photo('18000000-0000-0000-0000-000000000020');
do $$begin if exists(select 1 from public.profile_photos where user_id='18000000-0000-0000-0000-000000000020' and (pending_image is not null or approved_image is not null)) then raise exception 'FAIL photo remains';end if;end$$;
reset role;
rollback;
