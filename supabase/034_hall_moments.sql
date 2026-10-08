begin;
alter table public.submissions add column opening_pick integer check(opening_pick between 1 and 100);
alter table public.submissions add column hall_first_entered_at timestamptz;
-- Existing winners are already winners; never invent a new entry or send retroactive backer alerts.
update public.submissions s set hall_first_entered_at=now() where s.status='approved' and s.deleted_at is null and s.image_path is not null and (select count(*)>=10 and count(*) filter(where v.value=1)*5>count(*)*4 from public.votes v where v.submission_id=s.id);
create function public.cast_vote_with_result(discovery_id uuid,vote_value integer)
returns table(up_votes bigint,down_votes bigint,neutral_votes bigint,entered_hall boolean)
language plpgsql security definer set search_path='' as $$
declare before_up bigint; before_total bigint; after_total bigint;
begin
 if auth.uid() is null then raise exception 'Sign in to vote.';end if;
 perform 1 from public.submissions where id=discovery_id and status='approved' and deleted_at is null and image_path is not null for update;
 if not found then raise exception 'This discovery is not available.';end if;
 select count(*) filter(where value=1),count(*) into before_up,before_total from public.votes where submission_id=discovery_id;
 perform public.cast_vote(discovery_id,vote_value);
 select count(*) filter(where value=1),count(*) filter(where value=-1),count(*) filter(where value=2) into up_votes,down_votes,neutral_votes from public.votes where submission_id=discovery_id;
 after_total:=up_votes+down_votes+neutral_votes;
 entered_hall:=after_total>=10 and up_votes*5>after_total*4 and not(before_total>=10 and before_up*5>before_total*4);
 return next;
end;$$;
create function public.hall_contenders(selected_category text default 'All',selected_tag text default null,search_query text default null,hall_kind text default 'awesome')
returns setof public.discoveries language sql stable security invoker set search_path='' as $$
 select d.* from public.discoveries d
 where d.status='approved' and d.image_path is not null
 and (selected_category='All' or d.category=selected_category)
 and (selected_tag is null or exists(select 1 from public.submissions s,unnest(s.tags) t where s.id=d.id and public.canonical_discovery_tag(t)=public.canonical_discovery_tag(selected_tag)))
 and (nullif(trim(search_query),'') is null or exists(select 1 from public.submissions s where s.id=d.id and not exists(select 1 from regexp_split_to_table(lower(left(trim(search_query),100)), '\s+') term where strpos(lower(s.title||' '||coalesce(s.description,'')||' '||array_to_string(s.tags,' ')),term)=0)))
 and not (d.up_votes+d.down_votes+d.neutral_votes>=10 and (case when hall_kind='bullshit' then d.down_votes else d.up_votes end)*5>(d.up_votes+d.down_votes+d.neutral_votes)*4)
 order by greatest(10-(d.up_votes+d.down_votes+d.neutral_votes),4*(d.up_votes+d.down_votes+d.neutral_votes)-5*(case when hall_kind='bullshit' then d.down_votes else d.up_votes end)+1) asc,
 d.up_votes+d.down_votes+d.neutral_votes desc,d.created_at desc,d.id
 limit 6;
$$;
create function public.opening_discoveries(selected_category text default 'All',selected_tag text default null)
returns setof public.discoveries language sql stable security invoker set search_path='' as $$
 select d.* from public.discoveries d join public.submissions s on s.id=d.id
 where d.status='approved' and d.image_path is not null and (auth.uid() is null or not public.has_voted_on(d.id))
 and (selected_category='All' or d.category=selected_category)
 and (selected_tag is null or exists(select 1 from unnest(s.tags) t where public.canonical_discovery_tag(t)=public.canonical_discovery_tag(selected_tag)))
 order by s.opening_pick asc nulls last,md5(d.id::text||current_date::text),d.id limit 5;
$$;
create function public.notify_hall_backers() returns trigger language plpgsql security definer set search_path='' as $$
declare discovery uuid; owner_id uuid; ups bigint; total bigint;
begin
 discovery:=coalesce(new.submission_id,old.submission_id);
 select author_id into owner_id from public.submissions where id=discovery and status='approved' and deleted_at is null and image_path is not null and hall_first_entered_at is null for update;
 if owner_id is null then return null;end if;
 select count(*) filter(where value=1),count(*) into ups,total from public.votes where submission_id=discovery;
 if total>=10 and ups*5>total*4 then
  insert into public.discovery_notifications(user_id,submission_id,event)
  select v.user_id,discovery,'backed_hall_of_fame' from public.votes v where v.submission_id=discovery and v.value=1 and v.user_id<>owner_id
  on conflict do nothing;
  update public.submissions set hall_first_entered_at=now() where id=discovery;
 end if;return null;
end;$$;
-- PostgreSQL runs same-event triggers alphabetically: backers capture the first entry before the existing owner alert.
create trigger discovery_hall_backers after insert or update or delete on public.votes for each row execute function public.notify_hall_backers();
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.filter_discovery_alert()'::regprocedure) into definition;
 execute replace(definition,'new.event in (''hall_of_fame'',''hall_of_bullshit'')','new.event in (''hall_of_fame'',''hall_of_bullshit'',''backed_hall_of_fame'')');
end $migration$;
revoke all on function public.cast_vote_with_result(uuid,integer),public.hall_contenders(text,text,text,text),public.opening_discoveries(text,text),public.notify_hall_backers() from public,anon,authenticated;
grant execute on function public.cast_vote_with_result(uuid,integer) to authenticated;
grant execute on function public.hall_contenders(text,text,text,text),public.opening_discoveries(text,text) to anon,authenticated;
commit;
