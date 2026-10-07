begin;
-- Approved uploads always win. Only provider image URLs, never other auth metadata, are public.
create or replace function public.public_profile_photos(member_ids uuid[]) returns table(user_id uuid,image_data text) language sql stable security definer set search_path='' as $$
 select p.id,coalesce(f.approved_image,case when coalesce(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture') ~ '^https://([a-zA-Z0-9-]+\.)*(googleusercontent\.com|facebook\.com|fbcdn\.net)/' then coalesce(u.raw_user_meta_data->>'avatar_url',u.raw_user_meta_data->>'picture') end)
 from public.profiles p left join public.profile_photos f on f.user_id=p.id left join auth.users u on u.id=p.id where p.id=any(member_ids) limit 100;
$$;
create function public.comment_has_link(body text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(normalize(translate(body,U&'\200B\200C\200D\FEFF',''),NFKC) ~* '([a-z][a-z0-9+.-]*://|www[[:space:]]*\.|([[:alnum:]-]+\.)+[[:alpha:]]{2,63}([^[:alnum:]_]|$)|</?[a-z])',false);
$$;
create table public.discovery_comments (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.submissions on delete cascade,
 author_id uuid not null references public.profiles on delete cascade,body text not null check(char_length(trim(body)) between 1 and 1000 and not public.comment_has_link(body)),
 created_at timestamptz not null default now(),hidden_at timestamptz,hidden_by uuid references public.profiles on delete set null
);
create index comments_discovery on public.discovery_comments(submission_id,created_at desc);
create index comments_author on public.discovery_comments(author_id,created_at desc);
create table public.comment_reports (
 id uuid primary key default gen_random_uuid(),comment_id uuid not null references public.discovery_comments on delete cascade,
 reporter_id uuid not null references public.profiles on delete cascade,reason text not null check(reason in ('spam','hate speech','adult content')),
 created_at timestamptz not null default now(),resolved_at timestamptz,unique(comment_id,reporter_id)
);
alter table public.discovery_comments enable row level security;
alter table public.comment_reports enable row level security;
create policy comments_read on public.discovery_comments for select using ((hidden_at is null and exists(select 1 from public.submissions s where s.id=submission_id and s.status='approved' and s.deleted_at is null)) or public.is_moderator());
create policy comment_reports_read on public.comment_reports for select to authenticated using(public.is_moderator());
revoke all on public.discovery_comments,public.comment_reports from anon,authenticated;
grant select on public.discovery_comments to anon,authenticated;
grant select on public.comment_reports to authenticated;
create function public.add_discovery_comment(discovery_id uuid,comment_body text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to comment.';end if;
 if comment_body is null or char_length(trim(comment_body)) not between 1 and 1000 then raise exception 'Use 1–1000 characters.';end if;
 if public.comment_has_link(comment_body) then raise exception 'Keep comments link-free. Share your thoughts without URLs.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,28));
 if (select count(*) from public.discovery_comments where author_id=auth.uid() and created_at>now()-interval '1 day')>=40 then raise exception 'Daily comment limit reached.';end if;
 if exists(select 1 from public.discovery_comments where author_id=auth.uid() and created_at>now()-interval '10 seconds') then raise exception 'Wait 10 seconds between comments.';end if;
 perform 1 from public.submissions where id=discovery_id and status='approved' and deleted_at is null for share;
 if not found then raise exception 'Discovery unavailable.';end if;
 insert into public.discovery_comments(submission_id,author_id,body) values(discovery_id,auth.uid(),trim(comment_body)) returning id into result;return result;
end;$$;
create function public.report_discovery_comment(reported_comment uuid,report_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to report.';end if;
 if report_reason is null or report_reason not in ('spam','hate speech','adult content') then raise exception 'Choose a report reason.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,29));
 if (select count(*) from public.comment_reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Daily report limit reached.';end if;
 if not exists(select 1 from public.discovery_comments c join public.submissions s on s.id=c.submission_id where c.id=reported_comment and c.hidden_at is null and s.status='approved' and s.deleted_at is null) then raise exception 'Comment unavailable.';end if;
 insert into public.comment_reports(comment_id,reporter_id,reason) values(reported_comment,auth.uid(),report_reason) on conflict(comment_id,reporter_id) do update set reason=excluded.reason;
end;$$;
create function public.hide_discovery_comment(comment_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.';end if;
 update public.discovery_comments set hidden_at=now(),hidden_by=auth.uid() where id=comment_id and (author_id=auth.uid() or public.is_moderator());
 if not found then raise exception 'You can only remove your own comment.';end if;
 if public.is_moderator() then update public.comment_reports set resolved_at=now() where comment_reports.comment_id=hide_discovery_comment.comment_id;end if;
end;$$;
create function public.resolve_comment_report(report_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_moderator() then raise exception 'Moderator access required.';end if;
 update public.comment_reports set resolved_at=now() where id=report_id;
end;$$;
revoke all on function public.comment_has_link(text),public.add_discovery_comment(uuid,text),public.report_discovery_comment(uuid,text),public.hide_discovery_comment(uuid),public.resolve_comment_report(uuid) from public,anon,authenticated;
grant execute on function public.comment_has_link(text) to anon,authenticated;
grant execute on function public.add_discovery_comment(uuid,text),public.report_discovery_comment(uuid,text),public.hide_discovery_comment(uuid),public.resolve_comment_report(uuid) to authenticated;
commit;
