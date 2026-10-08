begin;
create or replace function public.hall_contenders(selected_category text default 'All',selected_tag text default null,search_query text default null,hall_kind text default 'awesome')
returns setof public.discoveries language sql stable security invoker set search_path='' as $$
 select d.* from public.discoveries d
 where d.status='approved' and d.image_path is not null
 and (case when hall_kind='bullshit' then d.down_votes else d.up_votes end)>0
 and (selected_category='All' or d.category=selected_category)
 and (selected_tag is null or exists(select 1 from public.submissions s,unnest(s.tags) t where s.id=d.id and public.canonical_discovery_tag(t)=public.canonical_discovery_tag(selected_tag)))
 and (nullif(trim(search_query),'') is null or exists(select 1 from public.submissions s where s.id=d.id and not exists(select 1 from regexp_split_to_table(lower(left(trim(search_query),100)), '\s+') term where strpos(lower(s.title||' '||coalesce(s.description,'')||' '||array_to_string(s.tags,' ')),term)=0)))
 and not (d.up_votes+d.down_votes+d.neutral_votes>=10 and (case when hall_kind='bullshit' then d.down_votes else d.up_votes end)*5>(d.up_votes+d.down_votes+d.neutral_votes)*4)
 order by greatest(10-(d.up_votes+d.down_votes+d.neutral_votes),4*(d.up_votes+d.down_votes+d.neutral_votes)-5*(case when hall_kind='bullshit' then d.down_votes else d.up_votes end)+1) asc,
 d.up_votes+d.down_votes+d.neutral_votes desc,d.created_at desc,d.id
 limit 6;
$$;
commit;
