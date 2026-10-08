begin;
-- Preserve the machine verdict and record human approval for this exact cover.
create table public.discovery_screening_overrides(
 id bigint generated always as identity primary key,
 submission_id uuid not null references public.submissions(id) on delete cascade,
 image_path text not null,
 moderator_id uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.discovery_screening_overrides enable row level security;
revoke all on public.discovery_screening_overrides from public,anon,authenticated;
grant select on public.discovery_screening_overrides to service_role;

create or replace function public.require_screened_discovery() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.image_path is distinct from new.image_path then new.status:='pending';end if;
 if new.status='approved' and (tg_op='INSERT' or old.status is distinct from 'approved' or old.image_path is distinct from new.image_path) then
  if new.image_path is null or not (
   exists(select 1 from public.content_screenings where asset_key='discovery:'||new.image_path and verdict='passed')
   or exists(select 1 from public.discovery_screening_overrides where submission_id=new.id and image_path=new.image_path)
  ) then raise exception 'Image screening or a recorded moderator approval is required.';end if;
 end if;return new;
end;$$;

create function public.approve_discovery_as_moderator(discovery_id uuid,review_confirmed boolean) returns void
language plpgsql security definer set search_path='' as $$
declare cover text;
begin
 if auth.uid() is null or not public.is_moderator() then raise exception 'Moderator access required.';end if;
 if review_confirmed is distinct from true then raise exception 'Confirm your review before approving.';end if;
 select image_path into cover from public.submissions where id=discovery_id and deleted_at is null for update;
 if not found then raise exception 'Discovery unavailable.';end if;
 if cover is null then raise exception 'Add a cover before approval.';end if;
 insert into public.discovery_screening_overrides(submission_id,image_path,moderator_id) values(discovery_id,cover,auth.uid());
 -- Keep existing working-cover, deletion, moderation-log and queue rules.
 perform public.moderate_discovery(discovery_id,'approved');
end;$$;
revoke all on function public.approve_discovery_as_moderator(uuid,boolean) from public,anon,authenticated;
grant execute on function public.approve_discovery_as_moderator(uuid,boolean) to authenticated;
commit;
