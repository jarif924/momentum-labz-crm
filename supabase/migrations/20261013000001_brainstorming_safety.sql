begin;
-- Only server maintenance can access object-cleanup jobs. Notes are deleted only by an explicit administrator action.
create table public.brainstorm_image_cleanup(note_id uuid primary key,created_at timestamptz not null default now());
alter table public.brainstorm_image_cleanup enable row level security;
revoke all on public.brainstorm_image_cleanup from public,anon,authenticated;
create or replace function public.bn_save(p_note uuid,p_token uuid,p_version integer,p_patch jsonb) returns public.brainstorm_notes language plpgsql security definer set search_path=public as $$
declare n public.brainstorm_notes; d jsonb;
begin
 if not public.bn_can_edit(p_note) then raise exception 'You cannot edit this note'; end if;
 select * into n from public.brainstorm_notes where id=p_note for update;
 if not public.bn_can_edit(p_note) then raise exception 'Note no longer available'; end if;
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
 if n.visibility='private' then update public.tasks set brainstorm_private_owner=n.created_by where brainstorm_note_id=n.id and brainstorm_private_owner is null; end if;
 return n;
end $$;

create or replace function public.bn_manage(p_note uuid,p_action text,p_token uuid default null,p_version integer default null,p_revision uuid default null) returns public.brainstorm_notes language plpgsql security definer set search_path=public as $$
declare n public.brainstorm_notes; r public.brainstorm_versions;
begin
 if not public.bn_can_read(p_note) then raise exception 'Note not available'; end if;
 select * into n from public.brainstorm_notes where id=p_note for update;
 if not public.bn_can_read(p_note) then raise exception 'Note no longer available'; end if;
 if p_action in ('trash','restore_trash','delete') then
 if coalesce(public.bn_role(),'') not in ('owner','admin') and (n.created_by is distinct from auth.uid() or public.bn_role()='viewer') then raise exception 'You cannot manage this note'; end if;
 if p_version is distinct from n.version then raise exception 'Note changed. Reload and try again.'; end if;
 if p_action='delete' then
 if public.bn_role() not in ('owner','admin') or n.deleted_at is null then raise exception 'Only admins can permanently delete trashed notes'; end if;
 insert into public.brainstorm_image_cleanup(note_id) values(p_note) on conflict do nothing;
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

create or replace function public.bn_comment(p_note uuid,p_body text,p_id uuid default null,p_parent uuid default null,p_mentions uuid[] default '{}',p_action text default 'save') returns public.brainstorm_comments language plpgsql security definer set search_path=public as $$
declare c public.brainstorm_comments; old_mentions uuid[]='{}'; recipient uuid;
begin
 if not public.bn_can_read(p_note) or exists(select 1 from public.brainstorm_notes where id=p_note and deleted_at is not null) then raise exception 'Note not available'; end if;
 perform 1 from public.brainstorm_notes where id=p_note for update;
 if not public.bn_can_read(p_note) then raise exception 'Note no longer available'; end if;
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
 select * into n from public.brainstorm_notes where id=p_note for update;
 if not public.bn_can_edit(p_note) then raise exception 'Note no longer available'; end if;
 if length(trim(p_title)) not between 1 and 500 or p_due is null then raise exception 'Enter a title and due date'; end if;
 if p_assignee is not null and not exists(select 1 from public.users where id=p_assignee) then raise exception 'Assignee is not a team member'; end if;
 if n.visibility='private' and p_assignee is distinct from auth.uid() then raise exception 'Private notes can only create tasks assigned to you'; end if;
 insert into public.tasks(title,description,assigned_to,due_at,status,completed,project_id,lead_id,brainstorm_note_id,brainstorm_private_owner)
 values(trim(p_title),'Source note: /brainstorming?note='||p_note,p_assignee,p_due,'To Do',false,n.project_id,n.lead_id,p_note,case when n.visibility='private' then auth.uid() else null end) returning id into tid;
 return tid;
end $$;
commit;
