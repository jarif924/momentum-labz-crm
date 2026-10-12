begin;

-- A duplicated note keeps its organization, including its pinned state.
create or replace function public.bn_duplicate(p_note uuid) returns public.brainstorm_notes
language plpgsql security definer set search_path=public as $$
declare source public.brainstorm_notes; copied public.brainstorm_notes;
begin
 if not public.bn_can_edit(p_note) then raise exception 'You cannot duplicate this note'; end if;
 select * into source from public.brainstorm_notes where id=p_note;
 copied=public.bn_create(source.title||' (copy)',source.document,source.visibility);
 update public.brainstorm_notes set
  tags=source.tags,status=source.status,pinned=source.pinned,
  client_id=source.client_id,lead_id=source.lead_id,project_id=source.project_id
 where id=copied.id returning * into copied;
 return copied;
end $$;

revoke all on function public.bn_duplicate(uuid) from public;
grant execute on function public.bn_duplicate(uuid) to authenticated;

commit;
