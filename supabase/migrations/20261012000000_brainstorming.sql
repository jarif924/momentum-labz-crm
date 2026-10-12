-- Local-first upgrade. Back up brainstorm_notes before applying to any database.
begin;
create or replace function public.bn_role() returns text language sql stable security definer set search_path=public as $$ select role from public.users where id=auth.uid() $$;
revoke all on function public.bn_role() from public; grant execute on function public.bn_role() to authenticated;
-- Prevent a member from elevating their own role through the existing broad policy.
-- Team administration already uses the server-only service-role client.
drop policy if exists authenticated_all on public.users;
create policy bn_member_directory on public.users for select to authenticated using (public.bn_role() is not null);
revoke insert,update,delete on public.users from authenticated,anon;

alter table public.brainstorm_notes
 add column document jsonb,
 add column original_content text,
 add column visibility text not null default 'team' check (visibility in ('team','private')),
 add column updated_by uuid references public.users(id) on delete set null,
 add column tags text[] not null default '{}',
 add column client_id uuid references public.contacts(id) on delete set null,
 add column lead_id uuid references public.leads(id) on delete set null,
 add column project_id uuid references public.projects(id) on delete set null,
 add column pinned boolean not null default false,
 add column version integer not null default 1,
 add column deleted_at timestamptz,
 add column deleted_by uuid references public.users(id) on delete set null;
-- Preserve original bytes and every line, including empty and trailing lines.
update public.brainstorm_notes n set original_content=content, document=(
 select jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'type','paragraph','content',jsonb_build_array(jsonb_build_object('type','text','text',line,'styles','{}'::jsonb))) order by ord)
 from unnest(string_to_array(coalesce(n.content,''),E'\n')) with ordinality x(line,ord)
);
update public.brainstorm_notes set document='[{"type":"paragraph","content":[]}]' where document is null;
alter table public.brainstorm_notes alter column document set not null;
alter table public.brainstorm_notes alter column document set default '[{"type":"paragraph","content":[]}]';
alter table public.brainstorm_notes add constraint bn_document_array check(jsonb_typeof(document)='array');
create index bn_notes_order on public.brainstorm_notes(pinned desc,updated_at desc);
create index bn_notes_author on public.brainstorm_notes(created_by);

create table public.brainstorm_tags(name text primary key check(length(trim(name)) between 1 and 40));
insert into public.brainstorm_tags values ('Website'),('Marketing'),('Client Idea'),('Meeting');
create table public.brainstorm_locks(note_id uuid primary key references public.brainstorm_notes on delete cascade,user_id uuid not null references public.users on delete cascade,token uuid not null,expires_at timestamptz not null);
create table public.brainstorm_versions(id uuid primary key default gen_random_uuid(),note_id uuid not null references public.brainstorm_notes on delete cascade,title text not null,document jsonb not null,content text,version integer not null,created_by uuid references public.users on delete set null,created_at timestamptz not null default now());
create index bn_versions_note on public.brainstorm_versions(note_id,created_at desc);
create table public.brainstorm_comments(id uuid primary key default gen_random_uuid(),note_id uuid not null references public.brainstorm_notes on delete cascade,parent_id uuid references public.brainstorm_comments on delete cascade,author_id uuid not null references public.users,body text not null check(length(trim(body)) between 1 and 10000),mentions uuid[] not null default '{}',resolved boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index bn_comments_note on public.brainstorm_comments(note_id,created_at);

create or replace function public.bn_can_read(nid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.bn_role() is not null and exists(select 1 from public.brainstorm_notes where id=nid and (visibility='team' or created_by=auth.uid()) and (deleted_at is null or created_by=auth.uid() or public.bn_role() in ('owner','admin')))
$$;
create or replace function public.bn_can_edit(nid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select public.bn_can_read(nid) and public.bn_role() in ('owner','admin','sales') and exists(select 1 from public.brainstorm_notes where id=nid and deleted_at is null)
$$;
revoke all on function public.bn_can_read(uuid),public.bn_can_edit(uuid) from public;
grant execute on function public.bn_can_read(uuid),public.bn_can_edit(uuid) to authenticated;
drop policy if exists authenticated_all on public.brainstorm_notes;
create policy bn_note_read on public.brainstorm_notes for select to authenticated using(public.bn_can_read(id));
revoke all on public.brainstorm_notes from anon,authenticated; grant select on public.brainstorm_notes to authenticated;
alter table public.brainstorm_tags enable row level security;
alter table public.brainstorm_locks enable row level security;
alter table public.brainstorm_versions enable row level security;
alter table public.brainstorm_comments enable row level security;
create policy bn_tag_read on public.brainstorm_tags for select to authenticated using(public.bn_role() is not null);
create policy bn_lock_read on public.brainstorm_locks for select to authenticated using(public.bn_can_read(note_id));
create policy bn_version_read on public.brainstorm_versions for select to authenticated using(public.bn_can_read(note_id) and public.bn_role() in ('owner','admin') and created_at>now()-interval '30 days');
create policy bn_comment_read on public.brainstorm_comments for select to authenticated using(public.bn_can_read(note_id));
revoke all on public.brainstorm_tags,public.brainstorm_locks,public.brainstorm_versions,public.brainstorm_comments from anon,authenticated;
grant select on public.brainstorm_tags,public.brainstorm_locks,public.brainstorm_versions,public.brainstorm_comments to authenticated;

-- Reuse existing notifications, with recipient and source-note privacy enforced.
alter table public.notifications add column brainstorm_note_id uuid references public.brainstorm_notes on delete cascade;
drop policy if exists authenticated_all on public.notifications;
create policy bn_notifications_read on public.notifications for select to authenticated using(public.bn_role() is not null and (user_id is null or user_id=auth.uid()) and (brainstorm_note_id is null or public.bn_can_read(brainstorm_note_id)));
create policy bn_notifications_seen on public.notifications for update to authenticated using(public.bn_role() is not null and (user_id is null or user_id=auth.uid()) and (brainstorm_note_id is null or public.bn_can_read(brainstorm_note_id))) with check(public.bn_role() is not null and (user_id is null or user_id=auth.uid()));
revoke all on public.notifications from anon,authenticated; grant select,update(is_read) on public.notifications to authenticated;

-- Converted tasks use the existing model. A private note's task stays private even
-- if the note is later deleted. Assignment to another person requires a Team note.
alter table public.tasks add column brainstorm_note_id uuid references public.brainstorm_notes on delete set null, add column brainstorm_private_owner uuid references public.users;
create policy bn_task_privacy on public.tasks as restrictive for all to authenticated using(
 (brainstorm_note_id is null or public.bn_can_read(brainstorm_note_id)) and (brainstorm_private_owner is null or brainstorm_private_owner=auth.uid())
) with check((brainstorm_note_id is null or public.bn_can_edit(brainstorm_note_id)) and (brainstorm_private_owner is null or brainstorm_private_owner=auth.uid()));

create or replace function public.bn_plain_text(doc jsonb) returns text language sql immutable as $$
 select coalesce(string_agg(value #>> '{}',E'\n'),'') from jsonb_path_query(doc,'$.**.text') value
$$;
create or replace function public.bn_create(p_title text,p_document jsonb,p_visibility text default 'team') returns public.brainstorm_notes language plpgsql security definer set search_path=public as $$
declare n public.brainstorm_notes;
begin
 if coalesce(public.bn_role(),'') not in ('owner','admin','sales') then raise exception 'You cannot create notes'; end if;
 if jsonb_typeof(p_document)<>'array' or length(p_document::text)>1000000 then raise exception 'Invalid or oversized note'; end if;
 insert into public.brainstorm_notes(title,document,content,visibility,created_by,updated_by) values(left(coalesce(nullif(trim(p_title),''),'Untitled Note'),200),p_document,public.bn_plain_text(p_document),p_visibility,auth.uid(),auth.uid()) returning * into n;
 return n;
end $$;

create or replace function public.bn_lock(p_note uuid,p_token uuid,p_release boolean default false) returns public.brainstorm_locks language plpgsql security definer set search_path=public as $$
declare l public.brainstorm_locks;
begin
 if not public.bn_can_edit(p_note) then raise exception 'You cannot edit this note'; end if;
 if p_release then delete from public.brainstorm_locks where note_id=p_note and user_id=auth.uid() and token=p_token; return null; end if;
 insert into public.brainstorm_locks(note_id,user_id,token,expires_at) values(p_note,auth.uid(),p_token,now()+interval '2 minutes')
 on conflict(note_id) do update set user_id=excluded.user_id,token=excluded.token,expires_at=excluded.expires_at
 where brainstorm_locks.expires_at<=now() or (brainstorm_locks.user_id=auth.uid() and brainstorm_locks.token=p_token)
 returning * into l;
 if l.note_id is null then raise exception 'Another teammate is editing this note'; end if;
 return l;
end $$;

create or replace function public.bn_snapshot(n public.brainstorm_notes,force_snapshot boolean default false) returns void language plpgsql security definer set search_path=public as $$
begin
 if force_snapshot or not exists(select 1 from public.brainstorm_versions where note_id=n.id and created_at>now()-interval '5 minutes') then
 insert into public.brainstorm_versions(note_id,title,document,content,version,created_by) values(n.id,n.title,n.document,n.content,n.version,n.updated_by);
 end if;
 delete from public.brainstorm_versions where note_id=n.id and (created_at<now()-interval '30 days' or id in(select id from public.brainstorm_versions where note_id=n.id order by created_at desc,id desc offset 50));
end $$;

create or replace function public.bn_save(p_note uuid,p_token uuid,p_version integer,p_patch jsonb) returns public.brainstorm_notes language plpgsql security definer set search_path=public as $$
declare n public.brainstorm_notes; d jsonb;
begin
 if not public.bn_can_edit(p_note) then raise exception 'You cannot edit this note'; end if;
 select * into n from public.brainstorm_notes where id=p_note for update;
 if n.version<>p_version then raise exception 'This note changed. Your draft is safe. Reload before saving.' using errcode='40001'; end if;
 if not exists(select 1 from public.brainstorm_locks where note_id=p_note and token=p_token and user_id=auth.uid() and expires_at>now()) then raise exception 'Your editing session expired. Resume editing to save.'; end if;
 if p_patch ? 'visibility' and p_patch->>'visibility'<>n.visibility and n.created_by is distinct from auth.uid() then raise exception 'Only the creator can change visibility'; end if;
 d=coalesce(p_patch->'document',n.document);
 if jsonb_typeof(d)<>'array' or length(d::text)>1000000 then raise exception 'Invalid or oversized note'; end if;
 perform public.bn_snapshot(n);
 update public.brainstorm_notes set
 title=case when p_patch ? 'title' then left(coalesce(nullif(trim(p_patch->>'title'),''),'Untitled Note'),200) else n.title end,
 document=d,content=public.bn_plain_text(d),
 status=coalesce(p_patch->>'status',n.status),visibility=coalesce(p_patch->>'visibility',n.visibility),
 pinned=coalesce((p_patch->>'pinned')::boolean,n.pinned),
 tags=case when p_patch ? 'tags' then array(select jsonb_array_elements_text(p_patch->'tags')) else n.tags end,
 client_id=case when p_patch ? 'client_id' then (p_patch->>'client_id')::uuid else n.client_id end,
 lead_id=case when p_patch ? 'lead_id' then (p_patch->>'lead_id')::uuid else n.lead_id end,
 project_id=case when p_patch ? 'project_id' then (p_patch->>'project_id')::uuid else n.project_id end,
 version=n.version+1,updated_by=auth.uid() where id=p_note returning * into n;
 return n;
end $$;

create or replace function public.bn_manage(p_note uuid,p_action text,p_token uuid default null,p_version integer default null,p_revision uuid default null) returns public.brainstorm_notes language plpgsql security definer set search_path=public as $$
declare n public.brainstorm_notes; r public.brainstorm_versions;
begin
 if not public.bn_can_read(p_note) then raise exception 'Note not available'; end if;
 select * into n from public.brainstorm_notes where id=p_note for update;
 if p_action in ('trash','restore_trash','delete') then
 if coalesce(public.bn_role(),'') not in ('owner','admin') and (n.created_by is distinct from auth.uid() or public.bn_role()='viewer') then raise exception 'You cannot manage this note'; end if;
 if p_version is distinct from n.version then raise exception 'Note changed. Reload and try again.'; end if;
 if p_action='delete' then
 if public.bn_role() not in ('owner','admin') or n.deleted_at is null then raise exception 'Only admins can permanently delete trashed notes'; end if;
 delete from public.brainstorm_notes where id=p_note; return null;
 elsif p_action='trash' then
 update public.brainstorm_notes set deleted_at=now(),deleted_by=auth.uid(),version=version+1 where id=p_note returning * into n;
 delete from public.brainstorm_locks where note_id=p_note;
 else update public.brainstorm_notes set deleted_at=null,deleted_by=null,version=version+1 where id=p_note returning * into n;
 end if;
 elsif p_action='restore_version' then
 if public.bn_role() not in ('owner','admin') or not public.bn_can_edit(p_note) then raise exception 'Only admins can restore versions'; end if;
 select * into r from public.brainstorm_versions where id=p_revision and note_id=p_note and created_at>now()-interval '30 days';
 if r.id is null then raise exception 'Version no longer available'; end if;
 perform public.bn_snapshot(n,true);
 n=public.bn_save(p_note,p_token,p_version,jsonb_build_object('title',r.title,'document',r.document));
 else raise exception 'Unknown action'; end if;
 return n;
end $$;

create or replace function public.bn_tag(p_name text) returns void language plpgsql security definer set search_path=public as $$
begin if coalesce(public.bn_role(),'') not in ('owner','admin','sales') then raise exception 'You cannot create tags'; end if; insert into public.brainstorm_tags values(trim(p_name)) on conflict do nothing; end $$;

create or replace function public.bn_comment(p_note uuid,p_body text,p_id uuid default null,p_parent uuid default null,p_mentions uuid[] default '{}',p_action text default 'save') returns public.brainstorm_comments language plpgsql security definer set search_path=public as $$
declare c public.brainstorm_comments; old_mentions uuid[]='{}'; recipient uuid;
begin
 if not public.bn_can_read(p_note) or exists(select 1 from public.brainstorm_notes where id=p_note and deleted_at is not null) then raise exception 'Note not available'; end if;
 if p_id is not null then
 select * into c from public.brainstorm_comments where id=p_id and note_id=p_note for update;
 if c.id is null then raise exception 'Comment not found'; end if;
 old_mentions=c.mentions;
 if p_action in ('save','delete') and c.author_id<>auth.uid() and public.bn_role() not in ('owner','admin') then raise exception 'You cannot modify this comment'; end if;
 if p_action='delete' then delete from public.brainstorm_comments where id=p_id; return null;
 elsif p_action in ('resolve','reopen') then update public.brainstorm_comments set resolved=(p_action='resolve'),updated_at=now() where id=p_id returning * into c; return c;
 elsif p_action<>'save' then raise exception 'Unknown action'; end if;
 end if;
 if p_parent is not null and not exists(select 1 from public.brainstorm_comments where id=p_parent and note_id=p_note and parent_id is null) then raise exception 'Discussion not found'; end if;
 if p_id is null then insert into public.brainstorm_comments(note_id,parent_id,author_id,body,mentions) values(p_note,p_parent,auth.uid(),trim(p_body),p_mentions) returning * into c;
 else update public.brainstorm_comments set body=trim(p_body),mentions=p_mentions,updated_at=now() where id=p_id returning * into c; end if;
 for recipient in select distinct unnest(p_mentions) loop
 if recipient<>auth.uid() and not(recipient=any(old_mentions)) and exists(select 1 from public.users u join public.brainstorm_notes n on n.id=p_note where u.id=recipient and (n.visibility='team' or n.created_by=u.id)) then
 insert into public.notifications(title,message,type,user_id,link,brainstorm_note_id) values('Mentioned in a note','A teammate mentioned you in a discussion.','system',recipient,'/brainstorming?note='||p_note||'&comment='||c.id,p_note);
 end if; end loop;
 return c;
end $$;

create or replace function public.bn_task(p_note uuid,p_title text,p_assignee uuid,p_due timestamptz) returns uuid language plpgsql security definer set search_path=public as $$
declare n public.brainstorm_notes; tid uuid;
begin
 if not public.bn_can_edit(p_note) then raise exception 'You cannot create a task from this note'; end if;
 select * into n from public.brainstorm_notes where id=p_note;
 if length(trim(p_title)) not between 1 and 500 or p_due is null then raise exception 'Enter a title and due date'; end if;
 if p_assignee is not null and not exists(select 1 from public.users where id=p_assignee) then raise exception 'Assignee is not a team member'; end if;
 if n.visibility='private' and p_assignee is distinct from auth.uid() then raise exception 'Private notes can only create tasks assigned to you'; end if;
 insert into public.tasks(title,description,assigned_to,due_at,status,completed,project_id,lead_id,brainstorm_note_id,brainstorm_private_owner)
 values(trim(p_title),'Source note: /brainstorming?note='||p_note,p_assignee,p_due,'To Do',false,n.project_id,n.lead_id,p_note,case when n.visibility='private' then auth.uid() else null end) returning id into tid;
 return tid;
end $$;

-- Private image objects are addressed by note UUID / random filename.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('brainstorm-images','brainstorm-images',false,5242880,array['image/jpeg','image/png','image/webp','image/gif']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.bn_image_note(object_name text) returns uuid language plpgsql immutable as $$ begin return split_part(object_name,'/',1)::uuid; exception when others then return null; end $$;
create policy bn_image_read on storage.objects for select to authenticated using(bucket_id='brainstorm-images' and public.bn_can_read(public.bn_image_note(name)));
create policy bn_image_insert on storage.objects for insert to authenticated with check(bucket_id='brainstorm-images' and public.bn_can_edit(public.bn_image_note(name)) and exists(select 1 from public.brainstorm_locks where note_id=public.bn_image_note(name) and user_id=auth.uid() and expires_at>now()));
create policy bn_image_delete on storage.objects for delete to authenticated using(bucket_id='brainstorm-images' and public.bn_can_edit(public.bn_image_note(name)));
-- Broad pre-existing storage policies must not override image privacy.
create policy bn_image_privacy on storage.objects as restrictive for all to public using(bucket_id<>'brainstorm-images' or (auth.uid() is not null and public.bn_can_read(public.bn_image_note(name)))) with check(bucket_id<>'brainstorm-images' or (auth.uid() is not null and public.bn_can_edit(public.bn_image_note(name))));

-- SECURITY DEFINER helpers are never a public privilege escalation surface.
revoke all on function public.bn_plain_text(jsonb),public.bn_snapshot(public.brainstorm_notes,boolean),public.bn_image_note(text) from public;
grant execute on function public.bn_image_note(text) to authenticated;
revoke all on function public.bn_create(text,jsonb,text),public.bn_lock(uuid,uuid,boolean),public.bn_save(uuid,uuid,integer,jsonb),public.bn_manage(uuid,text,uuid,integer,uuid),public.bn_tag(text),public.bn_comment(uuid,text,uuid,uuid,uuid[],text),public.bn_task(uuid,text,uuid,timestamptz) from public;
grant execute on function public.bn_create(text,jsonb,text),public.bn_lock(uuid,uuid,boolean),public.bn_save(uuid,uuid,integer,jsonb),public.bn_manage(uuid,text,uuid,integer,uuid),public.bn_tag(text),public.bn_comment(uuid,text,uuid,uuid,uuid[],text),public.bn_task(uuid,text,uuid,timestamptz) to authenticated;
commit;
