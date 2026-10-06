begin;
create table public.saved_discoveries(user_id uuid not null references public.profiles on delete cascade,submission_id uuid not null references public.submissions on delete cascade,created_at timestamptz not null default now(),primary key(user_id,submission_id));
alter table public.saved_discoveries enable row level security;
create policy saved_read on public.saved_discoveries for select to authenticated using(user_id=auth.uid());
create policy saved_insert on public.saved_discoveries for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.submissions s where s.id=submission_id and s.status='approved' and s.deleted_at is null and s.image_path is not null));
create policy saved_delete on public.saved_discoveries for delete to authenticated using(user_id=auth.uid());
revoke all on public.saved_discoveries from public,anon,authenticated;
grant select,insert,delete on public.saved_discoveries to authenticated;
create index saved_member_time on public.saved_discoveries(user_id,created_at desc);
create function public.saved_discovery_ids() returns uuid[] language sql stable security definer set search_path='' as $$select coalesce(array_agg(submission_id),'{}'::uuid[]) from public.saved_discoveries where user_id=auth.uid();$$;
revoke execute on function public.saved_discovery_ids() from public,anon,authenticated;
grant execute on function public.saved_discovery_ids() to anon,authenticated;
create function public.weekly_discoverers() returns table(member_id uuid,display_name text,discoveries bigint,awesome_votes bigint,points bigint) language sql stable security definer set search_path='' as $$
 with finds as(select s.id,s.author_id,s.created_at,(select count(*) from public.votes v where v.submission_id=s.id and v.value=1 and v.user_id<>s.author_id and v.created_at>=now()-interval '7 days') as earned,
 (select count(*)>=10 and count(*) filter(where value=-1)*5>count(*)*4 from public.votes v where v.submission_id=s.id) as bullshit
 from public.submissions s where s.status='approved' and s.deleted_at is null and s.image_path is not null),
 scores as(select f.author_id,count(*) filter(where f.created_at>=now()-interval '7 days') as discoveries,sum(f.earned)::bigint as awesome_votes,sum(case when f.bullshit then 0 else (case when f.created_at>=now()-interval '7 days' then 5 else 0 end)+f.earned end)::bigint as points from finds f group by f.author_id),
 eligible as(select * from scores where points>0)
 select e.author_id,p.display_name,e.discoveries,e.awesome_votes,e.points from eligible e join public.profiles p on p.id=e.author_id where (select count(*) from eligible)>=3 order by e.points desc,e.awesome_votes desc,e.author_id limit 10;
$$;
revoke execute on function public.weekly_discoverers() from public,anon,authenticated;
grant execute on function public.weekly_discoverers() to anon,authenticated;
create or replace function public.discovery_feed(feed text default 'Trending', selected_category text default 'All', member_id uuid default null, discovery_id uuid default null, page_offset integer default 0)
returns setof public.discoveries language sql stable security invoker set search_path='' as $$
 select d.* from public.discoveries d
 where (case when feed='Moderation' then public.is_moderator() and d.status in ('pending','approved')
             when feed='My discoveries' then d.author_id=auth.uid()
             else d.status='approved' and d.image_path is not null end)
 and (feed<>'Saved' or d.id=any(public.saved_discovery_ids()))
 and (selected_category='All' or d.category=selected_category)
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




create or replace function public.export_account() returns jsonb
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); result jsonb;
begin
 if member is null or not exists(select 1 from public.profiles where id=member) then raise exception 'Sign in to export your account.';end if;
 select jsonb_build_object(
 'exported_at',now(),
 'account',jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at),
 'profile',(select to_jsonb(p) from public.profiles p where p.id=member),
 'submissions',coalesce((select jsonb_agg(to_jsonb(s)) from public.submissions s where s.author_id=member),'[]'::jsonb),
 'votes',coalesce((select jsonb_agg(to_jsonb(v)) from public.votes v where v.user_id=member),'[]'::jsonb),
 'saved_discoveries',coalesce((select jsonb_agg(to_jsonb(b)) from public.saved_discoveries b where b.user_id=member),'[]'::jsonb),
 'notifications',coalesce((select jsonb_agg(to_jsonb(n)) from public.discovery_notifications n where n.user_id=member),'[]'::jsonb),
 'reports',coalesce((select jsonb_agg(to_jsonb(r)-'resolved_by') from public.reports r where r.reporter_id=member),'[]'::jsonb)
 ) into result from auth.users u where u.id=member;
 return result;
end;$$;

commit;


