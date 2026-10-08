begin;
alter table public.submissions add column removed_for_review boolean not null default false;
create function public.remove_discovery_for_review(discovery_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if not public.is_moderator() then raise exception 'Moderator access required.';end if;
 select status into previous from public.submissions where id=discovery_id and deleted_at is null for update;
 if not found then raise exception 'Discovery unavailable.';end if;
 update public.submissions set status='hidden',removed_for_review=true where id=discovery_id;
 insert into public.moderation_log(moderator_id,submission_id,old_status,new_status) values(auth.uid(),discovery_id,previous,'hidden');
end;$$;
create function public.permanently_delete_discovery(discovery_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_moderator() then raise exception 'Moderator access required.';end if;
 perform 1 from public.submissions where id=discovery_id and deleted_at is null and (status='pending' or (removed_for_review and status='hidden')) for update;
 if not found then raise exception 'Move this discovery to moderation before permanently deleting it.';end if;
 delete from public.moderation_log where submission_id=discovery_id;
 delete from public.submissions where id=discovery_id;
end;$$;
revoke all on function public.remove_discovery_for_review(uuid),public.permanently_delete_discovery(uuid) from public,anon,authenticated;
grant execute on function public.remove_discovery_for_review(uuid),public.permanently_delete_discovery(uuid) to authenticated;
do $migration$
declare definition text; old_condition text:='public.is_moderator() and d.status in (''pending'',''approved'')';
begin
 select pg_get_functiondef('public.search_discovery_feed(text,text,uuid,uuid,integer,text,text)'::regprocedure) into definition;
 if strpos(definition,old_condition)=0 then raise exception 'Unexpected moderation feed; no changes applied.';end if;
 execute replace(definition,old_condition,'public.is_moderator() and (d.status=''pending'' or exists(select 1 from public.submissions removed where removed.id=d.id and removed.removed_for_review and removed.status=''hidden''))');
end $migration$;
commit;

