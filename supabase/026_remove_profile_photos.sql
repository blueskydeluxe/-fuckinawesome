begin;
create function public.remove_profile_photo(member_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or (member_id<>auth.uid() and not public.is_moderator()) then raise exception 'You can only remove your own profile photo.';end if;
 update public.profile_photos set approved_image=null,pending_image=null,status='rejected',updated_at=now() where user_id=member_id;
end;$$;
revoke all on function public.remove_profile_photo(uuid) from public,anon;
grant execute on function public.remove_profile_photo(uuid) to authenticated;
commit;
