begin;
alter table public.votes drop constraint votes_value_check;
alter table public.votes add constraint votes_value_check check(value in(-1,1,2));
-- 2 is neutral; 0 remains the existing remove-vote command.
create or replace function public.cast_vote(discovery_id uuid,vote_value integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to vote.';end if;
 if vote_value not in(-1,0,1,2) or vote_value is null then raise exception 'Invalid vote.';end if;
 perform 1 from public.submissions where id=discovery_id and status='approved' and deleted_at is null for update;
 if not found then raise exception 'This discovery is not available.';end if;
 if vote_value=0 then delete from public.votes where submission_id=discovery_id and user_id=auth.uid();
 else insert into public.votes(submission_id,user_id,value) values(discovery_id,auth.uid(),vote_value) on conflict(submission_id,user_id) do update set value=excluded.value;end if;
end;$$;
create function public.neutral_vote_count(discovery_id uuid) returns bigint language sql stable security definer set search_path='' as $$
 select count(*) from public.votes v where v.submission_id=discovery_id and v.value=2 and exists(select 1 from public.submissions s where s.id=discovery_id and s.deleted_at is null and (s.status='approved' or s.author_id=auth.uid() or public.is_moderator()));
$$;
revoke all on function public.neutral_vote_count(uuid) from public,anon,authenticated;
grant execute on function public.neutral_vote_count(uuid) to anon,authenticated;
create or replace view public.discoveries with(security_invoker=true) as
select s.id,s.author_id,s.title,s.description,s.url,s.category,s.status,s.created_at,p.display_name as author_name,c.up_votes,c.down_votes,s.image_path,public.neutral_vote_count(s.id) as neutral_votes
from public.submissions s join public.profiles p on p.id=s.author_id cross join lateral public.vote_counts(s.id) c where s.deleted_at is null;
-- Preserve each feed's filters and permissions while including neutral votes in Hall denominators.
do $migration$
declare definition text; signature text;
begin
 foreach signature in array array['public.search_discovery_feed(text,text,uuid,uuid,integer,text,text)','public.discovery_feed(text,text,uuid,uuid,integer)','public.tagged_discovery_feed(text,text,uuid,uuid,integer,text)'] loop
  select pg_get_functiondef(signature::regprocedure) into definition;
  definition:=replace(definition,'d.up_votes+d.down_votes','d.up_votes+d.down_votes+d.neutral_votes');
  definition:=replace(definition,'d.up_votes::bigint+d.down_votes','d.up_votes::bigint+d.down_votes+d.neutral_votes');
  execute definition;
 end loop;
 select pg_get_functiondef('public.discovery_rewards(uuid)'::regprocedure) into definition;
 definition:=replace(definition,'select s.id,c.up_votes,c.down_votes,','select s.id,c.up_votes,c.down_votes,public.neutral_vote_count(s.id) as neutral_votes,');
 definition:=replace(definition,'up_votes+down_votes','up_votes+down_votes+neutral_votes');
 execute definition;
 select pg_get_functiondef('public.notify_discovery_reward()'::regprocedure) into definition;
 definition:=replace(definition,'ups+downs','ups+downs+public.neutral_vote_count(discovery)');
 execute definition;
end $migration$;
commit;
