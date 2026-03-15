// netlify/functions/drop_edit.js
import fs from "fs";
import path from "path";
import { requireBindingAuth } from "./authHelper.js";

export default async function handler(event){

const auth = await requireBindingAuth(event, "edit_website");
if (auth.unauthorized) return new Response(auth.response.body, { status: auth.response.statusCode, headers: auth.response.headers });

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

