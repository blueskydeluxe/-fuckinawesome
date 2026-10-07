begin;
create or replace function public.block_adult_discovery_links() returns trigger language plpgsql set search_path='' as $$
declare authority text;
begin
 if new.url is not null then
  authority:=lower(split_part(split_part(split_part(regexp_replace(new.url,'^https?://','','i'),'/',1),'?',1),'#',1));
  if authority ~ '(^|[.])(onlyfans[.]com|fansly[.]com|fanvue[.]com|loyalfans[.]com|justfor[.]fans|fancentro[.]com|manyvids[.]com|clips4sale[.]com|pornhub[.]com|xvideos[.]com|xhamster[.]com|redtube[.]com|youporn[.]com|chaturbate[.]com|stripchat[.]com|bongacams[.]com|cam4[.]com|camsoda[.]com|adultwork[.]com)[.]?(:[0-9]+)?$' or authority like '%\%%' escape '\' or authority like '%\\%' then raise exception 'Adult websites, adult-content sales platforms, and disguised website addresses are not allowed.';end if;
 end if;return new;
end;$$;

revoke all on function public.block_adult_discovery_links() from public,anon,authenticated;
commit;
