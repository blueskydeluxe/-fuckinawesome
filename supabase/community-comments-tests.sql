-- Run after 028; all fixtures roll back, including comments and auth users.
begin;
insert into auth.users(id) values('28000000-0000-0000-0000-000000000001'),('28000000-0000-0000-0000-000000000002');
do $$begin
 if not public.comment_has_link('example.com!') or not public.comment_has_link('https://example.com') or not public.comment_has_link(U&'https://exa\200Bmple.com') or not public.comment_has_link('www.example.com') then raise exception 'FAIL link blocking';end if;
 if public.comment_has_link('This is 9.5 out of 10. Awesome!') then raise exception 'FAIL ordinary text';end if;
end$$;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$begin begin perform public.add_discovery_comment((select id from public.submissions where status='approved' and deleted_at is null limit 1),'A test opinion.');raise exception 'FAIL guest write';exception when insufficient_privilege then null;end;end$$;
reset role;
select set_config('request.jwt.claim.sub','28000000-0000-0000-0000-000000000001',true);
set local role authenticated;
do $$declare discovery uuid;begin
 select id into discovery from public.submissions where status='approved' and deleted_at is null limit 1;
 if discovery is null then raise exception 'FAIL needs an approved discovery';end if;
 begin perform public.add_discovery_comment(discovery,'example.com!');raise exception 'FAIL linked comment';exception when raise_exception then if sqlerrm<>'Keep comments link-free. Share your thoughts without URLs.' then raise;end if;end;
 perform public.add_discovery_comment(discovery,'Community test: beautiful design.');
 begin perform public.add_discovery_comment(discovery,'Too quick.');raise exception 'FAIL rate limit';exception when raise_exception then if sqlerrm<>'Wait 10 seconds between comments.' then raise;end if;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','28000000-0000-0000-0000-000000000002',true);
set local role authenticated;
do $$declare c uuid;begin
 select id into c from public.discovery_comments where author_id='28000000-0000-0000-0000-000000000001';
 begin perform public.hide_discovery_comment(c);raise exception 'FAIL other member removal';exception when raise_exception then if sqlerrm<>'You can only remove your own comment.' then raise;end if;end;
 perform public.report_discovery_comment(c,'spam');
 if exists(select 1 from public.comment_reports) then raise exception 'FAIL reports leaked';end if;
 begin perform public.resolve_comment_report('28000000-0000-0000-0000-000000000002');raise exception 'FAIL member moderation';exception when raise_exception then if sqlerrm<>'Moderator access required.' then raise;end if;end;
end$$;
reset role;
update public.profiles set is_moderator=true where id='28000000-0000-0000-0000-000000000002';
set local role authenticated;
do $$declare c uuid;begin
 if not exists(select 1 from public.comment_reports where reason='spam') then raise exception 'FAIL moderator reports';end if;
 select id into c from public.discovery_comments where author_id='28000000-0000-0000-0000-000000000001';
 perform public.hide_discovery_comment(c);
 if exists(select 1 from public.comment_reports where resolved_at is null) then raise exception 'FAIL report resolution';end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$begin if exists(select 1 from public.discovery_comments where author_id='28000000-0000-0000-0000-000000000001') then raise exception 'FAIL hidden comment public';end if;end$$;
reset role;
rollback;
