-- Transactional fixtures use an existing member; all changes are rolled back.
begin;
insert into public.submissions(author_id,title,description,url,category,status,created_at)
select (select id from public.profiles limit 1),'Feed test '||i,'Temporary pagination fixture',
 'https://example.com/fa-feed-test/'||i,'Other','approved',now()-i*interval '1 hour'
from generate_series(1,205) i;
insert into public.votes(submission_id,user_id,value)
select id,author_id,1 from public.submissions where url='https://example.com/fa-feed-test/205';
insert into public.submissions(author_id,title,description,url,category)
select id,'Private feed test','Temporary private fixture','https://example.com/fa-feed-test/private','Other' from public.profiles limit 1;
set local role anon;
do $$ begin
 if (select count(*) from public.discovery_feed('New','Other',null,null,0))<>51 then raise exception 'Page size incorrect';end if;
 if (select count(*) from public.discovery_feed('New','Other',null,null,200))<>5 then raise exception 'Older discoveries missing';end if;
 if (select url from public.discovery_feed('Hall of Fame','Other',null,null,0) limit 1)<>'https://example.com/fa-feed-test/205' then raise exception 'Older Hall of Fame winner missing';end if;
 if exists(select 1 from public.discovery_feed('New','Other') where status<>'approved') then raise exception 'Private content leaked';end if;
 if exists(select 1 from public.discovery_feed('Moderation')) then raise exception 'Anonymous moderation feed leaked';end if;
end $$;
reset role;
select 'PASS: pages include older discoveries; global Hall of Fame; private content protected' as result;
rollback;
