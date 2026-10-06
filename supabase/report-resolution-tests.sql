begin;
do $$ begin
 if has_function_privilege('anon','public.resolve_report(uuid)','execute') then
  raise exception 'Anonymous callers must not resolve reports';
 end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
do $$ begin
 begin
  perform public.resolve_report('00000000-0000-0000-0000-000000000000');
  raise exception 'Ordinary account was allowed to resolve a report';
 exception when others then
  if sqlerrm <> 'Moderator access required.' then raise; end if;
 end;
end $$;
reset role;
select 'PASS: anonymous execute denied; ordinary account resolution denied' as result;
rollback;
