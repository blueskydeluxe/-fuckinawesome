begin;
insert into public.discovery_categories(name) values('Music') on conflict do nothing;
create table public.music_uploads(path text primary key,user_id uuid not null references public.profiles on delete cascade,created_at timestamptz not null default now());
alter table public.music_uploads enable row level security;
revoke all on public.music_uploads from public,anon,authenticated;
create table public.discovery_music(submission_id uuid primary key references public.submissions on delete cascade,artist_name text not null check(char_length(artist_name) between 2 and 80),entry_kind text not null check(entry_kind in ('band','song')),spotify_url text,apple_url text,amazon_url text,audio_path text unique references public.music_uploads(path),rights_confirmed boolean not null check(rights_confirmed),created_at timestamptz not null default now());
alter table public.discovery_music enable row level security;
create policy music_metadata_read on public.discovery_music for select using(exists(select 1 from public.submissions s where s.id=submission_id and ((s.status='approved' and s.deleted_at is null) or s.author_id=auth.uid() or public.is_moderator())));
revoke all on public.discovery_music from public,anon,authenticated;
grant select on public.discovery_music to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('discovery-music','discovery-music',false,20971520,array['audio/mpeg']);
create function public.can_upload_music(object_path text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.music_uploads u join public.profiles p on p.id=u.user_id where u.path=object_path and u.user_id=auth.uid() and not p.photo_cleanup_pending and u.created_at>now()-interval '1 hour' and not exists(select 1 from public.discovery_music m where m.audio_path=u.path));$$;
create function public.can_read_music(object_path text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.discovery_music m join public.submissions s on s.id=m.submission_id where m.audio_path=object_path and ((s.status='approved' and s.deleted_at is null) or s.author_id=auth.uid() or public.is_moderator()));$$;
revoke all on function public.can_upload_music(text),public.can_read_music(text) from public;
grant execute on function public.can_upload_music(text),public.can_read_music(text) to anon,authenticated;
create policy music_insert on storage.objects for insert to authenticated with check(bucket_id='discovery-music' and public.can_upload_music(name));
create policy music_read on storage.objects for select using(bucket_id='discovery-music' and public.can_read_music(name));
create function public.can_delete_music(object_path text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.music_uploads u join public.profiles p on p.id=u.user_id where u.path=object_path and u.user_id=auth.uid() and (p.photo_cleanup_pending or not exists(select 1 from public.discovery_music m where m.audio_path=u.path)));$$;
revoke all on function public.can_delete_music(text) from public,anon,authenticated;
grant execute on function public.can_delete_music(text) to authenticated;
create policy music_delete on storage.objects for delete to authenticated using(bucket_id='discovery-music' and public.can_delete_music(name));
create function public.reserve_music_upload() returns text language plpgsql security definer set search_path='' as $$ declare result text;begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and not photo_cleanup_pending) then raise exception 'Sign in to upload music.';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if (select count(*) from public.music_uploads where user_id=auth.uid() and created_at>now()-interval '1 day')>=5 then raise exception 'Daily music upload limit reached. Try tomorrow.';end if;
 result:=auth.uid()::text||'/'||gen_random_uuid()::text||'.mp3';insert into public.music_uploads(path,user_id) values(result,auth.uid());return result;end;$$;
create function public.submit_music_discovery(discovery_title text,discovery_description text,cover_path text,artist_name text,entry_kind text,spotify_url text default null,apple_url text default null,amazon_url text default null,audio_path text default null,rights_confirmed boolean default false,discovery_tags text[] default '{}') returns uuid language plpgsql security definer set search_path='' as $$ declare result uuid;begin
 if not coalesce(rights_confirmed,false) then raise exception 'Confirm you have permission to share this music and cover.';end if;
 discovery_tags:=array(select distinct tag from unnest(coalesce(discovery_tags,array[]::text[])||array['music',case when entry_kind='band' then 'bands' else 'songs' end]) tag);
 if char_length(trim(artist_name)) not between 2 and 80 or entry_kind not in ('band','song') then raise exception 'Add the artist name and submission type.';end if;
 if spotify_url is not null and (char_length(spotify_url)>2048 or spotify_url !~ '^https://open\.spotify\.com/[^[:space:]]+$') or apple_url is not null and (char_length(apple_url)>2048 or apple_url !~ '^https://music\.apple\.com/[^[:space:]]+$') or amazon_url is not null and (char_length(amazon_url)>2048 or amazon_url !~ '^https://music\.amazon\.(com|co\.uk|de|fr|co\.jp|ca|com\.au|in|es|it|com\.br|com\.mx)/[^[:space:]]+$') then raise exception 'Use a direct Spotify, Apple Music, or Amazon Music link.';end if;
 if coalesce(spotify_url,apple_url,amazon_url,audio_path) is null then raise exception 'Add a music link or MP3.';end if;
 if audio_path is not null then
 perform 1 from public.music_uploads u where u.path=audio_path and u.user_id=auth.uid() for update;
 if not public.can_upload_music(audio_path) or not exists(select 1 from storage.objects o where o.bucket_id='discovery-music' and o.name=audio_path and o.metadata->>'mimetype'='audio/mpeg' and (o.metadata->>'size')::bigint between 4 and 20971520) then raise exception 'Upload a fresh MP3 before submitting.';end if;
 end if;
 result:=public.submit_tagged_photo(discovery_title,discovery_description,cover_path,'Music',coalesce(spotify_url,apple_url,amazon_url),discovery_tags);
 insert into public.discovery_music values(result,trim(artist_name),entry_kind,spotify_url,apple_url,amazon_url,audio_path,true,now());return result;
end;$$;
create function public.prepare_music_account_deletion(confirmation text) returns text[] language plpgsql security definer set search_path='' as $$ begin
 if confirmation<>'DELETE MY ACCOUNT' or not exists(select 1 from public.profiles where id=auth.uid() and photo_cleanup_pending) then raise exception 'Prepare account deletion first.';end if;
 return coalesce((select array_agg(path) from public.music_uploads where user_id=auth.uid()),array[]::text[]);end;$$;
create function public.require_music_cleanup() returns trigger language plpgsql security definer set search_path='' as $$ begin if exists(select 1 from storage.objects o join public.music_uploads u on u.path=o.name where o.bucket_id='discovery-music' and u.user_id=old.id) then raise exception 'Remove uploaded music before deleting the account.';end if;return old;end;$$;
create trigger require_music_cleanup before delete on public.profiles for each row execute function public.require_music_cleanup();
revoke all on function public.require_music_cleanup() from public,anon,authenticated;
revoke all on function public.reserve_music_upload(),public.submit_music_discovery(text,text,text,text,text,text,text,text,text,boolean,text[]),public.prepare_music_account_deletion(text) from public,anon,authenticated;
grant execute on function public.reserve_music_upload(),public.submit_music_discovery(text,text,text,text,text,text,text,text,text,boolean,text[]),public.prepare_music_account_deletion(text) to authenticated;
create function public.export_own_music() returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Sign in to export your music.';end if;
 return jsonb_build_object('discoveries',(select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from public.discovery_music m join public.submissions s on s.id=m.submission_id where s.author_id=auth.uid()),'uploads',(select coalesce(jsonb_agg(to_jsonb(u)),'[]'::jsonb) from public.music_uploads u where u.user_id=auth.uid()));end;$$;
revoke all on function public.export_own_music() from public,anon,authenticated;
grant execute on function public.export_own_music() to authenticated;
commit;

