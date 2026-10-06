begin;
alter table public.profiles add column photo_cleanup_pending boolean not null default false;
create table public.photo_uploads(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles on delete cascade,
 path text not null unique,
 created_at timestamptz not null default now(),
 submitted_at timestamptz
);
alter table public.photo_uploads enable row level security;
revoke all on public.photo_uploads from anon,authenticated;
create policy photo_uploads_owner on public.photo_uploads for select to authenticated using(user_id=auth.uid());
grant select on public.photo_uploads to authenticated;
alter table public.submissions alter column url drop not null;
alter table public.submissions add column image_path text unique references public.photo_uploads(path);
alter table public.submissions add constraint discovery_source check((url is not null and image_path is null) or (url is null and image_path is not null));
create or replace view public.discoveries with(security_invoker=true) as
 select s.id,s.author_id,s.title,s.description,s.url,s.category,s.status,s.created_at,
 p.display_name as author_name,c.up_votes,c.down_votes,s.image_path
 from public.submissions s join public.profiles p on p.id=s.author_id cross join lateral public.vote_counts(s.id) c;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('discovery-photos','discovery-photos',false,5242880,array['image/jpeg']);
create function public.reserve_photo_upload() returns text
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); ticket uuid:=gen_random_uuid(); object_path text;
begin
 if member is null or not exists(select 1 from public.profiles where id=member and not photo_cleanup_pending) then raise exception 'Sign in to upload a photo.';end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text,0));
 if (select count(*) from public.photo_uploads where user_id=member and created_at>now()-interval '1 day')+(select count(*) from public.submissions where author_id=member and image_path is null and created_at>now()-interval '1 day')>=10 then raise exception 'You can start up to 10 submissions per day. Try again tomorrow.';end if;
 object_path:=member::text||'/'||ticket::text||'.jpg';
 insert into public.photo_uploads(id,user_id,path) values(ticket,member,object_path);
 return object_path;
end;$$;
create function public.can_upload_photo(object_path text) returns boolean
language plpgsql volatile security definer set search_path='' as $$
begin
 if auth.uid() is null then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 return exists(select 1 from public.photo_uploads u join public.profiles p on p.id=u.user_id where u.path=object_path and u.user_id=auth.uid() and u.submitted_at is null and u.created_at>now()-interval '1 hour' and not p.photo_cleanup_pending);
end;
$$;
create function public.can_read_photo(object_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.photo_uploads where path=object_path and user_id=auth.uid())
 or public.is_moderator()
 or exists(select 1 from public.submissions where image_path=object_path and status='approved');
$$;
create policy photos_insert_reserved on storage.objects for insert to authenticated
 with check(bucket_id='discovery-photos' and public.can_upload_photo(name));
create policy photos_read_visible on storage.objects for select to anon,authenticated
 using(bucket_id='discovery-photos' and public.can_read_photo(name));
create policy photos_delete_own on storage.objects for delete to authenticated
 using(bucket_id='discovery-photos' and exists(select 1 from public.photo_uploads where path=name and user_id=auth.uid()) and not exists(select 1 from public.submissions where image_path=name) or bucket_id='discovery-photos' and exists(select 1 from public.profiles where id=auth.uid() and photo_cleanup_pending) and exists(select 1 from public.photo_uploads where path=name and user_id=auth.uid()));
-- No UPDATE policy: an approved photo cannot be replaced after review.
create function public.submit_photo(discovery_title text,discovery_description text,photo_path text,discovery_category text) returns uuid
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); result uuid;
begin
 if member is null then raise exception 'Sign in to submit.';end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text,0));
 select id into result from public.submissions where image_path=photo_path and author_id=member;
 if found then return result;end if;
 if not public.can_upload_photo(photo_path) then raise exception 'Photo upload expired or unavailable. Choose the photo again.';end if;
 perform 1 from public.photo_uploads where path=photo_path and user_id=member for update;
 if not exists(select 1 from storage.objects where bucket_id='discovery-photos' and name=photo_path and metadata->>'mimetype'='image/jpeg' and (metadata->>'size')::bigint between 1 and 5242880) then raise exception 'Upload your photo before submitting.';end if;
 if (select count(*) from public.submissions where author_id=member and created_at>now()-interval '1 day')>=10 then raise exception 'You can submit up to 10 discoveries per day.';end if;
 insert into public.submissions(author_id,title,description,image_path,category) values(member,trim(discovery_title),trim(discovery_description),photo_path,discovery_category) returning id into result;
 update public.photo_uploads set submitted_at=now() where path=photo_path;
 return result;
end;$$;
create function public.prepare_photo_account_deletion(confirmation text) returns text[]
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); paths text[];
begin
 if member is null then raise exception 'Sign in to delete your account.';end if;
 if confirmation is distinct from 'DELETE MY ACCOUNT' then raise exception 'Type DELETE MY ACCOUNT to confirm.';end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text,0));
 perform 1 from public.profiles where id=member and not is_moderator for update;
 if not found then raise exception 'Moderator accounts must contact support before deletion.';end if;
 update public.profiles set photo_cleanup_pending=true where id=member;
 select coalesce(array_agg(name),array[]::text[]) into paths from storage.objects where bucket_id='discovery-photos' and name in(select path from public.photo_uploads where user_id=member);
 return paths;
end;$$;
create function public.cancel_photo_account_deletion() returns void
language sql security definer set search_path='' as $$update public.profiles set photo_cleanup_pending=false where id=auth.uid();$$;
-- Add a storage guard to the previously verified deletion function.
create or replace function public.delete_own_account(confirmation text) returns void
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); moderator boolean;
begin
 if member is null then raise exception 'Sign in to delete your account.';end if;
 if confirmation is distinct from 'DELETE MY ACCOUNT' then raise exception 'Type DELETE MY ACCOUNT to confirm.';end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text,0));
 select is_moderator into moderator from public.profiles where id=member for update;
 if not found then raise exception 'Account unavailable.';end if;
 if moderator then raise exception 'Moderator accounts must contact support before deletion.';end if;
 if exists(select 1 from storage.objects where bucket_id='discovery-photos' and name in(select path from public.photo_uploads where user_id=member)) then raise exception 'Photo cleanup is incomplete. Please retry account deletion.';end if;
 update public.reports set resolved_by=null where resolved_by=member;
 delete from public.moderation_log where moderator_id=member or submission_id in(select id from public.submissions where author_id=member);
 delete from public.submissions where author_id=member;
 delete from auth.users where id=member;
end;$$;
revoke execute on function public.reserve_photo_upload(),public.can_upload_photo(text),public.can_read_photo(text),public.submit_photo(text,text,text,text),public.prepare_photo_account_deletion(text),public.cancel_photo_account_deletion() from public,anon,authenticated;
grant execute on function public.can_read_photo(text) to anon,authenticated;
grant execute on function public.reserve_photo_upload(),public.can_upload_photo(text),public.submit_photo(text,text,text,text),public.prepare_photo_account_deletion(text),public.cancel_photo_account_deletion() to authenticated;
commit;
