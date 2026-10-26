-- Run after 038_preview_vote_commit.sql in a test database. All fixtures roll back.
begin;
insert into auth.users(id) values(md5('preview-owner')::uuid),(md5('preview-voter')::uuid);
insert into public.photo_uploads(user_id,path) values(md5('preview-owner')::uuid,'preview-commit-fixture.jpg');
insert into public.content_screenings(asset_key,verdict) values('discovery:preview-commit-fixture.jpg','passed');
insert into public.submissions(id,author_id,title,description,url,category,status,image_path) values
 (md5('preview-find')::uuid,md5('preview-owner')::uuid,'Preview commit fixture','This fixture only exists inside a rolled-back test.','https://example.com/preview-commit-fixture','Art','approved','preview-commit-fixture.jpg');
do $$begin
 if has_function_privilege('anon','public.commit_preview_votes(jsonb)','execute') then raise exception 'Guests can count previews';end if;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',md5('preview-voter')::uuid::text,true);
do $$declare payload jsonb; result record;begin
 payload:=jsonb_build_array(jsonb_build_object('id',md5('preview-find')::uuid,'value',1));
 select * into result from public.commit_preview_votes(payload);
 if result.outcome<>'counted' or result.up_votes<>1 then raise exception 'Initial preview was not counted';end if;
 select * into result from public.commit_preview_votes(payload);
 if result.outcome<>'existing' or result.up_votes<>1 then raise exception 'Retry duplicated vote';end if;
 select * into result from public.commit_preview_votes(jsonb_build_array(jsonb_build_object('id',md5('preview-find')::uuid,'value',-1)));
 if result.outcome<>'existing' or result.vote_value<>1 or result.up_votes<>1 or result.down_votes<>0 then raise exception 'Preview replaced existing account vote';end if;
 select * into result from public.commit_preview_votes(jsonb_build_array(jsonb_build_object('id',md5('missing-preview')::uuid,'value',1)));
 if result.outcome<>'unavailable' then raise exception 'Unavailable discovery counted';end if;
 begin
  perform public.commit_preview_votes(payload||payload);
  raise exception 'Duplicate input accepted';
 exception when raise_exception then if sqlerrm='Duplicate input accepted' then raise;end if;end;
 begin
  perform public.commit_preview_votes('[{"id":"private","value":0}]'::jsonb);
  raise exception 'Invalid input accepted';
 exception when raise_exception then if sqlerrm='Invalid input accepted' then raise;end if;end;
end$$;
reset role;
rollback;
