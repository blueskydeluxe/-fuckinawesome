begin;
alter table public.submissions drop constraint submissions_description_check;
alter table public.submissions add constraint submissions_description_check check(char_length(description)<=1000);
commit;
