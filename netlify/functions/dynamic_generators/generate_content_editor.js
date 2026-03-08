// \netlify\functions\dynamic_generators\generate_content_editor.js

export default async function generate_content_editor() {
return `
<div class="wide-content">

<h1>Content Editor</h1>

<div style="display:flex;gap:40px;">

<div id="tree" style="width:320px;border-right:1px solid #ccc;padding-right:20px;"></div>

<div id="editor" style="flex:1;">

<form id="editForm"></form>

<div style="margin-top:20px;">
<button type="button" onclick="saveEdit()">Save</button>
<button type="button" onclick="publishEdits()">Publish</button>
<button type="button" onclick="dropEdits()">Drop Edits</button>
<button type="button" onclick="cancelEdit()">Cancel</button>
</div>

</div>

</div>

<div id="logDiv" style="
border-top:1px solid #ccc;
margin-top:20px;
padding:10px;
max-height:200px;
overflow-y:auto;
background:#f9f9f9;
font-size:12px;
white-space:pre-wrap;
"></div>

<script>

// ===== Inline log helper =====
function log(msg) {
const logDiv = document.getElementById("logDiv");
if(logDiv) {
logDiv.textContent += msg + "\\n";
logDiv.scrollTop = logDiv.scrollHeight;
}
console.log(msg);
}

log("Step 1: generator script started");

// =====================
// Globals
// =====================

let currentFile = null;
let rawBody = "";
let frontMatter = {};
let accessOptionsCache = null;

// =====================
// Init editor
// =====================

function initEditor() {
log("Step 2: initializing editor");
log("Tree element exists: " + !!document.getElementById("tree"));
loadTree();
}

// =====================
// Script loader
// =====================

async function loadScript(src) {
return new Promise((resolve,reject)=>{

const s=document.createElement("script");
s.src=src;

s.onload=()=>{
log("Loaded script: "+src);
resolve();
};

s.onerror=()=>{
log("Failed to load script: "+src);
reject(new Error("Script failed "+src));
};

document.head.appendChild(s);

});
}

// =====================
// Load helpers
// =====================

(async()=>{

try{

await loadScript("/js/webeditor/normalizeFrontMatter.js");
await loadScript("/js/webeditor/renderAccessOptions.js");
await loadScript("/js/webeditor/renderExtraFields.js");
await loadScript("/js/webeditor/renderSubOptions.js");

log("All helper scripts loaded successfully");

log("normalizeFrontMatter type: "+typeof normalizeFrontMatter);
log("renderAccessOptions type: "+typeof renderAccessOptions);
log("renderExtraFields type: "+typeof renderExtraFields);
log("renderSubOptions type: "+typeof renderSubOptions);

initEditor();

}catch(err){

log("Script loading error: "+err);

}

})();

</script>

<script>

// =====================
// Load Tree
// =====================

async function loadTree(){

try{

log("Loading tree...");

const res=await fetch("/.netlify/functions/list_content_tree");

log("Tree HTTP status: "+res.status);

if(!res.ok) throw new Error("HTTP "+res.status);

const tree=await res.json();

log("Tree loaded successfully");

document.getElementById("tree").appendChild(renderTree(tree));

}catch(err){

log("loadTree error: "+err);

}

}

// =====================
// Render Tree
// =====================

function renderTree(nodes){

const ul=document.createElement("ul");
ul.style.listStyle="none";
ul.style.paddingLeft="15px";

nodes.forEach(node=>{

const li=document.createElement("li");

if(node.type==="folder"){

const label=document.createElement("div");

label.textContent=node.name;
label.style.fontWeight="bold";

li.appendChild(label);
li.appendChild(renderTree(node.children));
}else{

const a=document.createElement("a");

a.href="#";
a.textContent=node.qualifiedTitle || node.name;
a.style.display="block";
a.style.cursor="pointer";

a.onclick=(e)=>{

e.preventDefault();

log("Clicked file: "+node.path);

startEdit(node.path).catch(err=>log("startEdit error: "+err));

};

li.appendChild(a);

}

ul.appendChild(li);

});

return ul;

}

// =====================
// Start Editing
// =====================

async function startEdit(file){

try{

log("startEdit called for "+file);

currentFile=file;

document.getElementById("tree").style.display="none";

const res=await fetch("/.netlify/functions/start_edit",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({file})
});

log("start_edit HTTP status: "+res.status);

if(!res.ok) throw new Error("HTTP "+res.status);

const data=await res.json();

log("start_edit response type: "+typeof data);
log("start_edit response keys: "+Object.keys(data));

log("start_edit response preview:");
log(JSON.stringify(data).substring(0,500));

log("typeof data.content = "+typeof data.content);

parseMarkdown(data.content);

log("File loaded: "+file);

}catch(err){

log("startEdit error: "+err);

}

}

// =====================
// Parse Markdown
// =====================

function parseMarkdown(md){

log("parseMarkdown called");
log("typeof md = "+typeof md);

if(typeof md!=="string"){

log("ERROR: markdown is not string");
log("Value received:");
log(JSON.stringify(md));

throw new Error("Markdown not string");

}

log("Markdown length: "+md.length);

const parts=md.split("---");

log("Frontmatter split parts: "+parts.length);

const frontRaw=parts[1]||"";

rawBody=parts.slice(2).join("---");

const fields={};

frontRaw.split("\\n").forEach(line=>{

const i=line.indexOf(":");

if(i>0){

let key=line.slice(0,i).trim();
let value=line.slice(i+1).trim();

const hashIdx=value.indexOf("#");

if(hashIdx>=0) value=value.slice(0,hashIdx).trim();

fields[key]=value;

}

});

log("Parsed raw fields:");
log(JSON.stringify(fields));

frontMatter = normalizeFrontMatter(md);

log("Normalized front matter:");
log(JSON.stringify(frontMatter));

renderForm();

}

// =====================
// Render Form
// =====================

async function renderForm(){

log("renderForm called");

const form=document.getElementById("editForm");

form.innerHTML="";

const pageTypeLabel=document.createElement("label");
pageTypeLabel.textContent="Page type";
pageTypeLabel.style.display="block";
pageTypeLabel.style.marginTop="10px";

const pageTypeSelect=document.createElement("select");

["content page","navigation page"].forEach(v=>{

const opt=document.createElement("option");

opt.value=v;
opt.textContent=v;

if(frontMatter["page_type"]===v) opt.selected=true;

pageTypeSelect.appendChild(opt);

});

pageTypeSelect.name="page_type";
pageTypeSelect.style.width="320px";

pageTypeSelect.onchange=()=>renderSubOptions(pageTypeSelect.value,form,frontMatter);

form.appendChild(pageTypeLabel);
form.appendChild(pageTypeSelect);

// Title

const titleLabel=document.createElement("label");
titleLabel.textContent="Title (required)";
titleLabel.style.display="block";
titleLabel.style.marginTop="10px";

const titleInput=document.createElement("input");
titleInput.type="text";
titleInput.value=frontMatter["title"]||"";
titleInput.name="title";
titleInput.style.width="320px";

form.appendChild(titleLabel);
form.appendChild(titleInput);

// Summary

const summaryLabel=document.createElement("label");
summaryLabel.textContent="Summary (optional)";
summaryLabel.style.display="block";
summaryLabel.style.marginTop="10px";

const summaryInput=document.createElement("textarea");
summaryInput.name="summary";
summaryInput.value=frontMatter["summary"]||"";
summaryInput.rows=3;
summaryInput.style.width="320px";

form.appendChild(summaryLabel);
form.appendChild(summaryInput);

await renderAccessOptions(form,frontMatter,accessOptionsCache);
renderSubOptions(pageTypeSelect.value,form,frontMatter);
renderExtraFields(form,frontMatter);

}

// =====================
// Build Markdown
// =====================

function buildMarkdown(){

const form=document.getElementById("editForm");

const data=new FormData(form);

let front="---\\n";

for(const[k,v]of data.entries()){
front+=k+": "+v+"\\n";
}

front+="---\\n";

return front+rawBody;

}

// =====================
// Save
// =====================

async function saveEdit(){

try{

const content=buildMarkdown();

const res=await fetch("/.netlify/functions/save_edit",{
method:"POST",
body:JSON.stringify({file:currentFile,content})
});

log("save_edit HTTP status: "+res.status);

if(!res.ok) throw new Error("HTTP "+res.status);

log("Saved: "+currentFile);

document.getElementById("tree").style.display="block";

}catch(err){

log("saveEdit error: "+err);

}

}

// =====================
// Publish
// =====================

async function publishEdits(){

try{

const res=await fetch("/.netlify/functions/publish_edits",{method:"POST"});

log("publish HTTP status: "+res.status);

if(!res.ok) throw new Error("HTTP "+res.status);

log("All edits published");

document.getElementById("tree").style.display="block";

}catch(err){

log("publishEdits error: "+err);

}

}

// =====================
// Cancel
// =====================

function cancelEdit(){

document.getElementById("editForm").innerHTML="";

document.getElementById("tree").style.display="block";

log("Edit canceled, tree restored");

}
// =====================
// Drop Edits
// =====================

async function dropEdits(){

try{

if(!currentFile){
log("No file selected for drop edits");
return;
}

const res=await fetch("/.netlify/functions/drop_edit",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({file:currentFile})
});

log("drop_edit HTTP status: "+res.status);

if(!res.ok) throw new Error("HTTP "+res.status);

log("Edits dropped: "+currentFile);

document.getElementById("tree").style.display="block";
document.getElementById("editForm").innerHTML="";

}catch(err){

log("dropEdits error: "+err);

}

}
</script>
`;
  }
