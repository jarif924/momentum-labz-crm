import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { maintainBrainstorming } from '@/lib/brainstorming/maintenance';
export const dynamic='force-dynamic';
export async function POST(request: Request){
 const client=await createClient();
 const {data:{user}}=await client.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in to continue.'},{status:401});
 const body=await request.json().catch(()=>null);
 if(!body||!/^[0-9a-f-]{36}$/i.test(body.noteId)||!Number.isInteger(body.version))return NextResponse.json({error:'Invalid note.'},{status:400});
 const {error}=await client.rpc('bn_manage',{p_note:body.noteId,p_action:'delete',p_version:body.version});
 if(error)return NextResponse.json({error:error.message},{status:403});
 const cleaned=await maintainBrainstorming(body.noteId);
 return NextResponse.json({success:true,cleanupPending:!cleaned});
}
