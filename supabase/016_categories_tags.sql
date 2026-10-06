begin;
create table public.discovery_categories(name text primary key check(char_length(name) between 2 and 32));
create unique index categories_case_insensitive on public.discovery_categories(lower(name));
insert into public.discovery_categories values ('Architecture'),('Technology'),('Adventure'),('Food'),('Machines'),('Art'),('Other');
alter table public.discovery_categories enable row level security;
create policy categories_read on public.discovery_categories for select using(true);
revoke all on public.discovery_categories from public,anon,authenticated;
grant select on public.discovery_categories to anon,authenticated;
alter table public.submissions drop constraint submissions_category_check;
alter table public.submissions add constraint submissions_category_fkey foreign key(category) references public.discovery_categories(name);
alter table public.submissions add column tags text[] not null default '{}';
create index submissions_tags on public.submissions using gin(tags);
create function public.valid_discovery_tags(tags text[]) returns boolean language sql immutable set search_path='' as $$
 select tags is not null and cardinality(tags)<=5 and not exists(select 1 from unnest(tags) t where t is null or char_length(t) not between 2 and 24 or t !~ '^[a-z0-9]+([ -][a-z0-9]+)*$') and cardinality(tags)=(select count(distinct t) from unnest(tags) t);
$$;
alter table public.submissions add constraint valid_tags check(public.valid_discovery_tags(tags));
create function public.submit_tagged_photo(discovery_title text,discovery_description text,photo_path text,discovery_category text,discovery_url text default null,discovery_tags text[] default '{}') returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.valid_discovery_tags(discovery_tags) then raise exception 'Use up to 5 unique tags, 2–24 letters or numbers each.';end if;
 result:=public.submit_photo(discovery_title,discovery_description,photo_path,discovery_category,discovery_url);
 update public.submissions set tags=discovery_tags where id=result and author_id=auth.uid();
 return result;
end;$$;
revoke execute on function public.submit_tagged_photo(text,text,text,text,text,text[]) from public,anon;
grant execute on function public.submit_tagged_photo(text,text,text,text,text,text[]) to authenticated;
create function public.tagged_discovery_feed(feed text default 'Trending', selected_category text default 'All', member_id uuid default null, discovery_id uuid default null, page_offset integer default 0, selected_tag text default null)
returns setof public.discoveries language sql stable security invoker set search_path='' as $$
 select d.* from public.discoveries d
 where (case when feed='Moderation' then public.is_moderator() and d.status in ('pending','approved')
             when feed='My discoveries' then d.author_id=auth.uid()
             else d.status='approved' and d.image_path is not null end)
 and (feed<>'Saved' or d.id=any(public.saved_discovery_ids()))
 and (selected_category='All' or d.category=selected_category) and (selected_tag is null or exists(select 1 from public.submissions s where s.id=d.id and s.tags @> array[selected_tag]))
 and (member_id is null or d.author_id=member_id)
 and (discovery_id is null or d.id=discovery_id)
 and (feed<>'Hall of Fame' or d.up_votes+d.down_votes>=10 and d.up_votes::bigint*5>(d.up_votes::bigint+d.down_votes)*4)
 and (feed<>'Hall of Bullshit' or d.up_votes+d.down_votes>=10 and d.down_votes::bigint*5>(d.up_votes::bigint+d.down_votes)*4)
 order by
 case when feed='Trending' then (d.up_votes-d.down_votes)::double precision / power(greatest(0,extract(epoch from (now()-d.created_at))/3600)+2,1.5) end desc nulls last,
 case when feed='Hall of Fame' then d.up_votes-d.down_votes end desc nulls last,
 case when feed='Hall of Bullshit' then d.down_votes end desc nulls last,
 case when feed='Hall of Bullshit' then d.up_votes-d.down_votes end asc nulls last,
 d.created_at desc,d.id desc limit 51 offset greatest(0,coalesce(page_offset,0));
$$;
revoke execute on function public.tagged_discovery_feed(text,text,uuid,uuid,integer,text) from public;
grant execute on function public.tagged_discovery_feed(text,text,uuid,uuid,integer,text) to anon,authenticated;
create table public.category_suggestions(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles on delete cascade,name text not null check(char_length(name) between 2 and 32),reason text not null check(char_length(reason) between 10 and 300),status text not null default 'pending' check(status in ('pending','approved','declined')),created_at timestamptz not null default now());
create unique index category_request_unique on public.category_suggestions(user_id,lower(name));
alter table public.category_suggestions enable row level security;
create policy category_requests_read on public.category_suggestions for select to authenticated using(user_id=auth.uid() or public.is_moderator());
revoke all on public.category_suggestions from public,anon,authenticated;
grant select on public.category_suggestions to authenticated;
create function public.suggest_category(category_name text,category_reason text) returns void language plpgsql security definer set search_path='' as $$
declare clean text:=initcap(regexp_replace(trim(category_name),'[[:space:]]+',' ','g'));
begin
 if auth.uid() is null then raise exception 'Sign in to suggest a category.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,16));
 if clean is null or clean !~ '^[A-Za-z][A-Za-z &-]{1,31}$' then raise exception 'Use a short category name with letters.';end if;
 if exists(select 1 from public.discovery_categories where lower(name)=lower(clean)) then raise exception 'That category already exists.';end if;
 if exists(select 1 from public.category_suggestions where user_id=auth.uid() and lower(name)=lower(clean)) then raise exception 'You have already suggested that category.';end if;
 if (select count(*) from public.category_suggestions where user_id=auth.uid() and created_at>now()-interval '1 day')>=3 then raise exception 'You can suggest up to 3 categories per day.';end if;
 insert into public.category_suggestions(user_id,name,reason) values(auth.uid(),clean,trim(category_reason));
end;$$;
create function public.review_category(suggestion_id uuid,approved boolean) returns void language plpgsql security definer set search_path='' as $$
declare requested text;
begin
 if not public.is_moderator() then raise exception 'Moderator access required.';end if;
 if approved is null then raise exception 'Choose approve or decline.';end if;
 select name into requested from public.category_suggestions where id=suggestion_id and status='pending' for update;
 if not found then raise exception 'This suggestion has already been reviewed.';end if;
 if approved then insert into public.discovery_categories(name) values(requested) on conflict do nothing;end if;
 update public.category_suggestions set status=case when approved then 'approved' else 'declined' end where id=suggestion_id;
end;$$;
revoke execute on function public.suggest_category(text,text),public.review_category(uuid,boolean) from public,anon;
grant execute on function public.suggest_category(text,text),public.review_category(uuid,boolean) to authenticated;
create function public.set_discovery_tags(discovery_id uuid,discovery_tags text[]) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to edit tags.';end if;
 if not public.valid_discovery_tags(discovery_tags) then raise exception 'Use up to 5 unique tags, 2–24 letters or numbers each.';end if;
 update public.submissions set tags=discovery_tags where id=discovery_id and deleted_at is null and (author_id=auth.uid() or public.is_moderator());
 if not found then raise exception 'You can only edit tags on your discoveries.';end if;
end;$$;
revoke execute on function public.set_discovery_tags(uuid,text[]) from public,anon;
grant execute on function public.set_discovery_tags(uuid,text[]) to authenticated;
alter function public.export_account() rename to export_account_before_tags;
revoke execute on function public.export_account_before_tags() from public,anon,authenticated;
create function public.export_account() returns jsonb language sql security definer set search_path='' as $$
 select public.export_account_before_tags() || jsonb_build_object('category_suggestions',coalesce((select jsonb_agg(to_jsonb(c)) from public.category_suggestions c where user_id=auth.uid()),'[]'::jsonb));
$$;
revoke execute on function public.export_account() from public,anon;
grant execute on function public.export_account() to authenticated;
commit;
