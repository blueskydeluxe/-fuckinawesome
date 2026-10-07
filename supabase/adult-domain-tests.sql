begin;
insert into auth.users(id) values('18000000-0000-0000-0000-000000000004');
do $$declare address text;begin
 foreach address in array array['https://onlyfans.com/creator','https://FANSLY.COM./creator','https://shop.fanvue.com:443/','https://%6fnlyfans.com/'] loop
 begin insert into public.submissions(author_id,title,description,category,url,status) values('18000000-0000-0000-0000-000000000004','Test restriction','Rollback test only.','Other',address,'pending');raise exception 'FAIL adult domain accepted: %',address;
 exception when raise_exception then if sqlerrm<>'Adult websites, adult-content sales platforms, and disguised website addresses are not allowed.' then raise;end if;end;
 end loop;
 insert into public.submissions(author_id,title,description,category,url,status) values('18000000-0000-0000-0000-000000000004','Test domain boundary','Rollback test only.','Other','https://onlyfans.com.example.org/','pending');
end$$;
rollback;
