begin;
-- Moderators may curate up to 50 daily finds; members keep the existing 10 limit.
create or replace function public.reserve_photo_upload() returns text
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); ticket uuid:=gen_random_uuid(); object_path text;
begin
 if member is null or not exists(select 1 from public.profiles where id=member and not photo_cleanup_pending) then raise exception 'Sign in to upload a photo.';end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text,0));
 if (select count(*) from public.photo_uploads where user_id=member and purpose='submission' and created_at>now()-interval '1 day')+(select count(*) from public.submissions where author_id=member and image_path is null and created_at>now()-interval '1 day')>=(case when public.is_moderator() then 50 else 10 end) then raise exception 'Daily submission upload limit reached. Try again tomorrow.';end if;
 object_path:=member::text||'/'||ticket::text||'.jpg';
 insert into public.photo_uploads(id,user_id,path) values(ticket,member,object_path);
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
 if (select count(*) from public.submissions where author_id=member and created_at>now()-interval '1 day')>=(case when public.is_moderator() then 50 else 10 end) then raise exception 'Daily discovery limit reached. Try again tomorrow.';end if;
 insert into public.submissions(author_id,title,description,image_path,category,url) values(member,trim(discovery_title),trim(discovery_description),photo_path,discovery_category,discovery_url) returning id into result;
 update public.photo_uploads set submitted_at=now() where path=photo_path;
 return result;
end;$$;
commit;
