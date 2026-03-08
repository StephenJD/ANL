// \netlify\functions\dynamic_generators\generate_content_editor.js

export default async function generate_content_editor() {

return `
<div class="wide-content">

<h1>Content Editor</h1>

<script src="/js/webeditor/log.js"></script>
<script src="/js/webeditor/normalizeFrontMatter.js"></script>
<script src="/js/webeditor/renderAccessOptions.js"></script>
<script src="/js/webeditor/renderExtraFields.js"></script>
<script src="/js/webeditor/renderSubOptions.js"></script>

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

// =====================
// Load Tree
// =====================
async function loadTree() {
    try {
        const res = await fetch("/.netlify/functions/list_content_tree");
        if(!res.ok) throw new Error("HTTP " + res.status);
        const tree = await res.json();
        window.log("Tree loaded successfully");
        document.getElementById("tree").appendChild(renderTree(tree));
    } catch(err) {
        window.log("loadTree error: " + err);
    }
}

// =====================
// Render Tree
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
                window.log("Clicked file: " + node.path);
                startEdit(node.path).catch(err => window.log("startEdit error: " + err));
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
        window.log("startEdit called for " + file);
        currentFile = file;

        document.getElementById("tree").style.display = "none";

        const res = await fetch("/.netlify/functions/start_edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file })
        });
        if(!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        parseMarkdown(data.content);
        window.log("File loaded: " + file);
    } catch(err) {
        window.log("startEdit error: " + err);
    }
}

// =====================
// Parse Markdown
// =====================
function parseMarkdown(md) {
    md = typeof md === "string" ? md : (md.content || "");

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

    frontMatter = window.normalizeFrontMatter(fields);
    window.log("Parsed front matter: " + JSON.stringify(frontMatter));

    renderForm();
}

// =====================
// Render Form
// =====================
async function renderForm() {
    const form = document.getElementById("editForm");
    form.innerHTML = "";

    // --- Page Type ---
    const pageTypeLabel = document.createElement("label");
    pageTypeLabel.textContent = "Page type";
    pageTypeLabel.style.display = "block";
    pageTypeLabel.style.marginTop = "10px";

    const pageTypeSelect = document.createElement("select");
    ["content page","navigation page"].forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        if(frontMatter["page_type"] === v) opt.selected = true;
        pageTypeSelect.appendChild(opt);
    });
    pageTypeSelect.name = "page_type";
    pageTypeSelect.style.width = "320px";
    pageTypeSelect.onchange = () => window.renderSubOptions(pageTypeSelect.value, form, frontMatter);

    form.appendChild(pageTypeLabel);
    form.appendChild(pageTypeSelect);

    // --- Title ---
    const titleLabel = document.createElement("label");
    titleLabel.textContent = "Title (required)";
    titleLabel.style.display = "block";
    titleLabel.style.marginTop = "10px";
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = frontMatter["title"] || "";
    titleInput.name = "title";
    titleInput.style.width = "320px";
    form.appendChild(titleLabel);
    form.appendChild(titleInput);

    // --- Summary ---
    const summaryLabel = document.createElement("label");
    summaryLabel.textContent = "Summary (optional)";
    summaryLabel.style.display = "block";
    summaryLabel.style.marginTop = "10px";
    const summaryInput = document.createElement("textarea");
    summaryInput.name = "summary";
    summaryInput.value = frontMatter["summary"] || "";
    summaryInput.rows = 3;
    summaryInput.style.width = "320px";
    form.appendChild(summaryLabel);
    form.appendChild(summaryInput);

    // --- Access ---
    await window.renderAccessOptions(form, frontMatter, accessOptionsCache);

    // --- Sub-options ---
    window.renderSubOptions(pageTypeSelect.value, form, frontMatter);

    // --- Remaining fields ---
    window.renderExtraFields(form, frontMatter);
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
        window.log("Saved: " + currentFile);
        document.getElementById("tree").style.display = "block";
    } catch(err) {
        window.log("saveEdit error: " + err);
    }
}

async function publishEdits() {
    try {
        const res = await fetch("/.netlify/functions/publish_edits", { method: "POST" });
        if(!res.ok) throw new Error("HTTP " + res.status);
        window.log("All edits published");
        document.getElementById("tree").style.display = "block";
    } catch(err) {
        window.log("publishEdits error: " + err);
    }
}

function cancelEdit() {
    document.getElementById("editForm").innerHTML = "";
    document.getElementById("tree").style.display = "block";
    window.log("Edit canceled, tree restored");
}

// =====================
// Init
// =====================
loadTree();

</script>

</div>
`;
}
