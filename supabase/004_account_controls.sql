begin;
-- Caller identity is taken only from the authenticated session, never an input ID.
create function public.export_account() returns jsonb
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); result jsonb;
begin
 if member is null or not exists(select 1 from public.profiles where id=member) then raise exception 'Sign in to export your account.';end if;
 select jsonb_build_object(
 'exported_at',now(),
 'account',jsonb_build_object('id',u.id,'email',u.email,'created_at',u.created_at),
 'profile',(select to_jsonb(p) from public.profiles p where p.id=member),
 'submissions',coalesce((select jsonb_agg(to_jsonb(s)) from public.submissions s where s.author_id=member),'[]'::jsonb),
 'votes',coalesce((select jsonb_agg(to_jsonb(v)) from public.votes v where v.user_id=member),'[]'::jsonb),
 'reports',coalesce((select jsonb_agg(to_jsonb(r)-'resolved_by') from public.reports r where r.reporter_id=member),'[]'::jsonb)
 ) into result from auth.users u where u.id=member;
 return result;
end;$$;
create function public.delete_own_account(confirmation text) returns void
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); moderator boolean;
begin
 if member is null then raise exception 'Sign in to delete your account.';end if;
 if confirmation is distinct from 'DELETE MY ACCOUNT' then raise exception 'Type DELETE MY ACCOUNT to confirm.';end if;
 select is_moderator into moderator from public.profiles where id=member for update;
 if not found then raise exception 'Account unavailable.';end if;
 if moderator then raise exception 'Moderator accounts must contact support before deletion.';end if;
 -- Resolve all foreign-key dependencies in the same transaction.
 update public.reports set resolved_by=null where resolved_by=member;
 delete from public.moderation_log where moderator_id=member or submission_id in(select id from public.submissions where author_id=member);
 delete from public.submissions where author_id=member;
 delete from auth.users where id=member;
end;$$;
revoke execute on function public.export_account(),public.delete_own_account(text) from public,anon,authenticated;
grant execute on function public.export_account(),public.delete_own_account(text) to authenticated;
commit;
