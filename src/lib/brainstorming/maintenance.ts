import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

// Deletes files only for notes already permanently deleted by an administrator.
// Failed storage requests leave a durable job for the next maintenance run.
export async function maintainBrainstorming(noteId?: string) {
 const admin=createAdminClient();
 if(!noteId)await admin.from('brainstorm_versions').delete().lt('created_at',new Date(Date.now()-30*86400000).toISOString());
 let query=admin.from('brainstorm_image_cleanup').select('note_id').order('created_at').limit(25);
 if(noteId)query=query.eq('note_id',noteId);
 const {data,error}=await query;
 // Compatible with deployments that have not applied the upgrade yet.
 if(error)return false;
 for(const job of data||[]){
  let failed=false;
  while(true){
   const files=await admin.storage.from('brainstorm-images').list(job.note_id,{limit:100});
   if(files.error){failed=true;break;}
   if(!files.data?.length)break;
   const removed=await admin.storage.from('brainstorm-images').remove(files.data.map(f=>`${job.note_id}/${f.name}`));
   if(removed.error){failed=true;break;}
  }
  if(!failed)await admin.from('brainstorm_image_cleanup').delete().eq('note_id',job.note_id);
  else return false;
 }
 return true;
}
