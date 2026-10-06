begin;
alter table public.submissions drop constraint discovery_source;
alter table public.submissions add constraint discovery_source check(url is not null or image_path is not null);
drop function public.submit_photo(text,text,text,text);
create function public.submit_photo(discovery_title text,discovery_description text,photo_path text,discovery_category text,discovery_url text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); result uuid;
begin
 if member is null then raise exception 'Sign in to submit.';end if;
 if discovery_url is not null and (char_length(discovery_url)>2048 or discovery_url !~ '^https?://[^[:space:]]+$' or discovery_url ~ '^https?://[^/]*@') then raise exception 'Use a complete public http or https link.';end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text,0));
 select id into result from public.submissions where image_path=photo_path and author_id=member;
 if found then return result;end if;
 if not public.can_upload_photo(photo_path) then raise exception 'Photo upload expired or unavailable. Choose the photo again.';end if;
 perform 1 from public.photo_uploads where path=photo_path and user_id=member for update;
 if not exists(select 1 from storage.objects where bucket_id='discovery-photos' and name=photo_path and metadata->>'mimetype'='image/jpeg' and (metadata->>'size')::bigint between 1 and 5242880) then raise exception 'Upload your photo before submitting.';end if;
 if (select count(*) from public.submissions where author_id=member and created_at>now()-interval '1 day')>=10 then raise exception 'You can submit up to 10 discoveries per day.';end if;
 insert into public.submissions(author_id,title,description,image_path,category,url) values(member,trim(discovery_title),trim(discovery_description),photo_path,discovery_category,discovery_url) returning id into result;
 update public.photo_uploads set submitted_at=now() where path=photo_path;
 return result;
end;$$;

create function public.set_discovery_cover(discovery_id uuid,photo_path text) returns void
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
 if not exists(select 1 from storage.objects where bucket_id='discovery-photos' and name=photo_path and metadata->>'mimetype'='image/jpeg' and (metadata->>'size')::bigint between 1 and 5242880) then raise exception 'Upload your cover before saving.';end if;
 update public.submissions set image_path=photo_path,status=case when moderator then previous else 'pending' end where id=discovery_id;
 -- A moderator-supplied cover belongs to the discovery author for account cleanup.
 update public.photo_uploads set user_id=author,submitted_at=now() where path=photo_path;
 if moderator then insert into public.moderation_log(moderator_id,submission_id,old_status,new_status) values(member,discovery_id,previous,previous);end if;
end;$$;
create or replace function public.moderate_discovery(discovery_id uuid,new_status text) returns void
language plpgsql security definer set search_path='' as $$
declare previous text;cover text;
begin
 if not public.is_moderator() then raise exception 'Moderator access required.';end if;
 if new_status not in ('approved','rejected','hidden') or new_status is null then raise exception 'Invalid status.';end if;
 select status,image_path into previous,cover from public.submissions where id=discovery_id and deleted_at is null for update;
 if not found then raise exception 'Discovery unavailable.';end if;
 if new_status='approved' and (cover is null or not exists(select 1 from storage.objects where bucket_id='discovery-photos' and name=cover)) then raise exception 'Add a working cover photo before approval.';end if;
 update public.submissions set status=new_status where id=discovery_id;
 insert into public.moderation_log(moderator_id,submission_id,old_status,new_status) values(auth.uid(),discovery_id,previous,new_status);
end;$$;
revoke execute on function public.submit_photo(text,text,text,text,text),public.set_discovery_cover(uuid,text) from public,anon,authenticated;
grant execute on function public.submit_photo(text,text,text,text,text),public.set_discovery_cover(uuid,text) to authenticated;
commit;


