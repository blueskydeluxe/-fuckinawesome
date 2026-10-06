begin;
create or replace function public.discovery_feed(feed text default 'Trending', selected_category text default 'All', member_id uuid default null, discovery_id uuid default null, page_offset integer default 0)
returns setof public.discoveries language sql stable security invoker set search_path='' as $$
 select d.* from public.discoveries d
 where (case when feed='Moderation' then public.is_moderator()
             when feed='My discoveries' then d.author_id=auth.uid()
             else d.status='approved' and d.image_path is not null end)
 and (selected_category='All' or d.category=selected_category)
 and (member_id is null or d.author_id=member_id)
 and (discovery_id is null or d.id=discovery_id)
 order by
 case when feed='Trending' then (d.up_votes-d.down_votes)::double precision / power(greatest(0,extract(epoch from (now()-d.created_at))/3600)+2,1.5) end desc nulls last,
 case when feed='Hall of Fame' then d.up_votes-d.down_votes end desc nulls last,
 d.created_at desc,d.id desc limit 51 offset greatest(0,coalesce(page_offset,0));
$$;

commit;
