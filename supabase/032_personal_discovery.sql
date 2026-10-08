begin;
create table public.discovery_follows (
 user_id uuid not null references public.profiles on delete cascade,
 kind text not null check(kind in ('category','tag','discoverer')),
 target text not null check(char_length(target) between 1 and 80),
 created_at timestamptz not null default now(), primary key(user_id,kind,target)
);
create index follows_target on public.discovery_follows(kind,target);
create table public.discovery_preferences (
 user_id uuid primary key references public.profiles on delete cascade,
 approvals boolean not null default true, comments boolean not null default true,
 rewards boolean not null default true, measurement boolean not null default false
);
alter table public.discovery_follows enable row level security;
alter table public.discovery_preferences enable row level security;
create policy follows_own_read on public.discovery_follows for select to authenticated using(user_id=auth.uid());
create policy preferences_own_read on public.discovery_preferences for select to authenticated using(user_id=auth.uid());
revoke all on public.discovery_follows,public.discovery_preferences from public,anon,authenticated;
grant select on public.discovery_follows,public.discovery_preferences to authenticated;

create function public.set_discovery_follow(follow_kind text,follow_target text,following boolean) returns void language plpgsql security definer set search_path='' as $$
declare target_value text;
begin
 if auth.uid() is null then raise exception 'Sign in to follow.';end if;
 if follow_kind is null or follow_kind not in ('category','tag','discoverer') or following is null then raise exception 'Choose a valid interest or discoverer.';end if;
 target_value:=trim(follow_target);
 if follow_kind='tag' then target_value:=public.canonical_discovery_tag(target_value);end if;
 if target_value is null or char_length(target_value) not between 1 and 80 then raise exception 'Choose a valid interest or discoverer.';end if;
 if following then
  if follow_kind='category' and not exists(select 1 from public.discovery_categories where name=target_value) then raise exception 'Category unavailable.';end if;
  if follow_kind='tag' and (target_value !~ '^[a-z0-9]+([ -][a-z0-9]+)*$' or char_length(target_value)>24 or not exists(select 1 from public.submissions s where s.status='approved' and s.deleted_at is null and exists(select 1 from unnest(s.tags) t where public.canonical_discovery_tag(t)=target_value))) then raise exception 'Interest unavailable.';end if;
  if follow_kind='discoverer' and (target_value !~ '^[0-9a-f-]{36}$' or target_value=auth.uid()::text or not exists(select 1 from public.profiles where id::text=target_value)) then raise exception 'Choose another discoverer.';end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,32));
  if (select count(*) from public.discovery_follows where user_id=auth.uid())>=100 and not exists(select 1 from public.discovery_follows where user_id=auth.uid() and kind=follow_kind and target=target_value) then raise exception 'You can follow up to 100 interests and discoverers.';end if;
  insert into public.discovery_follows(user_id,kind,target) values(auth.uid(),follow_kind,target_value) on conflict do nothing;
 else delete from public.discovery_follows where user_id=auth.uid() and kind=follow_kind and target=target_value;
 end if;
end;$$;
create function public.set_discovery_preferences(approval_alerts boolean,comment_alerts boolean,reward_alerts boolean,usage_measurement boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.';end if;
 if approval_alerts is null or comment_alerts is null or reward_alerts is null or usage_measurement is null then raise exception 'Choose your preferences.';end if;
 insert into public.discovery_preferences values(auth.uid(),approval_alerts,comment_alerts,reward_alerts,usage_measurement)
 on conflict(user_id) do update set approvals=excluded.approvals,comments=excluded.comments,rewards=excluded.rewards,measurement=excluded.measurement;
end;$$;

create function public.personal_discovery_feed(selected_category text default 'All',member_id uuid default null,discovery_id uuid default null,page_offset integer default 0,selected_tag text default null,search_query text default null)
returns setof public.discoveries language sql stable security invoker set search_path='' as $$
 select d.* from public.discoveries d
 where auth.uid() is not null and d.status='approved' and d.image_path is not null
 and (selected_category='All' or d.category=selected_category)
 and (member_id is null or d.author_id=member_id) and (discovery_id is null or d.id=discovery_id)
 and (selected_tag is null or exists(select 1 from public.submissions s where s.id=d.id and exists(select 1 from unnest(s.tags) t where public.canonical_discovery_tag(t)=public.canonical_discovery_tag(selected_tag))))
 and (nullif(trim(search_query),'') is null or exists(select 1 from public.submissions s where s.id=d.id and not exists(select 1 from regexp_split_to_table(lower(left(trim(search_query),100)), '\s+') term where strpos(lower(s.title||' '||coalesce(s.description,'')||' '||array_to_string(s.tags,' ')),term)=0)))
 and (not exists(select 1 from public.discovery_follows f where f.user_id=auth.uid()) or exists(
  select 1 from public.discovery_follows f where f.user_id=auth.uid() and
  ((f.kind='category' and f.target=d.category) or (f.kind='discoverer' and f.target=d.author_id::text) or
   (f.kind='tag' and exists(select 1 from public.submissions s,unnest(s.tags) t where s.id=d.id and public.canonical_discovery_tag(t)=f.target)))))
 order by public.has_voted_on(d.id) asc,
 (d.up_votes-d.down_votes)::double precision/power(greatest(0,extract(epoch from (now()-d.created_at))/3600)+2,1.5) desc,d.created_at desc,d.id desc
 limit 51 offset greatest(0,coalesce(page_offset,0));
$$;

create function public.filter_discovery_alert() returns trigger language plpgsql security definer set search_path='' as $$
declare pref public.discovery_preferences;
begin
 select * into pref from public.discovery_preferences where user_id=new.user_id;
 if (new.event in ('approved','rejected','hidden') and pref.approvals=false) or (new.event like 'comment:%' and pref.comments=false) or ((new.event like 'awesome_%' or new.event in ('hall_of_fame','hall_of_bullshit')) and pref.rewards=false) then return null;end if;
 return new;
end;$$;
create trigger discovery_alert_preferences before insert on public.discovery_notifications for each row execute function public.filter_discovery_alert();
create function public.notify_discovery_comment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.discovery_notifications(user_id,submission_id,event)
 select distinct recipients.user_id,new.submission_id,'comment:'||new.id::text from (
 select s.author_id as user_id from public.submissions s where s.id=new.submission_id and s.status='approved' and s.deleted_at is null
 union select c.author_id from public.discovery_comments c where c.submission_id=new.submission_id and c.hidden_at is null
 ) recipients where recipients.user_id<>new.author_id on conflict do nothing;
 return new;
end;$$;
create trigger discovery_comment_alert after insert on public.discovery_comments for each row execute function public.notify_discovery_comment();
create function public.notify_discovery_bullshit() returns trigger language plpgsql security definer set search_path='' as $$
declare discovery uuid; owner_id uuid; ups bigint; downs bigint; neutral bigint;
begin
 discovery:=coalesce(new.submission_id,old.submission_id);
 select author_id into owner_id from public.submissions where id=discovery and status='approved' and deleted_at is null and image_path is not null;
 if owner_id is null then return null;end if;
 select count(*) filter(where value=1),count(*) filter(where value=-1),count(*) filter(where value=2) into ups,downs,neutral from public.votes where submission_id=discovery;
 if ups+downs+neutral>=10 and downs*5>(ups+downs+neutral)*4 then insert into public.discovery_notifications(user_id,submission_id,event) values(owner_id,discovery,'hall_of_bullshit') on conflict do nothing;end if;
 return null;
end;$$;
create trigger discovery_bullshit_alert after insert or update or delete on public.votes for each row execute function public.notify_discovery_bullshit();
create function public.notify_discovery_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('rejected','hidden') and old.status is distinct from new.status and new.deleted_at is null then
  insert into public.discovery_notifications(user_id,submission_id,event) values(new.author_id,new.id,new.status) on conflict(user_id,submission_id,event) do update set created_at=now(),read_at=null;
 end if;return new;
end;$$;
create trigger discovery_review_alert after update of status on public.submissions for each row execute function public.notify_discovery_review();

create function public.own_discovery_statuses(discovery_ids uuid[]) returns table(id uuid,status text,screening text) language sql stable security definer set search_path='' as $$
 select s.id,s.status::text,c.verdict from public.submissions s left join public.content_screenings c on c.asset_key='discovery:'||s.image_path
 where s.author_id=auth.uid() and s.id=any(discovery_ids) and s.deleted_at is null limit 1000;
$$;

create table public.discovery_usage (
 user_id uuid not null references public.profiles on delete cascade,day date not null default current_date,
 event text not null check(event in ('visit','vote','submission','open','share','image','image_error')),
 count integer not null default 0 check(count between 0 and 1000),duration_ms bigint not null default 0,
 primary key(user_id,day,event)
);
alter table public.discovery_usage enable row level security;
create policy usage_own_read on public.discovery_usage for select to authenticated using(user_id=auth.uid());
revoke all on public.discovery_usage from public,anon,authenticated;
grant select on public.discovery_usage to authenticated;
create function public.record_discovery_usage(event_name text,elapsed_ms integer default 0) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.discovery_preferences where user_id=auth.uid() and measurement) then return;end if;
 if event_name is null or event_name not in ('visit','vote','submission','open','share','image','image_error') then return;end if;
 insert into public.discovery_usage(user_id,event,count,duration_ms) values(auth.uid(),event_name,1,greatest(0,least(coalesce(elapsed_ms,0),60000)))
 on conflict(user_id,day,event) do update set count=least(1000,discovery_usage.count+1),duration_ms=discovery_usage.duration_ms+case when discovery_usage.count<1000 then excluded.duration_ms else 0 end;
 -- Bound retention without keeping individual events or page URLs.
 delete from public.discovery_usage where user_id=auth.uid() and day<current_date-90;
end;$$;
create function public.discovery_usage_summary() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_moderator() then raise exception 'Moderator access required.';end if;
 return jsonb_build_object('days',30,'events',coalesce((select jsonb_agg(to_jsonb(stats)) from (select event,sum(count)::bigint as total,case when sum(count)>0 then round(sum(duration_ms)::numeric/sum(count)) else 0 end as average_ms from public.discovery_usage where day>=current_date-29 group by event) stats),'[]'::jsonb),
 'participating_members',(select count(distinct user_id) from public.discovery_usage where day>=current_date-29),
 'returning_members',(select count(*) from (select user_id from public.discovery_usage where day>=current_date-29 and event='visit' group by user_id having count(distinct day)>1) users),
 'following_members',(select count(distinct user_id) from public.discovery_follows));
end;$$;

-- Extend the existing export without disclosing anyone else's follows or settings.
alter function public.export_account() rename to export_account_before_personalization;
revoke all on function public.export_account_before_personalization() from public,anon,authenticated;
create function public.export_account() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.';end if;
 return public.export_account_before_personalization()||jsonb_build_object(
 'following',coalesce((select jsonb_agg(to_jsonb(f)) from public.discovery_follows f where user_id=auth.uid()),'[]'::jsonb),
 'preferences',(select to_jsonb(p) from public.discovery_preferences p where user_id=auth.uid()),
 'usage',coalesce((select jsonb_agg(to_jsonb(u)) from public.discovery_usage u where user_id=auth.uid()),'[]'::jsonb));
end;$$;
revoke all on function public.set_discovery_follow(text,text,boolean),public.set_discovery_preferences(boolean,boolean,boolean,boolean),public.personal_discovery_feed(text,uuid,uuid,integer,text,text),public.own_discovery_statuses(uuid[]),public.record_discovery_usage(text,integer),public.discovery_usage_summary(),public.export_account() from public,anon,authenticated;
grant execute on function public.set_discovery_follow(text,text,boolean),public.set_discovery_preferences(boolean,boolean,boolean,boolean),public.personal_discovery_feed(text,uuid,uuid,integer,text,text),public.own_discovery_statuses(uuid[]),public.record_discovery_usage(text,integer),public.discovery_usage_summary(),public.export_account() to authenticated;
revoke all on function public.filter_discovery_alert(),public.notify_discovery_comment(),public.notify_discovery_bullshit(),public.notify_discovery_review() from public,anon,authenticated;
-- Automatic retention runs independently of a member returning to the site.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('discovery-usage-retention','30 3 * * *',$job$delete from public.discovery_usage where day<current_date-89;$job$);
create function public.remove_discoverer_follows() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from public.discovery_follows where kind='discoverer' and target=old.id::text;return old;end;$$;
create trigger discoverer_follow_cleanup after delete on public.profiles for each row execute function public.remove_discoverer_follows();
revoke all on function public.remove_discoverer_follows() from public,anon,authenticated;
commit;
