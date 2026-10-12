-- Run only after backing up; keeps a private full-fidelity rollback archive.
-- Does not run automatically and is never applied to production by this task.
begin;
-- Keep every earlier rollback archive rather than overwriting it.
do $$ begin if exists(select 1 from pg_namespace where nspname='brainstorming_rollback') then execute format('alter schema brainstorming_rollback rename to %I','brainstorming_rollback_'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'_'||substr(gen_random_uuid()::text,1,8)); end if; end $$;
drop index if exists public.bn_notes_author;
drop table if exists public.brainstorm_image_cleanup;
create schema if not exists brainstorming_rollback;
revoke all on schema brainstorming_rollback from public,anon,authenticated;
create table brainstorming_rollback.notes as table public.brainstorm_notes;
create table brainstorming_rollback.comments as table public.brainstorm_comments;
create table brainstorming_rollback.versions as table public.brainstorm_versions;
create table brainstorming_rollback.tags as table public.brainstorm_tags;
create table brainstorming_rollback.locks as table public.brainstorm_locks;
create table brainstorming_rollback.task_links as select id,brainstorm_note_id,brainstorm_private_owner from public.tasks;
create table brainstorming_rollback.notification_links as select id,brainstorm_note_id from public.notifications;
-- Restore original plain-text bytes for legacy notes; preserve text of newer notes.
update public.brainstorm_notes set content=coalesce(original_content,content);
do $$ declare f record; begin for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'bn\_%' escape '\' loop execute 'drop function if exists '||f.signature||' cascade'; end loop; end $$;
drop table public.brainstorm_comments,public.brainstorm_versions,public.brainstorm_locks,public.brainstorm_tags;
alter table public.tasks drop column brainstorm_note_id,drop column brainstorm_private_owner;
alter table public.notifications drop column brainstorm_note_id;
alter table public.brainstorm_notes drop column document,drop column original_content,drop column visibility,drop column updated_by,drop column tags,drop column client_id,drop column lead_id,drop column project_id,drop column pinned,drop column version,drop column deleted_at,drop column deleted_by;
-- Preserve private image files in their private bucket. Reapplying the upgrade
-- requires restoring note ownership first; no public image access is introduced.
drop policy if exists bn_image_read on storage.objects;
drop policy if exists bn_image_insert on storage.objects;
drop policy if exists bn_image_delete on storage.objects;
drop policy if exists bn_image_privacy on storage.objects;
create policy authenticated_all on public.brainstorm_notes for all using(auth.uid() is not null);
create policy authenticated_all on public.users for all using(auth.uid() is not null);
create policy authenticated_all on public.notifications for all using(auth.uid() is not null);
grant select,insert,update,delete on public.brainstorm_notes,public.users,public.notifications to authenticated;
commit;
