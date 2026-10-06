begin;
insert into auth.users(id) values(md5('fa-search-test')::uuid);
insert into public.photo_uploads(user_id,path) values(md5('fa-search-test')::uuid,'test/search.jpg');
insert into public.submissions(id,author_id,title,description,url,category,image_path,status,tags) values
('29000000-0000-0000-0000-000000000020',md5('fa-search-test')::uuid,'An extraordinary discovery','A luminous underwater sculpture, with no useful tags.','https://example.com/search-test','Art','test/search.jpg','approved',array['misc']);
set local role anon;
do $$begin
 if not exists(select 1 from public.search_discovery_feed(search_query=>'LUMINOUS underwater') where id='29000000-0000-0000-0000-000000000020') then raise exception 'FAIL description keywords or case';end if;
 if not exists(select 1 from public.search_discovery_feed(search_query=>'extraordinary') where id='29000000-0000-0000-0000-000000000020') then raise exception 'FAIL title';end if;
 if not exists(select 1 from public.search_discovery_feed(search_query=>'misc') where id='29000000-0000-0000-0000-000000000020') then raise exception 'FAIL tag keyword';end if;
 if exists(select 1 from public.search_discovery_feed(search_query=>'luminous nonexistent') where id='29000000-0000-0000-0000-000000000020') then raise exception 'FAIL all words required';end if;
 if exists(select 1 from public.search_discovery_feed(search_query=>'luminous',selected_category=>'Food') where id='29000000-0000-0000-0000-000000000020') then raise exception 'FAIL category scope';end if;
 if exists(select 1 from public.search_discovery_feed(search_query=>'luminous',feed=>'Hall of Fame') where id='29000000-0000-0000-0000-000000000020') then raise exception 'FAIL hall scope';end if;
 if exists(select 1 from public.search_discovery_feed(search_query=>'%') where id='29000000-0000-0000-0000-000000000020') then raise exception 'FAIL wildcard expansion';end if;
 if not exists(select 1 from public.search_discovery_feed(selected_tag=>'misc') where id='29000000-0000-0000-0000-000000000020') then raise exception 'FAIL exact tag';end if;
end$$;
reset role;
update public.submissions set status='hidden' where id='29000000-0000-0000-0000-000000000020';
set local role anon;
do $$begin if exists(select 1 from public.search_discovery_feed(search_query=>'luminous') where id='29000000-0000-0000-0000-000000000020') then raise exception 'FAIL hidden search privacy';end if;end$$;
reset role;
update public.submissions set status='pending' where id='29000000-0000-0000-0000-000000000020';
set local role anon;
do $$begin if exists(select 1 from public.search_discovery_feed(search_query=>'luminous') where id='29000000-0000-0000-0000-000000000020') then raise exception 'FAIL pending search privacy';end if;end$$;
rollback;
select 'PASS: title, description, tags, case, multiword, category/hall scope, literal wildcards, exact tags and hidden/pending privacy. Fixtures rolled back.' as result;
