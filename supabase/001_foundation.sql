begin;
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 display_name text not null check(char_length(display_name) between 2 and 40),
 bio text not null default '' check(char_length(bio)<=280),
 is_moderator boolean not null default false
);
create table public.submissions (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles,
 title text not null check(char_length(title) between 5 and 140),
 description text not null check(char_length(description) between 10 and 1000),
 url text not null check(char_length(url)<=2048 and url ~ '^https?://[^[:space:]]+$'),
 category text not null check(category in ('Architecture','Technology','Adventure','Food','Machines','Art','Other')),
 status text not null default 'pending' check(status in ('pending','approved','rejected','hidden')),
 created_at timestamptz not null default now()
);
create table public.votes (
 submission_id uuid references public.submissions on delete cascade,
 user_id uuid references public.profiles on delete cascade,
 value smallint not null check(value in (-1,1)),
 created_at timestamptz not null default now(),
 primary key(submission_id,user_id)
);
create table public.reports (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.submissions on delete cascade,
 reporter_id uuid not null references public.profiles on delete cascade,
 reason text not null check(char_length(reason) between 10 and 500),
 created_at timestamptz not null default now(),
 unique(submission_id,reporter_id)
);
create table public.moderation_log (
 id bigint generated always as identity primary key,
 moderator_id uuid not null references public.profiles,
 submission_id uuid not null references public.submissions,
 old_status text not null, new_status text not null,
 created_at timestamptz not null default now()
);
create index submissions_feed on public.submissions(status,created_at desc);
create index submissions_author on public.submissions(author_id,created_at desc);
create unique index submissions_active_url on public.submissions(url) where status in ('pending','approved');
create index votes_user on public.votes(user_id);
create index reports_user on public.reports(reporter_id,created_at desc);
alter table public.profiles enable row level security;
alter table public.submissions enable row level security;
alter table public.votes enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_log enable row level security;
create function public.is_moderator() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select is_moderator from public.profiles where id=auth.uid()),false);
$$;
create policy profiles_read on public.profiles for select using(true);
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy submissions_read on public.submissions for select using(status='approved' or author_id=auth.uid() or public.is_moderator());
create policy votes_read on public.votes for select using(user_id=auth.uid());
create policy reports_read on public.reports for select using(public.is_moderator());
create policy moderation_read on public.moderation_log for select using(public.is_moderator());
revoke all on public.profiles,public.submissions,public.votes,public.reports,public.moderation_log from anon,authenticated;
grant select on public.profiles,public.submissions to anon,authenticated;
grant update(display_name,bio) on public.profiles to authenticated;
grant select on public.votes,public.reports,public.moderation_log to authenticated;
create function public.create_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,'Discoverer '||left(new.id::text,8));
 return new;
end;$$;
create trigger on_new_user after insert on auth.users for each row execute function public.create_profile();
insert into public.profiles(id,display_name) select id,'Discoverer '||left(id::text,8) from auth.users on conflict do nothing;
create function public.submit_discovery(discovery_title text,discovery_description text,discovery_url text,discovery_category text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to submit.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.submissions where author_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'You can submit up to 10 discoveries per day.';end if;
 if exists(select 1 from public.submissions where url=discovery_url and status in ('pending','approved')) then raise exception 'That link has already been submitted.';end if;
 insert into public.submissions(author_id,title,description,url,category) values(auth.uid(),trim(discovery_title),trim(discovery_description),discovery_url,discovery_category) returning id into result;
 return result;
end;$$;
create function public.cast_vote(discovery_id uuid,vote_value integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to vote.';end if;
 if vote_value not in (-1,0,1) or vote_value is null then raise exception 'Invalid vote.';end if;
 perform 1 from public.submissions where id=discovery_id and status='approved' for update;
 if not found then raise exception 'This discovery is not available.';end if;
 if vote_value=0 then delete from public.votes where submission_id=discovery_id and user_id=auth.uid();
 else insert into public.votes(submission_id,user_id,value) values(discovery_id,auth.uid(),vote_value) on conflict(submission_id,user_id) do update set value=excluded.value;end if;
end;$$;
create function public.report_discovery(discovery_id uuid,report_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to report.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Report limit reached. Try again tomorrow.';end if;
 if not exists(select 1 from public.submissions where id=discovery_id and status='approved') then raise exception 'Discovery unavailable.';end if;
 insert into public.reports(submission_id,reporter_id,reason) values(discovery_id,auth.uid(),trim(report_reason));
end;$$;
create function public.moderate_discovery(discovery_id uuid,new_status text) returns void language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if not public.is_moderator() then raise exception 'Moderator access required.';end if;
 if new_status not in ('approved','rejected','hidden') or new_status is null then raise exception 'Invalid status.';end if;
 select status into previous from public.submissions where id=discovery_id for update;
 if not found then raise exception 'Discovery unavailable.';end if;
 update public.submissions set status=new_status where id=discovery_id;
 insert into public.moderation_log(moderator_id,submission_id,old_status,new_status) values(auth.uid(),discovery_id,previous,new_status);
end;$$;
-- Only aggregate counts are public; individual voters remain private.
create function public.vote_counts(discovery_id uuid) returns table(up_votes bigint,down_votes bigint) language sql stable security definer set search_path='' as $$
 select count(*) filter(where value=1), count(*) filter(where value=-1)
 from public.votes where submission_id=discovery_id and exists(select 1 from public.submissions where id=discovery_id and (status='approved' or author_id=auth.uid() or public.is_moderator()));
$$;
create view public.discoveries with (security_invoker=true) as
 select s.*,p.display_name as author_name,c.up_votes,c.down_votes from public.submissions s join public.profiles p on p.id=s.author_id cross join lateral public.vote_counts(s.id) c;
grant select on public.discoveries to anon,authenticated;
revoke execute on function public.create_profile(),public.is_moderator(),public.submit_discovery(text,text,text,text),public.cast_vote(uuid,integer),public.report_discovery(uuid,text),public.moderate_discovery(uuid,text),public.vote_counts(uuid) from public,anon,authenticated;
grant execute on function public.is_moderator(),public.vote_counts(uuid) to anon,authenticated;
grant execute on function public.submit_discovery(text,text,text,text),public.cast_vote(uuid,integer),public.report_discovery(uuid,text),public.moderate_discovery(uuid,text) to authenticated;
commit;
