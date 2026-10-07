begin;
create or replace function public.canonical_discovery_tag(value text) returns text language sql immutable strict security invoker set search_path='' as $$
select case lower(trim(value)) when 'watch' then 'watches' when 'watchmaking' then 'watches' when 'horology' then 'watches' when 'car' then 'cars' when 'automotive' then 'cars' when 'automobile' then 'cars' when 'automobiles' then 'cars' when 'artificial intelligence' then 'ai' else lower(trim(value)) end;
$$;

do $migration$
declare definition text; old_filter text := 's.tags @> array[selected_tag]'; new_filter text := 'exists(select 1 from unnest(s.tags) tag where public.canonical_discovery_tag(tag)=public.canonical_discovery_tag(selected_tag))';
begin
 select pg_get_functiondef('public.search_discovery_feed(text,text,uuid,uuid,integer,text,text)'::regprocedure) into definition;
 if strpos(definition,old_filter)>0 then execute replace(definition,old_filter,new_filter);
 elsif strpos(definition,new_filter)=0 then raise exception 'Unknown feed filter; no change applied'; end if;
 if public.canonical_discovery_tag('watchmaking')<>'watches' or public.canonical_discovery_tag('automotive')<>'cars' or public.canonical_discovery_tag('automotive design')<>'automotive design' then raise exception 'Alias verification failed';end if;
end $migration$;
commit;
