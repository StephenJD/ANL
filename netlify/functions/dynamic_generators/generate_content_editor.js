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
</div>

</div>

</div>

<!-- Log container -->
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
// Logger to div
// =====================
function log(msg) {
    const logDiv = document.getElementById("logDiv");
    logDiv.textContent += msg + "\\n";
    logDiv.scrollTop = logDiv.scrollHeight;
}

// =====================
// Globals
// =====================
let currentFile = null;
let rawBody = "";

const dropdownSchema = {
    review_period: ["6m","12m","24m"],
    access: ["public","member","admin"],
    type: ["policy","form","page"]
}

// =====================
// Load and render tree
// =====================
async function loadTree() {
    try {
        const res = await fetch("/.netlify/functions/list_content_tree");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const tree = await res.json();
        log("Tree loaded successfully");
        document.getElementById("tree").appendChild(renderTree(tree));
    } catch (err) {
        log("loadTree error: " + err);
    }
}

// =====================
// Render tree with clickable links
// =====================
function renderTree(nodes) {
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
// Start editing
// =====================
async function startEdit(file) {
    try {
        log("startEdit called for " + file);
        currentFile = file;

        const res = await fetch("/.netlify/functions/start_edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file })
        });

        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        log("Raw markdown received:\\n" + data.content);
        parseMarkdown(data.content);
        log("File loaded: " + file);
    } catch (err) {
        log("startEdit error: " + err);
    }
}

// =====================
// Parse Markdown with logging
// =====================
function parseMarkdown(md) {
    log("Parsing markdown...");
    const parts = md.split("---");
    log("Split into parts: " + parts.length);
    const front = parts[1] || "";
    rawBody = parts.slice(2).join("---");
    log("Front matter:\\n" + front);
    log("Body starts with:\\n" + rawBody.slice(0,50) + "...");

    const lines = front.split("\\n");
    const fields = {};

    lines.forEach((line, idx) => {
        const i = line.indexOf(":");
        if(i > 0) {
            const k = line.slice(0,i).trim();
            const v = line.slice(i+1).trim();
            fields[k] = v;
            log("Parsed field [" + idx + "]: " + k + " = " + v);
        } else {
            log("Skipping line [" + idx + "]: " + line);
        }
    });

    renderForm(fields);
}

// =====================
// Render form with logging
// =====================
function renderForm(fields) {
    log("Rendering form...");
    const form = document.getElementById("editForm");
    form.innerHTML = "";

    Object.keys(fields).forEach(k => {
        log("Rendering field: " + k + " = " + fields[k]);
        const label = document.createElement("label");
        label.textContent = k;
        label.style.display = "block";
        label.style.marginTop = "10px";

        let input;
        if(dropdownSchema[k]) {
            input = document.createElement("select");
            dropdownSchema[k].forEach(v => {
                const opt = document.createElement("option");
                opt.value = v;
                opt.textContent = v;
                if(v === fields[k]) opt.selected = true;
                input.appendChild(opt);
            });
        } else {
            input = document.createElement("input");
            input.value = fields[k];
        }

        input.name = k;
        input.style.width = "320px";

        form.appendChild(label);
        form.appendChild(input);
    });

    log("Form rendering complete. Total fields: " + Object.keys(fields).length);
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
// Save edit
// =====================
async function saveEdit() {
    try {
        const content = buildMarkdown();
        const res = await fetch("/.netlify/functions/save_edit", {
            method: "POST",
            body: JSON.stringify({ file: currentFile, content })
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        log("Saved: " + currentFile);
    } catch (err) {
        log("saveEdit error: " + err);
    }
}

// =====================
// Publish edits
// =====================
async function publishEdits() {
    try {
        const res = await fetch("/.netlify/functions/publish_edits", { method: "POST" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        log("All edits published");
    } catch (err) {
        log("publishEdits error: " + err);
    }
}

// =====================
// Init
// =====================
loadTree();

</script>

</div>
`;
}
