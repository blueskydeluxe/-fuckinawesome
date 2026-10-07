begin;
create table public.profile_photos (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 approved_image text,
 pending_image text,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 upload_day date not null default current_date,
 upload_count integer not null default 1,
 updated_at timestamptz not null default now(),
 check(approved_image is null or (approved_image like 'data:image/jpeg;base64,%' and length(approved_image)<200000)),
 check(pending_image is null or (pending_image like 'data:image/jpeg;base64,%' and length(pending_image)<200000))
);
alter table public.profile_photos enable row level security;
create policy profile_photos_private on public.profile_photos for select to authenticated using(user_id=auth.uid() or public.is_moderator());
revoke all on public.profile_photos from anon,authenticated;
grant select on public.profile_photos to authenticated;
create function public.submit_profile_photo(image_data text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.';end if;
 if image_data is null or image_data not like 'data:image/jpeg;base64,%' or length(image_data)>=200000 then raise exception 'Choose a smaller JPEG photo.';end if;
 if get_byte(decode(split_part(image_data,',',2),'base64'),0)<>255 or get_byte(decode(split_part(image_data,',',2),'base64'),1)<>216 then raise exception 'Choose a valid JPEG photo.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from public.profile_photos where user_id=auth.uid() and updated_at>now()-interval '30 seconds') then raise exception 'Wait 30 seconds before uploading another photo.';end if;
 if exists(select 1 from public.profile_photos where user_id=auth.uid() and upload_day=current_date and upload_count>=10) then raise exception 'You can upload up to 10 profile photos per day.';end if;
 insert into public.profile_photos(user_id,pending_image,status) values(auth.uid(),image_data,'pending') on conflict(user_id) do update set pending_image=excluded.pending_image,status='pending',updated_at=now(),upload_count=case when public.profile_photos.upload_day=current_date then public.profile_photos.upload_count+1 else 1 end,upload_day=current_date;
end;$$;
create function public.review_profile_photo(member_id uuid,approve boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_moderator() then raise exception 'Moderator access required.';end if;
 update public.profile_photos set approved_image=case when approve then pending_image else approved_image end,pending_image=null,status=case when approve then 'approved' else 'rejected' end,updated_at=now() where user_id=member_id and pending_image is not null;
end;$$;
create function public.public_profile_photos(member_ids uuid[]) returns table(user_id uuid,image_data text) language sql stable security definer set search_path='' as $$
 select p.user_id,p.approved_image from public.profile_photos p where p.user_id=any(member_ids) and p.approved_image is not null limit 100;
$$;
revoke all on function public.submit_profile_photo(text),public.review_profile_photo(uuid,boolean),public.public_profile_photos(uuid[]) from public;
grant execute on function public.submit_profile_photo(text),public.review_profile_photo(uuid,boolean) to authenticated;
grant execute on function public.public_profile_photos(uuid[]) to anon,authenticated;
commit;
