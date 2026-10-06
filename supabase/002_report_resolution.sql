begin;
alter table public.reports add column resolved_at timestamptz;
alter table public.reports add column resolved_by uuid references public.profiles;
create function public.resolve_report(report_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_moderator() then raise exception 'Moderator access required.'; end if;
 update public.reports set resolved_at=now(),resolved_by=auth.uid()
 where id=report_id and resolved_at is null;
 if not found then raise exception 'Report unavailable or already handled.'; end if;
end;$$;
revoke execute on function public.resolve_report(uuid) from public,anon,authenticated;
grant execute on function public.resolve_report(uuid) to authenticated;
commit;
