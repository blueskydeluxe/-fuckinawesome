begin;
-- Editorial opening order affects only optional rounds, never votes or Hall rankings.
update public.submissions s set opening_pick=p.rank from (values
 ('0f634045-4368-4511-ac44-1a923453d941'::uuid,1), -- Cappadocia: visual wonder
 ('90286590-5fe4-4c3f-94cc-712d4ef13c44'::uuid,2), -- SwitchBot: surprising, debatable gadget
 ('fae2d7be-93a4-4383-9a29-8ddf6cec87ce'::uuid,3), -- McLaren: sculptural design
 ('f0bbef59-fba9-4d4a-941b-e8a59bcd8b3b'::uuid,4), -- Aptos: dining concept
 ('3c11ccac-292c-4a6f-ba38-15aeebbc84a0'::uuid,5), -- Lens Lodge: unusual stay
 ('e6ce8000-6205-4877-8c9b-34e8126b13ad'::uuid,6),
 ('35d281ff-840b-41c3-912d-23bcda9d41d8'::uuid,7),
 ('0ffe08b9-8f58-4bf4-a35d-c66f695158fe'::uuid,8),
 ('60789ca1-8ca8-4119-af9b-10b98844ad15'::uuid,9),
 ('b49037d2-e0ab-46d5-91d5-fd7f2c3eaa49'::uuid,10),
 ('04681f14-d653-490c-9cb5-35284c1a6c6f'::uuid,11),
 ('b9d4591b-f3b4-4acc-822f-244b28954fe0'::uuid,12),
 ('10100b4c-5389-42ef-b216-30e8498c69e3'::uuid,13),
 ('f2ae75a8-034d-442f-a5cb-98ff62f9d3c1'::uuid,14)
) p(id,rank) where s.id=p.id and s.status='approved' and s.deleted_at is null and s.image_path is not null;
commit;
