import {spawnSync} from 'node:child_process';
for(const file of ['audit-editor.mjs','editor-deep.mjs','editor-final.mjs','editor-table.mjs','editor-drag.mjs','editor-images.mjs']){
 console.log('\nEditor audit:',file);
 const result=spawnSync(process.execPath,['tests/brainstorming/'+file],{stdio:'inherit'});
 if(result.status!==0){process.exitCode=result.status||1;break;}
}
