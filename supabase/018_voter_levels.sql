begin;
-- Lifetime credit for the first vote on each discovery; switching/removing cannot farm levels.
create table public.voter_participation(user_id uuid not null references public.profiles(id) on delete cascade, discovery_id uuid not null, credited_at timestamptz not null default now(), primary key(user_id,discovery_id));
alter table public.voter_participation enable row level security;
revoke all on public.voter_participation from public,anon,authenticated;
insert into public.voter_participation(user_id,discovery_id,credited_at) select user_id,submission_id,created_at from public.votes on conflict do nothing;
create function public.credit_voter_participation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.voter_participation(user_id,discovery_id) values(new.user_id,new.submission_id) on conflict do nothing;
 return new;
end;$$;
revoke all on function public.credit_voter_participation() from public,anon,authenticated;
create trigger credit_first_vote after insert on public.votes for each row execute function public.credit_voter_participation();
create function public.voter_levels(member_ids uuid[]) returns table(member_id uuid,votes_cast bigint,level bigint) language plpgsql stable security definer set search_path='' as $$
begin
 if member_ids is null or cardinality(member_ids)>100 then raise exception 'Request up to 100 members.';end if;
 return query select p.id,count(v.discovery_id),1+count(v.discovery_id)/25 from public.profiles p left join public.voter_participation v on v.user_id=p.id where p.id=any(member_ids) group by p.id;
end;$$;
revoke all on function public.voter_levels(uuid[]) from public,anon,authenticated;
grant execute on function public.voter_levels(uuid[]) to anon,authenticated;
commit;
