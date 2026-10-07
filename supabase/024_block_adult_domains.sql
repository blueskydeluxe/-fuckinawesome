begin;
create function public.block_adult_discovery_links() returns trigger language plpgsql set search_path='' as $$
declare authority text;
begin
 if new.url is not null then
  authority:=lower(split_part(split_part(split_part(regexp_replace(new.url,'^https?://','','i'),'/',1),'?',1),'#',1));
  if authority ~ '(^|[.])onlyfans[.]com[.]?(:[0-9]+)?$' or authority like '%\%%' escape '\' or authority like '%\\%' then raise exception 'OnlyFans links and disguised website addresses are not allowed.';end if;
 end if;return new;
end;$$;
create trigger adult_domain_guard before insert or update of url on public.submissions for each row execute function public.block_adult_discovery_links();
revoke all on function public.block_adult_discovery_links() from public,anon,authenticated;
commit;
