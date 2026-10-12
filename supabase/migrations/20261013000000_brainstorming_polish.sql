begin;
-- Preserve inline text order without jsonpath's recursive lax-mode duplicates.
create or replace function public.bn_plain_text(doc jsonb) returns text language plpgsql immutable set search_path=public as $$
declare result text=''; item jsonb; part text; separator text='';
begin
 if doc is null then return ''; end if;
 if jsonb_typeof(doc)='string' then return doc#>>'{}'; end if;
 if jsonb_typeof(doc)='array' then
  for item in select value from jsonb_array_elements(doc) loop
   part=public.bn_plain_text(item);
   result=result||separator||part;
   separator=case when item->>'type' in ('text','link') then '' else E'\n' end;
  end loop;
  return result;
 end if;
 if jsonb_typeof(doc)<>'object' then return ''; end if;
 if doc->>'type'='text' then return coalesce(doc->>'text',''); end if;
 if doc ? 'content' then result=public.bn_plain_text(doc->'content'); end if;
 if doc ? 'rows' then result=public.bn_plain_text(doc->'rows'); end if;
 if doc ? 'cells' then result=public.bn_plain_text(doc->'cells'); end if;
 if jsonb_array_length(coalesce(doc->'children','[]'))>0 then result=result||E'\n'||public.bn_plain_text(doc->'children'); end if;
 return result;
end $$;
-- Rebuild only derived search text; originals and documents remain intact.
update public.brainstorm_notes set content=public.bn_plain_text(document);
create index if not exists bn_versions_age on public.brainstorm_versions(created_at);
create or replace function public.bn_snapshot(n public.brainstorm_notes,force_snapshot boolean default false) returns void language plpgsql security definer set search_path=public as $$
begin
 if force_snapshot or not exists(select 1 from public.brainstorm_versions where note_id=n.id and created_at>now()-interval '5 minutes') then
  insert into public.brainstorm_versions(note_id,title,document,content,version,created_by) values(n.id,n.title,n.document,n.content,n.version,n.updated_by);
 end if;
 delete from public.brainstorm_versions where created_at<now()-interval '30 days';
 delete from public.brainstorm_versions where note_id=n.id and id in(select id from public.brainstorm_versions where note_id=n.id order by created_at desc,id desc offset 50);
end $$;
-- Copy organization fields as well as writing. Author and history start afresh.
create function public.bn_duplicate(p_note uuid) returns public.brainstorm_notes language plpgsql security definer set search_path=public as $$
declare source public.brainstorm_notes; copied public.brainstorm_notes;
begin
 if not public.bn_can_edit(p_note) then raise exception 'You cannot duplicate this note'; end if;
 select * into source from public.brainstorm_notes where id=p_note;
 copied=public.bn_create(source.title||' (copy)',source.document,source.visibility);
 update public.brainstorm_notes set tags=source.tags,status=source.status,client_id=source.client_id,lead_id=source.lead_id,project_id=source.project_id where id=copied.id returning * into copied;
 return copied;
end $$;
revoke all on function public.bn_duplicate(uuid) from public;
grant execute on function public.bn_duplicate(uuid) to authenticated;
-- This existing profile field was previously added outside the migration chain.
alter table public.users add column if not exists avatar_url text;
commit;
