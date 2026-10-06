begin;
create or replace function public.has_voted_on(discovery_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.votes where submission_id=discovery_id and user_id=auth.uid()); $$;
revoke execute on function public.has_voted_on(uuid) from public;
grant execute on function public.has_voted_on(uuid) to anon,authenticated;
create or replace function public.search_discovery_feed(feed text default 'Trending', selected_category text default 'All', member_id uuid default null, discovery_id uuid default null, page_offset integer default 0, selected_tag text default null, search_query text default null)
returns setof public.discoveries language sql stable security invoker set search_path='' as $$
 select d.* from public.discoveries d
 where (case when feed='Moderation' then public.is_moderator() and d.status in ('pending','approved')
             when feed='My discoveries' then d.author_id=auth.uid()
             else d.status='approved' and d.image_path is not null end)
 and (feed<>'Unvoted' or auth.uid() is not null and not public.has_voted_on(d.id))
 and (feed<>'Saved' or d.id=any(public.saved_discovery_ids()))
 and (selected_category='All' or d.category=selected_category) and (selected_tag is null or exists(select 1 from public.submissions s where s.id=d.id and s.tags @> array[selected_tag]))
 and (nullif(trim(search_query),'') is null or exists(select 1 from public.submissions s where s.id=d.id and not exists(select 1 from regexp_split_to_table(lower(left(trim(search_query),100)), '\s+') term where strpos(lower(s.title||' '||coalesce(s.description,'')||' '||array_to_string(s.tags,' ')),term)=0)))
 and (member_id is null or d.author_id=member_id)
 and (discovery_id is null or d.id=discovery_id)
 and (feed<>'Hall of Fame' or d.up_votes+d.down_votes>=10 and d.up_votes::bigint*5>(d.up_votes::bigint+d.down_votes)*4)
 and (feed<>'Hall of Bullshit' or d.up_votes+d.down_votes>=10 and d.down_votes::bigint*5>(d.up_votes::bigint+d.down_votes)*4)
 order by
 case when feed='Trending' then (d.up_votes-d.down_votes)::double precision / power(greatest(0,extract(epoch from (now()-d.created_at))/3600)+2,1.5) end desc nulls last,
 case when feed='Hall of Fame' then d.up_votes-d.down_votes end desc nulls last,
 case when feed='Hall of Bullshit' then d.down_votes end desc nulls last,
 case when feed='Hall of Bullshit' then d.up_votes-d.down_votes end asc nulls last,
 d.created_at desc,d.id desc limit 51 offset greatest(0,coalesce(page_offset,0));
$$;
revoke execute on function public.search_discovery_feed(text,text,uuid,uuid,integer,text,text) from public;
grant execute on function public.search_discovery_feed(text,text,uuid,uuid,integer,text,text) to anon,authenticated;
commit;
