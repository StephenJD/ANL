// netlify/functions/webeditor/drop_edit.js
import fs from "fs";
import path from "path";

export default async function handler(event){

try{

const {file}=JSON.parse(event.body);

const tmpPath=path.join(process.cwd(),"tmp",file);

if(fs.existsSync(tmpPath)){
fs.unlinkSync(tmpPath);
}

return new Response(JSON.stringify({ok:true}),{
status:200,
headers:{"Content-Type":"application/json"}
});

}catch(err){

console.error("[drop_edit]",err);

return new Response(JSON.stringify({error:"drop failed"}),{
status:500,
headers:{"Content-Type":"application/json"}
});

}

}
