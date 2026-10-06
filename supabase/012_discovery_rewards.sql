begin;
create table public.discovery_notifications (
 id bigint generated always as identity primary key,
 user_id uuid not null references public.profiles on delete cascade,
 submission_id uuid not null references public.submissions on delete cascade,
 event text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(user_id,submission_id,event)
);
alter table public.discovery_notifications enable row level security;
create policy notifications_read on public.discovery_notifications for select to authenticated using(user_id=auth.uid());
revoke all on public.discovery_notifications from public,anon,authenticated;
grant select on public.discovery_notifications to authenticated;
create function public.read_discovery_notifications() returns void language sql security definer set search_path='' as $$
 update public.discovery_notifications set read_at=now() where user_id=auth.uid() and read_at is null;
$$;
create function public.discovery_rewards(member_id uuid) returns table(approved bigint,awesome_votes bigint,reputation bigint,fame bigint) language sql stable security definer set search_path='' as $$
 with finds as (
 select s.id,c.up_votes,c.down_votes,
 (select count(*) from public.votes v where v.submission_id=s.id and v.value=1 and v.user_id<>s.author_id) as earned
 from public.submissions s cross join lateral (select count(*) filter(where v.value=1) as up_votes,count(*) filter(where v.value=-1) as down_votes from public.votes v where v.submission_id=s.id) c
 where s.author_id=member_id and s.status='approved' and s.deleted_at is null and s.image_path is not null
 ) select count(*),coalesce(sum(earned),0)::bigint,
 coalesce(sum(case when up_votes+down_votes>=10 and down_votes*5>(up_votes+down_votes)*4 then 0 else 5+earned end),0)::bigint,
 count(*) filter(where up_votes+down_votes>=10 and up_votes*5>(up_votes+down_votes)*4) from finds;
$$;
create function public.notify_discovery_reward() returns trigger language plpgsql security definer set search_path='' as $$
declare discovery uuid; owner_id uuid; ups bigint; downs bigint; milestone integer;
begin
 if tg_table_name='submissions' then
  if new.status='approved' and old.status is distinct from 'approved' and new.deleted_at is null then
   insert into public.discovery_notifications(user_id,submission_id,event) values(new.author_id,new.id,'approved') on conflict do nothing;
  end if;
  return new;
 end if;
 discovery:=coalesce(new.submission_id,old.submission_id);
 select author_id into owner_id from public.submissions where id=discovery and status='approved' and deleted_at is null and image_path is not null;
 if owner_id is null then return null;end if;
 select count(*) filter(where value=1),count(*) filter(where value=-1) into ups,downs from public.votes where submission_id=discovery;
 foreach milestone in array array[10,25,50,100] loop
  if ups>=milestone then insert into public.discovery_notifications(user_id,submission_id,event) values(owner_id,discovery,'awesome_'||milestone) on conflict do nothing;end if;
 end loop;
 if ups+downs>=10 and ups*5>(ups+downs)*4 then
  insert into public.discovery_notifications(user_id,submission_id,event) values(owner_id,discovery,'hall_of_fame') on conflict do nothing;
 end if;
 return null;
end;$$;
create trigger discovery_approved_reward after update of status on public.submissions for each row execute function public.notify_discovery_reward();
create trigger discovery_vote_reward after insert or update or delete on public.votes for each row execute function public.notify_discovery_reward();
revoke execute on function public.notify_discovery_reward(),public.read_discovery_notifications(),public.discovery_rewards(uuid) from public,anon,authenticated;
grant execute on function public.read_discovery_notifications() to authenticated;
grant execute on function public.discovery_rewards(uuid) to anon,authenticated;

create or replace function public.discovery_feed(feed text default 'Trending', selected_category text default 'All', member_id uuid default null, discovery_id uuid default null, page_offset integer default 0)
returns setof public.discoveries language sql stable security invoker set search_path='' as $$
 select d.* from public.discoveries d
 where (case when feed='Moderation' then public.is_moderator() and d.status in ('pending','approved')
             when feed='My discoveries' then d.author_id=auth.uid()
             else d.status='approved' and d.image_path is not null end)
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




commit;
