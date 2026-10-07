begin;
create table public.content_screenings(
 asset_key text primary key check(length(asset_key)<300),
 verdict text not null check(verdict in ('passed','blocked','review')),
 reviewer_id uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.content_screenings enable row level security;
revoke all on public.content_screenings from anon,authenticated;
grant select,insert,update,delete on public.content_screenings to service_role;
create function public.require_screened_discovery() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.image_path is distinct from new.image_path then new.status:='pending';end if;
 if new.status='approved' and (tg_op='INSERT' or old.status is distinct from 'approved' or old.image_path is distinct from new.image_path) then
  if new.image_path is null or not exists(select 1 from public.content_screenings where asset_key='discovery:'||new.image_path and verdict='passed') then raise exception 'Image safety screening must pass before approval.';end if;
 end if;return new;
end;$$;
create trigger discovery_screening_guard before insert or update on public.submissions for each row execute function public.require_screened_discovery();
create function public.require_screened_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.approved_image is not null and (tg_op='INSERT' or old.approved_image is distinct from new.approved_image) then
  if not exists(select 1 from public.content_screenings where asset_key='profile:'||new.user_id::text||':'||md5(new.approved_image) and verdict='passed') then raise exception 'Image safety screening must pass before approval.';end if;
 end if;return new;
end;$$;
create trigger profile_screening_guard before insert or update on public.profile_photos for each row execute function public.require_screened_profile();
revoke all on function public.require_screened_discovery(),public.require_screened_profile() from public,anon,authenticated;
commit;
