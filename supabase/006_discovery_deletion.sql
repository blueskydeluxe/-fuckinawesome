begin;
alter table public.submissions add column deleted_at timestamptz;
create or replace view public.discoveries with(security_invoker=true) as
select s.id,s.author_id,s.title,s.description,s.url,s.category,s.status,s.created_at,
p.display_name as author_name,c.up_votes,c.down_votes,s.image_path
from public.submissions s join public.profiles p on p.id=s.author_id
cross join lateral public.vote_counts(s.id) c where s.deleted_at is null;
create function public.delete_own_discovery(discovery_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to delete a discovery.';end if;
 update public.submissions set deleted_at=now(),status='hidden' where id=discovery_id and author_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'You can only delete your own available discoveries.';end if;
end;$$;
create function public.restore_own_discovery(discovery_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to restore a discovery.';end if;
 update public.submissions set deleted_at=null,status='pending' where id=discovery_id and author_id=auth.uid() and deleted_at is not null;
 if not found then raise exception 'You can only restore your own deleted discoveries.';end if;
end;$$;
-- A moderator cannot republish an author's deleted discovery.
create or replace function public.moderate_discovery(discovery_id uuid,new_status text) returns void
language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if not public.is_moderator() then raise exception 'Moderator access required.';end if;
 if new_status not in ('approved','rejected','hidden') or new_status is null then raise exception 'Invalid status.';end if;
 select status into previous from public.submissions where id=discovery_id and deleted_at is null for update;
 if not found then raise exception 'Discovery unavailable.';end if;
 update public.submissions set status=new_status where id=discovery_id;
 insert into public.moderation_log(moderator_id,submission_id,old_status,new_status) values(auth.uid(),discovery_id,previous,new_status);
end;$$;
revoke execute on function public.delete_own_discovery(uuid),public.restore_own_discovery(uuid) from public,anon,authenticated;
grant execute on function public.delete_own_discovery(uuid),public.restore_own_discovery(uuid) to authenticated;
commit;
