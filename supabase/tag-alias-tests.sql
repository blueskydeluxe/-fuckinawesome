begin;set local role anon;
select (select array_agg(id order by id) from public.search_discovery_feed(selected_tag=>'watches')) is not distinct from (select array_agg(id order by id) from public.search_discovery_feed(selected_tag=>'watchmaking')) as watches_alias_matches,
(select array_agg(id order by id) from public.search_discovery_feed(selected_tag=>'cars')) is not distinct from (select array_agg(id order by id) from public.search_discovery_feed(selected_tag=>'automotive')) as cars_alias_matches;
rollback;
