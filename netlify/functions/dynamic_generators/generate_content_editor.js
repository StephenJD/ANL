// \netlify\functions\dynamic_generators\generate_content_editor.js

export default async function generate_content_editor() {

return `
<div class="wide-content">

<h1>Content Editor</h1>

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
</script>

<script>
// ===== Script loader with logging =====
async function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => {
            log("Loaded script: " + src);
            resolve();
        };
        s.onerror = () => {
            log("Failed to load script: " + src);
            reject(new Error("Failed to load " + src));
        };
        document.head.appendChild(s);
    });
}

(async () => {
    try {
        await loadScript("/js/webeditor/normalizeFrontMatter.js");
        await loadScript("/js/webeditor/renderAccessOptions.js");
        await loadScript("/js/webeditor/renderExtraFields.js");
        await loadScript("/js/webeditor/renderSubOptions.js");

        log("All helper scripts loaded successfully");
        initEditor();
    } catch(err) {
        log("Script loading error: " + err);
    }
})();
</script>

<div style="display:flex;gap:40px;">

<div id="tree" style="width:320px;border-right:1px solid #ccc;padding-right:20px;"></div>

<div id="editor" style="flex:1;">

<form id="editForm"></form>

<div style="margin-top:20px;">
<button type="button" onclick="saveEdit()">Save</button>
<button type="button" onclick="publishEdits()">Publish</button>
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

// =====================
// Globals
// =====================
let currentFile = null;
let rawBody = "";
let frontMatter = {};
let accessOptionsCache = null;

function initEditor() {
    log("Step 2: initializing editor, checking tree div existence: " + !!document.getElementById("tree"));
    loadTree();
}

// =====================
// Load Tree
// =====================
async function loadTree() {
    try {
        log("loadTree started");
        const res = await fetch("/.netlify/functions/list_content_tree");
        if(!res.ok) throw new Error("HTTP " + res.status);
        const tree = await res.json();
        log("Tree data loaded: " + JSON.stringify(tree));
        if(typeof renderTree !== 'function') {
            log("renderTree is not defined!");
            return;
        }
        document.getElementById("tree").appendChild(renderTree(tree));
        log("Tree rendered");
    } catch(err) {
        log("loadTree error: " + err);
    }
}

// =====================
// Render Tree
// =====================
function renderTree(nodes) {
    log("renderTree called");
    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.paddingLeft = "15px";

    nodes.forEach(node => {
        const li = document.createElement("li");

        if(node.type === "folder") {
            li.style.fontWeight = "bold";
            li.textContent = node.name;
            li.appendChild(renderTree(node.children));
        } else {
            const a = document.createElement("a");
            a.href = "#";
            a.textContent = node.name;
            a.style.display = "block";
            a.style.cursor = "pointer";
            a.onclick = (e) => {
                e.preventDefault();
                log("Clicked file: " + node.path);
                startEdit(node.path).catch(err => log("startEdit error: " + err));
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
async function startEdit(file) {
    try {
        log("startEdit called for " + file);
        currentFile = file;

        const treeDiv = document.getElementById("tree");
        if(treeDiv) treeDiv.style.display = "none";

        const res = await fetch("/.netlify/functions/start_edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file })
        });
        if(!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        parseMarkdown(data.content);
        log("File loaded: " + file);
    } catch(err) {
        log("startEdit error: " + err);
    }
}

// =====================
// Parse Markdown
// =====================
function parseMarkdown(md) {
    log("parseMarkdown called, type: " + typeof md);
    if(typeof md !== "string") {
        log("md is not a string, attempting to read .content property");
        md = md.content || "";
    }

    const parts = md.split("---");
    const frontRaw = parts[1] || "";
    rawBody = parts.slice(2).join("---");

    const fields = {};
    frontRaw.split("\n").forEach(line => {
        const i = line.indexOf(":");
        if(i > 0) {
            let key = line.slice(0,i).trim();
            let value = line.slice(i+1).trim();
            const hashIdx = value.indexOf("#");
            if(hashIdx >= 0) value = value.slice(0, hashIdx).trim();
            fields[key] = value;
        }
    });

    if(typeof normalizeFrontMatter !== 'function') {
        log("normalizeFrontMatter not defined!");
        frontMatter = fields;
    } else {
        frontMatter = normalizeFrontMatter(fields);
    }

    log("Parsed front matter: " + JSON.stringify(frontMatter));

    renderForm();
}

// =====================
// Render Form
// =====================
async function renderForm() {
    const form = document.getElementById("editForm");
    if(!form) {
        log("editForm not found!");
        return;
    }
    form.innerHTML = "";

    if(typeof renderAccessOptions !== 'function') log("renderAccessOptions not defined!");
    else await renderAccessOptions(form, frontMatter, accessOptionsCache);

    if(typeof renderSubOptions !== 'function') log("renderSubOptions not defined!");
    else renderSubOptions(frontMatter["page_type"] || "content page", form, frontMatter);

    if(typeof renderExtraFields !== 'function') log("renderExtraFields not defined!");
    else renderExtraFields(form, frontMatter);

    log("Form rendered");
}

// =====================
// Build Markdown
// =====================
function buildMarkdown() {
    const form = document.getElementById("editForm");
    const data = new FormData(form);

    let front = "---\\n";
    for(const [k,v] of data.entries()) {
        front += k + ": " + v + "\\n";
    }
    front += "---\\n";

    return front + rawBody;
}

// =====================
// Save / Publish / Cancel
// =====================
async function saveEdit() {
    try {
        const content = buildMarkdown();
        const res = await fetch("/.netlify/functions/save_edit", {
            method: "POST",
            body: JSON.stringify({ file: currentFile, content })
        });
        if(!res.ok) throw new Error("HTTP " + res.status);
        log("Saved: " + currentFile);
        const treeDiv = document.getElementById("tree");
        if(treeDiv) treeDiv.style.display = "block";
    } catch(err) {
        log("saveEdit error: " + err);
    }
}

async function publishEdits() {
    try {
        const res = await fetch("/.netlify/functions/publish_edits", { method: "POST" });
        if(!res.ok) throw new Error("HTTP " + res.status);
        log("All edits published");
        const treeDiv = document.getElementById("tree");
        if(treeDiv) treeDiv.style.display = "block";
    } catch(err) {
        log("publishEdits error: " + err);
    }
}

function cancelEdit() {
    const form = document.getElementById("editForm");
    if(form) form.innerHTML = "";
    const treeDiv = document.getElementById("tree");
    if(treeDiv) treeDiv.style.display = "block";
    log("Edit canceled, tree restored");
}

</script>
`;
}
