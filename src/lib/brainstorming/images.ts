import { createClient } from '@/lib/supabase/client';
export async function uploadImage(noteId: string,file: File,onProgress: (n: number)=>void): Promise<string> {
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error('Choose a JPG, PNG, WebP, or GIF image.');
  if(file.size>5*1024*1024) throw new Error('Images must be 5 MB or smaller.');
  let output: Blob=file;
  if(file.type!=='image/gif' && file.size>700000){
    const bitmap=await createImageBitmap(file);
    try {
      const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Could not prepare image.');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const compressed=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not compress image.')),'image/webp',0.85));
      if(compressed.size<file.size)output=compressed;
    } finally {bitmap.close();}
  }
  const client=createClient();const {data:{session}}=await client.auth.getSession();if(!session)throw new Error('Sign in again to upload.');
  const ext=output.type.split('/')[1].replace('jpeg','jpg');const objectPath=`${noteId}/${crypto.randomUUID()}.${ext}`;
  const api=process.env.NEXT_PUBLIC_SUPABASE_URL!;
  await new Promise<void>((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('POST',`${api}/storage/v1/object/brainstorm-images/${objectPath}`);
    xhr.setRequestHeader('Authorization',`Bearer ${session.access_token}`);xhr.setRequestHeader('apikey',process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);xhr.setRequestHeader('Content-Type',output.type);
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};
    xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('Image upload failed. Check your editing access and try again.'));
    xhr.onerror=()=>reject(new Error('Upload failed. Check your connection and try again.'));xhr.timeout=60000;xhr.ontimeout=()=>reject(new Error('Upload timed out. Please retry.'));xhr.send(output);
  });
  return `brainstorm-image:${objectPath}`;
}
// Authenticated downloads re-check RLS on every load; no reusable public/signed URLs.
export async function resolveImage(url: string): Promise<string>{
  if(!url.startsWith('brainstorm-image:')) return /^https?:\/\//i.test(url)?url:'';
  const {data,error}=await createClient().storage.from('brainstorm-images').download(url.slice('brainstorm-image:'.length));
  if(error)throw error;return URL.createObjectURL(data);
}
