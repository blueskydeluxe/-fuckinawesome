begin;
alter table public.photo_uploads add column purpose text not null default 'submission' check(purpose in ('submission','cover'));
alter table public.photo_uploads add column cover_discovery_id uuid references public.submissions(id) on delete set null;
alter table public.photo_uploads add column requested_by uuid references public.profiles(id) on delete cascade;
create or replace function public.reserve_photo_upload() returns text
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); ticket uuid:=gen_random_uuid(); object_path text;
begin
 if member is null or not exists(select 1 from public.profiles where id=member and not photo_cleanup_pending) then raise exception 'Sign in to upload a photo.';end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text,0));
 if (select count(*) from public.photo_uploads where user_id=member and purpose='submission' and created_at>now()-interval '1 day')+(select count(*) from public.submissions where author_id=member and image_path is null and created_at>now()-interval '1 day')>=10 then raise exception 'You can start up to 10 submissions per day. Try again tomorrow.';end if;
 object_path:=member::text||'/'||ticket::text||'.jpg';
 insert into public.photo_uploads(id,user_id,path) values(ticket,member,object_path);
 return object_path;
end;$$;

create function public.reserve_discovery_cover(discovery_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid();ticket uuid:=gen_random_uuid();object_path text;moderator boolean:=public.is_moderator();
begin
 if member is null or not exists(select 1 from public.profiles where id=member and not photo_cleanup_pending) then raise exception 'Sign in to upload a cover.';end if;
 if not exists(select 1 from public.submissions where id=discovery_id and deleted_at is null and (author_id=member or moderator)) then raise exception 'You can only add covers to your own discoveries.';end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text,0));
 if (select count(*) from public.photo_uploads where purpose='cover' and requested_by=member and created_at>now()-interval '1 day')>=(case when moderator then 50 else 10 end) then raise exception 'Daily cover upload limit reached. Try again tomorrow.';end if;
 object_path:=member::text||'/'||ticket::text||'.jpg';
 insert into public.photo_uploads(id,user_id,path,purpose,cover_discovery_id,requested_by) values(ticket,member,object_path,'cover',discovery_id,member);
 return object_path;
end;$$;
create or replace function public.submit_photo(discovery_title text,discovery_description text,photo_path text,discovery_category text,discovery_url text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); result uuid;
begin
 if member is null then raise exception 'Sign in to submit.';end if;
 if discovery_url is not null and (char_length(discovery_url)>2048 or discovery_url !~ '^https?://[^[:space:]]+$' or discovery_url ~ '^https?://[^/]*@') then raise exception 'Use a complete public http or https link.';end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text,0));
 select id into result from public.submissions where image_path=photo_path and author_id=member;
 if found then return result;end if;
 if not public.can_upload_photo(photo_path) then raise exception 'Photo upload expired or unavailable. Choose the photo again.';end if;
 if not exists(select 1 from public.photo_uploads where path=photo_path and purpose='submission') then raise exception 'Use a new submission upload.';end if;
 perform 1 from public.photo_uploads where path=photo_path and user_id=member for update;
 if not exists(select 1 from storage.objects where bucket_id='discovery-photos' and name=photo_path and metadata->>'mimetype'='image/jpeg' and (metadata->>'size')::bigint between 1 and 5242880) then raise exception 'Upload your photo before submitting.';end if;
 if (select count(*) from public.submissions where author_id=member and created_at>now()-interval '1 day')>=10 then raise exception 'You can submit up to 10 discoveries per day.';end if;
 insert into public.submissions(author_id,title,description,image_path,category,url) values(member,trim(discovery_title),trim(discovery_description),photo_path,discovery_category,discovery_url) returning id into result;
 update public.photo_uploads set submitted_at=now() where path=photo_path;
 return result;
end;$$;

create or replace function public.set_discovery_cover(discovery_id uuid,photo_path text) returns void
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid();author uuid;previous text;moderator boolean;
begin
 if member is null then raise exception 'Sign in to add a cover.';end if;
 select author_id into author from public.submissions where id=discovery_id and deleted_at is null;
 if not found then raise exception 'Discovery unavailable.';end if;
 moderator:=public.is_moderator();
 if author<>member and not moderator then raise exception 'You can only add covers to your own discoveries.';end if;
 perform pg_advisory_xact_lock(hashtextextended(least(member,author)::text,0));
 if member<>author then perform pg_advisory_xact_lock(hashtextextended(greatest(member,author)::text,0));end if;
 select status into previous from public.submissions where id=discovery_id and deleted_at is null for update;
 if not found then raise exception 'Discovery unavailable.';end if;
 if exists(select 1 from public.submissions where id=discovery_id and image_path=photo_path) then return;end if;
 if not exists(select 1 from public.profiles where id=author and not photo_cleanup_pending) then raise exception 'Account cleanup is in progress.';end if;
 if not public.can_upload_photo(photo_path) then raise exception 'Photo upload expired or unavailable. Choose the photo again.';end if;
 if not exists(select 1 from public.photo_uploads where path=photo_path and purpose='cover' and cover_discovery_id=discovery_id) then raise exception 'Use a cover upload for this discovery.';end if;
 if not exists(select 1 from storage.objects where bucket_id='discovery-photos' and name=photo_path and metadata->>'mimetype'='image/jpeg' and (metadata->>'size')::bigint between 1 and 5242880) then raise exception 'Upload your cover before saving.';end if;
 update public.submissions set image_path=photo_path,status=case when moderator then previous else 'pending' end where id=discovery_id;
 -- A moderator-supplied cover belongs to the discovery author for account cleanup.
 update public.photo_uploads set user_id=author,submitted_at=now() where path=photo_path;
 if moderator then insert into public.moderation_log(moderator_id,submission_id,old_status,new_status) values(member,discovery_id,previous,previous);end if;
end;$$;

revoke execute on function public.reserve_discovery_cover(uuid) from public,anon,authenticated;
grant execute on function public.reserve_discovery_cover(uuid) to authenticated;
commit;

