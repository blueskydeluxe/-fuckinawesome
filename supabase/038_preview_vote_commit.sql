begin;
-- Guests never write votes. After sign-in, an explicit confirmation commits at most
-- 25 saved previews atomically. Retrying cannot flip or replace an existing vote.
create function public.commit_preview_votes(preview_votes jsonb)
returns table(submission_id uuid,vote_value integer,outcome text,up_votes bigint,down_votes bigint,neutral_votes bigint)
language plpgsql security definer set search_path='' as $$
declare member uuid:=auth.uid(); entry record; existing_value integer;
begin
 if member is null then raise exception 'Sign in to count your preview votes.';end if;
 if jsonb_typeof(preview_votes) is distinct from 'array' then raise exception 'Invalid preview votes.';end if;
 if jsonb_array_length(preview_votes) not between 1 and 25 then raise exception 'Choose between 1 and 25 preview votes.';end if;
 if exists(select 1 from jsonb_array_elements(preview_votes) v where jsonb_typeof(v) is distinct from 'object' or coalesce(v->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or coalesce(v->>'value','') not in ('1','2','-1')) then raise exception 'Invalid preview votes.';end if;
 if (select count(distinct lower(v->>'id')) from jsonb_array_elements(preview_votes) v)<>jsonb_array_length(preview_votes) then raise exception 'Each preview must be a different discovery.';end if;
 perform pg_advisory_xact_lock(hashtextextended(member::text,0));
 for entry in select (v->>'id')::uuid id,(v->>'value')::integer choice from jsonb_array_elements(preview_votes) v order by (v->>'id')::uuid loop
  submission_id:=entry.id;vote_value:=entry.choice;up_votes:=0;down_votes:=0;neutral_votes:=0;
  -- Lock in the same order as normal voting, then check for any saved account vote.
  perform 1 from public.submissions s where s.id=entry.id and s.status='approved' and s.deleted_at is null and s.image_path is not null for update;
  if not found then outcome:='unavailable';return next;continue;end if;
  select v.value into existing_value from public.votes v where v.submission_id=entry.id and v.user_id=member;
  if found then outcome:='existing';vote_value:=existing_value;
  else perform public.cast_vote_with_result(entry.id,entry.choice);outcome:='counted';end if;
  select count(*) filter(where v.value=1),count(*) filter(where v.value=-1),count(*) filter(where v.value=2) into up_votes,down_votes,neutral_votes from public.votes v where v.submission_id=entry.id;
  return next;
 end loop;
end;$$;
revoke all on function public.commit_preview_votes(jsonb) from public,anon,authenticated;
grant execute on function public.commit_preview_votes(jsonb) to authenticated;
commit;
